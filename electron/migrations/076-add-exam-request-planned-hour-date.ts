import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  // Add planned_hour column if it doesn't exist
  const hasPlannedHour = await sql<{ name: string }[]>`
    SELECT name FROM pragma_table_info('exam_requests') WHERE name = 'planned_hour'
  `.execute(db)
  if (hasPlannedHour.rows.length === 0) {
    await sql`ALTER TABLE exam_requests ADD COLUMN planned_hour INTEGER`.execute(db)
  }

  // Add planned_date column if it doesn't exist
  const hasPlannedDate = await sql<{ name: string }[]>`
    SELECT name FROM pragma_table_info('exam_requests') WHERE name = 'planned_date'
  `.execute(db)
  if (hasPlannedDate.rows.length === 0) {
    await sql`ALTER TABLE exam_requests ADD COLUMN planned_date TEXT`.execute(db)
  }

  // Backfill existing rows: set planned_date = DATE(created_at), planned_hour = HOUR(created_at)
  await sql`
    UPDATE exam_requests
    SET planned_date = DATE(created_at),
        planned_hour = CAST(strftime('%H', created_at) AS INTEGER)
    WHERE planned_date IS NULL AND planned_hour IS NULL
  `.execute(db)
}

export async function down(_db: Kysely<unknown>): Promise<void> {
  // SQLite does not support dropping columns; this is a no-op down migration.
}
