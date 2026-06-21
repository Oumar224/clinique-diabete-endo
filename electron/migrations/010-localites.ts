import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS localites (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      code       TEXT    NOT NULL UNIQUE,
      name       TEXT    NOT NULL,
      type       TEXT    NOT NULL CHECK(type IN ('prefecture', 'commune', 'sous_prefecture')),
      parent_id  INTEGER REFERENCES localites(id),
      country    TEXT    NOT NULL DEFAULT 'GN',
      is_active  INTEGER NOT NULL DEFAULT 1,
      created_at TEXT    DEFAULT (datetime('now')),
      updated_at TEXT    DEFAULT (datetime('now'))
    )
  `.execute(db)

  await sql`CREATE INDEX IF NOT EXISTS idx_localites_parent_id ON localites(parent_id)`.execute(db)
  await sql`CREATE INDEX IF NOT EXISTS idx_localites_type ON localites(type)`.execute(db)
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP TABLE IF EXISTS localites`.execute(db)
}
