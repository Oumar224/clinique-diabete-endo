import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`ALTER TABLE exam_requests ADD COLUMN specialite TEXT`.execute(db)
}

export async function down(_db: Kysely<unknown>): Promise<void> {
  // SQLite does not support dropping columns; this is a no-op down migration.
}
