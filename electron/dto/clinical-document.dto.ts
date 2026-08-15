export type ClinicalDocumentStatus = 'draft' | 'signed'

export interface ClinicalDocumentDTO {
  id?: string
  contactId?: string
  serviceId?: string
  documentTypeId?: string
  documentTypeLabel?: string
  documentTypeCode?: string
  title?: string
  status?: ClinicalDocumentStatus
  formData?: string
  source?: string
  pdfPath?: string
  signedAt?: string
  signedBy?: string
  createdBy?: string
  createdAt?: string
  updatedAt?: string
}