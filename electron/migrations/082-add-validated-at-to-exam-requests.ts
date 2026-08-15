import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`ALTER TABLE exam_requests ADD COLUMN validated_at TEXT`.execute(db)
}

export async function down(_db: Kysely<unknown>): Promise<void> {
  // SQLite does not support DROP COLUMN directly before version 3.35.0.
  // No-op: the column will persist after rollback.
}
