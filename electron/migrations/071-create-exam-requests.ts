import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS exam_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL REFERENCES patient(id),
      encounter_id INTEGER REFERENCES encounters(id),
      type TEXT NOT NULL,
      examen_id INTEGER,
      exam_ids TEXT,
      motif TEXT,
      statut TEXT NOT NULL DEFAULT 'en_attente',
      prescripteur_id INTEGER REFERENCES user(id),
      created_by INTEGER REFERENCES user(id),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `.execute(db)
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP TABLE IF EXISTS exam_requests`.execute(db)
}
