import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`ALTER TABLE encounters ADD COLUMN care_unit_id INTEGER REFERENCES care_units(id)`.execute(db)
}

export async function down(_db: Kysely<unknown>): Promise<void> {
  // SQLite does not support dropping columns directly.
}
