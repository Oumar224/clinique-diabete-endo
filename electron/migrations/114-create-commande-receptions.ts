import { type Kysely, sql } from 'kysely'
import { addColumnIfMissing } from './lib/alter-column'

/**
 * Réceptions de bons de commande pharmacie.
 *
 * Une réception est un événement daté : elle peut être partielle et être
 * répétée jusqu'à la livraison complète. Chaque ligne reçue alimente un lot
 * de stock (`stock_lots.commande_reception_id`) avec le fournisseur du bon.
 *
 * Aucune dépense n'est créée ici : le bon de commande ne porte pas de prix.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS commande_receptions (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      commande_id    INTEGER NOT NULL REFERENCES commandes(id) ON DELETE CASCADE,
      date_reception TEXT    NOT NULL,
      ref_bl         TEXT,
      notes          TEXT,
      created_by     INTEGER REFERENCES user(id),
      created_at     TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `.execute(db)
  await sql`CREATE INDEX IF NOT EXISTS idx_commande_receptions_commande_id ON commande_receptions (commande_id)`.execute(db)
  await sql`CREATE INDEX IF NOT EXISTS idx_commande_receptions_date ON commande_receptions (date_reception)`.execute(db)

  await sql`
    CREATE TABLE IF NOT EXISTS commande_reception_lignes (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      reception_id      INTEGER NOT NULL REFERENCES commande_receptions(id) ON DELETE CASCADE,
      commande_ligne_id INTEGER NOT NULL REFERENCES commande_lignes(id) ON DELETE CASCADE,
      quantite_recue    INTEGER NOT NULL CHECK (quantite_recue > 0),
      created_at        TEXT    NOT NULL DEFAULT (datetime('now')),
      UNIQUE (reception_id, commande_ligne_id)
    )
  `.execute(db)
  await sql`CREATE INDEX IF NOT EXISTS idx_commande_reception_lignes_reception_id ON commande_reception_lignes (reception_id)`.execute(db)
  await sql`CREATE INDEX IF NOT EXISTS idx_commande_reception_lignes_ligne_id ON commande_reception_lignes (commande_ligne_id)`.execute(db)

  await sql`
    CREATE TABLE IF NOT EXISTS commande_reception_attachments (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      reception_id INTEGER NOT NULL REFERENCES commande_receptions(id) ON DELETE CASCADE,
      file_name    TEXT    NOT NULL,
      file_type    TEXT    NOT NULL,
      file_size    INTEGER NOT NULL CHECK (file_size >= 0),
      file_data    TEXT    NOT NULL,
      uploaded_by  INTEGER REFERENCES user(id),
      created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `.execute(db)
  await sql`CREATE INDEX IF NOT EXISTS idx_commande_reception_attachments_reception_id ON commande_reception_attachments (reception_id)`.execute(db)

  await addColumnIfMissing(
    db,
    'stock_lots',
    'commande_reception_id',
    'INTEGER REFERENCES commande_receptions(id) ON DELETE SET NULL',
  )
  await sql`CREATE INDEX IF NOT EXISTS idx_stock_lots_commande_reception_id ON stock_lots (commande_reception_id)`.execute(db)
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP INDEX IF EXISTS idx_stock_lots_commande_reception_id`.execute(db)
  await sql`DROP INDEX IF EXISTS idx_commande_reception_attachments_reception_id`.execute(db)
  await sql`DROP TABLE IF EXISTS commande_reception_attachments`.execute(db)
  await sql`DROP INDEX IF EXISTS idx_commande_reception_lignes_ligne_id`.execute(db)
  await sql`DROP INDEX IF EXISTS idx_commande_reception_lignes_reception_id`.execute(db)
  await sql`DROP TABLE IF EXISTS commande_reception_lignes`.execute(db)
  await sql`DROP INDEX IF EXISTS idx_commande_receptions_date`.execute(db)
  await sql`DROP INDEX IF EXISTS idx_commande_receptions_commande_id`.execute(db)
  await sql`DROP TABLE IF EXISTS commande_receptions`.execute(db)
  // SQLite ne supprime pas `stock_lots.commande_reception_id` de façon
  // portable : la colonne reste, nullable et sans effet de bord.
}
