import type { ClinicalDocumentDTO, ClinicalDocumentStatus } from '../dto/clinical-document.dto'
import { EntityRegistry } from '../automerge/entity-registry'
import { ClinicalDocumentConverter } from '../automerge/converters/clinical-document.converter'
import type { AutomergeDocument } from '../automerge/utils/entity-types'
import { SchemaField, buildDocumentSchema } from '../automerge/utils/schema-field'

export class ClinicalDocumentEntity {
  @SchemaField() id?: string
  @SchemaField() contact_id?: string
  @SchemaField() service_id?: string
  @SchemaField() site_id?: number
  @SchemaField() document_type_id?: string
  @SchemaField() title?: string
  @SchemaField() status?: string
  @SchemaField() form_data?: string
  @SchemaField() source?: string
  @SchemaField() pdf_path?: string
  @SchemaField() signed_at?: string
  @SchemaField() signed_by?: string
  @SchemaField() created_by?: string
  @SchemaField() created_at?: string
  @SchemaField() updated_at?: string

  // Joined fields (populated by SQL JOIN queries)
  document_type_label?: string
  document_type_code?: string
  site_name?: string

  static toDto(entity: ClinicalDocumentEntity): ClinicalDocumentDTO {
    return {
      id: entity.id!,
      contactId: entity.contact_id!,
      serviceId: entity.service_id,
      siteId: entity.site_id,
      siteName: entity.site_name,
      documentTypeId: entity.document_type_id!,
      documentTypeLabel: entity.document_type_label,
      documentTypeCode: entity.document_type_code,
      title: entity.title,
      status: entity.status as ClinicalDocumentStatus,
      formData: entity.form_data,
      source: entity.source ?? 'created',
      pdfPath: entity.pdf_path,
      signedAt: entity.signed_at,
      signedBy: entity.signed_by,
      createdBy: entity.created_by!,
      createdAt: entity.created_at!,
      updatedAt: entity.updated_at!,
    }
  }

  static toDtos(entities: ClinicalDocumentEntity[]): ClinicalDocumentDTO[] {
    return entities.map(ClinicalDocumentEntity.toDto)
  }

  static fromDto(dto: ClinicalDocumentDTO): ClinicalDocumentEntity {
    const e = new ClinicalDocumentEntity()
    e.id = dto.id
    e.contact_id = dto.contactId
    e.service_id = dto.serviceId
    e.site_id = dto.siteId
    e.document_type_id = dto.documentTypeId
    e.title = dto.title
    e.status = dto.status
    e.form_data = dto.formData
    e.source = dto.source ?? 'created'
    e.pdf_path = dto.pdfPath
    e.signed_at = dto.signedAt
    e.signed_by = dto.signedBy
    e.created_by = dto.createdBy
    e.created_at = dto.createdAt
    e.updated_at = dto.updatedAt
    return e
  }

  static documentType(): string {
    return 'ClinicalDocument'
  }

  static documentSchema(): AutomergeDocument<ClinicalDocumentEntity> {
    return buildDocumentSchema(ClinicalDocumentEntity) as AutomergeDocument<ClinicalDocumentEntity>
  }

  static register(): void {
    EntityRegistry.getInstance().register({
      type: this.documentType(),
      tableName: 'clinical_document',
      documentSchema: this.documentSchema(),
      converter: { toDocument: ClinicalDocumentConverter.toDocument, toEntity: ClinicalDocumentConverter.toEntity },
    })
  }
}