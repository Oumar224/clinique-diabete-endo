import 'reflect-metadata'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import { container } from 'tsyringe'
import { AppDatabaseDatasource } from '../../sqlite-data-source'
import { PrescriptionService } from '../prescription.service'
import { PrescriptionEntity } from '../../entities/prescription.entity'

describe('PrescriptionService', () => {
  let tempDir: string
  let dbPath: string

  beforeEach(async () => {
    container.clearInstances()
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cd-prescription-test-'))
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

  // ─── Create ─────────────────────────────────────────────────────

  it('should create a prescription', async () => {
    const service = container.resolve(PrescriptionService)
    const patientId = await createTestPatient()
    const userId = await createTestUser()

    const entity = PrescriptionEntity.fromDto({
      patientId,
      medicament: 'Paracétamol',
      dosage: '500mg',
      voie: 'PO',
      duree: 7,
      frequence: ['Matin', 'Midi', 'Soir'],
      statut: 'active',
      type: 'medicament',
      prescripteurId: userId,
    })

    const result = await service.create(entity)
    expect(result.prescription).toBeDefined()
    expect(result.prescription.patient_id).toBe(patientId)
  })

  it('should reject create with invalid patient_id', async () => {
    const service = container.resolve(PrescriptionService)
    const userId = await createTestUser()

    const entity = PrescriptionEntity.fromDto({
      patientId: 99999,
      medicament: 'Test',
      dosage: '500mg',
      voie: 'PO',
      duree: 3,
      frequence: ['Matin'],
      statut: 'active',
      type: 'medicament',
      prescripteurId: userId,
    })

    await expect(service.create(entity)).rejects.toThrow()
  })

  it('should reject create with invalid prescripteur_id', async () => {
    const service = container.resolve(PrescriptionService)
    const patientId = await createTestPatient()

    const entity = PrescriptionEntity.fromDto({
      patientId,
      medicament: 'Test',
      dosage: '500mg',
      voie: 'PO',
      duree: 3,
      frequence: ['Matin'],
      statut: 'active',
      type: 'medicament',
      prescripteurId: 99999,
    })

    await expect(service.create(entity)).rejects.toThrow()
  })

  it('should create with null optional prescripteur_id', async () => {
    const service = container.resolve(PrescriptionService)
    const patientId = await createTestPatient()

    // Use duree=0 so no plan_soins_items are generated (avoids FK on created_by)
    const entity = PrescriptionEntity.fromDto({
      patientId,
      medicament: 'Paracétamol',
      dosage: '500mg',
      voie: 'PO',
      duree: 0,
      frequence: [],
      statut: 'active',
      type: 'medicament',
      prescripteurId: undefined,
    })

    const result = await service.create(entity)
    expect(result.prescription).toBeDefined()
    expect(result.prescription.prescripteur_id).toBeNull()
  })
})
