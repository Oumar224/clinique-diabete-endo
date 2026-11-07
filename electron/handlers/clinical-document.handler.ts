import path from 'path'
import fs from 'fs'
import crypto from 'crypto'
import { app, dialog, shell } from 'electron'
import { container } from 'tsyringe'
import { ClinicalDocumentService } from '../services/clinical-document.service'
import type { CreateDocumentParams } from '../services/clinical-document.service'
import { ExportService } from '../services/export.service'
import { createHandler } from '../utils/create-handler'

export function registerClinicalDocumentHandlers() {
  // ─── List all active document types ─────────────────────────────
  createHandler('clinical-documents:get-types', async () => {
    return await container.resolve(ClinicalDocumentService).getDocumentTypes()
  })

  // ─── List active document types with pricing info (for accordion) ───
  createHandler('clinical-documents:get-types-with-pricing', async () => {
    return await container.resolve(ClinicalDocumentService).getDocumentTypesWithPricing()
  })

  // ─── List documents for a contact ───────────────────────────────
  createHandler('clinical-documents:list', async ({ contactId }: { contactId: string }) => {
    return await container.resolve(ClinicalDocumentService).getDocumentsByContact(contactId)
  })

  createHandler('clinical-documents:count', async ({ contactId }: { contactId: string }) => {
    return await container.resolve(ClinicalDocumentService).countDocumentsByContact(contactId)
  })

  // ─── List documents for a patient ───────────────────────────────
  createHandler('clinical-documents:list-by-patient', async ({ patientId }: { patientId: number }) => {
    return await container.resolve(ClinicalDocumentService).getDocumentsByPatient(patientId)
  })

  // ─── Get single document by ID ──────────────────────────────────
  createHandler('clinical-documents:get', async ({ id }: { id: string }) => {
    return await container.resolve(ClinicalDocumentService).getDocumentById(id)
  })

  // ─── Create a new draft document ────────────────────────────────
  createHandler('clinical-documents:create', async (params: CreateDocumentParams) => {
    return await container.resolve(ClinicalDocumentService).createDocument(params)
  })

  // ─── Create a draft document + linked patient acte ──────────────
  createHandler('clinical-documents:create-with-acte', async (params: CreateDocumentParams) => {
    return await container.resolve(ClinicalDocumentService).createDocumentWithActe(params)
  })

  // ─── Update document form data ──────────────────────────────────
  createHandler('clinical-documents:update-data', async ({ id, formData }: { id: string; formData: Record<string, unknown> }) => {
    return await container.resolve(ClinicalDocumentService).updateDocumentData(id, formData)
  })

  // ─── Sign a document (re-signable) + generate stored PDF ────────
  createHandler('clinical-documents:sign', async ({ id, userId }: { id: string; userId: string }) => {
    const service = container.resolve(ClinicalDocumentService)
    const exportService = container.resolve(ExportService)
    const doc = await service.signDocument(id, userId)
    const pdfPath = await exportService.generateClinicalDocumentPdf(doc.id!)
    return await service.setDocumentPdfPath(doc.id!, pdfPath)
  })

  // ─── Delete a draft document ────────────────────────────────────
  createHandler('clinical-documents:delete', async ({ id }: { id: string }) => {
    await container.resolve(ClinicalDocumentService).deleteDocument(id)
    return { success: true }
  })

  // ─── Check if a contact (encounter) is expired (>24h) ───────────
  createHandler('clinical-documents:check-contact-expired', async ({ contactId }: { contactId: string }) => {
    return await container.resolve(ClinicalDocumentService).isContactExpired(contactId)
  })

  // ─── Admin: list all document types (incl. inactive) ──────────────
  createHandler('clinical-documents:get-all-types', async () => {
    return await container.resolve(ClinicalDocumentService).getAllDocumentTypes()
  })

  // ─── Admin: create document type ──────────────────────────────────
  createHandler('clinical-documents:create-type', async (dto: {
    code: string
    label: string
    description?: string | null
    formSchema: any[]
    category: string
    acteIdDeclenche?: number | null
    contactTypes?: string[]
  }) => {
    return await container.resolve(ClinicalDocumentService).createDocumentType(dto)
  })

  // ─── Admin: update document type ──────────────────────────────────
  createHandler('clinical-documents:update-type', async (dto: {
    id: string
    code?: string
    label?: string
    description?: string | null
    formSchema?: any[]
    category?: string
    acteIdDeclenche?: number | null
    isActive?: boolean
    contactTypes?: string[]
  }) => {
    return await container.resolve(ClinicalDocumentService).updateDocumentType(dto.id, dto)
  })

  // ─── Admin: delete (soft) document type ───────────────────────────
  createHandler('clinical-documents:delete-type', async ({ id }: { id: string }) => {
    await container.resolve(ClinicalDocumentService).deleteDocumentType(id)
    return { success: true }
  })

  // ─── Import a PDF as a clinical document ─────────────────────────
  createHandler('clinical-documents:import-pdf', async (params: {
    contactId: string
    createdBy: string
    siteId?: number | null
  }) => {
    const result = await dialog.showOpenDialog({
      title: 'Importer un PDF',
      filters: [{ name: 'Documents PDF', extensions: ['pdf'] }],
      properties: ['openFile'],
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    const filePath = result.filePaths[0]
    const importDir = path.join(app.getPath('userData'), 'pdf-imports')
    if (!fs.existsSync(importDir)) {
      fs.mkdirSync(importDir, { recursive: true })
    }

    const ext = path.extname(filePath)
    const destName = crypto.randomUUID() + ext
    const destPath = path.join(importDir, destName)
    fs.copyFileSync(filePath, destPath)

    const fileName = path.basename(filePath)

    const service = container.resolve(ClinicalDocumentService)

    // Get encounter to determine service_id
    const encounter = await service.db
      .selectFrom('encounters')
      .select(['service_id'])
      .where('encounters.id', '=', Number(params.contactId))
      .executeTakeFirst()

    const doc = await service.importPdf({
      contactId: params.contactId,
      serviceId: encounter ? String(encounter.service_id) : null,
      siteId: params.siteId ?? null,
      createdBy: params.createdBy,
      pdfPath: destPath,
      title: `PDF: ${fileName}`,
    })

    return doc
  })

  // ─── Import a file (PDF, images, documents) via base64 upload ───
  createHandler('clinical-documents:import-file', async (params: {
    contactId: string
    createdBy: string
    siteId?: number | null
    /** Base64-encoded file content (without data-URL prefix) */
    fileData: string
    /** Original file name including extension (e.g. "scan.pdf") */
    fileName: string
    documentTypeId?: string
    title?: string
  }) => {
    if (!params.fileData || !params.fileName) {
      throw new Error('Données de fichier manquantes')
    }

    const importDir = path.join(app.getPath('userData'), 'pdf-imports')
    if (!fs.existsSync(importDir)) {
      fs.mkdirSync(importDir, { recursive: true })
    }

    // Decode base64 to binary and write to import directory
    const ext = path.extname(params.fileName)
    const destName = crypto.randomUUID() + ext
    const destPath = path.join(importDir, destName)
    const buffer = Buffer.from(params.fileData, 'base64')
    fs.writeFileSync(destPath, buffer)

    const service = container.resolve(ClinicalDocumentService)

    // Get encounter to determine service_id
    const encounter = await service.db
      .selectFrom('encounters')
      .select(['service_id'])
      .where('encounters.id', '=', Number(params.contactId))
      .executeTakeFirst()

    const doc = await service.importPdf({
      contactId: params.contactId,
      serviceId: encounter ? String(encounter.service_id) : null,
      siteId: params.siteId ?? null,
      createdBy: params.createdBy,
      pdfPath: destPath,
      title: params.title,
      documentTypeId: params.documentTypeId,
    })

    return doc
  })

  // ─── Open a PDF file via system default application ──────────────
  createHandler('clinical-documents:open-pdf', async ({ pdfPath }: { pdfPath: string }) => {
    if (!pdfPath || !fs.existsSync(pdfPath)) {
      throw new Error('Fichier PDF introuvable')
    }
    // Fire-and-forget: ShellExecute can hang on some Windows configurations.
    // Awaiting would leave the IPC reply pending ("reply was never sent").
    void shell.openPath(pdfPath)
      .then((errorMessage) => {
        if (errorMessage) console.error(`[clinical-documents:open-pdf] ${errorMessage}`)
      })
      .catch((error) => {
        console.error('[clinical-documents:open-pdf]', error)
      })
    return { success: true }
  })
}
