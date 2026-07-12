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
    ).rejects.toThrow('Patient ou service introuvable')
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
    ).rejects.toThrow('Patient ou service introuvable')
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

    await service.create({ ...baseDto, start_date: '2024-01-03T12:00:00.000Z' })
    await service.create({ ...baseDto, start_date: '2024-01-01T12:00:00.000Z' })
    await service.create({ ...baseDto, start_date: '2024-01-02T12:00:00.000Z' })

    const encounters = await service.listByPatient(patientId)
    expect(encounters).toHaveLength(3)
    expect(new Date(encounters[0].start_date).getTime()).toBeGreaterThan(
      new Date(encounters[1].start_date).getTime()
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

    await service.create(baseDto)
    const e2 = await service.create(baseDto)
    await service.closeEncounter(e2.id!)

    const activeEncounters = await service.listByPatient(patientId, 'active')
    expect(activeEncounters.every(e => e.status === 'active')).toBe(true)

    const closedEncounters = await service.listByPatient(patientId, 'closed')
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
})
