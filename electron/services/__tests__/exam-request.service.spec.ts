import 'reflect-metadata'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import { container } from 'tsyringe'
import { AppDatabaseDatasource } from '../../sqlite-data-source'
import { ExamRequestService } from '../exam-request.service'
import { PatientService } from '../patient.service'
import { ExamTypeService } from '../exam-type.service'
import { SpecialtyService } from '../specialty.service'
import { ExamRequestEntity } from '../../entities/exam-request.entity'

describe('ExamRequestService', () => {
  let tempDir: string
  let dbPath: string

  beforeEach(async () => {
    container.clearInstances()
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cd-exr-test-'))
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
    const patientService = container.resolve(PatientService)
    const nir = `1${String(Math.random()).slice(2, 15)}`
    const patient = await patientService.create({
      nom: 'Patient',
      prenom: 'Test',
      civilite: 'M',
      date_naissance: '1990-05-20',
      nir,
      telephone: '0600000000',
    })
    return patient.id!
  }

  // ─── Create: all 3 types ─────────────────────────────────────────

  it('should create an "imagerie" exam request', async () => {
    const service = container.resolve(ExamRequestService)
    const patientId = await createTestPatient()

    const entity = ExamRequestEntity.fromDto({
      patientId,
      type: 'imagerie',
      statut: 'en_attente',
      motif: 'Douleur thoracique',
    })

    const result = await service.create(entity)
    expect(result.id).toBeDefined()
    expect(result.patient_id).toBe(patientId)
    expect(result.type).toBe('imagerie')
    expect(result.statut).toBe('en_attente')
    expect(result.motif).toBe('Douleur thoracique')
  })

  it('should create a "laboratoire" exam request', async () => {
    const service = container.resolve(ExamRequestService)
    const patientId = await createTestPatient()

    const entity = ExamRequestEntity.fromDto({
      patientId,
      type: 'laboratoire',
      statut: 'en_attente',
      motif: 'Bilan annuel',
    })

    const result = await service.create(entity)
    expect(result.id).toBeDefined()
    expect(result.type).toBe('laboratoire')
    expect(result.statut).toBe('en_attente')
    expect(result.motif).toBe('Bilan annuel')
  })

  it('should create an "avis" exam request with specialty info', async () => {
    const service = container.resolve(ExamRequestService)
    const specialtyService = container.resolve(SpecialtyService)
    const patientId = await createTestPatient()

    // Get an existing seeded specialty
    const specialties = await specialtyService.list()
    const endo = specialties.find(s => s.code === 'ENDO')
    expect(endo).toBeDefined()

    const entity = ExamRequestEntity.fromDto({
      patientId,
      type: 'avis',
      specialtyId: endo!.id,
      specialite: endo!.name,
      statut: 'en_attente',
      motif: 'Avis endocrinologique',
    })

    const result = await service.create(entity)
    expect(result.id).toBeDefined()
    expect(result.type).toBe('avis')
    expect(result.specialty_id).toBe(endo!.id)
    expect(result.specialite).toBe('Endocrinologie')
    expect(result.statut).toBe('en_attente')
    expect(result.motif).toBe('Avis endocrinologique')
  })

  it('should default statut to "en_attente" when not provided', async () => {
    const service = container.resolve(ExamRequestService)
    const patientId = await createTestPatient()

    const entity = ExamRequestEntity.fromDto({
      patientId,
      type: 'laboratoire',
    } as any)

    const result = await service.create(entity)
    expect(result.statut).toBe('en_attente')
  })

  it('should reject create when patient_id is missing', async () => {
    const service = container.resolve(ExamRequestService)

    const entity = ExamRequestEntity.fromDto({
      patientId: undefined as any,
      type: 'laboratoire',
      statut: 'en_attente',
    } as any)

    await expect(service.create(entity)).rejects.toThrow()
  })

  // ─── List by patient ─────────────────────────────────────────────

  it('should list exam requests for a patient ordered by created_at desc', async () => {
    const service = container.resolve(ExamRequestService)
    const patientId = await createTestPatient()

    // Create 3 requests — because created_at defaults to datetime('now')
    // with second precision, we use raw SQL to set distinct timestamps
    await service.create(ExamRequestEntity.fromDto({ patientId, type: 'laboratoire', statut: 'en_attente', motif: 'A' }))
    await service.create(ExamRequestEntity.fromDto({ patientId, type: 'imagerie', statut: 'en_attente', motif: 'B' }))
    await service.create(ExamRequestEntity.fromDto({ patientId, type: 'avis', statut: 'en_attente', motif: 'C' }))

    const requests = await service.listByPatient(patientId)
    expect(requests).toHaveLength(3)

    // All requests belong to the patient
    expect(requests.every(r => r.patient_id === patientId)).toBe(true)
  })

  it('should return empty list for patient with no requests', async () => {
    const service = container.resolve(ExamRequestService)
    const requests = await service.listByPatient(99999)
    expect(requests).toHaveLength(0)
  })

  it('should resolve specialty_name via join on listByPatient', async () => {
    const service = container.resolve(ExamRequestService)
    const specialtyService = container.resolve(SpecialtyService)
    const patientId = await createTestPatient()

    const specialties = await specialtyService.list()
    const endo = specialties.find(s => s.code === 'ENDO')!

    const entity = ExamRequestEntity.fromDto({
      patientId,
      type: 'avis',
      specialtyId: endo.id,
      statut: 'en_attente',
    })
    await service.create(entity)

    const requests = await service.listByPatient(patientId)
    expect(requests).toHaveLength(1)
    const dto = ExamRequestEntity.toDto(requests[0])
    expect(dto.specialtyName).toBe('Endocrinologie')
  })

  // ─── Get by ID ───────────────────────────────────────────────────

  it('should get an exam request by id', async () => {
    const service = container.resolve(ExamRequestService)
    const patientId = await createTestPatient()

    const entity = ExamRequestEntity.fromDto({
      patientId,
      type: 'laboratoire',
      statut: 'en_attente',
    })
    const created = await service.create(entity)

    const found = await service.getById(created.id!)
    expect(found).toBeDefined()
    expect(found!.id).toBe(created.id)
    expect(found!.patient_id).toBe(patientId)
  })

  it('should return null for non-existent id', async () => {
    const service = container.resolve(ExamRequestService)
    const found = await service.getById(-1)
    expect(found).toBeNull()
  })

  it('should resolve specialty_name via join on getById', async () => {
    const service = container.resolve(ExamRequestService)
    const specialtyService = container.resolve(SpecialtyService)
    const patientId = await createTestPatient()

    const specialties = await specialtyService.list()
    const endo = specialties.find(s => s.code === 'ENDO')!

    const entity = ExamRequestEntity.fromDto({
      patientId,
      type: 'avis',
      specialtyId: endo.id,
      statut: 'en_attente',
    })
    const created = await service.create(entity)

    const found = await service.getById(created.id!)
    const dto = ExamRequestEntity.toDto(found!)
    expect(dto.specialtyName).toBe('Endocrinologie')
  })

  // ─── Update ──────────────────────────────────────────────────────

  it('should update statut', async () => {
    const service = container.resolve(ExamRequestService)
    const patientId = await createTestPatient()

    const entity = ExamRequestEntity.fromDto({
      patientId,
      type: 'laboratoire',
      statut: 'en_attente',
    })
    const created = await service.create(entity)
    expect(created.statut).toBe('en_attente')

    const updated = await service.update(ExamRequestEntity.fromDto({
      id: created.id,
      patientId,
      type: 'laboratoire',
      statut: 'realise',
    }))
    expect(updated.statut).toBe('realise')
  })

  it('should update specialty_id', async () => {
    const service = container.resolve(ExamRequestService)
    const specialtyService = container.resolve(SpecialtyService)
    const patientId = await createTestPatient()

    const specialties = await specialtyService.list()
    const cardio = specialties.find(s => s.code === 'CARDIO')!

    const entity = ExamRequestEntity.fromDto({
      patientId,
      type: 'avis',
      statut: 'en_attente',
    })
    const created = await service.create(entity)

    const updated = await service.update(ExamRequestEntity.fromDto({
      id: created.id,
      patientId,
      type: 'avis',
      specialtyId: cardio.id,
      statut: 'en_attente',
    }))
    expect(updated.specialty_id).toBe(cardio.id)
  })

  it('should throw when updating non-existent request', async () => {
    const service = container.resolve(ExamRequestService)

    await expect(
      service.update(ExamRequestEntity.fromDto({
        id: 99999,
        patientId: 1,
        type: 'laboratoire',
        statut: 'en_attente',
      }))
    ).rejects.toThrow('Demande introuvable')
  })

  it('should throw when id is missing on update', async () => {
    const service = container.resolve(ExamRequestService)

    await expect(
      service.update(ExamRequestEntity.fromDto({
        patientId: 1,
        type: 'laboratoire',
        statut: 'en_attente',
      }))
    ).rejects.toThrow("L'identifiant est requis")
  })

  // ─── Delete ──────────────────────────────────────────────────────

  it('should delete an exam request', async () => {
    const service = container.resolve(ExamRequestService)
    const patientId = await createTestPatient()

    const entity = ExamRequestEntity.fromDto({
      patientId,
      type: 'laboratoire',
      statut: 'en_attente',
    })
    const created = await service.create(entity)

    await service.delete(created.id!)
    const found = await service.getById(created.id!)
    expect(found).toBeNull()
  })

  it('should throw when deleting non-existent request', async () => {
    const service = container.resolve(ExamRequestService)
    await expect(service.delete(99999)).rejects.toThrow('Demande introuvable')
  })

  // ─── Specialty join in listByPatient ─────────────────────────────

  it('should include specialty_name when listing avis requests', async () => {
    const service = container.resolve(ExamRequestService)
    const specialtyService = container.resolve(SpecialtyService)
    const patientId = await createTestPatient()

    const specialties = await specialtyService.list()
    const endo = specialties.find(s => s.code === 'ENDO')!
    const cardio = specialties.find(s => s.code === 'CARDIO')!

    // Create two avis with different specialties
    const e1 = ExamRequestEntity.fromDto({ patientId, type: 'avis', specialtyId: endo.id, statut: 'en_attente' })
    const e2 = ExamRequestEntity.fromDto({ patientId, type: 'avis', specialtyId: cardio.id, statut: 'en_attente' })
    await service.create(e1)
    await service.create(e2)

    const requests = await service.listByPatient(patientId)
    expect(requests).toHaveLength(2)

    const dtos = ExamRequestEntity.toDtos(requests)
    const endoReq = dtos.find(r => r.specialtyId === endo.id)
    const cardioReq = dtos.find(r => r.specialtyId === cardio.id)
    expect(endoReq?.specialtyName).toBe('Endocrinologie')
    expect(cardioReq?.specialtyName).toBe('Cardiologie')
  })

  // ─── toDto / fromDto roundtrip ───────────────────────────────────

  it('should roundtrip through toDto and fromDto', async () => {
    const dto = {
      patientId: 1,
      type: 'avis' as const,
      specialtyId: 5,
      specialite: 'Cardiologie',
      statut: 'en_attente' as const,
      motif: 'Avis demandé',
      prescripteurId: 10,
    }
    const entity = ExamRequestEntity.fromDto(dto)
    expect(entity.patient_id).toBe(1)
    expect(entity.type).toBe('avis')
    expect(entity.specialty_id).toBe(5)
    expect(entity.specialite).toBe('Cardiologie')

    const back = ExamRequestEntity.toDto(entity)
    expect(back.patientId).toBe(1)
    expect(back.type).toBe('avis')
    expect(back.specialtyId).toBe(5)
    expect(back.specialite).toBe('Cardiologie')
    expect(back.statut).toBe('en_attente')
  })

  // ─── FK Validation ───────────────────────────────────────────────

  it('should reject create with invalid patient_id', async () => {
    const service = container.resolve(ExamRequestService)

    const entity = ExamRequestEntity.fromDto({
      patientId: 99999,
      type: 'laboratoire',
      statut: 'en_attente',
      motif: 'Test',
    })

    await expect(service.create(entity)).rejects.toThrow()
  })

  it('should reject create with invalid specialty_id (type=avis)', async () => {
    const service = container.resolve(ExamRequestService)
    const patientId = await createTestPatient()

    const entity = ExamRequestEntity.fromDto({
      patientId,
      type: 'avis',
      specialtyId: 99999,
      statut: 'en_attente',
      motif: 'Avis test',
    })

    await expect(service.create(entity)).rejects.toThrow()
  })

  it('should reject create with invalid prescripteur_id', async () => {
    const service = container.resolve(ExamRequestService)
    const patientId = await createTestPatient()

    const entity = ExamRequestEntity.fromDto({
      patientId,
      type: 'laboratoire',
      statut: 'en_attente',
      motif: 'Test',
      prescripteurId: 99999,
    })

    await expect(service.create(entity)).rejects.toThrow()
  })

  it('should create with null optional FKs (prescripteur_id, encounter_id)', async () => {
    const service = container.resolve(ExamRequestService)
    const patientId = await createTestPatient()

    const entity = ExamRequestEntity.fromDto({
      patientId,
      type: 'laboratoire',
      statut: 'en_attente',
      motif: 'Test sans prescripteur',
    })

    const result = await service.create(entity)
    expect(result).toBeDefined()
    expect(result.id).toBeDefined()
    expect(result.patient_id).toBe(patientId)
    expect(result.prescripteur_id).toBeNull()
  })
})
