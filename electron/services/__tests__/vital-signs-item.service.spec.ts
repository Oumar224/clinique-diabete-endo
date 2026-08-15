import 'reflect-metadata'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import { container } from 'tsyringe'
import { AppDatabaseDatasource } from '../../sqlite-data-source'
import { VitalSignsItemService } from '../vital-signs-item.service'
import { VitalSignsItemEntity } from '../../entities/vital-signs-item.entity'

describe('VitalSignsItemService', () => {
  let tempDir: string
  let dbPath: string

  beforeEach(async () => {
    container.clearInstances()
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cd-vitalsignsitem-test-'))
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

  it('should save a vital signs item for a patient', async () => {
    const service = container.resolve(VitalSignsItemService)
    const patientId = await createTestPatient()
    const userId = await createTestUser()

    const entity = new VitalSignsItemEntity()
    entity.patient_id = patientId
    entity.date = new Date().toISOString().slice(0, 10)
    entity.hour = 8
    entity.glycemie = 6.2
    entity.created_by = userId

    const result = await service.save(entity)
    expect(result).toBeDefined()
    expect(result.id).toBeGreaterThan(0)
    expect(result.patient_id).toBe(patientId)
    expect(result.hour).toBe(8)
  })

  // ─── Delete ────────────────────────────────────────────────────

  it('should delete a vital signs item by id', async () => {
    const service = container.resolve(VitalSignsItemService)
    const patientId = await createTestPatient()
    const userId = await createTestUser()

    const entity = new VitalSignsItemEntity()
    entity.patient_id = patientId
    entity.date = new Date().toISOString().slice(0, 10)
    entity.hour = 10
    entity.created_by = userId

    const saved = await service.save(entity)
    expect(saved.id).toBeGreaterThan(0)

    await service.delete(saved.id!)

    const rows = await service.listByPatientAndDateRange(patientId, '1900-01-01', '2100-01-01')
    expect(rows).toHaveLength(0)
  })
})
