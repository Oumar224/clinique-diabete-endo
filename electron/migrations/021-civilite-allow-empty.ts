import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    CREATE TABLE patient_v2 (
      id                 INTEGER PRIMARY KEY AUTOINCREMENT,
      civilite           TEXT NOT NULL CHECK(civilite IN ('M','Mme','Mlle','')),
      nom                TEXT NOT NULL,
      prenom             TEXT NOT NULL,
      date_naissance     TEXT NOT NULL,
      nir                TEXT UNIQUE,
      telephone          TEXT NOT NULL,
      email              TEXT,
      adresse            TEXT,
      mutuelle           TEXT,
      medecin_traitant   TEXT,
      allergies          TEXT DEFAULT '[]',
      photo              TEXT,
      nip                TEXT UNIQUE,
      lieu_naissance     TEXT,
      residence_code     TEXT,
      complement_adresse  TEXT,
      region             TEXT,
      profession         TEXT,
      automerge_id       TEXT,
      created_at         TEXT DEFAULT (datetime('now')),
      updated_at         TEXT DEFAULT (datetime('now'))
    )
  `.execute(db)

  await sql`INSERT INTO patient_v2 SELECT * FROM patient`.execute(db)
  await sql`DROP TABLE patient`.execute(db)
  await sql`ALTER TABLE patient_v2 RENAME TO patient`.execute(db)

  await sql`CREATE INDEX IF NOT EXISTS idx_patient_nom ON patient(nom)`.execute(db)
  await sql`CREATE INDEX IF NOT EXISTS idx_patient_nir ON patient(nir)`.execute(db)
}

export async function down(_db: Kysely<unknown>): Promise<void> {
}
