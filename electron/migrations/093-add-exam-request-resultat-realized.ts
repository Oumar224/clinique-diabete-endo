import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  const pragmaResult = await sql<{ name: string }>`
    SELECT name FROM pragma_table_info('exam_requests') WHERE name IN ('realized_at', 'resultat')
  `.execute(db)

  const existing = new Set(pragmaResult.rows.map((r) => r.name))

  if (!existing.has('realized_at')) {
    console.log('[Migration 093] Adding column realized_at to exam_requests...')
    await sql`ALTER TABLE exam_requests ADD COLUMN realized_at TEXT`.execute(db)
    console.log('[Migration 093] Column realized_at added successfully')
  } else {
    console.log('[Migration 093] Column realized_at already exists, skipping')
  }

  if (!existing.has('resultat')) {
    console.log('[Migration 093] Adding column resultat to exam_requests...')
    await sql`ALTER TABLE exam_requests ADD COLUMN resultat TEXT`.execute(db)
    console.log('[Migration 093] Column resultat added successfully')
  } else {
    console.log('[Migration 093] Column resultat already exists, skipping')
  }
}

export async function down(_db: Kysely<unknown>): Promise<void> {
  // SQLite does not support DROP COLUMN directly before version 3.35.0.
  // No-op: the columns will persist after rollback.
}