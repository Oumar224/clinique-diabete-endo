import { container } from 'tsyringe'
import { createHandler } from '../utils/create-handler'
import { ExportService } from '../services/export.service'
import {
  ACCOUNTING_ROLES,
  LABO_REQUEST_ROLES,
  PHARMACY_ORDER_ROLES,
  PHARMACY_SERVICE_ROLES,
} from '../utils/authorization'

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

  createHandler('export:crc-obesite-pdf', async (params: CrhDiabeteExportParams) => {
    return await exportService.exportCrcObesitePdf(params?.documentId ?? null, params?.formData, params?.patientId ?? null, params?.contactId ?? null)
  })

  createHandler('export:crc-obesite-preview', async (params: CrhDiabeteExportParams) => {
    return await exportService.previewCrcObesite(params?.documentId ?? null, params?.formData, params?.patientId ?? null, params?.contactId ?? null)
  })

  createHandler('export:crc-gesta-pdf', async (params: CrhDiabeteExportParams) => {
    return await exportService.exportCrcGestaPdf(params?.documentId ?? null, params?.formData, params?.patientId ?? null, params?.contactId ?? null)
  })

  createHandler('export:crc-gesta-preview', async (params: CrhDiabeteExportParams) => {
    return await exportService.previewCrcGesta(params?.documentId ?? null, params?.formData, params?.patientId ?? null, params?.contactId ?? null)
  })

  createHandler('export:patients-list-excel', async (filters?: unknown) => {
    return await exportService.exportPatientsListExcel(filters)
  })

  interface PrescriptionExportParams {
    patientId: number
    prescriptionIds?: number[]
    inlinePrescriptions?: Array<{ medicament: string; dosage: string; unite: string; voie: string; duree: number; frequenceType: string; frequence: string[]; prn: boolean; instructions: string }>
    ordonnanceItems?: any[]
  }

  createHandler('export:prescription-preview', async (params: PrescriptionExportParams) => {
    return await exportService.generateOrdonnancePreview(params)
  })

  createHandler('export:prescription-pdf', async (params: PrescriptionExportParams) => {
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

  createHandler('export:invoices-excel', async (filters: { search?: string; status?: string; date_debut?: string; date_fin?: string }) => {
    return await exportService.exportInvoicesExcel(filters)
  })

  createHandler('export:receipt-pdf', async (params: { payment_id?: number; numero_recu?: string }) => {
    return await exportService.exportReceiptPdf(params)
  })

  createHandler('export:payslip-pdf', async (params: { userId: number; periode: string }) => {
    return await exportService.exportPayslipPdf(params)
  }, { roles: ACCOUNTING_ROLES })

  createHandler('export:commande-preview', async (params: { id: number }) => {
    if (!params?.id) throw new Error('id requis')
    return await exportService.previewBonCommandeHtml(params.id)
  }, { roles: PHARMACY_ORDER_ROLES })

  createHandler('export:commande-pdf', async (params: { id: number }) => {
    if (!params?.id) throw new Error('id requis')
    return await exportService.exportBonCommandePdf(params.id)
  }, { roles: PHARMACY_ORDER_ROLES })

  interface ReceptionExportParams {
    commandeId: number
    receptionId: number
  }

  createHandler('export:reception-preview', async (params: ReceptionExportParams) => {
    if (!params?.commandeId) throw new Error('commandeId requis')
    if (!params?.receptionId) throw new Error('receptionId requis')
    return await exportService.previewBonReceptionHtml(params.commandeId, params.receptionId)
  }, { roles: PHARMACY_ORDER_ROLES })

  createHandler('export:reception-pdf', async (params: ReceptionExportParams) => {
    if (!params?.commandeId) throw new Error('commandeId requis')
    if (!params?.receptionId) throw new Error('receptionId requis')
    return await exportService.exportBonReceptionPdf(params.commandeId, params.receptionId)
  }, { roles: PHARMACY_ORDER_ROLES })

  // ═══════════════ Reçus de service (laboratoire / pharmacie) ═══════════════
  // Le reçu est disponible quelle que soit l'origine de la demande (interne ou
  // externe) : les rôles du circuit laboratoire et ceux de la caisse y ont accès.

  const LABO_RECU_ROLES = [...LABO_REQUEST_ROLES, ...ACCOUNTING_ROLES] as const

  createHandler('export:labo-recu-preview', async (params: { id: number }) => {
    if (!params?.id) throw new Error('id requis')
    return await exportService.previewLaboRecuHtml(params.id)
  }, { roles: LABO_RECU_ROLES })

  createHandler('export:labo-recu-pdf', async (params: { id: number }) => {
    if (!params?.id) throw new Error('id requis')
    return await exportService.exportLaboRecuPdf(params.id)
  }, { roles: LABO_RECU_ROLES })

  createHandler('export:pharmacie-recu-preview', async (params: { id: number }) => {
    if (!params?.id) throw new Error('id requis')
    return await exportService.previewPharmacieRecuHtml(params.id)
  }, { roles: PHARMACY_SERVICE_ROLES })

  createHandler('export:pharmacie-recu-pdf', async (params: { id: number }) => {
    if (!params?.id) throw new Error('id requis')
    return await exportService.exportPharmacieRecuPdf(params.id)
  }, { roles: PHARMACY_SERVICE_ROLES })
}
