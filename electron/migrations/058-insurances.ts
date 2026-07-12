import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`CREATE TABLE IF NOT EXISTS insurances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`.execute(db)

  await sql`
    INSERT INTO insurances (name, code) VALUES
      ('CNSS', 'CNSS'),
      ('SONA', 'SONA'),
      ('AXA', 'AXA'),
      ('NSIA', 'NSIA'),
      ('SAAR', 'SAAR'),
      ('ALLIANZ', 'ALLIANZ'),
      ('GN-ASSURANCE', 'GN-ASSURANCE'),
      ('SUNU', 'SUNU')
  `.execute(db)
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP TABLE IF EXISTS insurances`.execute(db)
}
