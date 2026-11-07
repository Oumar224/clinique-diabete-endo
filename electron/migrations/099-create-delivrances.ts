import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS delivrances (
      id                 INTEGER PRIMARY KEY AUTOINCREMENT,
      source             TEXT    NOT NULL DEFAULT 'ordonnance_libre',
      source_document_id INTEGER NOT NULL,
      patient_id         INTEGER NOT NULL REFERENCES patient(id) ON DELETE CASCADE,
      statut             TEXT    NOT NULL DEFAULT 'a_servir' CHECK (statut IN ('a_servir','partielle','servie','annulee')),
      served_by          INTEGER REFERENCES user(id),
      served_at          TEXT,
      created_at         TEXT    NOT NULL DEFAULT (datetime('now')),
      UNIQUE (source, source_document_id)
    )
  `.execute(db)
  await sql`
    CREATE INDEX IF NOT EXISTS idx_delivrances_statut ON delivrances (statut)
  `.execute(db)
  await sql`
    CREATE INDEX IF NOT EXISTS idx_delivrances_patient_id ON delivrances (patient_id)
  `.execute(db)

  await sql`
    CREATE TABLE IF NOT EXISTS delivrance_lignes (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      delivrance_id     INTEGER NOT NULL REFERENCES delivrances(id) ON DELETE CASCADE,
      medicament_id     INTEGER REFERENCES medicaments(id),
      libelle           TEXT    NOT NULL,
      quantite_demandee INTEGER NOT NULL,
      quantite_servie   INTEGER DEFAULT 0,
      lot_id            INTEGER REFERENCES stock_lots(id),
      created_at        TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `.execute(db)
  await sql`
    CREATE INDEX IF NOT EXISTS idx_delivrance_lignes_delivrance_id ON delivrance_lignes (delivrance_id)
  `.execute(db)
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP TABLE IF EXISTS delivrance_lignes`.execute(db)
  await sql`DROP TABLE IF EXISTS delivrances`.execute(db)
}
