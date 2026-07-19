import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`ALTER TABLE exam_requests ADD COLUMN specialty_id INTEGER REFERENCES specialties(id)`.execute(db)
}

export async function down(_db: Kysely<unknown>): Promise<void> {
  // SQLite does not support dropping columns; this is a no-op down migration.
}
