import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`PRAGMA foreign_keys = OFF`.execute(db)

  // Drop orphaned v2 table left by failed migration 064
  await sql`DROP TABLE IF EXISTS clinical_document_types_v2`.execute(db)

  // Remove all existing document types and re-seed with CRH_DIABETE only
  await sql`DELETE FROM clinical_document_types`.execute(db)

  await sql`
    INSERT INTO clinical_document_types (id, code, label, description, form_schema, category)
    VALUES (
      '11111111-1111-4111-1111-111111111111',
      'CRH_DIABETE',
      'Compte-Rendu d''Hospitalisation',
      'Compte rendu d''hospitalisation détaillé pour patient diabétique',
      '[]',
      'hospitalization'
    )
  `.execute(db)

  await sql`PRAGMA foreign_keys = ON`.execute(db)
}

export async function down(_db: Kysely<unknown>): Promise<void> {
  // No rollback — data was intentionally cleaned
}
