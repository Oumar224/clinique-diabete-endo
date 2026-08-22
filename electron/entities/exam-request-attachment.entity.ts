import type { ExamRequestAttachmentDto, ExamRequestAttachmentWithDataDto, CreateExamRequestAttachmentDto, UpdateExamRequestAttachmentDto } from '../dto/exam-request-attachment.dto'
import { EntityRegistry } from '../automerge/entity-registry'
import { ExamRequestAttachmentConverter } from '../automerge/converters/exam-request-attachment.converter'
import type { AutomergeDocument } from '../automerge/utils/entity-types'
import { SchemaField, buildDocumentSchema } from '../automerge/utils/schema-field'

export class ExamRequestAttachmentEntity {
  @SchemaField() id?: number
  @SchemaField() exam_request_id?: number
  @SchemaField() display_name?: string
  @SchemaField() file_name?: string
  @SchemaField() mime_type?: string
  @SchemaField() file_size?: number
  @SchemaField() file_data?: string
  @SchemaField() description?: string
  @SchemaField() created_at?: string

  static toDto(entity: ExamRequestAttachmentEntity): ExamRequestAttachmentDto {
    return {
      id: entity.id!,
      exam_request_id: entity.exam_request_id!,
      display_name: entity.display_name!,
      file_name: entity.file_name!,
      mime_type: entity.mime_type ?? undefined,
      file_size: entity.file_size ?? undefined,
      description: entity.description ?? undefined,
      created_at: entity.created_at!,
    }
  }

  static toDtoWithData(entity: ExamRequestAttachmentEntity): ExamRequestAttachmentWithDataDto {
    return {
      ...ExamRequestAttachmentEntity.toDto(entity),
      file_data: entity.file_data,
    }
  }

  static toDtos(entities: ExamRequestAttachmentEntity[]): ExamRequestAttachmentDto[] {
    return entities.map(ExamRequestAttachmentEntity.toDto)
  }

  static fromDto(dto: ExamRequestAttachmentDto | ExamRequestAttachmentWithDataDto | CreateExamRequestAttachmentDto | UpdateExamRequestAttachmentDto): ExamRequestAttachmentEntity {
    const e = new ExamRequestAttachmentEntity()
    const anyDto = dto as Record<string, unknown>
    if (anyDto.id != null) e.id = anyDto.id as number
    if (anyDto.exam_request_id != null) e.exam_request_id = anyDto.exam_request_id as number
    if (anyDto.display_name != null) e.display_name = anyDto.display_name as string
    if (anyDto.file_name != null) e.file_name = anyDto.file_name as string
    if (anyDto.mime_type !== undefined) e.mime_type = anyDto.mime_type as string
    if (anyDto.file_size !== undefined) e.file_size = anyDto.file_size as number
    if (anyDto.file_data !== undefined) e.file_data = anyDto.file_data as string
    if (anyDto.description !== undefined) e.description = anyDto.description as string
    if (anyDto.created_at != null) e.created_at = anyDto.created_at as string
    return e
  }

  static documentType(): string { return 'ExamRequestAttachment' }
  static documentSchema(): AutomergeDocument<ExamRequestAttachmentEntity> {
    return buildDocumentSchema(ExamRequestAttachmentEntity) as AutomergeDocument<ExamRequestAttachmentEntity>
  }
  static register(): void {
    EntityRegistry.getInstance().register({
      type: this.documentType(),
      tableName: 'exam_request_attachment',
      documentSchema: this.documentSchema(),
      converter: { toDocument: ExamRequestAttachmentConverter.toDocument, toEntity: ExamRequestAttachmentConverter.toEntity },
    })
  }
}
