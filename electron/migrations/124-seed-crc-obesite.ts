import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  // Seed CRC_OBESITE — idempotent INSERT (skip if code already exists)
  await sql`
    INSERT OR IGNORE INTO clinical_document_types
      (id, code, label, description, form_schema, category, is_active, acte_id_declenche, contact_types)
    VALUES (
      '44444444-4444-4444-8444-444444444444',
      'CRC_OBESITE',
      'Compte Rendu de Consultation — Obésité',
      'Dossier patient en parcours de soins d''obésité',
      '[]',
      'consultation',
      1,
      NULL,
      '["consultation"]'
    )
  `.execute(db)
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DELETE FROM clinical_document_types WHERE code = 'CRC_OBESITE'`.execute(db)
}
