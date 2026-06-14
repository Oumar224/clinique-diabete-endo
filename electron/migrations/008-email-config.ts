import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS email_config (
      id                 INTEGER PRIMARY KEY CHECK(id = 1),
      smtp_host          TEXT    NOT NULL DEFAULT '',
      smtp_port          INTEGER NOT NULL DEFAULT 587,
      smtp_user          TEXT    NOT NULL DEFAULT '',
      smtp_pass_encrypted TEXT   NOT NULL DEFAULT '',
      sender_email       TEXT    NOT NULL DEFAULT '',
      sender_name        TEXT    NOT NULL DEFAULT '',
      is_configured      INTEGER NOT NULL DEFAULT 0,
      created_at         TEXT    DEFAULT (datetime('now')),
      updated_at         TEXT    DEFAULT (datetime('now'))
    )
  `.execute(db)
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP TABLE IF EXISTS email_config`.execute(db)
}
