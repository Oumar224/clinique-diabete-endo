import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  // SQLite cannot ALTER TABLE to modify CHECK constraint, so recreate
  await sql`
    CREATE TABLE IF NOT EXISTS localites_new (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      code       TEXT    NOT NULL UNIQUE,
      name       TEXT    NOT NULL,
      type       TEXT    NOT NULL CHECK(type IN ('region', 'prefecture', 'commune', 'sous_prefecture')),
      parent_id  INTEGER REFERENCES localites_new(id),
      country    TEXT    NOT NULL DEFAULT 'GN',
      region     TEXT,
      is_active  INTEGER NOT NULL DEFAULT 1,
      created_at TEXT    DEFAULT (datetime('now')),
      updated_at TEXT    DEFAULT (datetime('now'))
    )
  `.execute(db)

  await sql`INSERT INTO localites_new (id, code, name, type, parent_id, country, region, is_active, created_at, updated_at) SELECT id, code, name, type, parent_id, country, region, is_active, created_at, updated_at FROM localites`.execute(db)

  await sql`DROP TABLE localites`.execute(db)

  await sql`ALTER TABLE localites_new RENAME TO localites`.execute(db)

  await sql`CREATE INDEX IF NOT EXISTS idx_localites_parent_id ON localites(parent_id)`.execute(db)
  await sql`CREATE INDEX IF NOT EXISTS idx_localites_type ON localites(type)`.execute(db)
}

export async function down(_db: Kysely<unknown>): Promise<void> {
}
