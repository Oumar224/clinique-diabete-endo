import { container } from 'tsyringe'
import { ClinicalDocumentService } from '../services/clinical-document.service'
import type { CreateDocumentParams } from '../services/clinical-document.service'
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

  // ─── Sign (lock) a document ─────────────────────────────────────
  createHandler('clinical-documents:sign', async ({ id, userId }: { id: string; userId: string }) => {
    return await container.resolve(ClinicalDocumentService).signDocument(id, userId)
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
  }) => {
    return await container.resolve(ClinicalDocumentService).updateDocumentType(dto.id, dto)
  })

  // ─── Admin: delete (soft) document type ───────────────────────────
  createHandler('clinical-documents:delete-type', async ({ id }: { id: string }) => {
    await container.resolve(ClinicalDocumentService).deleteDocumentType(id)
    return { success: true }
  })
}
