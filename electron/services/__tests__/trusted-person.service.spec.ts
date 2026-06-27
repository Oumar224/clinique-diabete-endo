import 'reflect-metadata'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import { container } from 'tsyringe'
import { AppDatabaseDatasource } from '../../sqlite-data-source'
import { TrustedPersonService } from '../trusted-person.service'

describe('TrustedPersonService', () => {
  let tempDir: string
  let dbPath: string
  let service: TrustedPersonService
  let datasource: AppDatabaseDatasource
  let patientId: number
  let patientId2: number

  beforeEach(async () => {
    container.clearInstances()
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cd-trusted-person-test-'))
    dbPath = path.join(tempDir, 'test.db')
    container.register('DB_PATH', { useValue: dbPath })
    datasource = container.resolve(AppDatabaseDatasource)
    await datasource.initialize()
    service = container.resolve(TrustedPersonService)
    const db = datasource.getInstance()

    // Create two test patients to attach trusted persons to
    const p1 = await db
      .insertInto('patient')
      .values({
        civilite: 'M',
        nom: 'Diallo',
        prenom: 'Amadou',
        date_naissance: '1985-06-15',
        nir: '1850615123456',
        telephone: '0612345678',
      })
      .returningAll()
      .executeTakeFirstOrThrow()
    patientId = p1.id!

    const p2 = await db
      .insertInto('patient')
      .values({
        civilite: 'Mme',
        nom: 'Barry',
        prenom: 'Fatoumata',
        date_naissance: '1990-01-01',
        nir: '2900101123456',
        telephone: '0623456789',
      })
      .returningAll()
      .executeTakeFirstOrThrow()
    patientId2 = p2.id!
  })

  afterEach(() => {
    container.clearInstances()
    try {
      if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath)
      fs.rmSync(tempDir, { recursive: true, force: true })
    } catch {
      /* cleanup best-effort */
    }
  })

  // ─── Create (upsert — insert path) ───────────────────────────────────

  it('creates a trusted person and returns DTO with all fields', async () => {
    const result = await service.upsert({
      patient_id: patientId,
      has_trusted: true,
      nom: 'Toure',
      prenom: 'Mariam',
      profession: 'Infirmiere',
      residence: 'Conakry',
      residence_code: 'GN-CONAKRY-COM-MATAM',
      telephone: '0611111111',
      email: 'm.toure@example.com',
      complement_adresse: 'Porte 123',
      lien_parente: 'Soeur',
      attachments: '[]',
    })

    expect(result).toBeDefined()
    expect(result.id).toBeGreaterThan(0)
    expect(result.patient_id).toBe(patientId)
    expect(result.has_trusted).toBe(true)
    expect(result.nom).toBe('Toure')
    expect(result.prenom).toBe('Mariam')
    expect(result.profession).toBe('Infirmiere')
    expect(result.residence).toBe('Conakry')
    expect(result.residence_code).toBe('GN-CONAKRY-COM-MATAM')
    expect(result.telephone).toBe('0611111111')
    expect(result.email).toBe('m.toure@example.com')
    expect(result.lien_parente).toBe('Soeur')
    expect(result.created_at).toBeDefined()
    expect(result.updated_at).toBeDefined()
  })

  it('creates a trusted person with minimal fields (has_trusted = false)', async () => {
    const result = await service.upsert({
      patient_id: patientId2,
      has_trusted: false,
    })

    expect(result.patient_id).toBe(patientId2)
    expect(result.has_trusted).toBe(false)
    expect(result.nom).toBeNull()
  })

  // ─── GetByPatientId ──────────────────────────────────────────────────

  it('retrieves a trusted person by patient ID when one exists', async () => {
    await service.upsert({
      patient_id: patientId,
      has_trusted: true,
      nom: 'Toure',
      prenom: 'Mariam',
    })

    const found = await service.getByPatientId(patientId)
    expect(found).not.toBeNull()
    expect(found!.patient_id).toBe(patientId)
    expect(found!.nom).toBe('Toure')
    expect(found!.has_trusted).toBe(true)
  })

  it('returns null when no trusted person exists for the given patient', async () => {
    const found = await service.getByPatientId(patientId)
    expect(found).toBeNull()
  })

  it('returns null for non-existent patient ID (no trusted person rows)', async () => {
    const found = await service.getByPatientId(9999)
    expect(found).toBeNull()
  })

  // ─── Update (upsert — update path) ───────────────────────────────────

  it('updates an existing trusted person (upsert update path)', async () => {
    // Create
    await service.upsert({
      patient_id: patientId,
      has_trusted: true,
      nom: 'Toure',
      prenom: 'Mariam',
      telephone: '0611111111',
    })

    // Update with same patient_id — changes fields
    const updated = await service.upsert({
      patient_id: patientId,
      has_trusted: true,
      nom: 'Toure',
      prenom: 'Mariam',
      telephone: '0622222222',     // changed
      email: 'updated@example.com', // new field
    })

    expect(updated.telephone).toBe('0622222222')
    expect(updated.email).toBe('updated@example.com')
    // Fields not in the update DTO should retain old values
    expect(updated.nom).toBe('Toure')
  })

  it('upsert with has_trusted=false updates the flag without losing other data', async () => {
    await service.upsert({
      patient_id: patientId,
      has_trusted: true,
      nom: 'Toure',
      prenom: 'Mariam',
    })

    const updated = await service.upsert({
      patient_id: patientId,
      has_trusted: false,
    })

    expect(updated.has_trusted).toBe(false)
    // Previously set data should be preserved since they are not overwritten
    expect(updated.nom).toBe('Toure')
    expect(updated.prenom).toBe('Mariam')
  })

  it('upsert preserves data isolation between patients', async () => {
    const tp1 = await service.upsert({
      patient_id: patientId,
      has_trusted: true,
      nom: 'PersonOne',
    })

    const tp2 = await service.upsert({
      patient_id: patientId2,
      has_trusted: true,
      nom: 'PersonTwo',
    })

    // Trusted_persons now has a UNIQUE constraint on patient_id,
    // so there should be exactly one row per patient
    expect(tp1.patient_id).toBe(patientId)
    expect(tp1.nom).toBe('PersonOne')
    expect(tp2.patient_id).toBe(patientId2)
    expect(tp2.nom).toBe('PersonTwo')
  })

  // ─── Delete ──────────────────────────────────────────────────────────

  it('deletes a trusted person by patient ID', async () => {
    await service.upsert({
      patient_id: patientId,
      has_trusted: true,
      nom: 'ToDelete',
    })

    await service.delete(patientId)

    const found = await service.getByPatientId(patientId)
    expect(found).toBeNull()
  })

  it('delete is idempotent — does not throw when no trusted person exists', async () => {
    // No trusted person exists for patientId
    await expect(service.delete(patientId)).resolves.not.toThrow()
  })

  it('delete only removes the targeted patient\'s trusted person', async () => {
    await service.upsert({
      patient_id: patientId,
      has_trusted: true,
      nom: 'KeepMe',
    })
    await service.upsert({
      patient_id: patientId2,
      has_trusted: true,
      nom: 'DeleteMe',
    })

    await service.delete(patientId2)

    const remaining = await service.getByPatientId(patientId)
    expect(remaining).not.toBeNull()
    expect(remaining!.nom).toBe('KeepMe')

    const deleted = await service.getByPatientId(patientId2)
    expect(deleted).toBeNull()
  })

  // ─── UNIQUE constraint on patient_id (migration 024) ─────────────────

  it('enforces UNIQUE constraint on patient_id — second upsert updates instead of inserting', async () => {
    // Create the first trusted person for this patient
    await service.upsert({
      patient_id: patientId,
      has_trusted: true,
      nom: 'First',
    })

    // Upsert again with same patient_id — should update, not insert
    // The UNIQUE index ensures at most one row per patient_id
    const result = await service.upsert({
      patient_id: patientId,
      has_trusted: true,
      nom: 'Second',  // updated
    })
    expect(result.nom).toBe('Second')

    // Verify only ONE row exists for this patient
    const db = datasource.getInstance()
    const rows = await db
      .selectFrom('trusted_persons')
      .selectAll()
      .where('patient_id', '=', patientId)
      .execute()
    expect(rows.length).toBe(1)
  })
})
