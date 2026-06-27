import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`ALTER TABLE patient ADD COLUMN profession TEXT`.execute(db)

  await sql`
    CREATE TABLE IF NOT EXISTS trusted_persons (
      id                 INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id         INTEGER NOT NULL REFERENCES patient(id) ON DELETE CASCADE,
      has_trusted        INTEGER NOT NULL DEFAULT 0,
      nom                TEXT,
      prenom             TEXT,
      profession         TEXT,
      residence          TEXT,
      telephone          TEXT,
      email              TEXT,
      complement_adresse TEXT,
      lien_parente       TEXT,
      attachments        TEXT DEFAULT '[]',
      created_at         TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at         TEXT
    )
  `.execute(db)

  await sql`CREATE INDEX IF NOT EXISTS idx_trusted_persons_patient_id ON trusted_persons(patient_id)`.execute(db)
}

export async function down(_db: Kysely<unknown>): Promise<void> {
}
