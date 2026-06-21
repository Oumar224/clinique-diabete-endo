import { type Kysely, CompiledQuery } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.executeQuery(CompiledQuery.raw(`
    CREATE TABLE IF NOT EXISTS patient_attachments (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id   INTEGER NOT NULL REFERENCES patient(id) ON DELETE CASCADE,
      display_name TEXT    NOT NULL,
      file_name    TEXT    NOT NULL,
      mime_type    TEXT,
      file_size    INTEGER,
      file_data    TEXT    NOT NULL,
      created_at   TEXT    DEFAULT (datetime('now'))
    )
  `))
  await db.executeQuery(CompiledQuery.raw(`
    CREATE INDEX IF NOT EXISTS idx_patient_attachments_patient_id ON patient_attachments(patient_id)
  `))
}

export async function down(_db: Kysely<unknown>): Promise<void> {}
