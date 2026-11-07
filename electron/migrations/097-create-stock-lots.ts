import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS stock_lots (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      medicament_id     INTEGER NOT NULL REFERENCES medicaments(id) ON DELETE CASCADE,
      numero_lot        TEXT,
      quantite          INTEGER NOT NULL DEFAULT 0 CHECK (quantite >= 0),
      quantite_initiale INTEGER NOT NULL DEFAULT 0,
      date_peremption   TEXT,
      date_entree       TEXT,
      created_at        TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `.execute(db)
  await sql`
    CREATE INDEX IF NOT EXISTS idx_stock_lots_medicament_id ON stock_lots (medicament_id)
  `.execute(db)
  await sql`
    CREATE INDEX IF NOT EXISTS idx_stock_lots_date_peremption ON stock_lots (date_peremption)
  `.execute(db)
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP TABLE IF EXISTS stock_lots`.execute(db)
}
