import 'reflect-metadata'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import { container } from 'tsyringe'
import { AppDatabaseDatasource } from '../../sqlite-data-source'
import { AppointmentService } from '../appointment.service'
import { AppointmentEntity } from '../../entities/appointment.entity'

describe('AppointmentService', () => {
  let tempDir: string
  let dbPath: string
  let service: AppointmentService
  let datasource: AppDatabaseDatasource
  let patientId: number
  let patientId2: number
  let medecinId: number

  beforeEach(async () => {
    container.clearInstances()
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cd-appointment-test-'))
    dbPath = path.join(tempDir, 'test.db')
    container.register('DB_PATH', { useValue: dbPath })
    datasource = container.resolve(AppDatabaseDatasource)
    await datasource.initialize()
    service = container.resolve(AppointmentService)
    const db = datasource.getInstance()

    // Create test patients and a doctor to reference
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

    const user = await db
      .insertInto('user')
      .values({
        nom: 'Docteur',
        prenom: 'Kane',
        email: 'dkane@test.com',
        password_hash: 'hash',
        role: 'MEDECIN',
      })
      .returningAll()
      .executeTakeFirstOrThrow()
    medecinId = user.id!
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

  // ─── Create ─────────────────────────────────────────────────────

  it('creates an appointment with required fields using AppointmentEntity', async () => {
    const entity = AppointmentEntity.fromDto({
      patient_id: patientId,
      date: '2025-06-15',
      time: '09:00',
      motif: 'Consultation',
    })

    const created = await service.create(entity)
    expect(created).toBeDefined()
    expect(created.id).toBeGreaterThan(0)
    expect(created.patient_id).toBe(patientId)
    expect(created.date).toBe('2025-06-15')
    expect(created.time).toBe('09:00')
    expect(created.motif).toBe('Consultation')
    // Default status should be 'confirmed'
    expect(created.status).toBe('confirmed')
    expect(created.created_at).toBeDefined()
  })

  it('creates an appointment with optional medecin_id and notes', async () => {
    const entity = AppointmentEntity.fromDto({
      patient_id: patientId,
      date: '2025-06-16',
      time: '14:30',
      motif: 'Suivi',
      medecin_id: medecinId,
      notes: 'Patient à surveiller',
    })

    const created = await service.create(entity)
    expect(created.id).toBeGreaterThan(0)
    expect(created.medecin_id).toBe(medecinId)
    expect(created.notes).toBe('Patient à surveiller')
  })

  it('creates an appointment via constructor with AppointmentEntity directly', async () => {
    const entity = new AppointmentEntity()
    entity.patient_id = patientId
    entity.date = '2025-07-01'
    entity.time = '11:00'
    entity.motif = 'Direct entity'

    const created = await service.create(entity)
    expect(created.id).toBeGreaterThan(0)
    expect(created.patient_id).toBe(patientId)
    expect(created.motif).toBe('Direct entity')
  })

  // ─── List ───────────────────────────────────────────────────────

  it('lists all appointments', async () => {
    await service.create(AppointmentEntity.fromDto({
      patient_id: patientId,
      date: '2025-06-15',
      time: '09:00',
    }))
    await service.create(AppointmentEntity.fromDto({
      patient_id: patientId2,
      date: '2025-06-16',
      time: '10:00',
    }))

    const list = await service.list()
    expect(list.length).toBeGreaterThanOrEqual(2)
  })

  it('filters appointments by date', async () => {
    await service.create(AppointmentEntity.fromDto({
      patient_id: patientId,
      date: '2025-06-15',
      time: '09:00',
    }))
    await service.create(AppointmentEntity.fromDto({
      patient_id: patientId2,
      date: '2025-06-16',
      time: '10:00',
    }))

    const list = await service.list('2025-06-15')
    expect(list.length).toBe(1)
    expect(list[0].date).toBe('2025-06-15')
  })

  it('returns empty list when no appointments match the date filter', async () => {
    const list = await service.list('2099-01-01')
    expect(list).toEqual([])
  })

  it('lists appointments ordered by time ascending', async () => {
    // Create appointments at different times on same date
    await service.create(AppointmentEntity.fromDto({
      patient_id: patientId,
      date: '2025-06-15',
      time: '11:00',
      motif: 'Late',
    }))
    await service.create(AppointmentEntity.fromDto({
      patient_id: patientId2,
      date: '2025-06-15',
      time: '08:00',
      motif: 'Early',
    }))

    const list = await service.list('2025-06-15')
    expect(list.length).toBe(2)
    expect(list[0].time).toBe('08:00')
    expect(list[1].time).toBe('11:00')
  })

  // ─── UpdateStatus ───────────────────────────────────────────────

  it('updates appointment status to cancelled', async () => {
    const created = await service.create(AppointmentEntity.fromDto({
      patient_id: patientId,
      date: '2025-06-15',
      time: '09:00',
    }))
    expect(created.status).toBe('confirmed')

    await service.updateStatus(created.id!, 'cancelled')

    // Verify the status changed by re-reading from DB
    const db = datasource.getInstance()
    const updated = await db
      .selectFrom('appointment')
      .selectAll()
      .where('id', '=', created.id!)
      .executeTakeFirst()
    expect(updated!.status).toBe('cancelled')
  })

  it('updates appointment status to done', async () => {
    const created = await service.create(AppointmentEntity.fromDto({
      patient_id: patientId,
      date: '2025-06-15',
      time: '09:00',
    }))

    await service.updateStatus(created.id!, 'done')

    const db = datasource.getInstance()
    const updated = await db
      .selectFrom('appointment')
      .selectAll()
      .where('id', '=', created.id!)
      .executeTakeFirst()
    expect(updated!.status).toBe('done')
  })

  it('updates appointment status to pending', async () => {
    const created = await service.create(AppointmentEntity.fromDto({
      patient_id: patientId,
      date: '2025-06-15',
      time: '09:00',
    }))

    await service.updateStatus(created.id!, 'pending')

    const db = datasource.getInstance()
    const updated = await db
      .selectFrom('appointment')
      .selectAll()
      .where('id', '=', created.id!)
      .executeTakeFirst()
    expect(updated!.status).toBe('pending')
  })

  // ─── Edge cases ─────────────────────────────────────────────────

  it('creates appointment without optional motif field', async () => {
    const entity = AppointmentEntity.fromDto({
      patient_id: patientId,
      date: '2025-06-15',
      time: '10:00',
    })

    const created = await service.create(entity)
    expect(created.id).toBeGreaterThan(0)
    // motif should be undefined/null in DB
    const db = datasource.getInstance()
    const row = await db
      .selectFrom('appointment')
      .selectAll()
      .where('id', '=', created.id!)
      .executeTakeFirst()
    expect(row!.motif).toBeNull()
  })

  it('creates multiple appointments for the same patient on different dates', async () => {
    await service.create(AppointmentEntity.fromDto({
      patient_id: patientId,
      date: '2025-06-15',
      time: '09:00',
    }))
    await service.create(AppointmentEntity.fromDto({
      patient_id: patientId,
      date: '2025-06-16',
      time: '10:00',
    }))
    await service.create(AppointmentEntity.fromDto({
      patient_id: patientId,
      date: '2025-06-17',
      time: '11:00',
    }))

    const list = await service.list()
    const patientAppts = list.filter(a => a.patient_id === patientId)
    expect(patientAppts.length).toBe(3)
  })

  it('throws when creating appointment with non-existent patient (FK constraint)', async () => {
    const entity = AppointmentEntity.fromDto({
      patient_id: 9999,
      date: '2025-06-15',
      time: '09:00',
    })

    await expect(service.create(entity)).rejects.toThrow()
  })
})
