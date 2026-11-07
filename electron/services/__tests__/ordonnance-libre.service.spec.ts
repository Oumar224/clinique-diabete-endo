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

  // ─── flags de transfert pharmacie ───────────────────────────────

  it('should expose hasMedicamentLines and dejaTransferee in listByPatient', async () => {
    const service = container.resolve(OrdonnanceLibreService)
    const db = container.resolve(AppDatabaseDatasource).getInstance()
    const patientId = await createTestPatient()
    const userId = await createTestUser()
    const encounterId = await createTestEncounter(patientId, userId)

    const medDocId = await createTestDocument(encounterId, userId, {
      items: [{ categorie: 'medicament', medicament: 'Metformine 500 mg' }],
    })
    const examDocId = await createTestDocument(encounterId, userId, {
      items: [{ categorie: 'examen', examen: 'NFS' }],
    })
    const sortieDocId = await createTestDocument(encounterId, userId, {
      ordonnanceSortie: [{ categorie: 'medicament', medicament: 'Amlodipine 5 mg' }],
    })

    await db
      .insertInto('delivrances')
      .values({
        source: 'ordonnance_libre',
        source_document_id: medDocId,
        patient_id: patientId,
        statut: 'a_servir',
      })
      .execute()

    const results = await service.listByPatient(patientId)
    const byId = new Map(results.map((row) => [row.id, row]))

    expect(byId.get(medDocId)).toMatchObject({ hasMedicamentLines: true, dejaTransferee: true })
    expect(byId.get(examDocId)).toMatchObject({ hasMedicamentLines: false, dejaTransferee: false })
    expect(byId.get(sortieDocId)).toMatchObject({ hasMedicamentLines: true, dejaTransferee: false })
  })

  it('should expose the same transfer flags in getById', async () => {
    const service = container.resolve(OrdonnanceLibreService)
    const db = container.resolve(AppDatabaseDatasource).getInstance()
    const patientId = await createTestPatient()
    const userId = await createTestUser()
    const encounterId = await createTestEncounter(patientId, userId)

    const docId = await createTestDocument(encounterId, userId, {
      items: [{ categorie: 'medicament', medicament: 'Paracétamol' }],
    })
    await db
      .insertInto('delivrances')
      .values({
        source: 'ordonnance_libre',
        source_document_id: docId,
        patient_id: patientId,
        statut: 'a_servir',
      })
      .execute()

    const result = await service.getById(docId)
    expect(result).toMatchObject({ hasMedicamentLines: true, dejaTransferee: true })
  })

  it('should ignore linkedPrescriptionIds alone when computing transfer eligibility', async () => {
    const service = container.resolve(OrdonnanceLibreService)
    const patientId = await createTestPatient()
    const userId = await createTestUser()
    const encounterId = await createTestEncounter(patientId, userId)
    const rxId = await createTestPrescription(patientId, userId)

    await createTestDocument(encounterId, userId, { linkedPrescriptionIds: [rxId] })

    const [row] = await service.listByPatient(patientId)
    expect(row.hasMedicamentLines).toBe(false)
    expect(row.dejaTransferee).toBe(false)
  })

  // ─── createFromGroup (génération d'ordonnance par groupe CRH/CRC) ────

  const GROUP_FINGERPRINT = {
    patientId: 0,
    contactId: '0',
    serviceId: null,
    siteId: null,
    createdBy: '0',
    title: 'CRH - 16/08/2026',
    sourceDocumentId: 'doc-crh-abc',
    categorie: 'medicament' as const,
    items: [
      { _key: 'k1', categorie: 'medicament', medicament: 'Metformine 500 mg', dosage: '500', unite: 'mg', voie: 'PO', frequence: ['Matin', 'Soir'] },
    ],
  }

  async function resolveFingerprint(): Promise<typeof GROUP_FINGERPRINT> {
    const patientId = await createTestPatient()
    const userId = await createTestUser()
    const encounterId = await createTestEncounter(patientId, userId)
    return { ...GROUP_FINGERPRINT, patientId, createdBy: String(userId), contactId: String(encounterId) }
  }

  it('should create a new draft ORDONNANCE_LIBRE document from a CRH group', async () => {
    const service = container.resolve(OrdonnanceLibreService)
    const params = await resolveFingerprint()

    const result = await service.createOrReplaceFromGroup(params)

    expect(result.replaced).toBe(false)
    expect(result.documentId).toBeTruthy()

    const docs = await service.listByPatient(params.patientId)
    expect(docs).toHaveLength(1)
    expect(docs[0].document_type_code).toBe('ORDONNANCE_LIBRE')
    expect(docs[0].title).toBe('CRH - 16/08/2026')
    expect(docs[0].status).toBe('draft')
    const fd = JSON.parse(docs[0].form_data)
    expect(fd.source).toBe('crh')
    expect(fd.sourceDocumentId).toBe('doc-crh-abc')
    expect(fd.categorie).toBe('medicament')
    expect(fd.items).toEqual(params.items)
  })

  it('should replace the existing document when the (source, sourceDocumentId, categorie) fingerprint matches', async () => {
    const service = container.resolve(OrdonnanceLibreService)
    const params = await resolveFingerprint()

    const first = await service.createOrReplaceFromGroup(params)
    const second = await service.createOrReplaceFromGroup({
      ...params,
      title: 'CRH - 17/08/2026',
    })

    expect(second.replaced).toBe(true)
    expect(second.documentId).toBe(first.documentId)

    const docs = await service.listByPatient(params.patientId)
    expect(docs).toHaveLength(1) // pas de doublon : le document est mis à jour en place
    const fd = JSON.parse(docs[0].form_data)
    expect(fd.title).toBe('CRH - 17/08/2026')
    expect(fd.items).toEqual(params.items)
  })

  it('should create a separate document for a different categorie (same source document)', async () => {
    const service = container.resolve(OrdonnanceLibreService)
    const params = await resolveFingerprint()

    const medicament = await service.createOrReplaceFromGroup(params)
    const soins = await service.createOrReplaceFromGroup({
      ...params,
      categorie: 'soins',
      items: [{ _key: 'k2', categorie: 'soins', medicament: 'Pansement quotidien', frequence: ['1/jour'] }],
    })

    expect(medicament.replaced).toBe(false)
    expect(soins.replaced).toBe(false)
    expect(soins.documentId).not.toBe(medicament.documentId)

    const docs = await service.listByPatient(params.patientId)
    const categories = docs
      .map((d: any) => JSON.parse(d.form_data).categorie)
      .sort()
    expect(categories).toEqual(['medicament', 'soins'])
  })

  it('should create a separate document for a different sourceDocumentId', async () => {
    const service = container.resolve(OrdonnanceLibreService)
    const params = await resolveFingerprint()

    const first = await service.createOrReplaceFromGroup(params)
    const second = await service.createOrReplaceFromGroup({
      ...params,
      sourceDocumentId: 'doc-crc-def',
    })

    expect(second.replaced).toBe(false)
    expect(second.documentId).not.toBe(first.documentId)
  })

  it('should NOT replace a legacy ordonnance libre without the crh fingerprint (ex: ordonnanceSortie)', async () => {
    const service = container.resolve(OrdonnanceLibreService)
    const params = await resolveFingerprint()

    // document legacy créé via le helper (form_data "ordonnanceSortie", sans source)
    await createTestDocument(Number(params.contactId), Number(params.createdBy), {
      ordonnanceSortie: [{ categorie: 'medicament', medicament: 'Legacy' }],
    })

    const result = await service.createOrReplaceFromGroup(params)

    expect(result.replaced).toBe(false)

    const docs = await service.listByPatient(params.patientId)
    expect(docs).toHaveLength(2)
  })

  // ─── matcher défensif (Task 3) ─────────────────────────────────

  it('should NOT replace an ordonnance libre from ANOTHER patient even with matching fingerprint', async () => {
    const service = container.resolve(OrdonnanceLibreService)
    const params = await resolveFingerprint()
    await service.createOrReplaceFromGroup(params)

    // un autre patient avec le même (source, sourceDocumentId, categorie)
    const otherPatientId = await createTestPatient()
    const otherUser = await createTestUser()
    const otherEncounterId = await createTestEncounter(otherPatientId, otherUser)
    const other = await service.createOrReplaceFromGroup({
      ...params,
      patientId: otherPatientId,
      contactId: String(otherEncounterId),
    })

    expect(other.replaced).toBe(false)
    expect(await service.listByPatient(otherPatientId)).toHaveLength(1)
    // le document du patient A reste intact et unique
    expect(await service.listByPatient(params.patientId)).toHaveLength(1)
  })

  it('should NOT replace when categorie differs (already covered) and should create a new doc', async () => {
    const service = container.resolve(OrdonnanceLibreService)
    const params = await resolveFingerprint()
    await service.createOrReplaceFromGroup(params)
    const result = await service.createOrReplaceFromGroup({ ...params, categorie: 'examen' })

    expect(result.replaced).toBe(false)
    const docs = await service.listByPatient(params.patientId)
    expect(docs).toHaveLength(2)
  })

  it('should NOT crash nor replace when form_data is not an object (ex: JSON array or scalar)', async () => {
    const service = container.resolve(OrdonnanceLibreService)
    const params = await resolveFingerprint()
    // form_data valide en JSON mais PAS un objet (ex: tableau) → ne doit ni matcher ni crasher
    await createTestDocument(Number(params.contactId), Number(params.createdBy), {} as any)
    const db = container.resolve(AppDatabaseDatasource).getInstance()
    await db
      .updateTable('patient_clinical_documents')
      .set({ form_data: JSON.stringify([{ source: 'crh', sourceDocumentId: params.sourceDocumentId, categorie: params.categorie }]) })
      .where('contact_id', '=', String(params.contactId))
      .execute()

    const result = await service.createOrReplaceFromGroup(params)
    expect(result.replaced).toBe(false)

    const docs = await service.listByPatient(params.patientId)
    expect(docs).toHaveLength(2)
  })

  it('should NOT match when form_data contains an unrelated scalar fingerprint', async () => {
    const service = container.resolve(OrdonnanceLibreService)
    const params = await resolveFingerprint()
    const db = container.resolve(AppDatabaseDatasource).getInstance()
    await db
      .insertInto('patient_clinical_documents')
      .values({
        id: `doc-scalar-${Date.now()}`,
        contact_id: String(params.contactId),
        document_type_id: ORDONNANCE_LIBRE_TYPE_ID,
        title: 'Scalar',
        status: 'draft',
        form_data: JSON.stringify('just a string'),
        created_by: String(params.createdBy),
      })
      .executeTakeFirstOrThrow()

    const result = await service.createOrReplaceFromGroup(params)
    expect(result.replaced).toBe(false)
  })

  describe('validateCreateFromGroup', () => {
    it('rejects an empty items array', async () => {
      const { validateCreateFromGroup } = await import('../ordonnance-libre.service')
      expect(() => validateCreateFromGroup({ items: [], categorie: 'medicament' })).toThrow(/non vide/)
    })

    it('rejects a non-array items', async () => {
      const { validateCreateFromGroup } = await import('../ordonnance-libre.service')
      expect(() => validateCreateFromGroup({ items: 'nope', categorie: 'medicament' })).toThrow(/tableau non vide/)
    })

    it('rejects an out-of-allowlist categorie', async () => {
      const { validateCreateFromGroup } = await import('../ordonnance-libre.service')
      expect(() => validateCreateFromGroup({ items: [{ x: 1 }], categorie: 'urgences' })).toThrow(/categorie invalide/)
    })

    it('accepts a valid non-empty group for every allowlisted categorie', async () => {
      const { validateCreateFromGroup, ORDONNANCE_LIBRE_CATEGORIES } = await import('../ordonnance-libre.service')
      for (const categorie of ORDONNANCE_LIBRE_CATEGORIES) {
        expect(() => validateCreateFromGroup({ items: [{ x: 1 }], categorie })).not.toThrow()
      }
    })
  })
})
