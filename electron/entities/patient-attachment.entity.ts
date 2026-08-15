import type { PatientAttachmentDto, CreatePatientAttachmentDto, UpdatePatientAttachmentDto } from '../dto/patient-attachment.dto'
import { EntityRegistry } from '../automerge/entity-registry'
import { PatientAttachmentConverter } from '../automerge/converters/patient-attachment.converter'
import type { AutomergeDocument } from '../automerge/utils/entity-types'
import { SchemaField, buildDocumentSchema } from '../automerge/utils/schema-field'

export class PatientAttachmentEntity {
  @SchemaField() id?: number
  @SchemaField() patient_id?: number
  @SchemaField() display_name?: string
  @SchemaField() file_name?: string
  @SchemaField() mime_type?: string 
  @SchemaField() file_size?: number 
  @SchemaField() file_data?: string
  @SchemaField() category?: string
  @SchemaField() attachment_type_id?: number 
  @SchemaField() created_at?: string

  static toDto(entity: PatientAttachmentEntity): PatientAttachmentDto {
    return {
      id: entity.id!,
      patient_id: entity.patient_id!,
      display_name: entity.display_name!,
      file_name: entity.file_name!,
      mime_type: entity.mime_type ?? undefined,
      file_size: entity.file_size ?? undefined,
      file_data: entity.file_data,
      category: entity.category,
      attachment_type_id: entity.attachment_type_id ?? undefined,
      created_at: entity.created_at!,
    }
  }

  static toDtos(entities: PatientAttachmentEntity[]): PatientAttachmentDto[] {
    return entities.map(PatientAttachmentEntity.toDto)
  }

  static fromDto(dto: PatientAttachmentDto | CreatePatientAttachmentDto | UpdatePatientAttachmentDto): PatientAttachmentEntity {
    const e = new PatientAttachmentEntity()
    const anyDto = dto as Record<string, unknown>
    if (anyDto.id != null) e.id = anyDto.id as number
    if (anyDto.patient_id != null) e.patient_id = anyDto.patient_id as number
    if (anyDto.display_name != null) e.display_name = anyDto.display_name as string
    if (anyDto.file_name != null) e.file_name = anyDto.file_name as string
    if (anyDto.mime_type !== undefined) e.mime_type = anyDto.mime_type as string
    if (anyDto.file_size !== undefined) e.file_size = anyDto.file_size as number
    if (anyDto.file_data !== undefined) e.file_data = anyDto.file_data as string
    if (anyDto.category !== undefined) e.category = anyDto.category as string
    if (anyDto.attachment_type_id !== undefined) e.attachment_type_id = anyDto.attachment_type_id as number
    if (anyDto.created_at != null) e.created_at = anyDto.created_at as string
    return e
  }

  static documentType(): string { return 'PatientAttachment' }
  static documentSchema(): AutomergeDocument<PatientAttachmentEntity> {
    return buildDocumentSchema(PatientAttachmentEntity) as AutomergeDocument<PatientAttachmentEntity>
  }
  static register(): void {
    EntityRegistry.getInstance().register({
      type: this.documentType(),
      tableName: 'patient_attachment',
      documentSchema: this.documentSchema(),
      converter: { toDocument: PatientAttachmentConverter.toDocument, toEntity: PatientAttachmentConverter.toEntity },
    })
  }
}
