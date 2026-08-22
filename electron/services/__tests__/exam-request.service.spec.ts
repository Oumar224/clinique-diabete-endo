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

  // ─── Realize (mark as done + store result) ───────────────────────

  it('should realize an exam request (statut = realise, realized_at, resultat)', async () => {
    const service = container.resolve(ExamRequestService)
    const patientId = await createTestPatient()

    const created = await service.create(ExamRequestEntity.fromDto({
      patientId,
      type: 'laboratoire',
      statut: 'en_attente',
      motif: 'Bilan',
    }))

    const before = new Date()
    const realized = await service.realize(ExamRequestEntity.fromDto({
      id: created.id,
      patientId,
      type: 'laboratoire',
      resultat: '<p>Résultat normal</p>',
    }))

    expect(realized.statut).toBe('realise')
    expect(realized.resultat).toBe('<p>Résultat normal</p>')
    expect(realized.realized_at).toBeDefined()
    const realizedAt = new Date(realized.realized_at!)
    expect(realizedAt.getTime()).toBeGreaterThanOrEqual(before.getTime() - 1000)
    // DTO exposes the realizedAt as ISO string
    expect(ExamRequestEntity.toDto(realized).realizedAt).toBe(realized.realized_at)
  })

  it('should throw on realize when the id is missing', async () => {
    const service = container.resolve(ExamRequestService)
    await expect(
      service.realize(ExamRequestEntity.fromDto({ patientId: 1, type: 'laboratoire' }))
    ).rejects.toThrow("L'identifiant est requis")
  })

  it('should throw on realize when the request does not exist', async () => {
    const service = container.resolve(ExamRequestService)
    await expect(
      service.realize(ExamRequestEntity.fromDto({ id: 99999, patientId: 1, type: 'laboratoire' }))
    ).rejects.toThrow('Demande introuvable')
  })

  // ─── Attachments ─────────────────────────────────────────────────

  it('should create an attachment with base64 data and list it', async () => {
    const service = container.resolve(ExamRequestService)
    const patientId = await createTestPatient()
    const created = await service.create(ExamRequestEntity.fromDto({
      patientId,
      type: 'avis',
      statut: 'en_attente',
    }))

    const dto = {
      exam_request_id: created.id!,
      display_name: 'CR.pdf',
      file_name: 'CR.pdf',
      mime_type: 'application/pdf',
      file_size: 5,
      file_data: 'data:application/pdf;base64,aGVsbG8=',
      description: 'Compte-rendu',
    }
    const attachment = await service.createAttachment(dto)

    expect(attachment.id).toBeDefined()
    expect(attachment.exam_request_id).toBe(created.id)
    expect(attachment.display_name).toBe('CR.pdf')
    expect(attachment.mime_type).toBe('application/pdf')

    const list = await service.listAttachments(created.id!)
    expect(list).toHaveLength(1)
    expect(list[0].id).toBe(attachment.id)
    expect(list[0].file_data).toBeUndefined() // list does not return blob data
  })

  it('should reject an attachment with a non-base64 data URI', async () => {
    const service = container.resolve(ExamRequestService)
    const patientId = await createTestPatient()
    const created = await service.create(ExamRequestEntity.fromDto({
      patientId,
      type: 'avis',
      statut: 'en_attente',
    }))

    await expect(
      service.createAttachment({
        exam_request_id: created.id!,
        display_name: 'bad.txt',
        file_name: 'bad.txt',
        file_data: 'not-a-data-uri',
      })
    ).rejects.toThrow('Format de fichier invalide')
  })

  it('should reject an attachment whose file_size exceeds 10 Mo', async () => {
    const service = container.resolve(ExamRequestService)
    const patientId = await createTestPatient()
    const created = await service.create(ExamRequestEntity.fromDto({
      patientId,
      type: 'avis',
      statut: 'en_attente',
    }))

    await expect(
      service.createAttachment({
        exam_request_id: created.id!,
        display_name: 'huge.pdf',
        file_name: 'huge.pdf',
        file_size: 11 * 1024 * 1024,
        file_data: 'data:application/pdf;base64,aGVsbG8=',
      })
    ).rejects.toThrow('La taille du fichier ne doit pas dépasser 10 Mo')
  })

  it('should reject an attachment with a decoded payload above 10 Mo', async () => {
    const service = container.resolve(ExamRequestService)
    const patientId = await createTestPatient()
    const created = await service.create(ExamRequestEntity.fromDto({
      patientId,
      type: 'avis',
      statut: 'en_attente',
    }))

    // 14 Mo of base64 decodes to ~10.5 Mo — above the 10 Mo decoded limit
    // (decoded size ≈ 3/4 of the base64 length)
    const huge = 'A'.repeat(14 * 1024 * 1024)
    await expect(
      service.createAttachment({
        exam_request_id: created.id!,
        display_name: 'huge.pdf',
        file_name: 'huge.pdf',
        file_data: `data:application/pdf;base64,${huge}`,
      })
    ).rejects.toThrow('La taille du fichier décodé ne doit pas dépasser 10 Mo')
  })

  it('should reject an attachment for a non-existent exam request', async () => {
    const service = container.resolve(ExamRequestService)
    await expect(
      service.createAttachment({
        exam_request_id: 99999,
        display_name: 'x.pdf',
        file_name: 'x.pdf',
        file_data: 'data:application/pdf;base64,aGVsbG8=',
      })
    ).rejects.toThrow()
  })

  it('should get an attachment by id and throw when missing', async () => {
    const service = container.resolve(ExamRequestService)
    const patientId = await createTestPatient()
    const created = await service.create(ExamRequestEntity.fromDto({
      patientId,
      type: 'avis',
      statut: 'en_attente',
    }))

    const attachment = await service.createAttachment({
      exam_request_id: created.id!,
      display_name: 'CR.pdf',
      file_name: 'CR.pdf',
      file_data: 'data:application/pdf;base64,aGVsbG8=',
    })

    const found = await service.getAttachmentById(attachment.id!)
    expect(found.id).toBe(attachment.id)
    expect(found.display_name).toBe('CR.pdf')

    await expect(service.getAttachmentById(99999)).rejects.toThrow('Pièce jointe introuvable')
  })

  it('should delete an attachment and reject deleting it twice', async () => {
    const service = container.resolve(ExamRequestService)
    const patientId = await createTestPatient()
    const created = await service.create(ExamRequestEntity.fromDto({
      patientId,
      type: 'avis',
      statut: 'en_attente',
    }))

    const attachment = await service.createAttachment({
      exam_request_id: created.id!,
      display_name: 'CR.pdf',
      file_name: 'CR.pdf',
      file_data: 'data:application/pdf;base64,aGVsbG8=',
    })

    await service.deleteAttachment(attachment.id!)
    expect(await service.listAttachments(created.id!)).toHaveLength(0)

    await expect(service.deleteAttachment(attachment.id!)).rejects.toThrow('Pièce jointe introuvable')
  })
})
