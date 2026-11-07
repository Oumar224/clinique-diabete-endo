import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  // Seed CRC_GESTA — idempotent INSERT (skip if code already exists)
  await sql`
    INSERT OR IGNORE INTO clinical_document_types
      (id, code, label, description, form_schema, category, is_active, acte_id_declenche, contact_types)
    VALUES (
      '55555555-5555-4555-8555-555555555555',
      'CRC_GESTA',
      'Compte Rendu de Consultation — Diabète gestationnel',
      'Dossier patiente en parcours de soins de diabète gestationnel / diabète & grossesse',
      '[]',
      'consultation',
      1,
      NULL,
      '["consultation"]'
    )
  `.execute(db)
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DELETE FROM clinical_document_types WHERE code = 'CRC_GESTA'`.execute(db)
}
