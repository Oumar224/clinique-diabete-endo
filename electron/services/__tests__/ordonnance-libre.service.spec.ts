import 'reflect-metadata'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import { container } from 'tsyringe'
import { AppDatabaseDatasource } from '../../sqlite-data-source'
import { OrdonnanceLibreService } from '../ordonnance-libre.service'

const ORDONNANCE_LIBRE_TYPE_ID = '22222222-2222-4222-2222-222222222222'

describe('OrdonnanceLibreService', () => {
  let tempDir: string
  let dbPath: string

  beforeEach(async () => {
    container.clearInstances()
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cd-ordonnance-libre-test-'))
    dbPath = path.join(tempDir, 'test.db')
    container.register('DB_PATH', { useValue: dbPath })
    const datasource = container.resolve(AppDatabaseDatasource)
    await datasource.initialize()
  })

  afterEach(() => {
    container.clearInstances()
    try {
      if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath)
      fs.rmSync(tempDir, { recursive: true, force: true })
    } catch { /* best-effort cleanup */ }
  })

  async function createTestPatient(): Promise<number> {
    const db = container.resolve(AppDatabaseDatasource).getInstance()
    const p = await db
      .insertInto('patient')
      .values({
        civilite: 'M',
        nom: 'Patient',
        prenom: 'Test',
        date_naissance: '1980-01-01',
        nir: `1${String(Math.random()).slice(2, 15)}`,
        telephone: '0611111111',
      })
      .returningAll()
      .executeTakeFirstOrThrow()
    return p.id!
  }

  async function createTestUser(): Promise<number> {
    const db = container.resolve(AppDatabaseDatasource).getInstance()
    const u = await db
      .insertInto('user')
      .values({
        nom: 'Medecin',
        prenom: 'Test',
        email: `medecin${Math.random()}@test.com`,
        password_hash: 'hash',
        role: 'MEDECIN',
      })
      .returningAll()
      .executeTakeFirstOrThrow()
    return u.id!
  }

  async function createTestService(): Promise<number> {
    const db = container.resolve(AppDatabaseDatasource).getInstance()
    const s = await db
      .insertInto('services')
      .values({
        name: `Service Test ${Math.random()}`,
        description: 'Test service',
      })
      .returningAll()
      .executeTakeFirstOrThrow()
    return s.id!
  }

  async function createTestEncounter(patientId: number, userId: number): Promise<number> {
    const db = container.resolve(AppDatabaseDatasource).getInstance()
    const serviceId = await createTestService()
    const e = await db
      .insertInto('encounters')
      .values({
        patient_id: patientId,
        contact_type: 'consultation',
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 86400000).toISOString(),
        service_id: serviceId,
        medecin_id: userId,
        origin: 'auto_refere',
        zone_situation: 'zone_responsabilite',
        prise_en_charge: 'maladie_naturelle',
        status: 'active',
        created_by: userId,
      })
      .returningAll()
      .executeTakeFirstOrThrow()
    return e.id!
  }

  async function createTestPrescription(patientId: number, userId: number, overrides?: Record<string, any>): Promise<number> {
    const db = container.resolve(AppDatabaseDatasource).getInstance()
    const p = await db
      .insertInto('prescriptions')
      .values({
        patient_id: patientId,
        medicament: 'Paracétamol',
        dosage: '500mg',
        voie: 'PO',
        duree: 7,
        frequence: 'Matin,Midi,Soir',
        prescripteur_id: userId,
        statut: 'active',
        prescription_type: 'medicament',
        ...overrides,
      })
      .returningAll()
      .executeTakeFirstOrThrow()
    return p.id!
  }

  async function createTestDocument(
    encounterId: number,
    userId: number,
    form_data?: Record<string, any>,
  ): Promise<string> {
    const db = container.resolve(AppDatabaseDatasource).getInstance()
    const docId = `doc-${Date.now()}-${Math.random().toString(36).slice(2)}`
    await db
      .insertInto('patient_clinical_documents')
      .values({
        id: docId,
        contact_id: String(encounterId),
        document_type_id: ORDONNANCE_LIBRE_TYPE_ID,
        title: 'Ordonnance Libre Test',
        status: 'draft',
        form_data: form_data ? JSON.stringify(form_data) : null,
        created_by: String(userId),
      })
      .executeTakeFirstOrThrow()
    return docId
  }

  // ─── listByPatient ──────────────────────────────────────────────

  it('should list ordonnance libre documents for a patient', async () => {
    const service = container.resolve(OrdonnanceLibreService)
    const patientId = await createTestPatient()
    const userId = await createTestUser()
    const encounterId = await createTestEncounter(patientId, userId)

    await createTestDocument(encounterId, userId, { linkedPrescriptionIds: [] })

    const results = await service.listByPatient(patientId)
    expect(results).toHaveLength(1)
    expect(results[0].document_type_code).toBe('ORDONNANCE_LIBRE')
    expect(results[0].title).toBe('Ordonnance Libre Test')
    expect(results[0].medecin_nom).toBe('Medecin')
    expect(results[0].medecin_prenom).toBe('Test')
  })

  it('should return empty list when no ordonnance libre exists', async () => {
    const service = container.resolve(OrdonnanceLibreService)
    const patientId = await createTestPatient()

    const results = await service.listByPatient(patientId)
    expect(results).toHaveLength(0)
  })

  it('should only return ordonnance libre documents, not other document types', async () => {
    const service = container.resolve(OrdonnanceLibreService)
    const patientId = await createTestPatient()
    const userId = await createTestUser()
    const encounterId = await createTestEncounter(patientId, userId)
    const db = container.resolve(AppDatabaseDatasource).getInstance()

    await createTestDocument(encounterId, userId)

    const otherDocId = `doc-other-${Date.now()}`
    await db
      .insertInto('patient_clinical_documents')
      .values({
        id: otherDocId,
        contact_id: String(encounterId),
        document_type_id: '11111111-1111-4111-1111-111111111111',
        title: 'Consultation Note',
        status: 'draft',
        created_by: String(userId),
      })
      .executeTakeFirstOrThrow()

    const results = await service.listByPatient(patientId)
    expect(results).toHaveLength(1)
    expect(results[0].document_type_code).toBe('ORDONNANCE_LIBRE')
  })

  // ─── getById ────────────────────────────────────────────────────

  it('should get ordonnance libre by id', async () => {
    const service = container.resolve(OrdonnanceLibreService)
    const patientId = await createTestPatient()
    const userId = await createTestUser()
    const encounterId = await createTestEncounter(patientId, userId)

    const docId = await createTestDocument(encounterId, userId)

    const result = await service.getById(docId)
    expect(result).toBeDefined()
    expect(result!.id).toBe(docId)
    expect(result!.document_type_code).toBe('ORDONNANCE_LIBRE')
    expect(result!.title).toBe('Ordonnance Libre Test')
  })

  it('should return undefined for non-existent id', async () => {
    const service = container.resolve(OrdonnanceLibreService)

    const result = await service.getById('non-existent-id')
    expect(result).toBeUndefined()
  })

  // ─── linked prescriptions in listByPatient ─────────────────────

  it('should resolve linked prescriptions in listByPatient', async () => {
    const service = container.resolve(OrdonnanceLibreService)
    const patientId = await createTestPatient()
    const userId = await createTestUser()
    const encounterId = await createTestEncounter(patientId, userId)

    const rx1Id = await createTestPrescription(patientId, userId)
    const rx2Id = await createTestPrescription(patientId, userId, {
      medicament: 'Ibuprofène',
      dosage: '200mg',
    })

    await createTestDocument(encounterId, userId, {
      linkedPrescriptionIds: [rx1Id, rx2Id],
    })

    const results = await service.listByPatient(patientId)
    expect(results).toHaveLength(1)
    expect(results[0].linkedPrescriptions).toHaveLength(2)

    const medecaments = results[0].linkedPrescriptions.map((p: any) => p.medicament)
    expect(medecaments).toContain('Paracétamol')
    expect(medecaments).toContain('Ibuprofène')
  })

  it('should return empty linkedPrescriptions when form_data has no linkedPrescriptionIds', async () => {
    const service = container.resolve(OrdonnanceLibreService)
    const patientId = await createTestPatient()
    const userId = await createTestUser()
    const encounterId = await createTestEncounter(patientId, userId)

    await createTestDocument(encounterId, userId, { notes: 'Some notes' })

    const results = await service.listByPatient(patientId)
    expect(results).toHaveLength(1)
    expect(results[0].linkedPrescriptions).toHaveLength(0)
  })

  it('should return empty linkedPrescriptions when form_data is null', async () => {
    const service = container.resolve(OrdonnanceLibreService)
    const patientId = await createTestPatient()
    const userId = await createTestUser()
    const encounterId = await createTestEncounter(patientId, userId)

    await createTestDocument(encounterId, userId)

    const results = await service.listByPatient(patientId)
    expect(results).toHaveLength(1)
    expect(results[0].linkedPrescriptions).toHaveLength(0)
  })

  // ─── linked prescriptions in getById ───────────────────────────

  it('should resolve linked prescriptions in getById', async () => {
    const service = container.resolve(OrdonnanceLibreService)
    const patientId = await createTestPatient()
    const userId = await createTestUser()
    const encounterId = await createTestEncounter(patientId, userId)

    const rx1Id = await createTestPrescription(patientId, userId)

    const docId = await createTestDocument(encounterId, userId, {
      linkedPrescriptionIds: [rx1Id],
    })

    const result = await service.getById(docId)
    expect(result).toBeDefined()
    expect(result!.linkedPrescriptions).toHaveLength(1)
    expect(result!.linkedPrescriptions[0].medicament).toBe('Paracétamol')
  })

  it('should return empty linkedPrescriptions in getById when none linked', async () => {
    const service = container.resolve(OrdonnanceLibreService)
    const patientId = await createTestPatient()
    const userId = await createTestUser()
    const encounterId = await createTestEncounter(patientId, userId)

    const docId = await createTestDocument(encounterId, userId, { linkedPrescriptionIds: [] })

    const result = await service.getById(docId)
    expect(result).toBeDefined()
    expect(result!.linkedPrescriptions).toHaveLength(0)
  })
})
