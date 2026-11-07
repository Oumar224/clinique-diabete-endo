import 'reflect-metadata'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { Kysely, sql } from 'kysely'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { NodeSqliteDialect } from '../../driver/node-sqlite-dialect'
import { up } from '../../migrations/095-repair-021-patient-scramble'

/**
 * Migration 095 repairs the silent data-corruption introduced by the ORIGINAL
 * 021 `INSERT INTO patient_v2 SELECT * FROM patient`, which scrambled every
 * `patient` column from #13 onward because patient and patient_v2 defined their
 * columns in different orders.
 *
 * A scrambled row holds a SQLite datetime in `nip` (it received the OLD
 * `created_at`), matching `GLOB '????-??-?? ??:??:??'`. This is the detection
 * predicate — correct NIPs (e.g. `185COXGJLE`) never match it.
 */
describe('migration 095 (repair 021 patient scramble)', { timeout: 30_000 }, () => {
  let db: Kysely<any>
  let dbDir: string
  let dbPath: string

  // Final pre-021 `patient` column order (001 + 014 + 016 + 018 + 019).
  const PRE_021_PATIENT_DDL = `
    CREATE TABLE patient (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      civilite TEXT NOT NULL, nom TEXT NOT NULL, prenom TEXT NOT NULL,
      date_naissance TEXT NOT NULL, nir TEXT UNIQUE NOT NULL,
      telephone TEXT NOT NULL, email TEXT, adresse TEXT, mutuelle TEXT,
      medecin_traitant TEXT, allergies TEXT DEFAULT '[]', automerge_id TEXT,
      created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')),
      photo TEXT, nip TEXT UNIQUE, lieu_naissance TEXT, residence_code TEXT,
      complement_adresse TEXT, region TEXT, profession TEXT
    )
  `

  beforeEach(async () => {
    dbDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cd-migration-095-'))
    dbPath = path.join(dbDir, 'test.db')
    const dialect = new NodeSqliteDialect(dbPath)
    db = new Kysely<any>({ dialect })
  })

  afterEach(async () => {
    await db.destroy().catch(() => {})
    fs.rmSync(dbDir, { recursive: true, force: true })
  })

  async function patientRow(): Promise<any> {
    const r = await sql`SELECT * FROM patient WHERE id = 1`.execute(db)
    return r.rows[0]
  }

  // Insert a row as the SCRAMBLED 021 left it: photo holds old automerge_id,
  // nip holds old created_at (datetime), etc. `updatedAt` is the value written
  // to the physical `updated_at` column (which holds the OLD profession after
  // the scramble); pass an ISO string to simulate a post-021 edit.
  async function insertScrambledRow(updatedAt: string = 'Ingénieur'): Promise<void> {
    await sql`
      INSERT INTO patient (
        id, civilite, nom, prenom, date_naissance, nir, telephone, email,
        adresse, mutuelle, medecin_traitant, allergies,
        photo, nip, lieu_naissance, residence_code, complement_adresse,
        region, profession, automerge_id, created_at, updated_at
      ) VALUES (
        1, 'M', 'DUPONT', 'Jean', '1975-04-12', '185COXGJLE', '0102030405',
        'jean@example.com', '1 rue de Paris', 'MGEN', 'Dr Martin', '[]',
        'auto-AAA-001', '2024-01-15 10:30:00', '2024-06-01 08:00:00',
        '/photos/jean.jpg', '185COXGJLE', 'Conakry', 'RC-101', 'Bat B 3e étage',
        'Conakry', ${updatedAt}
      )
    `.execute(db)
  }

  it('restores the true values of every scrambled column', async () => {
    await sql.raw(PRE_021_PATIENT_DDL).execute(db)
    await insertScrambledRow()

    await expect(up(db)).resolves.toBeUndefined()

    const row = await patientRow()
    expect(row.photo).toBe('/photos/jean.jpg')          // was auto-AAA-001
    expect(row.nip).toBe('185COXGJLE')                  // was datetime
    expect(row.lieu_naissance).toBe('Conakry')          // was updated_at
    expect(row.residence_code).toBe('RC-101')           // was photo
    expect(row.complement_adresse).toBe('Bat B 3e étage') // was nip
    expect(row.region).toBe('Conakry')                  // was lieu_naissance
    expect(row.profession).toBe('Ingénieur')            // was residence_code
    expect(row.automerge_id).toBe('auto-AAA-001')       // was complement_adresse
    expect(row.created_at).toBe('2024-01-15 10:30:00')  // was region
    expect(row.updated_at).toBe('2024-06-01 08:00:00')  // was profession
  })

  it('yields NULL (not an ISO string) for profession when updated_at was overwritten post-021', async () => {
    await sql.raw(PRE_021_PATIENT_DDL).execute(db)
    // Simulate a scrambled row edited at least once between 021 and 095:
    // patient.service.ts stamped `updated_at = new Date().toISOString()`,
    // destroying the true profession value physically held in that column.
    await insertScrambledRow('2024-03-14T09:30:00.000Z')

    await expect(up(db)).resolves.toBeUndefined()

    const row = await patientRow()
    expect(row.profession).toBeNull()                       // ISO overwrite → NULL, not garbage
    expect(row.updated_at).toBe('2024-06-01 08:00:00')      // restored from lieu_naissance
    expect(row.automerge_id).toBe('auto-AAA-001')           // was complement_adresse
    expect(row.nip).toBe('185COXGJLE')                      // was datetime
    expect(row.lieu_naissance).toBe('Conakry')              // was region
    expect(row.residence_code).toBe('RC-101')               // was photo
    expect(row.complement_adresse).toBe('Bat B 3e étage')   // was nip
    expect(row.region).toBe('Conakry')                      // was created_at
    expect(row.photo).toBe('/photos/jean.jpg')              // was automerge_id
    expect(row.created_at).toBe('2024-01-15 10:30:00')      // was region
  })

  it('is idempotent and a no-op on non-scrambled (correct) rows', async () => {
    await sql.raw(PRE_021_PATIENT_DDL).execute(db)
    // Correct / non-scrambled row: nip is a real NIP, never a datetime.
    await sql`
      INSERT INTO patient (
        id, civilite, nom, prenom, date_naissance, nir, telephone, email,
        adresse, mutuelle, medecin_traitant, allergies,
        photo, nip, lieu_naissance, residence_code, complement_adresse,
        region, profession, automerge_id, created_at, updated_at
      ) VALUES (
        1, 'M', 'DUPONT', 'Jean', '1975-04-12', '185COXGJLE', '0102030405',
        'jean@example.com', '1 rue de Paris', 'MGEN', 'Dr Martin', '[]',
        '/photos/jean.jpg', '185COXGJLE', 'Conakry', 'RC-101', 'Bat B 3e étage',
        'Conakry', 'Ingénieur', 'auto-AAA-001', '2024-01-15 10:30:00',
        '2024-06-01 08:00:00'
      )
    `.execute(db)

    await expect(up(db)).resolves.toBeUndefined()
    // First run must NOT touch a correct row.
    let row = await patientRow()
    expect(row.nip).toBe('185COXGJLE')
    expect(row.photo).toBe('/photos/jean.jpg')
    expect(row.profession).toBe('Ingénieur')

    // Second run must also be a no-op (matches nothing).
    await expect(up(db)).resolves.toBeUndefined()
    row = await patientRow()
    expect(row.nip).toBe('185COXGJLE')
    expect(row.region).toBe('Conakry')
  })
})
