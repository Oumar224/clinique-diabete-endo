import 'reflect-metadata'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import { container } from 'tsyringe'
import { AppDatabaseDatasource } from '../../sqlite-data-source'
import { VitalSignsService } from '../vital-signs.service'
import { VitalSignEntity } from '../../entities/vital-sign.entity'

describe('VitalSignsService', () => {
  let tempDir: string
  let dbPath: string

  beforeEach(async () => {
    container.clearInstances()
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cd-vitalsigns-test-'))
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
        nom: 'Infirmier',
        prenom: 'Test',
        email: `infirmier${Math.random()}@test.com`,
        password_hash: 'hash',
        role: 'INFIRMIER',
      })
      .returningAll()
      .executeTakeFirstOrThrow()
    return u.id!
  }

  // ─── Save ──────────────────────────────────────────────────────

  it('should save vital signs for a patient', async () => {
    const service = container.resolve(VitalSignsService)
    const patientId = await createTestPatient()
    const userId = await createTestUser()

    const entity = new VitalSignEntity()
    entity.patient_id = patientId
    entity.date = new Date().toISOString().slice(0, 10)
    entity.glycemie = 5.5
    entity.ta_systolique = 120
    entity.ta_diastolique = 80
    entity.created_by = userId

    const result = await service.save(entity)
    expect(result).toBeDefined()
    expect(result.patient_id).toBe(patientId)
    expect(result.glycemie).toBe(5.5)
  })

  it('should reject save with invalid patient_id', async () => {
    const service = container.resolve(VitalSignsService)

    const entity = new VitalSignEntity()
    entity.patient_id = 99999
    entity.date = new Date().toISOString().slice(0, 10)
    entity.glycemie = 5.5

    await expect(service.save(entity)).rejects.toThrow()
  })

  it('should reject save with invalid created_by', async () => {
    const service = container.resolve(VitalSignsService)
    const patientId = await createTestPatient()

    const entity = new VitalSignEntity()
    entity.patient_id = patientId
    entity.date = new Date().toISOString().slice(0, 10)
    entity.glycemie = 5.5
    entity.created_by = 99999

    await expect(service.save(entity)).rejects.toThrow()
  })
})
