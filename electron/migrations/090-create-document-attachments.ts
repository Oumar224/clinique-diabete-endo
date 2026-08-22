import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS document_attachments (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      document_id  TEXT    NOT NULL REFERENCES patient_clinical_documents(id) ON DELETE CASCADE,
      display_name TEXT    NOT NULL,
      file_name    TEXT    NOT NULL,
      mime_type    TEXT,
      file_size    INTEGER CHECK (file_size >= 0),
      file_data    TEXT    NOT NULL,
      description  TEXT,
      created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `.execute(db)
  await sql`
    CREATE INDEX IF NOT EXISTS idx_document_attachments_document_id ON document_attachments (document_id)
  `.execute(db)
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP TABLE IF EXISTS document_attachments`.execute(db)
}
