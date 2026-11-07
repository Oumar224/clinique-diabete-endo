import { type Kysely, sql } from 'kysely'
import { addColumnIfMissing } from './lib/alter-column'

/**
 * Comptabilité pharmacie — prix de vente, gratuité et encaissements.
 *
 * - delivrances : date de vente, type (facturée / gratuite), motif, total
 * - delivrance_lignes : prix unitaire, montant ligne, coût d'achat total
 * - vente_pharmacie_paiement : paiements (éventuellement multiples) d'une vente
 *
 * IDEMPOTENCE (défaut B3) : l'ancien code avalait TOUTE erreur d'`ALTER`
 * (`catch { console.log('Colonne déjà existante...') }`). Une vraie erreur
 * (table verrouillée, page corrompue, disque plein) était donc avalée, la
 * migration se terminait « avec succès » et était ENREGISTRÉE dans
 * `kysely_migration` alors que le schéma restait incomplet : l'application
 * démarrait avec des colonnes manquantes et chaque `dispensation:servir`
 * échouait, sans chemin de réparation.
 *
 * On sonde donc explicitement l'existence de chaque colonne avant l'`ALTER` :
 * la colonne existe → on ne fait rien ; toute autre erreur → la migration
 * ÉCHOUE et n'est PAS enregistrée : elle sera rejouée au prochain démarrage,
 * où la sonde d'idempotence complètera le schéma sans dupliquer les colonnes
 * déjà ajoutées (l'adaptateur SQLite de Kysely n'enveloppe pas les migrations
 * dans une transaction : `supportsTransactionalDdl = false`).
 *
 * `PRAGMA foreign_keys = OFF/ON` a été retiré : cette pragma est un NO-OP
 * à l'intérieur d'une transaction (SQLite l'ignore depuis 3.6.19) et
 * suggérait à tort que les clés étrangères seraient désactivées.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  const delivranceAlters: Array<{ column: string; definition: string }> = [
    { column: 'date_vente', definition: 'TEXT' },
    {
      column: 'type_vente',
      definition: `TEXT NOT NULL DEFAULT 'facturee' CHECK (type_vente IN ('facturee','gratuite'))`,
    },
    { column: 'motif_gratuite', definition: 'TEXT' },
    {
      column: 'montant_total',
      definition: 'INTEGER NOT NULL DEFAULT 0 CHECK (montant_total >= 0)',
    },
  ]
  for (const alter of delivranceAlters) {
    await addColumnIfMissing(db, 'delivrances', alter.column, alter.definition)
  }

  const ligneAlters: Array<{ column: string; definition: string }> = [
    {
      column: 'prix_unitaire',
      definition: 'INTEGER NOT NULL DEFAULT 0 CHECK (prix_unitaire >= 0)',
    },
    { column: 'montant', definition: 'INTEGER NOT NULL DEFAULT 0 CHECK (montant >= 0)' },
    {
      column: 'cout_achat_total',
      definition: 'INTEGER NOT NULL DEFAULT 0 CHECK (cout_achat_total >= 0)',
    },
  ]
  for (const alter of ligneAlters) {
    await addColumnIfMissing(db, 'delivrance_lignes', alter.column, alter.definition)
  }

  await sql`
    CREATE INDEX IF NOT EXISTS idx_delivrances_date_vente ON delivrances (date_vente)
  `.execute(db)

  await sql`
    CREATE TABLE IF NOT EXISTS vente_pharmacie_paiement (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      delivrance_id INTEGER NOT NULL REFERENCES delivrances(id) ON DELETE CASCADE,
      montant       INTEGER NOT NULL CHECK (montant > 0),
      mode_paiement TEXT    NOT NULL CHECK (mode_paiement IN ('espèces','carte_bancaire','chèque','virement','mobile_money','assurance','autre')),
      date_paiement TEXT    NOT NULL,
      reference     TEXT,
      numero_recu   TEXT    UNIQUE,
      created_by    INTEGER REFERENCES user(id),
      created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `.execute(db)
  await sql`
    CREATE INDEX IF NOT EXISTS idx_vente_pharmacie_paiement_delivrance_id
      ON vente_pharmacie_paiement (delivrance_id)
  `.execute(db)
  await sql`
    CREATE INDEX IF NOT EXISTS idx_vente_pharmacie_paiement_date
      ON vente_pharmacie_paiement (date_paiement)
  `.execute(db)
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP INDEX IF EXISTS idx_vente_pharmacie_paiement_date`.execute(db)
  await sql`DROP INDEX IF EXISTS idx_vente_pharmacie_paiement_delivrance_id`.execute(db)
  await sql`DROP TABLE IF EXISTS vente_pharmacie_paiement`.execute(db)
  await sql`DROP INDEX IF EXISTS idx_delivrances_date_vente`.execute(db)
  // SQLite ne supprime pas les colonnes ajoutées : les colonnes de 109 restent
  // en place (même approche que 101/105). Elles n'ont pas d'effet de bord.
}
