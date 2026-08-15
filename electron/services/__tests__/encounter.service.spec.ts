import 'reflect-metadata'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import { container } from 'tsyringe'
import { AppDatabaseDatasource } from '../../sqlite-data-source'
import { EncounterService } from '../encounter.service'
import { PatientService } from '../patient.service'
import { ServiceService } from '../service.service'
import { ClinicalDocumentService } from '../clinical-document.service'

const CRH_DIABETE_TYPE_ID = '11111111-1111-4111-1111-111111111111'

describe('EncounterService', () => {
  let tempDir: string
  let dbPath: string

  beforeEach(async () => {
    container.clearInstances()
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cd-enc-test-'))
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
    } catch { /* best-effort */ }
  })

  async function createTestPatient(): Promise<number> {
    const patientService = container.resolve(PatientService)
    const nir = `1${String(Math.random()).slice(2, 15)}`
    const patient = await patientService.create({
      nom: 'Dupont',
      prenom: 'Jean',
      civilite: 'M',
      date_naissance: '1980-01-15',
      nir,
      telephone: '0600000000',
    })
    return patient.id!
  }

  async function createTestService(): Promise<number> {
    const serviceService = container.resolve(ServiceService)
    const svc = await serviceService.create({ name: 'Médecine Générale', code: 'MED-GEN' })
    return svc.id!
  }

  // ─── Create ─────────────────────────────────────────────────────

  it('should create an encounter and return it with default 24h end_date', async () => {
    const service = container.resolve(EncounterService)
    const patientId = await createTestPatient()
    const serviceId = await createTestService()

    const dto = {
      patient_id: patientId,
      contact_type: 'consultation',
      start_date: new Date().toISOString(),
      service_id: serviceId,
      origin: 'auto_refere',
      zone_situation: 'zone_responsabilite',
      prise_en_charge: 'maladie_naturelle',
    }

    const result = await service.create(dto)

    expect(result.id).toBeDefined()
    expect(result.patient_id).toBe(patientId)
    expect(result.contact_type).toBe('consultation')
    expect(result.service_id).toBe(serviceId)
    expect(result.status).toBe('active')

    const startMs = new Date(result.start_date).getTime()
    const endMs = new Date(result.end_date!).getTime()
    const diffHours = (endMs - startMs) / (1000 * 60 * 60)
    expect(diffHours).toBeCloseTo(24, 0)
  })

  it('should create an encounter with optional fields', async () => {
    const service = container.resolve(EncounterService)
    const patientId = await createTestPatient()
    const serviceId = await createTestService()

    const dto = {
      patient_id: patientId,
      contact_type: 'urgence',
      contact_type_precision: 'Urgence vitale',
      start_date: new Date().toISOString(),
      service_id: serviceId,
      medecin_id: null,
      origin: 'domicile',
      origin_precision: 'Domicile patient',
      zone_situation: 'hors_zone',
      zone_precision: 'Région X',
      prise_en_charge: 'accident_circulation',
      prise_en_charge_precision: 'Assurance XYZ',
      sinistre_info: 'SIN123',
      notes: 'Patient transporté par ambulance',
      created_by: 1,
    }

    const result = await service.create(dto)
    expect(result.contact_type).toBe('urgence')
    expect(result.origin).toBe('domicile')
    expect(result.sinistre_info).toBe('SIN123')
    expect(result.notes).toBe('Patient transporté par ambulance')
  })

  it('should reject create with invalid patient_id', async () => {
    const service = container.resolve(EncounterService)
    const serviceId = await createTestService()

      await expect(
        service.create({
          patient_id: 99999,
          contact_type: 'consultation',
          start_date: new Date().toISOString(),
          service_id: serviceId,
          origin: 'auto_refere',
          zone_situation: 'zone_responsabilite',
          prise_en_charge: 'maladie_naturelle',
        })
      ).rejects.toThrow("n'existe pas dans la base de données")
  })

  it('should reject create with invalid service_id', async () => {
    const service = container.resolve(EncounterService)
    const patientId = await createTestPatient()

      await expect(
        service.create({
          patient_id: patientId,
          contact_type: 'consultation',
          start_date: new Date().toISOString(),
          service_id: 99999,
          origin: 'auto_refere',
          zone_situation: 'zone_responsabilite',
          prise_en_charge: 'maladie_naturelle',
        })
      ).rejects.toThrow("n'existe pas dans la base de données")
  })

  it('should reject create with invalid medecin_id', async () => {
    const service = container.resolve(EncounterService)
    const patientId = await createTestPatient()
    const serviceId = await createTestService()

      await expect(
        service.create({
          patient_id: patientId,
          contact_type: 'consultation',
          start_date: new Date().toISOString(),
          service_id: serviceId,
          medecin_id: 99999,
          origin: 'auto_refere',
          zone_situation: 'zone_responsabilite',
          prise_en_charge: 'maladie_naturelle',
        })
      ).rejects.toThrow("n'existe pas dans la base de données")
  })

  it('should accept null optional foreign keys (medecin_id, responsable_id, etc.)', async () => {
    const service = container.resolve(EncounterService)
    const patientId = await createTestPatient()
    const serviceId = await createTestService()

    const result = await service.create({
      patient_id: patientId,
      contact_type: 'consultation',
      start_date: new Date().toISOString(),
      service_id: serviceId,
      medecin_id: null,
      responsable_id: null,
      care_unit_id: null,
      created_by: null,
      origin: 'domicile',
      zone_situation: 'hors_zone',
      zone_precision: 'Région test',
      prise_en_charge: 'maladie_naturelle',
    })

    expect(result.id).toBeDefined()
    expect(result.status).toBe('active')
  })

  // ─── List ───────────────────────────────────────────────────────

  it('should list encounters by patient ordered by start_date desc', async () => {
    const service = container.resolve(EncounterService)
    const patientId = await createTestPatient()
    const serviceId = await createTestService()

    const baseDto = {
      patient_id: patientId,
      contact_type: 'consultation' as const,
      start_date: new Date().toISOString(),
      service_id: serviceId,
      origin: 'auto_refere' as const,
      zone_situation: 'zone_responsabilite' as const,
      prise_en_charge: 'maladie_naturelle' as const,
    }

    // Create encounters with different dates, closing each before creating the next
    const e1 = await service.create({ ...baseDto, start_date: '2024-01-03T12:00:00.000Z' })
    await service.closeEncounter(e1.id!)
    const e2 = await service.create({ ...baseDto, start_date: '2024-01-01T12:00:00.000Z' })
    await service.closeEncounter(e2.id!)
    const e3 = await service.create({ ...baseDto, start_date: '2024-01-02T12:00:00.000Z' })
    await service.closeEncounter(e3.id!)

    const encounters = await service.listByPatient(patientId)
    expect(encounters).toHaveLength(3)
    // Should be ordered by start_date desc
    expect(new Date(encounters[0].start_date).getTime()).toBeGreaterThan(
      new Date(encounters[1].start_date).getTime()
    )
    expect(new Date(encounters[1].start_date).getTime()).toBeGreaterThan(
      new Date(encounters[2].start_date).getTime()
    )
  })

  it('should return empty list for patient with no encounters', async () => {
    const service = container.resolve(EncounterService)
    const encounters = await service.listByPatient(99999)
    expect(encounters).toHaveLength(0)
  })

  it('should filter encounters by status', async () => {
    const service = container.resolve(EncounterService)
    const patientId = await createTestPatient()
    const serviceId = await createTestService()

    const baseDto = {
      patient_id: patientId,
      contact_type: 'consultation' as const,
      start_date: new Date().toISOString(),
      service_id: serviceId,
      origin: 'auto_refere' as const,
      zone_situation: 'zone_responsabilite' as const,
      prise_en_charge: 'maladie_naturelle' as const,
    }

    const e1 = await service.create(baseDto)
    const db = (container.resolve(AppDatabaseDatasource)).getInstance()
    await db.updateTable('encounters').set({ status: 'closed' }).where('id', '=', e1.id!).execute()
    await service.create(baseDto) // e2 is active

    // Filter active — should find e2
    const activeEncounters = await service.listByPatient(patientId, 'active')
    expect(activeEncounters.length).toBeGreaterThanOrEqual(1)
    expect(activeEncounters.every(e => e.status === 'active')).toBe(true)

    // Filter closed — should find e1
    const closedEncounters = await service.listByPatient(patientId, 'closed')
    expect(closedEncounters.length).toBeGreaterThanOrEqual(1)
    expect(closedEncounters.every(e => e.status === 'closed')).toBe(true)
  })

  // ─── GetById ────────────────────────────────────────────────────

  it('should get an encounter by id', async () => {
    const service = container.resolve(EncounterService)
    const patientId = await createTestPatient()
    const serviceId = await createTestService()

    const created = await service.create({
      patient_id: patientId,
      contact_type: 'consultation',
      start_date: new Date().toISOString(),
      service_id: serviceId,
      origin: 'auto_refere',
      zone_situation: 'zone_responsabilite',
      prise_en_charge: 'maladie_naturelle',
    })

    const found = await service.getById(created.id!)
    expect(found).toBeDefined()
    expect(found!.id).toBe(created.id)
  })

  it('should return null for non-existent encounter', async () => {
    const service = container.resolve(EncounterService)
    const found = await service.getById(-1)
    expect(found).toBeNull()
  })

  // ─── Close ──────────────────────────────────────────────────────

  it('should close an encounter and set status to closed', async () => {
    const service = container.resolve(EncounterService)
    const patientId = await createTestPatient()
    const serviceId = await createTestService()

    const created = await service.create({
      patient_id: patientId,
      contact_type: 'consultation',
      start_date: new Date().toISOString(),
      service_id: serviceId,
      origin: 'auto_refere',
      zone_situation: 'zone_responsabilite',
      prise_en_charge: 'maladie_naturelle',
    })

    expect(created.status).toBe('active')
    await service.closeEncounter(created.id!)

    const closed = await service.getById(created.id!)
    expect(closed!.status).toBe('closed')
  })

  it('should not throw when closing already closed encounter', async () => {
    const service = container.resolve(EncounterService)
    const patientId = await createTestPatient()
    const serviceId = await createTestService()

    const created = await service.create({
      patient_id: patientId,
      contact_type: 'consultation',
      start_date: new Date().toISOString(),
      service_id: serviceId,
      origin: 'auto_refere',
      zone_situation: 'zone_responsabilite',
      prise_en_charge: 'maladie_naturelle',
    })

    await service.closeEncounter(created.id!)
    await expect(service.closeEncounter(created.id!)).resolves.not.toThrow()
  })

  // ─── Movements ──────────────────────────────────────────────────

  it('should return empty list for encounter with no movements', async () => {
    const service = container.resolve(EncounterService)
    const patientId = await createTestPatient()
    const serviceId = await createTestService()

    const created = await service.create({
      patient_id: patientId,
      contact_type: 'consultation',
      start_date: new Date().toISOString(),
      service_id: serviceId,
      origin: 'auto_refere',
      zone_situation: 'zone_responsabilite',
      prise_en_charge: 'maladie_naturelle',
    })

    const movements = await service.getMovements(created.id!)
    expect(movements).toHaveLength(0)
  })

  // ─── service_name and medecin_name resolution ───────────────────

  it('should resolve service_name via join', async () => {
    const service = container.resolve(EncounterService)
    const patientId = await createTestPatient()
    const serviceId = await createTestService()

    const created = await service.create({
      patient_id: patientId,
      contact_type: 'consultation',
      start_date: new Date().toISOString(),
      service_id: serviceId,
      origin: 'auto_refere',
      zone_situation: 'zone_responsabilite',
      prise_en_charge: 'maladie_naturelle',
    })

    const found = await service.getById(created.id!)
    expect(found!.service_name).toBe('Médecine Générale')
  })

  // ─── Hospitalisation creates stay + admission movement ──────────

  it('should create stay and admission movement when contact_type is hospitalisation', async () => {
    const service = container.resolve(EncounterService)
    const patientId = await createTestPatient()
    const serviceId = await createTestService()

    const created = await service.create({
      patient_id: patientId,
      contact_type: 'hospitalisation',
      start_date: new Date().toISOString(),
      service_id: serviceId,
      origin: 'auto_refere',
      zone_situation: 'zone_responsabilite',
      prise_en_charge: 'maladie_naturelle',
    })

    // Should have an admission movement
    const movements = await service.getMovements(created.id!)
    expect(movements).toHaveLength(1)
    expect(movements[0].step_label).toBe('Admission')
    expect(movements[0].service_id).toBe(serviceId)

    // Should have created a stay
    const db = (container.resolve(AppDatabaseDatasource)).getInstance()
    const stay = await db
      .selectFrom('stays')
      .selectAll()
      .where('patient_id', '=', patientId)
      .where('status', '=', 'en_cours')
      .executeTakeFirst()
    expect(stay).toBeDefined()
    expect(stay!.service_id).toBe(serviceId)
  })

  // ─── addMovement ─────────────────────────────────────────────────

  it('should add a movement to an encounter and return it', async () => {
    const service = container.resolve(EncounterService)
    const patientId = await createTestPatient()
    const serviceId = await createTestService()

    const enc = await service.create({
      patient_id: patientId,
      contact_type: 'consultation',
      start_date: new Date().toISOString(),
      service_id: serviceId,
      origin: 'auto_refere',
      zone_situation: 'zone_responsabilite',
      prise_en_charge: 'maladie_naturelle',
    })

    const mvt = await service.addMovement({
      encounter_id: enc.id!,
      service_id: serviceId,
      step_label: 'Transfert en réa',
      entered_at: new Date().toISOString(),
      motif: 'Dégradation clinique',
      notes: 'Patient instable',
    })

    expect(mvt.id).toBeDefined()
    expect(mvt.step_label).toBe('Transfert en réa')
    expect(mvt.service_id).toBe(serviceId)
    expect(mvt.encounter_id).toBe(enc.id)
    expect(mvt.motif).toBe('Dégradation clinique')

    // Check via getMovements
    const all = await service.getMovements(enc.id!)
    expect(all).toHaveLength(1)
    expect(all[0].step_label).toBe('Transfert en réa')
  })

  it('should add multiple movements in order and return them sorted by entered_at ASC', async () => {
    const service = container.resolve(EncounterService)
    const patientId = await createTestPatient()
    const serviceId = await createTestService()

    const enc = await service.create({
      patient_id: patientId,
      contact_type: 'consultation',
      start_date: new Date().toISOString(),
      service_id: serviceId,
      origin: 'auto_refere',
      zone_situation: 'zone_responsabilite',
      prise_en_charge: 'maladie_naturelle',
    })

    const t1 = new Date('2024-06-01T08:00:00.000Z').toISOString()
    const t2 = new Date('2024-06-02T10:00:00.000Z').toISOString()
    const t3 = new Date('2024-06-03T14:00:00.000Z').toISOString()

    await service.addMovement({ encounter_id: enc.id!, service_id: serviceId, step_label: 'Mvt A', entered_at: t3 })
    await service.addMovement({ encounter_id: enc.id!, service_id: serviceId, step_label: 'Mvt B', entered_at: t1 })
    await service.addMovement({ encounter_id: enc.id!, service_id: serviceId, step_label: 'Mvt C', entered_at: t2 })

    const all = await service.getMovements(enc.id!)
    expect(all).toHaveLength(3)
    expect(all[0].step_label).toBe('Mvt B')
    expect(all[0].entered_at).toBe(t1)
    expect(all[1].step_label).toBe('Mvt C')
    expect(all[1].entered_at).toBe(t2)
    expect(all[2].step_label).toBe('Mvt A')
    expect(all[2].entered_at).toBe(t3)
  })

  it('should add movement with from_service_id and created_by', async () => {
    const service = container.resolve(EncounterService)
    const patientId = await createTestPatient()
    const serviceId = await createTestService()

    const svc2 = await container.resolve(ServiceService).create({ name: 'Chirurgie', code: 'CHIR' })

    const enc = await service.create({
      patient_id: patientId,
      contact_type: 'consultation',
      start_date: new Date().toISOString(),
      service_id: serviceId,
      origin: 'auto_refere',
      zone_situation: 'zone_responsabilite',
      prise_en_charge: 'maladie_naturelle',
    })

    const mvt = await service.addMovement({
      encounter_id: enc.id!,
      from_service_id: serviceId,
      service_id: svc2.id!,
      step_label: 'Mutation en chirurgie',
      entered_at: new Date().toISOString(),
      created_by: 1,
    })

    expect(mvt.from_service_id).toBe(serviceId)
    expect(mvt.service_id).toBe(svc2.id)
    expect(mvt.created_by).toBe(1)
  })

  // ─── closeCurrentMovement ────────────────────────────────────────

  it('should close the current open movement (set exited_at)', async () => {
    const service = container.resolve(EncounterService)
    const patientId = await createTestPatient()
    const serviceId = await createTestService()

    const enc = await service.create({
      patient_id: patientId,
      contact_type: 'consultation',
      start_date: new Date().toISOString(),
      service_id: serviceId,
      origin: 'auto_refere',
      zone_situation: 'zone_responsabilite',
      prise_en_charge: 'maladie_naturelle',
    })

    await service.addMovement({
      encounter_id: enc.id!,
      service_id: serviceId,
      step_label: 'Test',
      entered_at: new Date().toISOString(),
    })

    await service.closeCurrentMovement(enc.id!)

    const all = await service.getMovements(enc.id!)
    expect(all).toHaveLength(1)
    expect(all[0].exited_at).toBeDefined()
    // exited_at should be a valid ISO date string
    expect(() => new Date(all[0].exited_at!).toISOString()).not.toThrow()
  })

  it('should not throw when closing on encounter with no movements', async () => {
    const service = container.resolve(EncounterService)
    const patientId = await createTestPatient()
    const serviceId = await createTestService()

    const enc = await service.create({
      patient_id: patientId,
      contact_type: 'consultation',
      start_date: new Date().toISOString(),
      service_id: serviceId,
      origin: 'auto_refere',
      zone_situation: 'zone_responsabilite',
      prise_en_charge: 'maladie_naturelle',
    })

    await expect(service.closeCurrentMovement(enc.id!)).resolves.not.toThrow()
  })

  it('should close only the most recent open movement when multiple exist', async () => {
    const service = container.resolve(EncounterService)
    const patientId = await createTestPatient()
    const serviceId = await createTestService()

    const enc = await service.create({
      patient_id: patientId,
      contact_type: 'consultation',
      start_date: new Date().toISOString(),
      service_id: serviceId,
      origin: 'auto_refere',
      zone_situation: 'zone_responsabilite',
      prise_en_charge: 'maladie_naturelle',
    })

    await service.addMovement({ encounter_id: enc.id!, service_id: serviceId, step_label: 'Mvt 1', entered_at: '2024-06-01T08:00:00.000Z' })
    await service.closeCurrentMovement(enc.id!)
    await service.addMovement({ encounter_id: enc.id!, service_id: serviceId, step_label: 'Mvt 2', entered_at: '2024-06-02T08:00:00.000Z' })

    await service.closeCurrentMovement(enc.id!)

    const all = await service.getMovements(enc.id!)
    expect(all).toHaveLength(2)
    expect(all[0].exited_at).toBeDefined() // Mvt 1 closed
    expect(all[1].exited_at).toBeDefined() // Mvt 2 closed
  })

  // ─── update (Partie C: cascade to document dateSortie) ────────────

  it('should update end_date on encounter and cascade to CRH_DIABETE document form_data.sortie.dateSortie', async () => {
    const encService = container.resolve(EncounterService)
    const patientId = await createTestPatient()
    const serviceId = await createTestService()

    const enc = await encService.create({
      patient_id: patientId,
      contact_type: 'consultation',
      start_date: new Date().toISOString(),
      service_id: serviceId,
      origin: 'auto_refere',
      zone_situation: 'zone_responsabilite',
      prise_en_charge: 'maladie_naturelle',
    })

    // Create a CRH_DIABETE document for this encounter
    const docService = container.resolve(ClinicalDocumentService)
    const doc = await docService.createDocument({
      contactId: String(enc.id!),
      documentTypeId: CRH_DIABETE_TYPE_ID,
      createdBy: String(1),
    })

    // Update the encounter end_date
    const newEndDate = new Date('2024-12-25T10:00:00.000Z').toISOString()
    await encService.update(enc.id!, { end_date: newEndDate })

    // Verify the document form_data was updated
    const docs = await docService.getDocumentsByContact(String(enc.id!))
    expect(docs).toHaveLength(1)
    const formData = JSON.parse(docs[0].formData!)
    expect(formData.sortie.dateSortie).toBeDefined()
  })

  it('should not update document form_data when end_date is not provided', async () => {
    const encService = container.resolve(EncounterService)
    const patientId = await createTestPatient()
    const serviceId = await createTestService()

    const enc = await encService.create({
      patient_id: patientId,
      contact_type: 'consultation',
      start_date: new Date().toISOString(),
      service_id: serviceId,
      origin: 'auto_refere',
      zone_situation: 'zone_responsabilite',
      prise_en_charge: 'maladie_naturelle',
    })

    await encService.update(enc.id!, { notes: 'Just changing notes' })

    const updated = await encService.getById(enc.id!)
    expect(updated!.notes).toBe('Just changing notes')
  })

  // ─── delete cascade ──────────────────────────────────────────────

  it('should delete encounter and cascade to movements, stays, and clinical documents', async () => {
    const encService = container.resolve(EncounterService)
    const docService = container.resolve(ClinicalDocumentService)
    const patientId = await createTestPatient()
    const serviceId = await createTestService()

    const enc = await encService.create({
      patient_id: patientId,
      contact_type: 'hospitalisation',
      start_date: new Date().toISOString(),
      service_id: serviceId,
      origin: 'auto_refere',
      zone_situation: 'zone_responsabilite',
      prise_en_charge: 'maladie_naturelle',
    })

    // Add a movement
    await encService.addMovement({
      encounter_id: enc.id!,
      service_id: serviceId,
      step_label: 'Test movement',
      entered_at: new Date().toISOString(),
    })

    // Create a clinical document
    await docService.createDocument({
      contactId: String(enc.id!),
      documentTypeId: CRH_DIABETE_TYPE_ID,
      createdBy: String(1),
    })

    // Delete the encounter
    await encService.delete(enc.id!)

    // Verify encounter is gone
    const gone = await encService.getById(enc.id!)
    expect(gone).toBeNull()

    // Verify movements are gone
    const movements = await encService.getMovements(enc.id!)
    expect(movements).toHaveLength(0)

    // Verify clinical documents are gone
    const docs = await docService.getDocumentsByContact(String(enc.id!))
    expect(docs).toHaveLength(0)

    // Verify stay is gone
    const db = (container.resolve(AppDatabaseDatasource)).getInstance()
    const stays = await db
      .selectFrom('stays')
      .selectAll()
      .where('patient_id', '=', patientId)
      .execute()
    expect(stays).toHaveLength(0)
  })

  // ─── computed status (virtual closed when end_date <= now) ────────

  it('should return status closed when end_date is in the past', async () => {
    const service = container.resolve(EncounterService)
    const patientId = await createTestPatient()
    const serviceId = await createTestService()

    const enc = await service.create({
      patient_id: patientId,
      contact_type: 'consultation',
      start_date: new Date().toISOString(),
      service_id: serviceId,
      origin: 'auto_refere',
      zone_situation: 'zone_responsabilite',
      prise_en_charge: 'maladie_naturelle',
    })

    // Set end_date in the past
    await service.update(enc.id!, { end_date: new Date('2020-01-01').toISOString() })

    const found = await service.getById(enc.id!)
    expect(found!.status).toBe('closed')

    // Also check via listByPatient
    const list = await service.listByPatient(patientId)
    expect(list.find(e => e.id === enc.id)!.status).toBe('closed')
  })

  it('should return status active when end_date is in the future', async () => {
    const service = container.resolve(EncounterService)
    const patientId = await createTestPatient()
    const serviceId = await createTestService()

    const enc = await service.create({
      patient_id: patientId,
      contact_type: 'consultation',
      start_date: new Date().toISOString(),
      service_id: serviceId,
      origin: 'auto_refere',
      zone_situation: 'zone_responsabilite',
      prise_en_charge: 'maladie_naturelle',
    })

    // Set end_date in the future
    const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
    await service.update(enc.id!, { end_date: futureDate })

    const found = await service.getById(enc.id!)
    expect(found!.status).toBe('active')
  })

  // ─── Règle A.1: un seul contact *effectivement* actif par patient ──

  it('should allow creating a new contact when the only active one is effectively closed (end_date in the past)', async () => {
    const service = container.resolve(EncounterService)
    const patientId = await createTestPatient()
    const serviceId = await createTestService()

    const baseDto = {
      patient_id: patientId,
      contact_type: 'consultation' as const,
      start_date: new Date().toISOString(),
      service_id: serviceId,
      origin: 'auto_refere' as const,
      zone_situation: 'zone_responsabilite' as const,
      prise_en_charge: 'maladie_naturelle' as const,
    }

    // e1 : consultation → end_date par défaut = now + 24h (donc modifiable)
    const e1 = await service.create(baseDto)

    // Expirer e1 : end_date dans le passé, le statut brut reste 'active'
    await service.update(e1.id!, { end_date: new Date('2020-01-01T12:00:00.000Z').toISOString() })

    // Le statut brut doit bien être resté 'active' (scénario du bug en production)
    const db = (container.resolve(AppDatabaseDatasource)).getInstance()
    const raw = await db
      .selectFrom('encounters')
      .select('status')
      .where('id', '=', e1.id!)
      .executeTakeFirst()
    expect(raw?.status).toBe('active')

    // Mais le statut effectif est 'closed' (même sémantique que l'UI)
    expect((await service.getById(e1.id!))!.status).toBe('closed')

    // Un deuxième contact pour le même patient doit être créable
    const e2 = await service.create(baseDto)
    expect(e2.id).toBeDefined()
    expect(e2.status).toBe('active')
  })

  it('should still block creating a new contact when a genuinely active contact exists (future end_date)', async () => {
    const service = container.resolve(EncounterService)
    const patientId = await createTestPatient()
    const serviceId = await createTestService()

    const baseDto = {
      patient_id: patientId,
      contact_type: 'consultation' as const,
      start_date: new Date().toISOString(),
      service_id: serviceId,
      origin: 'auto_refere' as const,
      zone_situation: 'zone_responsabilite' as const,
      prise_en_charge: 'maladie_naturelle' as const,
    }

    // Consultation → end_date auto = now + 24h (futur) → effectivement actif
    await service.create(baseDto)

    await expect(
      service.create(baseDto)
    ).rejects.toThrow(/existe déjà/)
  })
})
