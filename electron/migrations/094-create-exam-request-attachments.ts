import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS exam_request_attachments (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      exam_request_id INTEGER NOT NULL REFERENCES exam_requests(id) ON DELETE CASCADE,
      display_name    TEXT    NOT NULL,
      file_name       TEXT    NOT NULL,
      mime_type       TEXT,
      file_size       INTEGER CHECK (file_size >= 0),
      file_data       TEXT    NOT NULL,
      description     TEXT,
      created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `.execute(db)
  await sql`
    CREATE INDEX IF NOT EXISTS idx_exam_request_attachments_request_id ON exam_request_attachments (exam_request_id)
  `.execute(db)
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP TABLE IF EXISTS exam_request_attachments`.execute(db)
}