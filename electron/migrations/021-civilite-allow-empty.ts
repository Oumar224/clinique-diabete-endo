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

  // NOTE: this is an EXPLICIT, order-aware mapping, NOT `SELECT *`.
  //
  // `patient` (pre-021) and `patient_v2` (this migration) define their
  // columns in DIFFERENT orders:
  //   patient  : ..., allergies, automerge_id, created_at, updated_at, photo, nip, lieu_naissance, residence_code, complement_adresse, region, profession
  //   patient_v2: ..., allergies, photo, nip, lieu_naissance, residence_code, complement_adresse, region, profession, automerge_id, created_at, updated_at
  //
  // A positional `INSERT INTO patient_v2 SELECT * FROM patient` silently
  // scrambles every column from #13 onward (automerge_id -> photo, created_at
  // -> nip, ... profession -> updated_at). The rewrite below avoids that in the
  // only two ways that are safe:
  //   1. It lists the target patient_v2 columns explicitly (column order
  //      doesn't matter anymore, because values are matched positionally).
  //   2. The SELECT references each value column BY NAME from `patient`, so it
  //      reads the correct value into each position regardless of `patient`'s
  //      physical column order. Both lists use the patient_v2 order, so
  //      position 13 (patient_v2.photo) receives patient.photo, position 14
  //      receives patient.nip, ... position 20 receives patient.automerge_id.
  await sql`
    INSERT INTO patient_v2
      (id, civilite, nom, prenom, date_naissance, nir, telephone, email, adresse, mutuelle, medecin_traitant, allergies, photo, nip, lieu_naissance, residence_code, complement_adresse, region, profession, automerge_id, created_at, updated_at)
    SELECT
      id, civilite, nom, prenom, date_naissance, nir, telephone, email, adresse, mutuelle, medecin_traitant, allergies, photo, nip, lieu_naissance, residence_code, complement_adresse, region, profession, automerge_id, created_at, updated_at
    FROM patient
  `.execute(db)
  await sql`DROP TABLE patient`.execute(db)
  await sql`ALTER TABLE patient_v2 RENAME TO patient`.execute(db)

  await sql`CREATE INDEX IF NOT EXISTS idx_patient_nom ON patient(nom)`.execute(db)
  await sql`CREATE INDEX IF NOT EXISTS idx_patient_nir ON patient(nir)`.execute(db)
}

export async function down(_db: Kysely<unknown>): Promise<void> {
}
