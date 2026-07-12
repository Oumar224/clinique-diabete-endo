import 'reflect-metadata'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import { container } from 'tsyringe'
import { AppDatabaseDatasource } from '../../sqlite-data-source'
import { StayService } from '../stay.service'
import { PatientService } from '../patient.service'
import { ServiceService } from '../service.service'

describe('StayService', () => {
  let tempDir: string
  let dbPath: string

  beforeEach(async () => {
    container.clearInstances()
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cd-stay-test-'))
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
    const nir = `2${String(Math.random()).slice(2, 15)}`
    const patient = await patientService.create({
      nom: 'Martin',
      prenom: 'Sophie',
      civilite: 'Mme',
      date_naissance: '1990-06-20',
      nir,
      telephone: '0611111111',
    })
    return patient.id!
  }

  async function createTestService(): Promise<number> {
    const serviceService = container.resolve(ServiceService)
    const svc = await serviceService.create({ name: 'Cardiologie', code: 'CARDIO' })
    return svc.id!
  }

  function insertActiveStay(
    db: any,
    patientId: number,
    serviceId: number,
    overrides: Record<string, any> = {},
  ): Promise<{ id: number }> {
    return db.insertInto('stays')
      .values({
        patient_id: patientId,
        admission_date: overrides.admission_date || new Date().toISOString(),
        mode_admission: overrides.mode_admission || 'programmee',
        service_id: serviceId,
        chambre: overrides.chambre || null,
        lit: overrides.lit || null,
        medecin_id: overrides.medecin_id || null,
        notes: overrides.notes || null,
        status: 'en_cours',
        created_by: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .returning('id')
      .executeTakeFirst()
  }

  // ─── getActiveByPatient ─────────────────────────────────────────

  it('should return the active stay for a patient', async () => {
    const service = container.resolve(StayService)
    const patientId = await createTestPatient()
    const svcId = await createTestService()

    const inserted = await insertActiveStay(service.db, patientId, svcId)

    const active = await service.getActiveByPatient(patientId)
    expect(active).toBeDefined()
    expect(active!.id).toBe(inserted.id)
    expect(active!.status).toBe('en_cours')
    expect(active!.service_name).toBe('Cardiologie')
  })

  it('should return null if no active stay exists', async () => {
    const service = container.resolve(StayService)
    const patientId = await createTestPatient()

    const active = await service.getActiveByPatient(patientId)
    expect(active).toBeNull()
  })

  it('should return null if only closed stays exist', async () => {
    const service = container.resolve(StayService)
    const patientId = await createTestPatient()
    const svcId = await createTestService()

    await service.db.insertInto('stays').values({
      patient_id: patientId,
      admission_date: new Date().toISOString(),
      mode_admission: 'programmee',
      service_id: svcId,
      status: 'cloture',
      created_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).execute()

    const active = await service.getActiveByPatient(patientId)
    expect(active).toBeNull()
  })

  it('should return only one active stay (the first one found)', async () => {
    const service = container.resolve(StayService)
    const patientId = await createTestPatient()
    const svcId = await createTestService()

    await insertActiveStay(service.db, patientId, svcId, { admission_date: '2024-01-01T00:00:00.000Z' })
    await insertActiveStay(service.db, patientId, svcId, { admission_date: '2024-06-01T00:00:00.000Z' })

    const active = await service.getActiveByPatient(patientId)
    expect(active).toBeDefined()
  })

  // ─── listByPatient ──────────────────────────────────────────────

  it('should list all stays for a patient ordered by admission_date desc', async () => {
    const service = container.resolve(StayService)
    const patientId = await createTestPatient()
    const svcId = await createTestService()

    await insertActiveStay(service.db, patientId, svcId, { admission_date: '2024-03-01T00:00:00.000Z' })
    await insertActiveStay(service.db, patientId, svcId, { admission_date: '2024-01-01T00:00:00.000Z' })
    await insertActiveStay(service.db, patientId, svcId, { admission_date: '2024-06-01T00:00:00.000Z' })

    const stays = await service.listByPatient(patientId)
    expect(stays).toHaveLength(3)
    expect(new Date(stays[0].admission_date).getTime()).toBeGreaterThan(
      new Date(stays[1].admission_date).getTime()
    )
  })

  it('should return empty list for patient with no stays', async () => {
    const service = container.resolve(StayService)
    const stays = await service.listByPatient(99999)
    expect(stays).toHaveLength(0)
  })

  it('should resolve service_name in list', async () => {
    const service = container.resolve(StayService)
    const patientId = await createTestPatient()
    const svcId = await createTestService()

    await insertActiveStay(service.db, patientId, svcId)

    const stays = await service.listByPatient(patientId)
    expect(stays[0].service_name).toBe('Cardiologie')
  })

  // ─── getMovements ───────────────────────────────────────────────

  it('should return empty list for stay with no movements', async () => {
    const service = container.resolve(StayService)
    const patientId = await createTestPatient()
    const svcId = await createTestService()

    const inserted = await insertActiveStay(service.db, patientId, svcId)

    const movements = await service.getMovements(inserted.id)
    expect(movements).toHaveLength(0)
  })

  it('should return movements ordered by moved_at asc', async () => {
    const service = container.resolve(StayService)
    const patientId = await createTestPatient()
    const svcId = await createTestService()

    const inserted = await insertActiveStay(service.db, patientId, svcId)

    await service.db.insertInto('stay_movements').values([
      {
        stay_id: inserted.id,
        movement_type: 'admission',
        to_service_id: svcId,
        moved_at: '2024-01-01T08:00:00.000Z',
        created_at: new Date().toISOString(),
      },
      {
        stay_id: inserted.id,
        movement_type: 'transfert_service',
        from_service_id: svcId,
        to_service_id: svcId,
        moved_at: '2024-01-02T10:00:00.000Z',
        created_at: new Date().toISOString(),
      },
    ]).execute()

    const movements = await service.getMovements(inserted.id)
    expect(movements).toHaveLength(2)
    expect(movements[0].movement_type).toBe('admission')
    expect(movements[1].movement_type).toBe('transfert_service')
  })

  it('should resolve from_service_name and to_service_name', async () => {
    const service = container.resolve(StayService)
    const patientId = await createTestPatient()
    const svcId = await createTestService()

    const inserted = await insertActiveStay(service.db, patientId, svcId)

    await service.db.insertInto('stay_movements').values({
      stay_id: inserted.id,
      movement_type: 'admission',
      to_service_id: svcId,
      moved_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    }).execute()

    const movements = await service.getMovements(inserted.id)
    expect(movements[0].to_service_name).toBe('Cardiologie')
  })
})
