import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`ALTER TABLE clinical_document_types ADD COLUMN acte_id_declenche INTEGER REFERENCES medical_acts(id)`.execute(db)
}

export async function down(db: Kysely<unknown>): Promise<void> {
  // SQLite does not support DROP COLUMN in older versions
  // Recreate table without the column
  await sql`PRAGMA foreign_keys = OFF`.execute(db)

  await sql`
    CREATE TABLE IF NOT EXISTS clinical_document_types_new (
      id          TEXT PRIMARY KEY,
      code        TEXT NOT NULL UNIQUE,
      label       TEXT NOT NULL,
      description TEXT,
      form_schema TEXT NOT NULL,
      category    TEXT NOT NULL,
      is_active   INTEGER NOT NULL DEFAULT 1,
      created_at  TEXT DEFAULT (datetime('now'))
    )
  `.execute(db)

  await sql`
    INSERT INTO clinical_document_types_new (id, code, label, description, form_schema, category, is_active, created_at)
    SELECT id, code, label, description, form_schema, category, is_active, created_at
    FROM clinical_document_types
  `.execute(db)

  await sql`DROP TABLE IF EXISTS clinical_document_types`.execute(db)
  await sql`ALTER TABLE clinical_document_types_new RENAME TO clinical_document_types`.execute(db)

  await sql`PRAGMA foreign_keys = ON`.execute(db)
}
