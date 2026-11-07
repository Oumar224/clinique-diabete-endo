import { type Kysely, sql } from 'kysely'

/**
 * Pièces jointes d'un lot de stock (bon de livraison, facture, photo…).
 *
 * Les fichiers sont stockés en base64 dans SQLite : le volume attendu est
 * faible (quelques BL par réception) et cela garantit que la pièce reste
 * attachée au lot même si le dossier de données de l'application est déplacé.
 * La taille est bornée côté service (10 Mo décodés).
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS stock_lot_attachments (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      stock_lot_id INTEGER NOT NULL REFERENCES stock_lots(id) ON DELETE CASCADE,
      file_name    TEXT    NOT NULL,
      file_type    TEXT    NOT NULL,
      file_size    INTEGER NOT NULL CHECK (file_size >= 0),
      file_data    TEXT    NOT NULL,
      uploaded_by  INTEGER REFERENCES user(id),
      created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `.execute(db)
  await sql`CREATE INDEX IF NOT EXISTS idx_stock_lot_attachments_lot_id ON stock_lot_attachments (stock_lot_id)`.execute(db)
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP INDEX IF EXISTS idx_stock_lot_attachments_lot_id`.execute(db)
  await sql`DROP TABLE IF EXISTS stock_lot_attachments`.execute(db)
}
