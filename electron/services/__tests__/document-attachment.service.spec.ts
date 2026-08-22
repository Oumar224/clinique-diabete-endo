import 'reflect-metadata'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import { container } from 'tsyringe'
import { AppDatabaseDatasource } from '../../sqlite-data-source'
import { DocumentAttachmentService } from '../document-attachment.service'
import { ClinicalDocumentService } from '../clinical-document.service'
import { ServiceService } from '../service.service'

// Fixed UUID seeded by migration 068 (CRH_DIABETE)
const CRH_DIABETE_TYPE_ID = '11111111-1111-4111-1111-111111111111'

const IMG_DATA_URL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

describe('DocumentAttachmentService', () => {
  let tempDir: string
  let dbPath: string
  let service: DocumentAttachmentService
  let datasource: AppDatabaseDatasource
  let documentId: string
  let documentId2: string

  beforeEach(async () => {
    container.clearInstances()
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cd-doc-attachment-test-'))
    dbPath = path.join(tempDir, 'test.db')
    container.register('DB_PATH', { useValue: dbPath })
    datasource = container.resolve(AppDatabaseDatasource)
    await datasource.initialize()
    service = container.resolve(DocumentAttachmentService)
    const db = datasource.getInstance()

    // Create a test user (needed for created_by FK)
    const user = await db
      .insertInto('user')
      .values({
        nom: 'DocTest',
        prenom: 'User',
        email: 'docattach@clinique.test',
        password_hash: 'not-used',
        role: 'MEDECIN',
        is_active: 1,
      })
      .returningAll()
      .executeTakeFirstOrThrow()
    const userId = String(user.id!)

    // Create a test patient
    const patient = await db
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

    // Create a test service via ServiceService to ensure proper defaults
    const svc = await container.resolve(ServiceService).create({
      name: `Service Test Doc ${Date.now()}`,
      code: `DOC-ATTACH-TEST-${Date.now()}`,
    })

    // Create a test encounter (contact)
    const encounter = await db
      .insertInto('encounters')
      .values({
        patient_id: patient.id!,
        contact_type: 'consultation',
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        service_id: svc.id!,
        origin: 'auto_refere',
        zone_situation: 'zone_responsabilite',
        prise_en_charge: 'maladie_naturelle',
        status: 'active',
      })
      .returningAll()
      .executeTakeFirstOrThrow()

    // Create two valid clinical documents to verify isolation
    const docService = container.resolve(ClinicalDocumentService)
    const doc1 = await docService.createDocument({
      contactId: String(encounter.id!),
      documentTypeId: CRH_DIABETE_TYPE_ID,
      createdBy: userId,
    })
    const doc2 = await docService.createDocument({
      contactId: String(encounter.id!),
      documentTypeId: CRH_DIABETE_TYPE_ID,
      createdBy: userId,
    })
    documentId = doc1.id
    documentId2 = doc2.id
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

  it('creates an image attachment and persists the description', async () => {
    const result = await service.create({
      document_id: documentId,
      display_name: 'Photo pied.png',
      file_name: 'photo-pied.png',
      mime_type: 'image/png',
      file_size: 1024,
      file_data: IMG_DATA_URL,
      description: 'Plaie du pied gauche avant traitement',
    })

    expect(result.id).toBeDefined()
    expect(result.document_id).toBe(documentId)
    expect(result.display_name).toBe('Photo pied.png')
    expect(result.file_name).toBe('photo-pied.png')
    expect(result.mime_type).toBe('image/png')
    expect(result.file_size).toBe(1024)
    expect(result.description).toBe('Plaie du pied gauche avant traitement')
    expect(result.created_at).toBeDefined()

    const found = await service.getById(result.id!)
    expect(found.description).toBe('Plaie du pied gauche avant traitement')
  })

  it('creates with null description and nullable fields', async () => {
    const result = await service.create({
      document_id: documentId,
      display_name: 'Scan.pdf',
      file_name: 'scan.pdf',
      mime_type: 'application/pdf',
      file_data: 'data:application/pdf;base64,dGVzdA==',
    })

    expect(result.description).toBeNull()
    expect(result.file_size).toBeNull()
  })

  it('rejects create with a non-existent document_id (FK validation)', async () => {
    await expect(
      service.create({
        document_id: 'non-existent-document-id',
        display_name: 'Orphan.pdf',
        file_name: 'orphan.pdf',
        file_data: 'data:application/pdf;base64,YQ==',
      }),
    ).rejects.toThrow()
  })

  /** The service enforces a 10 MB file size limit. */
  it('rejects file_size that exceeds 10 MB', async () => {
    await expect(
      service.create({
        document_id: documentId,
        display_name: 'Huge.bin',
        file_name: 'huge.bin',
        mime_type: 'application/octet-stream',
        file_size: 11 * 1024 * 1024,
        file_data: 'data:application/octet-stream;base64,dGVzdA==',
      }),
    ).rejects.toThrow('La taille du fichier ne doit pas dépasser 10 Mo')
  })

  it('rejects file_data when decoded size exceeds 10 MB even if fileSize is small', async () => {
    const bigBase64 = 'data:application/octet-stream;base64,' + 'A'.repeat(15 * 1024 * 1024)

    await expect(
      service.create({
        document_id: documentId,
        display_name: 'Huge.bin',
        file_name: 'huge.bin',
        file_data: bigBase64,
        file_size: 100, // small declared size, but decoded is large
      }),
    ).rejects.toThrow('La taille du fichier décodé ne doit pas dépasser 10 Mo')
  })

  it('rejects create when file_data is not a valid base64 data URI', async () => {
    await expect(
      service.create({
        document_id: documentId,
        display_name: 'Malformed.txt',
        file_name: 'malformed.txt',
        file_data: 'data:,foo',
      }),
    ).rejects.toThrow('Format de fichier invalide')
  })

  it('accepts an empty file_data string', async () => {
    const result = await service.create({
      document_id: documentId,
      display_name: 'Vide.txt',
      file_name: 'vide.txt',
      mime_type: 'text/plain',
      file_data: '',
    })

    expect(result.file_data).toBe('')

    const found = await service.getById(result.id!)
    expect(found.file_data).toBe('')
  })

  // ─── List ───────────────────────────────────────────────────────

  it('lists attachments for a document without file_data', async () => {
    await service.create({
      document_id: documentId,
      display_name: 'A1.pdf',
      file_name: 'a1.pdf',
      mime_type: 'application/pdf',
      file_size: 2048,
      file_data: 'data:application/pdf;base64,YTE=',
      description: 'Première',
    })
    await service.create({
      document_id: documentId,
      display_name: 'A2.png',
      file_name: 'a2.png',
      mime_type: 'image/png',
      file_size: 4096,
      file_data: IMG_DATA_URL,
    })

    const list = await service.listByDocument(documentId)

    expect(list).toHaveLength(2)
    expect(list[0].document_id).toBe(documentId)
    // data minimization: list never carries file_data
    expect(list[0].file_data).toBeUndefined()
    expect(list[1].file_data).toBeUndefined()
    // description is part of the list projection
    const a1 = list.find(a => a.display_name === 'A1.pdf')
    expect(a1?.description).toBe('Première')
  })

  it('returns empty array for document with no attachments', async () => {
    const list = await service.listByDocument(documentId)
    expect(list).toEqual([])
  })

  it('orders by created_at DESC', async () => {
    const db = datasource.getInstance()

    // Insert an "older" attachment with a past timestamp via raw query
    await db
      .insertInto('document_attachments')
      .values({
        document_id: documentId,
        display_name: 'Old Attachment',
        file_name: 'old.pdf',
        file_data: 'data:application/pdf;base64,b2xk',
        created_at: '2023-01-01 00:00:00',
      })
      .execute()

    // Create a newer attachment via service (uses datetime('now'))
    await service.create({
      document_id: documentId,
      display_name: 'New Attachment',
      file_name: 'new.pdf',
      file_data: 'data:application/pdf;base64,bmV3',
    })

    const list = await service.listByDocument(documentId)

    expect(list).toHaveLength(2)
    expect(list[0].display_name).toBe('New Attachment')
    expect(list[1].display_name).toBe('Old Attachment')
  })

  it('isolates attachments between documents', async () => {
    await service.create({
      document_id: documentId,
      display_name: 'Doc1.pdf',
      file_name: 'doc1.pdf',
      file_data: 'data:application/pdf;base64,MQ==',
    })
    await service.create({
      document_id: documentId2,
      display_name: 'Doc2.pdf',
      file_name: 'doc2.pdf',
      file_data: 'data:application/pdf;base64,Mg==',
    })

    const list1 = await service.listByDocument(documentId)
    const list2 = await service.listByDocument(documentId2)

    expect(list1).toHaveLength(1)
    expect(list2).toHaveLength(1)
    expect(list1[0].display_name).toBe('Doc1.pdf')
    expect(list2[0].display_name).toBe('Doc2.pdf')
  })

  // ─── Update ─────────────────────────────────────────────────────

  it('updates the description of an attachment', async () => {
    const created = await service.create({
      document_id: documentId,
      display_name: 'Photo.png',
      file_name: 'photo.png',
      mime_type: 'image/png',
      file_data: IMG_DATA_URL,
      description: 'Avant',
    })

    const updated = await service.update(created.id!, 'Après traitement — guérison')

    expect(updated.id).toBe(created.id!)
    expect(updated.description).toBe('Après traitement — guérison')

    const found = await service.getById(created.id!)
    expect(found.description).toBe('Après traitement — guérison')
  })

  it('throws French error when updating a non-existent id', async () => {
    await expect(service.update(9999, 'x')).rejects.toThrow('Pièce jointe introuvable')
  })

  // ─── Delete ─────────────────────────────────────────────────────

  it('deletes an attachment by id', async () => {
    const created = await service.create({
      document_id: documentId,
      display_name: 'DeleteMe.pdf',
      file_name: 'delete.pdf',
      file_data: 'data:application/pdf;base64,YWJj',
    })

    await service.delete(created.id!)

    // After delete, getById must throw (row gone)
    await expect(service.getById(created.id!)).rejects.toThrow('Pièce jointe introuvable')
  })

  it('throws French error when deleting a non-existent id', async () => {
    await expect(service.delete(9999)).rejects.toThrow('Pièce jointe introuvable')
  })

  // ─── GetById ────────────────────────────────────────────────────

  it('returns the attachment including file_data', async () => {
    const created = await service.create({
      document_id: documentId,
      display_name: 'Full.png',
      file_name: 'full.png',
      mime_type: 'image/png',
      file_size: 1024,
      file_data: IMG_DATA_URL,
      description: 'Image complète',
    })

    const found = await service.getById(created.id!)

    expect(found.id).toBe(created.id!)
    expect(found.document_id).toBe(documentId)
    expect(found.display_name).toBe('Full.png')
    expect(found.file_name).toBe('full.png')
    expect(found.mime_type).toBe('image/png')
    expect(found.file_size).toBe(1024)
    expect(found.description).toBe('Image complète')
    expect(found.file_data).toBe(IMG_DATA_URL)
    expect(found.created_at).toBeDefined()
  })

  it('throws French error for non-existent id', async () => {
    await expect(service.getById(9999)).rejects.toThrow('Pièce jointe introuvable')
  })

  // ─── Cascade (ON DELETE CASCADE) ────────────────────────────────

  it('deleting the document cascades to delete its attachments', async () => {
    const created = await service.create({
      document_id: documentId,
      display_name: 'Cascaded.png',
      file_name: 'cascaded.png',
      mime_type: 'image/png',
      file_data: IMG_DATA_URL,
    })

    // Delete the parent document directly — FK cascade should remove the attachment
    await datasource
      .getInstance()
      .deleteFrom('patient_clinical_documents')
      .where('id', '=', documentId)
      .execute()

    // The attachment must be gone
    await expect(service.getById(created.id!)).rejects.toThrow('Pièce jointe introuvable')
    expect(await service.listByDocument(documentId)).toEqual([])
  })

  it('deleting one document leaves attachments of other documents intact', async () => {
    const a1 = await service.create({
      document_id: documentId,
      display_name: 'A.pdf',
      file_name: 'a.pdf',
      file_data: 'data:application/pdf;base64,YQ==',
    })
    await service.create({
      document_id: documentId2,
      display_name: 'B.pdf',
      file_name: 'b.pdf',
      file_data: 'data:application/pdf;base64,Yg==',
    })

    await datasource
      .getInstance()
      .deleteFrom('patient_clinical_documents')
      .where('id', '=', documentId)
      .execute()

    await expect(service.getById(a1.id!)).rejects.toThrow('Pièce jointe introuvable')
    const list2 = await service.listByDocument(documentId2)
    expect(list2).toHaveLength(1)
    expect(list2[0].display_name).toBe('B.pdf')
  })
})
