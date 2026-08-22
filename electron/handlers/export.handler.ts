import { container } from 'tsyringe'
import { createHandler } from '../utils/create-handler'
import { ExportService } from '../services/export.service'

export function registerExportHandlers(): void {
  const exportService = container.resolve(ExportService)

  createHandler('export:users-list-pdf', async (filters?: unknown) => {
    return await exportService.exportUsersListPdf(filters)
  })

  createHandler('export:user-profile-pdf', async (params: { userId: number }) => {
    return await exportService.exportUserProfilePdf(params.userId)
  })

  createHandler('export:users-list-excel', async (filters?: unknown) => {
    return await exportService.exportUsersListExcel(filters)
  })

  createHandler('export:user-profile-excel', async (params: { userId: number }) => {
    return await exportService.exportUserProfileExcel(params.userId)
  })

  createHandler('export:patient-profile-pdf', async (params: { patientId: number }) => {
    return await exportService.exportPatientProfilePdf(params.patientId)
  })

  interface CrhDiabeteExportParams {
    documentId?: string | null
    formData?: Record<string, any>
    patientId?: number | null
    contactId?: string | number | null
  }

  createHandler('export:crh-diabete-pdf', async (params: CrhDiabeteExportParams) => {
    return await exportService.exportCrhDiabetePdf(params?.documentId ?? null, params?.formData, params?.patientId ?? null, params?.contactId ?? null)
  })

  createHandler('export:crc-diabete-pdf', async (params: CrhDiabeteExportParams) => {
    return await exportService.exportCrcDiabetePdf(params?.documentId ?? null, params?.formData, params?.patientId ?? null, params?.contactId ?? null)
  })

  createHandler('export:crh-diabete-preview', async (params: CrhDiabeteExportParams) => {
    return await exportService.previewCrhDiabete(params?.documentId ?? null, params?.formData, params?.patientId ?? null, params?.contactId ?? null)
  })

  createHandler('export:crc-diabete-preview', async (params: CrhDiabeteExportParams) => {
    return await exportService.previewCrcDiabete(params?.documentId ?? null, params?.formData, params?.patientId ?? null, params?.contactId ?? null)
  })

  createHandler('export:patients-list-excel', async (filters?: unknown) => {
    return await exportService.exportPatientsListExcel(filters)
  })

  createHandler('export:prescription-preview', async (params: { patientId: number; prescriptionIds?: number[]; inlinePrescriptions?: Array<{ medicament: string; dosage: string; unite: string; voie: string; duree: number; frequenceType: string; frequence: string[]; prn: boolean; instructions: string }> }) => {
    return await exportService.generateOrdonnancePreview(params)
  })

  createHandler('export:prescription-pdf', async (params: { patientId: number; prescriptionIds?: number[]; inlinePrescriptions?: Array<{ medicament: string; dosage: string; unite: string; voie: string; duree: number; frequenceType: string; frequence: string[]; prn: boolean; instructions: string }> }) => {
    return await exportService.exportOrdonnancePdf(params)
  })

  createHandler('clinical-documents:preview', async ({ docId }: { docId: string }) => {
    return await exportService.previewClinicalDocumentHtml(docId)
  })

  createHandler('clinical-documents:export-pdf', async ({ docId }: { docId: string }) => {
    return await exportService.exportClinicalDocumentPdf(docId)
  })

  createHandler('clinical-documents:export-doc', async ({ docId }: { docId: string }) => {
    return await exportService.exportClinicalDocumentDoc(docId)
  })
}
