import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  const hasContactTypes = await sql<{ name: string }[]>`
    SELECT name FROM pragma_table_info('clinical_document_types') WHERE name = 'contact_types'
  `.execute(db)
  if (hasContactTypes.rows.length === 0) {
    await sql`ALTER TABLE clinical_document_types ADD COLUMN contact_types TEXT DEFAULT '[]'`.execute(db)
  }

  await sql`UPDATE clinical_document_types SET contact_types = '["consultation"]' WHERE code = 'CRC_DIABETE' AND (contact_types IS NULL OR contact_types = '[]')`.execute(db)
  await sql`UPDATE clinical_document_types SET contact_types = '["consultation","hospitalisation"]' WHERE code = 'ORDONNANCE_LIBRE' AND (contact_types IS NULL OR contact_types = '[]')`.execute(db)
  await sql`UPDATE clinical_document_types SET contact_types = '["hospitalisation"]' WHERE code = 'CRH_DIABETE' AND (contact_types IS NULL OR contact_types = '[]')`.execute(db)
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`ALTER TABLE clinical_document_types DROP COLUMN contact_types`.execute(db)
}
