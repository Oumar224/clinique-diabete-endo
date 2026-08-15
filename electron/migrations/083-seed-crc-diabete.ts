import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  // Seed CRC_DIABETE — idempotent INSERT (skip if code already exists)
  await sql`
    INSERT OR IGNORE INTO clinical_document_types (id, code, label, description, form_schema, category, is_active, acte_id_declenche)
    VALUES (
      '33333333-3333-4333-3333-333333333333',
      'CRC_DIABETE',
      'Compte Rendu de Consultation',
      'Compte rendu de consultation pour le suivi du diabète',
      '[]',
      'consultation',
      1,
      NULL
    )
  `.execute(db)
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DELETE FROM clinical_document_types WHERE code = 'CRC_DIABETE'`.execute(db)
}
