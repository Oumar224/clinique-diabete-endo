import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  const hasServiceId = await sql<{ name: string }[]>`
    SELECT name FROM pragma_table_info('appointment') WHERE name = 'service_id'
  `.execute(db)
  if (hasServiceId.rows.length === 0) {
    await sql`ALTER TABLE appointment ADD COLUMN service_id INTEGER REFERENCES services(id)`.execute(db)
  }

  const hasCareUnitId = await sql<{ name: string }[]>`
    SELECT name FROM pragma_table_info('appointment') WHERE name = 'care_unit_id'
  `.execute(db)
  if (hasCareUnitId.rows.length === 0) {
    await sql`ALTER TABLE appointment ADD COLUMN care_unit_id INTEGER REFERENCES care_units(id)`.execute(db)
  }
}

export async function down(_db: Kysely<unknown>): Promise<void> {
  // SQLite does not support dropping columns directly.
}
