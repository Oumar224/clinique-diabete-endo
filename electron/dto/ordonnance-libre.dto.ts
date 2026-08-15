export interface OrdonnanceLibreDto {
  id?: string
  contactId?: string
  documentTypeId?: string
  title?: string
  status?: 'draft' | 'signed'
  linkedPrescriptionIds?: number[]
  formData?: Record<string, unknown>
  source?: string
  createdAt?: string
  updatedAt?: string
}
