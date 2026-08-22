import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`PRAGMA foreign_keys = OFF`.execute(db)

  // Recreate table with relaxed category CHECK constraint (was 'hospitalization' only)
  await sql`
    CREATE TABLE clinical_document_types_new (
      id                TEXT PRIMARY KEY,
      code              TEXT NOT NULL UNIQUE,
      label             TEXT NOT NULL,
      description       TEXT,
      form_schema       TEXT NOT NULL DEFAULT '[]',
      category          TEXT NOT NULL,
      is_active         INTEGER NOT NULL DEFAULT 1,
      acte_id_declenche INTEGER REFERENCES medical_acts(id),
      created_at        TEXT DEFAULT (datetime('now'))
    )
  `.execute(db)

  // Copy existing data (CRH_DIABETE)
  await sql`
    INSERT INTO clinical_document_types_new (id, code, label, description, form_schema, category, is_active, acte_id_declenche, created_at)
    SELECT id, code, label, description, form_schema, category, is_active, acte_id_declenche, created_at
    FROM clinical_document_types
  `.execute(db)

  await sql`DROP TABLE clinical_document_types`.execute(db)
  await sql`ALTER TABLE clinical_document_types_new RENAME TO clinical_document_types`.execute(db)

  // Seed ORDONNANCE_LIBRE
  await sql`
    INSERT INTO clinical_document_types (id, code, label, description, form_schema, category)
    VALUES (
      '22222222-2222-4222-2222-222222222222',
      'ORDONNANCE_LIBRE',
      'Ordonnance Libre',
      'Prescription libre avec génération d''ordonnance médicale',
      '[]',
      'prescriptions'
    )
  `.execute(db)

  await sql`PRAGMA foreign_keys = ON`.execute(db)
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DELETE FROM clinical_document_types WHERE code = 'ORDONNANCE_LIBRE'`.execute(db)
}
