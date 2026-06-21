import { type Kysely, CompiledQuery } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.executeQuery(CompiledQuery.raw(`
    CREATE TABLE IF NOT EXISTS user_attachments (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id      INTEGER NOT NULL REFERENCES user(id) ON DELETE CASCADE,
      display_name TEXT    NOT NULL,
      file_name    TEXT    NOT NULL,
      mime_type    TEXT,
      file_size    INTEGER CHECK(file_size >= 0),
      file_data    TEXT    NOT NULL,
      created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `))
  await db.executeQuery(CompiledQuery.raw(`
    CREATE INDEX IF NOT EXISTS idx_user_attachments_user_id ON user_attachments(user_id)
  `))
}

export async function down(_db: Kysely<unknown>): Promise<void> {}
