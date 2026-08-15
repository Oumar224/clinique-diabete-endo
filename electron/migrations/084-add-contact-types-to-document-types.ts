import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`ALTER TABLE clinical_document_types ADD COLUMN contact_types TEXT DEFAULT '[]'`.execute(db)

  await sql`UPDATE clinical_document_types SET contact_types = '["consultation"]' WHERE code = 'CRC_DIABETE'`.execute(db)
  await sql`UPDATE clinical_document_types SET contact_types = '["consultation","hospitalisation"]' WHERE code = 'ORDONNANCE_LIBRE'`.execute(db)
  await sql`UPDATE clinical_document_types SET contact_types = '["hospitalisation"]' WHERE code = 'CRH_DIABETE'`.execute(db)
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`ALTER TABLE clinical_document_types DROP COLUMN contact_types`.execute(db)
}
