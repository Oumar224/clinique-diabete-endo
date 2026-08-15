import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  const hasSource = await sql<{ name: string }[]>`
    SELECT name FROM pragma_table_info('patient_clinical_documents') WHERE name = 'source'
  `.execute(db)
  if (hasSource.rows.length === 0) {
    await sql`ALTER TABLE patient_clinical_documents ADD COLUMN source TEXT NOT NULL DEFAULT 'created'`.execute(db)
  }

  const hasPdfPath = await sql<{ name: string }[]>`
    SELECT name FROM pragma_table_info('patient_clinical_documents') WHERE name = 'pdf_path'
  `.execute(db)
  if (hasPdfPath.rows.length === 0) {
    await sql`ALTER TABLE patient_clinical_documents ADD COLUMN pdf_path TEXT`.execute(db)
  }
}

export async function down(_db: Kysely<unknown>): Promise<void> {
  // SQLite does not support dropping columns; this is a no-op down migration.
}
