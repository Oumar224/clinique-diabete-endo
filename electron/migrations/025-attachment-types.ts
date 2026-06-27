import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS attachment_types (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT    NOT NULL UNIQUE,
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `.execute(db)

  await sql`
    ALTER TABLE patient_attachments ADD COLUMN attachment_type_id INTEGER REFERENCES attachment_types(id)
  `.execute(db)

  await sql`
    INSERT INTO attachment_types (name) VALUES
      ('Ordonnance'),
      ('Compte-rendu'),
      ('Radio'),
      ('Analyse'),
      ('Certificat médical'),
      ('Autre')
  `.execute(db)
}

export async function down(_db: Kysely<unknown>): Promise<void> {}
