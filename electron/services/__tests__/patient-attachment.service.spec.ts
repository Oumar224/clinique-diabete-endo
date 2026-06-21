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
      patientId,
      displayName: 'Ordonnance.pdf',
      fileName: 'ordonnance.pdf',
      mimeType: 'application/pdf',
      fileSize: 1024,
      fileData: 'data:application/pdf;base64,dGVzdA==',
    })

    expect(result.id).toBeDefined()
    expect(result.id).toBeGreaterThan(0)
    expect(result.patientId).toBe(patientId)
    expect(result.displayName).toBe('Ordonnance.pdf')
    expect(result.fileName).toBe('ordonnance.pdf')
    expect(result.mimeType).toBe('application/pdf')
    expect(result.fileSize).toBe(1024)
    expect(result.createdAt).toBeDefined()
    expect(typeof result.createdAt).toBe('string')
    // fileData is not returned by create (consistent with list DTO)
    expect(result.fileData).toBeUndefined()
  })

  it('creates with null mime_type and null file_size (nullable fields)', async () => {
    const result = await service.create({
      patientId,
      displayName: 'Photo',
      fileName: 'photo.jpg',
      mimeType: null,
      fileSize: null,
      fileData: 'data:image/jpeg;base64,/9j/4AAQ==',
    })

    expect(result.mimeType).toBeNull()
    expect(result.fileSize).toBeNull()
  })

  it('creates with base64 data — verifies file_data stored and returned in getById', async () => {
    const fileData =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

    const created = await service.create({
      patientId,
      displayName: 'Rapport.png',
      fileName: 'rapport.png',
      mimeType: 'image/png',
      fileSize: 1024,
      fileData,
    })

    const found = await service.getById(created.id!)
    expect(found.fileData).toBe(fileData)
  })

  it('creating without required fields throws (patientId missing)', async () => {
    // @ts-expect-error — intentionally omitting required patientId
    const promise = service.create({
      displayName: 'Test',
      fileName: 'test.pdf',
      fileData: 'data:,',
    })
    await expect(promise).rejects.toThrow()
  })

  /** The service enforces a 10 MB file size limit. */
  it('rejects fileData that exceeds 10 MB decoded size', async () => {
    // Build a base64 string that decodes to >10 MB
    const bigBase64 = 'data:application/octet-stream;base64,' + 'A'.repeat(15 * 1024 * 1024)

    await expect(
      service.create({
        patientId,
        displayName: 'Huge.bin',
        fileName: 'huge.bin',
        mimeType: 'application/octet-stream',
        fileSize: 11 * 1024 * 1024,
        fileData: bigBase64,
      }),
    ).rejects.toThrow('La taille du fichier ne doit pas dépasser 10 Mo')
  })

  it('rejects fileData when decoded size exceeds 10 MB even if fileSize is small', async () => {
    const bigBase64 = 'data:application/octet-stream;base64,' + 'A'.repeat(15 * 1024 * 1024)

    await expect(
      service.create({
        patientId,
        displayName: 'Huge.bin',
        fileName: 'huge.bin',
        fileData: bigBase64,
        fileSize: 100, // small declared size, but decoded is large
      }),
    ).rejects.toThrow('La taille du fichier décodé ne doit pas dépasser 10 Mo')
  })

  // ─── List ───────────────────────────────────────────────────────

  it('lists attachments for a patient — returns only that patient\'s attachments (isolation)', async () => {
    await service.create({
      patientId,
      displayName: 'A1',
      fileName: 'a1.pdf',
      fileData: 'data:,',
    })
    await service.create({
      patientId,
      displayName: 'A2',
      fileName: 'a2.pdf',
      fileData: 'data:,',
    })
    await service.create({
      patientId: patientId2,
      displayName: 'B1',
      fileName: 'b1.pdf',
      fileData: 'data:,',
    })

    const list = await service.listByPatient(patientId)

    expect(list.length).toBe(2)
    expect(list.every(a => a.patientId === patientId)).toBe(true)
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
        display_name: 'Old Attachment',
        file_name: 'old.pdf',
        file_data: 'data:,old',
        created_at: '2023-01-01 00:00:00',
      })
      .execute()

    // Create a newer attachment via service (uses datetime('now'))
    await service.create({
      patientId,
      displayName: 'New Attachment',
      fileName: 'new.pdf',
      fileData: 'data:,new',
    })

    const list = await service.listByPatient(patientId)

    expect(list.length).toBe(2)
    expect(list[0].displayName).toBe('New Attachment')
    expect(list[1].displayName).toBe('Old Attachment')
  })

  it('list does NOT return fileData column (data minimization)', async () => {
    await service.create({
      patientId,
      displayName: 'Secret.pdf',
      fileName: 'secret.pdf',
      fileData: 'super-secret-data-should-not-leak',
    })

    const list = await service.listByPatient(patientId)

    expect(list.length).toBe(1)
    expect(list[0].fileData).toBeUndefined()
  })

  it('returns multiple attachments for same patient', async () => {
    await service.create({
      patientId,
      displayName: 'A',
      fileName: 'a.pdf',
      fileData: 'data:,a',
    })
    await service.create({
      patientId,
      displayName: 'B',
      fileName: 'b.pdf',
      fileData: 'data:,b',
    })
    await service.create({
      patientId,
      displayName: 'C',
      fileName: 'c.pdf',
      fileData: 'data:,c',
    })

    const list = await service.listByPatient(patientId)
    expect(list.length).toBe(3)
  })

  // ─── GetById ────────────────────────────────────────────────────

  it('returns full attachment including fileData', async () => {
    const created = await service.create({
      patientId,
      displayName: 'Full.pdf',
      fileName: 'full.pdf',
      mimeType: 'application/pdf',
      fileSize: 2048,
      fileData: 'data:application/pdf;base64,Zm9v',
    })

    const found = await service.getById(created.id!)

    expect(found.id).toBe(created.id!)
    expect(found.patientId).toBe(patientId)
    expect(found.displayName).toBe('Full.pdf')
    expect(found.fileName).toBe('full.pdf')
    expect(found.mimeType).toBe('application/pdf')
    expect(found.fileSize).toBe(2048)
    expect(found.fileData).toBe('data:application/pdf;base64,Zm9v')
    expect(found.createdAt).toBeDefined()
  })

  it('throws French error for non-existent id', async () => {
    await expect(service.getById(9999)).rejects.toThrow('Pièce jointe introuvable')
  })

  it('returns correct file_data for binary content', async () => {
    const binaryData =
      'data:application/octet-stream;base64,AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8='

    const created = await service.create({
      patientId,
      displayName: 'Binary.dat',
      fileName: 'binary.dat',
      mimeType: 'application/octet-stream',
      fileSize: 32,
      fileData: binaryData,
    })

    const found = await service.getById(created.id!)
    expect(found.fileData).toBe(binaryData)
  })

  // ─── Delete ─────────────────────────────────────────────────────

  it('deletes attachment by id', async () => {
    const created = await service.create({
      patientId,
      displayName: 'DeleteMe.pdf',
      fileName: 'delete.pdf',
      fileData: 'data:,',
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
      patientId,
      displayName: 'A',
      fileName: 'a.pdf',
      fileData: 'data:,a',
    })
    const a2 = await service.create({
      patientId,
      displayName: 'B',
      fileName: 'b.pdf',
      fileData: 'data:,b',
    })

    await service.delete(a1.id!)

    const list = await service.listByPatient(patientId)
    expect(list.length).toBe(1)
    expect(list[0].id).toBe(a2.id!)
  })

  it('deleted attachment is not returned in list', async () => {
    const created = await service.create({
      patientId,
      displayName: 'Gone.pdf',
      fileName: 'gone.pdf',
      fileData: 'data:,gone',
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
      patientId,
      displayName: 'Cascaded.pdf',
      fileName: 'cascaded.pdf',
      fileData: 'data:,cascade',
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
        patientId: 9999,
        displayName: 'Orphan.pdf',
        fileName: 'orphan.pdf',
        fileData: 'data:,',
      }),
    ).rejects.toThrow()
  })

  // ─── Edge cases ─────────────────────────────────────────────────

  it('handles very long display_name and file_name', async () => {
    const longName = 'A'.repeat(500)
    const result = await service.create({
      patientId,
      displayName: longName,
      fileName: longName + '.pdf',
      fileData: 'data:,long',
    })
    expect(result.displayName).toBe(longName)
    expect(result.fileName).toBe(longName + '.pdf')
  })

  it('handles empty string file_data', async () => {
    const result = await service.create({
      patientId,
      displayName: 'Empty.txt',
      fileName: 'empty.txt',
      fileData: '',
    })
    expect(result.id).toBeGreaterThan(0)

    const found = await service.getById(result.id!)
    expect(found.fileData).toBe('')
  })

  it('handles file_data with special characters and unicode', async () => {
    const unicodeData =
      'data:text/plain;base64,' + Buffer.from('Hello 世界 🌍').toString('base64')
    const result = await service.create({
      patientId,
      displayName: 'Unicode.txt',
      fileName: 'unicode.txt',
      fileData: unicodeData,
    })
    const found = await service.getById(result.id!)
    expect(found.fileData).toBe(unicodeData)
  })
})
