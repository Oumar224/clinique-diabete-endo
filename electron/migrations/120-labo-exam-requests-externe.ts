import { type Kysely, sql } from 'kysely'
import { nextExamRequestNumero } from '../utils/exam-request-numero'

/**
 * 120 — Circuit laboratoire : demandes internes et externes.
 *
 * `exam_requests.patient_id` devient nullable pour permettre une demande
 * d'examen sans dossier patient (patient externe). On ajoute au passage :
 *  - un numéro de demande stable (`LB-AAAAMMJJ-NNNN`) ;
 *  - une priorité (`normale` / `urgente`) ;
 *  - les champs d'identité dénormalisés du patient externe ;
 *  - les coordonnées du prescripteur externe ;
 *  - le prélèvement (type, date, opérateur) ;
 *  - la facturation (facture liée, montant, statut de paiement).
 *
 * SQLite ne sait pas retirer la contrainte NOT NULL : la table est reconstruite
 * (create → copy → drop → rename) sans perdre les identifiants, afin que les
 * `exam_results` et pièces jointes déjà rattachés restent valides.
 */
interface ChildBackup {
  table: string
  schema: string
  indexes: string[]
}

/**
 * Met une table enfant de côté avant de reconstruire son parent.
 *
 * `exam_results` et `exam_request_attachments` portent une clé étrangère
 * `ON DELETE CASCADE` vers `exam_requests` : sans cette précaution, le DROP de
 * la table parente effacerait tous les résultats et pièces jointes.
 */
async function backupChild(db: Kysely<unknown>, table: string): Promise<ChildBackup> {
  const schemaRow = await sql<{ sql: string }>`
    SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ${table}
  `.execute(db)
  const schema = schemaRow.rows[0]?.sql
  if (!schema) throw new Error(`Table enfant introuvable : ${table}`)

  const indexRows = await sql<{ sql: string }>`
    SELECT sql FROM sqlite_master
    WHERE type = 'index' AND tbl_name = ${table} AND sql IS NOT NULL
  `.execute(db)

  await sql`CREATE TABLE ${sql.raw(`${table}__labo_bak`)} AS SELECT * FROM ${sql.raw(table)}`.execute(db)
  await sql`DROP TABLE ${sql.raw(table)}`.execute(db)
  return { table, schema, indexes: indexRows.rows.map((r) => r.sql) }
}

async function restoreChild(db: Kysely<unknown>, backup: ChildBackup): Promise<void> {
  await sql`${sql.raw(backup.schema)}`.execute(db)
  await sql`INSERT INTO ${sql.raw(backup.table)} SELECT * FROM ${sql.raw(`${backup.table}__labo_bak`)}`.execute(db)
  for (const indexSql of backup.indexes) {
    await sql`${sql.raw(indexSql)}`.execute(db)
  }
  await sql`DROP TABLE ${sql.raw(`${backup.table}__labo_bak`)}`.execute(db)
}

