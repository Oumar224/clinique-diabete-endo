import { type Kysely, sql } from 'kysely'
import { addColumnIfMissing } from './lib/alter-column'

/**
 * Couche de données « Indicateurs annuels ».
 *
 * - `encounters` : classement du dossier (case_type) et indicateur de
 *   « nouveau cas » (is_new_case), utilisés pour l'agrégation annuelle.
 * - `stays` : type de séjour (jour / complete) pour distinguer les
 *   hospitalisations de jour des hospitalisations complètes.
 * - `invoice_item` : lien vers l'acte médical facturé (acte_id) afin de
 *   pouvoir agréger le chiffre d'affaires par type d'activité.
 * - `annual_indicator` : agrégats annuels éditables (une ligne par année).
 *
 * IDEMPOTENCE : chaque `ALTER` passe par `addColumnIfMissing` (sonde
 * `pragma_table_info`) ; les `CREATE ... IF NOT EXISTS` sont rejouables.
 * Aucune erreur n'est avalée : un vrai échec fait échouer la migration.
 *
 * Note SQLite : `invoice_item.acte_id` est déclaré TEXT alors que
 * `medical_acts.id` est INTEGER. SQLite applique l'affinité de la colonne
 * parente lors de la vérification de clé étrangère, donc une valeur texte
 * numérique reste valide. Le type TEXT est celui attendu par le contrat
 * applicatif (identifiant opaque côté client).
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  // ─── encounters ────────────────────────────────────────────────
  await addColumnIfMissing(
    db,
    'encounters',
    'case_type',
    `TEXT CHECK (case_type IN ('diabete','thyroide_endocrino','autre'))`,
  )
  await addColumnIfMissing(
    db,
    'encounters',
    'is_new_case',
    'INTEGER NOT NULL DEFAULT 0 CHECK (is_new_case IN (0, 1))',
  )
  await sql`
    CREATE INDEX IF NOT EXISTS idx_encounters_case_type ON encounters (case_type)
  `.execute(db)
  await sql`
    CREATE INDEX IF NOT EXISTS idx_encounters_is_new_case ON encounters (is_new_case)
  `.execute(db)

  // ─── stays ─────────────────────────────────────────────────────
  await addColumnIfMissing(
    db,
    'stays',
    'type',
    `TEXT CHECK (type IN ('jour','complete'))`,
  )

  // ─── invoice_item ──────────────────────────────────────────────
  // ON DELETE SET NULL : supprimer un acte du catalogue ne doit jamais faire
  // disparaître la ligne de facture historique ; on perd seulement le lien
  // d'imputation (la ligne retombe alors sur le repli par libellé).
  await addColumnIfMissing(
    db,
    'invoice_item',
    'acte_id',
    'TEXT REFERENCES medical_acts(id) ON DELETE SET NULL',
  )
  await sql`
    CREATE INDEX IF NOT EXISTS idx_invoice_item_acte_id ON invoice_item (acte_id)
  `.execute(db)

  // ─── annual_indicator ──────────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS annual_indicator (
      id                        TEXT PRIMARY KEY,
      annee                     INTEGER NOT NULL UNIQUE,
      ca_diabete_endocrino      REAL,
      nouveaux_cas_diabete      INTEGER,
      nouveaux_cas_thyroide_endocrino INTEGER,
      nouveaux_venus_diabete    INTEGER,
      bilan_labo                INTEGER,
      hospitalisation_jour      INTEGER,
      hospitalisation_complete  INTEGER,
      autres_nouveaux_cas       INTEGER,
      ecg                       INTEGER,
      hopital_de_jour           INTEGER,
      total_activites           INTEGER,
      moyenne_activites         REAL,
      updated_by                TEXT,
      updated_at                TEXT
    )
  `.execute(db)

  // La colonne `annee` est déjà `UNIQUE` : l'index unique séparé était
  // redondant. On le supprime aussi sur les bases où une version antérieure
  // de cette migration l'aurait créé.
  await sql`DROP INDEX IF EXISTS idx_annual_indicator_annee`.execute(db)

  // ─── seed ECG (imagerie) ───────────────────────────────────────
  // 072 seeds the imaging category with code 'imagerie'. The probe keeps
  // the INSERT idempotent (lab_exams.code is not UNIQUE).
  await sql`
    INSERT INTO lab_exams (category_id, parent_id, code, name, sort_order)
    SELECT cat.id, NULL, 'ECG', 'ECG de repos', 99
    FROM lab_exam_categories cat
    WHERE cat.code = 'imagerie'
      AND NOT EXISTS (SELECT 1 FROM lab_exams WHERE code = 'ECG')
  `.execute(db)
}

export async function down(db: Kysely<unknown>): Promise<void> {
  // L'ECG est un référentiel partagé : `up()` ne l'insère que s'il est absent,
  // il peut donc préexister à la migration. On ne le supprime PAS ici — sinon
  // un rollback effacerait une donnée que l'utilisateur possédait déjà.
  await sql`DROP INDEX IF EXISTS idx_annual_indicator_annee`.execute(db)
  await sql`DROP TABLE IF EXISTS annual_indicator`.execute(db)
  await sql`DROP INDEX IF EXISTS idx_invoice_item_acte_id`.execute(db)
  await sql`DROP INDEX IF EXISTS idx_encounters_is_new_case`.execute(db)
  await sql`DROP INDEX IF EXISTS idx_encounters_case_type`.execute(db)
  // SQLite ne supprime pas les colonnes ajoutées : celles de 110 restent en
  // place (même approche que 101/109). Elles sont nullables ou ont un défaut
  // sans effet de bord.
}
