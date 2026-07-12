import { type Kysely } from 'kysely'
import { CompiledQuery } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.executeQuery(CompiledQuery.raw('PRAGMA foreign_keys = OFF'))

  await db.executeQuery(CompiledQuery.raw(`
    CREATE TABLE IF NOT EXISTS care_units (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      code TEXT,
      description TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `))

  await db.executeQuery(CompiledQuery.raw('CREATE INDEX IF NOT EXISTS idx_care_units_service_id ON care_units(service_id)'))

  // Note: no seed data — care units are created manually
  // by the user in the "Unités de soins" settings tab.

  await db.executeQuery(CompiledQuery.raw('PRAGMA foreign_keys = ON'))
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.executeQuery(CompiledQuery.raw('DROP TABLE IF EXISTS care_units'))
}
