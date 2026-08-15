import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`PRAGMA foreign_keys = OFF`.execute(db)

  const hasFromServiceId = await sql<{ name: string }[]>`
    SELECT name FROM pragma_table_info('encounter_movements') WHERE name = 'from_service_id'
  `.execute(db)
  if (hasFromServiceId.rows.length === 0) {
    await sql`ALTER TABLE encounter_movements ADD COLUMN from_service_id INTEGER REFERENCES services(id)`.execute(db)
  }

  const hasCreatedBy = await sql<{ name: string }[]>`
    SELECT name FROM pragma_table_info('encounter_movements') WHERE name = 'created_by'
  `.execute(db)
  if (hasCreatedBy.rows.length === 0) {
    await sql`ALTER TABLE encounter_movements ADD COLUMN created_by INTEGER REFERENCES user(id)`.execute(db)
  }

  const hasMotif = await sql<{ name: string }[]>`
    SELECT name FROM pragma_table_info('encounter_movements') WHERE name = 'motif'
  `.execute(db)
  if (hasMotif.rows.length === 0) {
    await sql`ALTER TABLE encounter_movements ADD COLUMN motif TEXT`.execute(db)
  }

  await sql`PRAGMA foreign_keys = ON`.execute(db)
}

export async function down(_db: Kysely<unknown>): Promise<void> {
  // SQLite does not support dropping columns; this is a no-op down migration.
}
