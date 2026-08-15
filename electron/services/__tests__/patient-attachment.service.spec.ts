import 'reflect-metadata'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import { container } from 'tsyringe'
import { AppDatabaseDatasource } from '../../sqlite-data-source'
import { PatientAttachmentService } from '../patient-attachment.service'

describe('PatientAttachmentService', () => {
  let tempDir: string
  let dbPath: string
  let service: PatientAttachmentService
  let datasource: AppDatabaseDatasource
  let patientId: number
  let patientId2: number

  beforeEach(async () => {
    container.clearInstances()
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cd-patient-attachment-test-'))
    dbPath = path.join(tempDir, 'test.db')
    container.register('DB_PATH', { useValue: dbPath })
    datasource = container.resolve(AppDatabaseDatasource)
    await datasource.initialize()
    service = container.resolve(PatientAttachmentService)
    const db = datasource.getInstance()

    // Create two test patients to verify isolation
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

  it('creates a minimal attachment and returns DTO with id and all fields correct', async () => {
    const result = await service.create({
      patient_id: patientId,
      display_name: 'Ordonnance.pdf',
      file_name: 'ordonnance.pdf',
      mime_type: 'application/pdf',
      file_size: 1024,
      file_data: 'data:application/pdf;base64,dGVzdA==',
    })

    expect(result.id).toBeDefined()
    expect(result.id).toBeGreaterThan(0)
    expect(result.patient_id).toBe(patientId)
    expect(result.display_name).toBe('Ordonnance.pdf')
    expect(result.file_name).toBe('ordonnance.pdf')
    expect(result.mime_type).toBe('application/pdf')
    expect(result.file_size).toBe(1024)
    expect(result.created_at).toBeDefined()
    expect(typeof result.created_at).toBe('string')
    // file_data is returned by create (returningAll on entity)
    expect(result.file_data).toBeDefined()
  })

  it('creates with null mime_type and null file_size (nullable fields)', async () => {
    const result = await service.create({
      patient_id: patientId,
      display_name: 'Photo',
      file_name: 'photo.jpg',
      mime_type: null,
      file_size: null,
      file_data: 'data:image/jpeg;base64,/9j/4AAQ==',
    })

    expect(result.mime_type).toBeNull()
    expect(result.file_size).toBeNull()
  })

  it('creates with base64 data — verifies file_data stored and returned in getById', async () => {
    const fileData =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

    const created = await service.create({
      patient_id: patientId,
      display_name: 'Rapport.png',
      file_name: 'rapport.png',
      mime_type: 'image/png',
      file_size: 1024,
      file_data: fileData,
    })

    const found = await service.getById(created.id!)
    expect(found.file_data).toBe(fileData)
  })

  it('creating without required fields throws (patientId missing)', async () => {
    const promise = service.create({
      display_name: 'Test',
      file_name: 'test.pdf',
      file_data: 'data:,',
    })
    await expect(promise).rejects.toThrow()
  })

  /** The service enforces a 10 MB file size limit. */
  it('rejects fileData that exceeds 10 MB decoded size', async () => {
    // Build a base64 string that decodes to >10 MB
    const bigBase64 = 'data:application/octet-stream;base64,' + 'A'.repeat(15 * 1024 * 1024)

    await expect(
      service.create({
        patient_id: patientId,
        display_name: 'Huge.bin',
        file_name: 'huge.bin',
        mime_type: 'application/octet-stream',
        file_size: 11 * 1024 * 1024,
        file_data: bigBase64,
      }),
    ).rejects.toThrow('La taille du fichier ne doit pas dépasser 10 Mo')
  })

  it('rejects fileData when decoded size exceeds 10 MB even if fileSize is small', async () => {
    const bigBase64 = 'data:application/octet-stream;base64,' + 'A'.repeat(15 * 1024 * 1024)

    await expect(
      service.create({
        patient_id: patientId,
        display_name: 'Huge.bin',
        file_name: 'huge.bin',
        file_data: bigBase64,
        file_size: 100, // small declared size, but decoded is large
      }),
    ).rejects.toThrow('La taille du fichier décodé ne doit pas dépasser 10 Mo')
  })

  // ─── List ───────────────────────────────────────────────────────

  it('lists attachments for a patient — returns only that patient\'s attachments (isolation)', async () => {
    await service.create({
      patient_id: patientId,
      display_name: 'A1',
      file_name: 'a1.pdf',
      file_data: 'data:,',
    })
    await service.create({
      patient_id: patientId,
      display_name: 'A2',
      file_name: 'a2.pdf',
      file_data: 'data:,',
    })
    await service.create({
      patient_id: patientId2,
      display_name: 'B1',
      file_name: 'b1.pdf',
      file_data: 'data:,',
    })

    const list = await service.listByPatient(patientId)

    expect(list.length).toBe(2)
    expect(list.every(a => a.patient_id === patientId)).toBe(true)
  })

  it('returns empty array for patient with no attachments', async () => {
    const list = await service.listByPatient(patientId)
    expect(list).toEqual([])
  })

  it('orders by created_at DESC', async () => {
    const db = datasource.getInstance()

    // Insert an "older" attachment with a past timestamp via raw query
    await db
      .insertInto('patient_attachments')
      .values({
        patient_id: patientId,
        category: 'patient',
        display_name: 'Old Attachment',
        file_name: 'old.pdf',
        file_data: 'data:,old',
        created_at: '2023-01-01 00:00:00',
      })
      .execute()

    // Create a newer attachment via service (uses datetime('now'))
    await service.create({
      patient_id: patientId,
      display_name: 'New Attachment',
      file_name: 'new.pdf',
      file_data: 'data:,new',
    })

    const list = await service.listByPatient(patientId)

    expect(list.length).toBe(2)
    expect(list[0].display_name).toBe('New Attachment')
    expect(list[1].display_name).toBe('Old Attachment')
  })

  it('list does NOT return fileData column (data minimization)', async () => {
    await service.create({
      patient_id: patientId,
      display_name: 'Secret.pdf',
      file_name: 'secret.pdf',
      file_data: 'super-secret-data-should-not-leak',
    })

    const list = await service.listByPatient(patientId)

    expect(list.length).toBe(1)
    expect(list[0].file_data).toBeUndefined()
  })

  it('returns multiple attachments for same patient', async () => {
    await service.create({
      patient_id: patientId,
      display_name: 'A',
      file_name: 'a.pdf',
      file_data: 'data:,a',
    })
    await service.create({
      patient_id: patientId,
      display_name: 'B',
      file_name: 'b.pdf',
      file_data: 'data:,b',
    })
    await service.create({
      patient_id: patientId,
      display_name: 'C',
      file_name: 'c.pdf',
      file_data: 'data:,c',
    })

    const list = await service.listByPatient(patientId)
    expect(list.length).toBe(3)
  })

  // ─── GetById ────────────────────────────────────────────────────

  it('returns full attachment including fileData', async () => {
    const created = await service.create({
      patient_id: patientId,
      display_name: 'Full.pdf',
      file_name: 'full.pdf',
      mime_type: 'application/pdf',
      file_size: 2048,
      file_data: 'data:application/pdf;base64,Zm9v',
    })

    const found = await service.getById(created.id!)

    expect(found.id).toBe(created.id!)
    expect(found.patient_id).toBe(patientId)
    expect(found.display_name).toBe('Full.pdf')
    expect(found.file_name).toBe('full.pdf')
    expect(found.mime_type).toBe('application/pdf')
    expect(found.file_size).toBe(2048)
    expect(found.file_data).toBe('data:application/pdf;base64,Zm9v')
    expect(found.created_at).toBeDefined()
  })

  it('throws French error for non-existent id', async () => {
    await expect(service.getById(9999)).rejects.toThrow('Pièce jointe introuvable')
  })

  it('returns correct file_data for binary content', async () => {
    const binaryData =
      'data:application/octet-stream;base64,AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8='

    const created = await service.create({
      patient_id: patientId,
      display_name: 'Binary.dat',
      file_name: 'binary.dat',
      mime_type: 'application/octet-stream',
      file_size: 32,
      file_data: binaryData,
    })

    const found = await service.getById(created.id!)
    expect(found.file_data).toBe(binaryData)
  })

  // ─── Delete ─────────────────────────────────────────────────────

  it('deletes attachment by id', async () => {
    const created = await service.create({
      patient_id: patientId,
      display_name: 'DeleteMe.pdf',
      file_name: 'delete.pdf',
      file_data: 'data:,',
    })

    await service.delete(created.id!)

    // After delete, getById must throw (row gone)
    await expect(service.getById(created.id!)).rejects.toThrow('Pièce jointe introuvable')
  })

  it('throws French error when deleting non-existent id', async () => {
    await expect(service.delete(9999)).rejects.toThrow('Pièce jointe introuvable')
  })

  it('deleting one attachment does not affect other attachments for same patient', async () => {
    const a1 = await service.create({
      patient_id: patientId,
      display_name: 'A',
      file_name: 'a.pdf',
      file_data: 'data:,a',
    })
    const a2 = await service.create({
      patient_id: patientId,
      display_name: 'B',
      file_name: 'b.pdf',
      file_data: 'data:,b',
    })

    await service.delete(a1.id!)

    const list = await service.listByPatient(patientId)
    expect(list.length).toBe(1)
    expect(list[0].id).toBe(a2.id!)
  })

  it('deleted attachment is not returned in list', async () => {
    const created = await service.create({
      patient_id: patientId,
      display_name: 'Gone.pdf',
      file_name: 'gone.pdf',
      file_data: 'data:,gone',
    })

    // Verify it exists before delete
    const before = await service.listByPatient(patientId)
    expect(before.length).toBe(1)

    await service.delete(created.id!)

    const after = await service.listByPatient(patientId)
    expect(after.find(a => a.id === created.id!)).toBeUndefined()
  })

  // ─── Cascade (ON DELETE CASCADE) ────────────────────────────────

  it('deleting a patient cascades to delete their attachments', async () => {
    const created = await service.create({
      patient_id: patientId,
      display_name: 'Cascaded.pdf',
      file_name: 'cascaded.pdf',
      file_data: 'data:,cascade',
    })

    // Delete the parent patient directly — FK cascade should remove the attachment
    await datasource
      .getInstance()
      .deleteFrom('patient')
      .where('id', '=', patientId)
      .execute()

    // The attachment must be gone
    await expect(service.getById(created.id!)).rejects.toThrow('Pièce jointe introuvable')
  })

  it('cannot create attachment for non-existent patient (FK constraint)', async () => {
    await expect(
      service.create({
        patient_id: 9999,
        display_name: 'Orphan.pdf',
        file_name: 'orphan.pdf',
        file_data: 'data:,',
      }),
    ).rejects.toThrow()
  })

  it('should verify FK constraint fails with descriptive error for invalid patient_id', async () => {
    await expect(
      service.create({
        patient_id: 88888,
        display_name: 'Bad.pdf',
        file_name: 'bad.pdf',
        file_data: 'data:,',
      }),
    ).rejects.toThrow()
  })

  // ─── Edge cases ─────────────────────────────────────────────────

  it('handles very long display_name and file_name', async () => {
    const longName = 'A'.repeat(500)
    const result = await service.create({
      patient_id: patientId,
      display_name: longName,
      file_name: longName + '.pdf',
      file_data: 'data:,long',
    })
    expect(result.display_name).toBe(longName)
    expect(result.file_name).toBe(longName + '.pdf')
  })

  it('handles empty string file_data', async () => {
    const result = await service.create({
      patient_id: patientId,
      display_name: 'Empty.txt',
      file_name: 'empty.txt',
      file_data: '',
    })
    expect(result.id).toBeGreaterThan(0)

    const found = await service.getById(result.id!)
    expect(found.file_data).toBe('')
  })

  it('handles file_data with special characters and unicode', async () => {
    const unicodeData =
      'data:text/plain;base64,' + Buffer.from('Hello 世界 🌍').toString('base64')
    const result = await service.create({
      patient_id: patientId,
      display_name: 'Unicode.txt',
      file_name: 'unicode.txt',
      file_data: unicodeData,
    })
    const found = await service.getById(result.id!)
    expect(found.file_data).toBe(unicodeData)
  })
  // ─── End of tests ────────────────────────────────────────────────

    // ─── Feature 1: Attach files after create (create-then-attach flow) ───
  
    it('can add attachments to a newly created patient (simulates create-then-attach flow)', async () => {
      const db = datasource.getInstance()
      const newPatient = await db.insertInto('patient').values({
        civilite: 'M',
        nom: 'TestAttach',
        prenom: 'CreateFlow',
        date_naissance: '2000-01-01',
        nir: '2000101123457',
        telephone: '0612345679',
      }).returningAll().executeTakeFirstOrThrow()
  
      const attachment = await service.create({
        patient_id: newPatient.id!,
        display_name: 'PostCreate.pdf',
        file_name: 'post-create.pdf',
        file_data: 'data:application/pdf;base64,cG9zdC1jcmVhdGU=',
      })
  
      expect(attachment.id).toBeGreaterThan(0)
      expect(attachment.patient_id).toBe(newPatient.id!)
  
      const list = await service.listByPatient(newPatient.id!)
      expect(list.length).toBe(1)
      expect(list[0].display_name).toBe('PostCreate.pdf')
    })
  
    it('preserves existing attachments when adding new ones after creation', async () => {
      const db = datasource.getInstance()
      const patient = await db.insertInto('patient').values({
        civilite: 'M',
        nom: 'MulitAttach',
        prenom: 'Test',
        date_naissance: '1995-06-15',
        nir: '1950615123458',
        telephone: '0612345680',
      }).returningAll().executeTakeFirstOrThrow()
  
      await service.create({
        patient_id: patient.id!,
        display_name: 'First.pdf',
        file_name: 'first.pdf',
        file_data: 'data:,first',
      })
  
      await service.create({
        patient_id: patient.id!,
        display_name: 'Second.pdf',
        file_name: 'second.pdf',
        file_data: 'data:,second',
      })
  
      const list = await service.listByPatient(patient.id!)
      expect(list.length).toBe(2)
    })
})
