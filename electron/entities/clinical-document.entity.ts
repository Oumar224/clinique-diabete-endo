export type ClinicalDocumentStatus = 'draft' | 'signed'

export interface ClinicalDocumentDTO {
  id: string
  contactId: string
  serviceId: string | null
  documentTypeId: string
  documentTypeLabel?: string
  documentTypeCode?: string
  title: string | null
  status: ClinicalDocumentStatus
  formData: string | null
  signedAt: string | null
  signedBy: string | null
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface ClinicalDocumentRow {
  id: string
  contact_id: string
  service_id: string | null
  document_type_id: string
  document_type_label?: string
  document_type_code?: string
  title: string | null
  status: string
  form_data: string | null
  signed_at: string | null
  signed_by: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export class ClinicalDocumentEntity {
  id?: string
  contact_id?: string
  service_id?: string | null
  document_type_id?: string
  title?: string | null
  status?: string
  form_data?: string | null
  signed_at?: string | null
  signed_by?: string | null
  created_by?: string
  created_at?: string
  updated_at?: string

  static toDto(
    entity: ClinicalDocumentRow,
  ): ClinicalDocumentDTO {
    return {
      id: entity.id,
      contactId: entity.contact_id,
      serviceId: entity.service_id ?? null,
      documentTypeId: entity.document_type_id,
      documentTypeLabel: entity.document_type_label,
      documentTypeCode: entity.document_type_code,
      title: entity.title ?? null,
      status: entity.status as ClinicalDocumentStatus,
      formData: entity.form_data ?? null,
      signedAt: entity.signed_at ?? null,
      signedBy: entity.signed_by ?? null,
      createdBy: entity.created_by,
      createdAt: entity.created_at,
      updatedAt: entity.updated_at,
    }
  }

  static toDtos(entities: ClinicalDocumentRow[]): ClinicalDocumentDTO[] {
    return entities.map(ClinicalDocumentEntity.toDto)
  }

  static fromDto(dto: ClinicalDocumentDTO): ClinicalDocumentEntity {
    const e = new ClinicalDocumentEntity()
    e.id = dto.id
    e.contact_id = dto.contactId
    e.service_id = dto.serviceId ?? null
    e.document_type_id = dto.documentTypeId
    e.title = dto.title ?? null
    e.status = dto.status
    e.form_data = dto.formData ?? null
    e.signed_at = dto.signedAt ?? null
    e.signed_by = dto.signedBy ?? null
    e.created_by = dto.createdBy
    e.created_at = dto.createdAt
    e.updated_at = dto.updatedAt
    return e
  }

  static documentType(): string {
    return 'ClinicalDocument'
  }

  static documentSchema(): unknown {
    return {}
  }

  static register(): void {
    /* No Automerge sync needed */
  }
}
