import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS voie_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      label TEXT NOT NULL UNIQUE,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `.execute(db)

  await sql`
    CREATE TABLE IF NOT EXISTS dispositif_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      label TEXT NOT NULL UNIQUE,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `.execute(db)

  // Seed default voie types
  await sql`
    INSERT OR IGNORE INTO voie_types (label) VALUES
      ('IV'), ('PO'), ('SC'), ('IM'), ('SL')
  `.execute(db)

  // Seed common dispositif types
  await sql`
    INSERT OR IGNORE INTO dispositif_types (label) VALUES
      ('KT central'), ('PICC line'), ('Chambre implantable'),
      ('Voie veineuse périphérique'), ('Artérielle')
  `.execute(db)
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP TABLE IF EXISTS voie_types`.execute(db)
  await sql`DROP TABLE IF EXISTS dispositif_types`.execute(db)
}
