import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`PRAGMA foreign_keys = OFF`.execute(db)

  // Drop orphaned table from previous failed attempts (DDL is non-rollbackable in SQLite)
  await sql`DROP TABLE IF EXISTS clinical_document_types_v2`.execute(db)

  await sql`
    CREATE TABLE clinical_document_types_v2 (
      id                TEXT PRIMARY KEY,
      code              TEXT NOT NULL UNIQUE,
      label             TEXT NOT NULL,
      description       TEXT,
      form_schema       TEXT NOT NULL DEFAULT '[]',
      category          TEXT NOT NULL CHECK(category IN ('hospitalization')),
      is_active         INTEGER NOT NULL DEFAULT 1,
      acte_id_declenche INTEGER REFERENCES medical_acts(id),
      created_at        TEXT DEFAULT (datetime('now'))
    )
  `.execute(db)

  // Insert CRH_DIABETE directly — old types (CONSULTATION_NOTE, LAB_REQUEST, DELIVERY_REPORT)
  // had categories 'consultation','lab','delivery' which violate the new CHECK constraint,
  // so copying them is impossible. Instead we seed only the one type we need.
  await sql`
    INSERT INTO clinical_document_types_v2 (id, code, label, description, form_schema, category)
    VALUES (
      '11111111-1111-4111-1111-111111111111',
      'CRH_DIABETE',
      'Compte-Rendu d''Hospitalisation',
      'Compte rendu d''hospitalisation détaillé pour patient diabétique',
      '[]',
      'hospitalization'
    )
  `.execute(db)

  await sql`DROP TABLE IF EXISTS clinical_document_types`.execute(db)
  await sql`ALTER TABLE clinical_document_types_v2 RENAME TO clinical_document_types`.execute(db)

  await sql`PRAGMA foreign_keys = ON`.execute(db)
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`PRAGMA foreign_keys = OFF`.execute(db)

  await sql`DROP TABLE IF EXISTS clinical_document_types_old`.execute(db)

  await sql`
    CREATE TABLE clinical_document_types_old (
      id                TEXT PRIMARY KEY,
      code              TEXT NOT NULL UNIQUE,
      label             TEXT NOT NULL,
      description       TEXT,
      form_schema       TEXT NOT NULL,
      category          TEXT NOT NULL CHECK(category IN ('consultation','lab','delivery','other')),
      is_active         INTEGER NOT NULL DEFAULT 1,
      acte_id_declenche INTEGER REFERENCES medical_acts(id),
      created_at        TEXT DEFAULT (datetime('now'))
    )
  `.execute(db)

  await sql`
    INSERT INTO clinical_document_types_old (id, code, label, description, form_schema, category)
    VALUES
      ('11111111-1111-4111-1111-111111111111', 'CRH_DIABETE', 'Compte-Rendu d''Hospitalisation', 'Compte rendu d''hospitalisation détaillé pour patient diabétique', '[]', 'hospitalization')
  `.execute(db)

  await sql`DROP TABLE IF EXISTS clinical_document_types`.execute(db)
  await sql`ALTER TABLE clinical_document_types_old RENAME TO clinical_document_types`.execute(db)

  await sql`PRAGMA foreign_keys = ON`.execute(db)
}
