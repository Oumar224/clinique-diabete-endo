import 'reflect-metadata'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import { container } from 'tsyringe'
import { AppDatabaseDatasource } from '../../sqlite-data-source'
import { DispositifsService } from '../dispositifs.service'
import { DispositifEntity } from '../../entities/dispositif.entity'

describe('DispositifsService', () => {
  let tempDir: string
  let dbPath: string

  beforeEach(async () => {
    container.clearInstances()
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cd-dispositifs-test-'))
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

  // ─── Create ─────────────────────────────────────────────────────

  it('should create a dispositif', async () => {
    const service = container.resolve(DispositifsService)
    const patientId = await createTestPatient()

    const entity = new DispositifEntity()
    entity.patient_id = patientId
    entity.type = 'catheter'
    entity.date_pose = new Date().toISOString().slice(0, 10)
    entity.aspect = 'Sain'
    entity.volume_ml = 500

    const result = await service.create(entity)
    expect(result).toBeDefined()
    expect(result.id).toBeGreaterThan(0)
    expect(result.patient_id).toBe(patientId)
  })

  it('should reject create with invalid patient_id', async () => {
    const service = container.resolve(DispositifsService)

    const entity = new DispositifEntity()
    entity.patient_id = 99999
    entity.type = 'catheter'
    entity.date_pose = new Date().toISOString().slice(0, 10)
    entity.aspect = 'Sain'

    await expect(service.create(entity)).rejects.toThrow()
  })

  it('should reject create with invalid created_by', async () => {
    const service = container.resolve(DispositifsService)
    const patientId = await createTestPatient()

    const entity = new DispositifEntity()
    entity.patient_id = patientId
    entity.type = 'catheter'
    entity.date_pose = new Date().toISOString().slice(0, 10)
    entity.aspect = 'Sain'
    entity.created_by = 99999

    await expect(service.create(entity)).rejects.toThrow()
  })
})
