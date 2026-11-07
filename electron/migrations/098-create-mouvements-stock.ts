import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS mouvements_stock (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      medicament_id  INTEGER NOT NULL REFERENCES medicaments(id) ON DELETE CASCADE,
      lot_id         INTEGER REFERENCES stock_lots(id) ON DELETE SET NULL,
      type           TEXT    NOT NULL CHECK (type IN ('entree','sortie_manuelle','delivrance','administration','ajustement')),
      quantite       INTEGER NOT NULL,
      stock_avant    INTEGER,
      stock_apres    INTEGER,
      reference_type TEXT CHECK (reference_type IN ('ordonnance_libre','prescription','plan_soins_item')),
      reference_id   INTEGER,
      motif          TEXT,
      user_id        INTEGER REFERENCES user(id),
      created_at     TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `.execute(db)
  await sql`
    CREATE INDEX IF NOT EXISTS idx_mouvements_stock_medicament_id ON mouvements_stock (medicament_id)
  `.execute(db)
  await sql`
    CREATE INDEX IF NOT EXISTS idx_mouvements_stock_reference ON mouvements_stock (reference_type, reference_id)
  `.execute(db)
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP TABLE IF EXISTS mouvements_stock`.execute(db)
}
