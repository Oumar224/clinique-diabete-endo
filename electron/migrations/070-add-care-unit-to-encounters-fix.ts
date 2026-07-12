import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  const tableInfo = await sql<{ name: string }>`
    PRAGMA table_info('encounters')
  `.execute(db)
  const columns = tableInfo.rows.map(r => r.name)

  if (!columns.includes('care_unit_id')) {
    await sql`ALTER TABLE encounters ADD COLUMN care_unit_id INTEGER REFERENCES care_units(id)`.execute(db)
  }
}

export async function down(_db: Kysely<unknown>): Promise<void> {
  // SQLite does not support dropping columns directly.
}