export async function up(db: Kysely<unknown>): Promise<void> {
  // Copie des colonnes communes. Les colonnes absentes sur d'anciennes bases
  // (specialite, specialty_id, planned_*) sont ajoutées par les migrations 074
  // à 076 ; on lit prudemment la liste réelle des colonnes.
  const cols = await sql<{ name: string }>`
    SELECT name FROM pragma_table_info('exam_requests')
  `.execute(db)
  const existing = new Set(cols.rows.map((r) => r.name))
  const wanted = [
    'id', 'patient_id', 'encounter_id', 'type', 'examen_id', 'exam_ids',
    'motif', 'statut', 'specialite', 'specialty_id', 'planned_hour',
    'planned_date', 'validated_at', 'realized_at', 'resultat',
    'prescripteur_id', 'created_by', 'created_at', 'updated_at',
  ]
  const shared = wanted.filter((name) => existing.has(name))
  const quoted = shared.map((name) => `"${name}"`).join(', ')

  // 1. Sauvegarde et retrait des tables qui référencent exam_requests.
  const children = ['exam_results', 'exam_request_attachments']
  const backups: ChildBackup[] = []
  for (const child of children) {
    const exists = await sql<{ name: string }>`
      SELECT name FROM sqlite_master WHERE type = 'table' AND name = ${child}
    `.execute(db)
    if (exists.rows.length > 0) backups.push(await backupChild(db, child))
  }

  // 2. Reconstruction du parent, sans aucune clé étrangère entrante.
  await sql`
    CREATE TABLE IF NOT EXISTS exam_requests_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      numero TEXT,
      patient_id INTEGER REFERENCES patient(id),
      encounter_id INTEGER REFERENCES encounters(id),
      type TEXT NOT NULL,
      examen_id INTEGER,
      exam_ids TEXT,
      motif TEXT,
      statut TEXT NOT NULL DEFAULT 'en_attente',
      priorite TEXT NOT NULL DEFAULT 'normale',
      patient_externe INTEGER NOT NULL DEFAULT 0,
      externe_nom TEXT,
      externe_prenom TEXT,
      externe_sexe TEXT,
      externe_date_naissance TEXT,
      externe_telephone TEXT,
      externe_adresse TEXT,
      prescripteur_externe_nom TEXT,
      prescripteur_externe_structure TEXT,
      prescripteur_externe_telephone TEXT,
      prelevement_type TEXT,
      prelevement_at TEXT,
      prelevement_par INTEGER REFERENCES user(id),
      specialite TEXT,
      specialty_id INTEGER REFERENCES specialties(id),
      planned_hour INTEGER,
      planned_date TEXT,
      validated_at TEXT,
      realized_at TEXT,
      resultat TEXT,
      prescripteur_id INTEGER REFERENCES user(id),
      facture_id INTEGER,
      montant REAL,
      statut_paiement TEXT NOT NULL DEFAULT 'non_paye',
      created_by INTEGER REFERENCES user(id),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `.execute(db)

  await sql`INSERT INTO exam_requests_new (${sql.raw(quoted)}) SELECT ${sql.raw(quoted)} FROM exam_requests`.execute(db)
  await sql`DROP TABLE exam_requests`.execute(db)
  await sql`ALTER TABLE exam_requests_new RENAME TO exam_requests`.execute(db)

  // 3. Restauration des enfants : la clé étrangère se lie au nouveau parent.
  for (const backup of backups) {
    await restoreChild(db, backup)
  }

  // 4. Numérotation des demandes de laboratoire déjà existantes (créées
  //    depuis le dossier patient avant l'introduction du module Laboratoire).
  const orphelines = await sql<{ id: number; created_at: string | null }>`
    SELECT id, created_at FROM exam_requests
    WHERE type = 'laboratoire' AND (numero IS NULL OR numero = '')
    ORDER BY created_at ASC, id ASC
  `.execute(db)
  for (const row of orphelines.rows) {
    const ymd = typeof row.created_at === 'string' ? row.created_at.slice(0, 10) : ''
    const date = /^\d{4}-\d{2}-\d{2}$/.test(ymd)
      ? new Date(`${ymd}T12:00:00Z`)
      : new Date()
    const numero = await nextExamRequestNumero(db, date)
    await sql`UPDATE exam_requests SET numero = ${numero} WHERE id = ${row.id}`.execute(db)
  }

  await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_exam_requests_numero ON exam_requests(numero)`.execute(db)
  await sql`CREATE INDEX IF NOT EXISTS idx_exam_requests_patient ON exam_requests(patient_id)`.execute(db)
  await sql`CREATE INDEX IF NOT EXISTS idx_exam_requests_statut ON exam_requests(statut)`.execute(db)
  await sql`CREATE INDEX IF NOT EXISTS idx_exam_requests_planned_date ON exam_requests(planned_date)`.execute(db)
}

export async function down(_db: Kysely<unknown>): Promise<void> {
  // Reconstruction complexe : le rollback n'est pas pris en charge.
}
