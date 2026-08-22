import type { DocumentAttachmentDto, DocumentAttachmentWithDataDto, CreateDocumentAttachmentDto, UpdateDocumentAttachmentDto } from '../dto/document-attachment.dto'
import { EntityRegistry } from '../automerge/entity-registry'
import { DocumentAttachmentConverter } from '../automerge/converters/document-attachment.converter'
import type { AutomergeDocument } from '../automerge/utils/entity-types'
import { SchemaField, buildDocumentSchema } from '../automerge/utils/schema-field'

export class DocumentAttachmentEntity {
  @SchemaField() id?: number
  @SchemaField() document_id?: string
  @SchemaField() display_name?: string
  @SchemaField() file_name?: string
  @SchemaField() mime_type?: string
  @SchemaField() file_size?: number
  @SchemaField() file_data?: string
  @SchemaField() description?: string
  @SchemaField() created_at?: string

  static toDto(entity: DocumentAttachmentEntity): DocumentAttachmentDto {
    return {
      id: entity.id!,
      document_id: entity.document_id!,
      display_name: entity.display_name!,
      file_name: entity.file_name!,
      mime_type: entity.mime_type ?? undefined,
      file_size: entity.file_size ?? undefined,
      description: entity.description ?? undefined,
      created_at: entity.created_at!,
    }
  }

  static toDtoWithData(entity: DocumentAttachmentEntity): DocumentAttachmentWithDataDto {
    return {
      ...DocumentAttachmentEntity.toDto(entity),
      file_data: entity.file_data,
    }
  }

  static toDtos(entities: DocumentAttachmentEntity[]): DocumentAttachmentDto[] {
    return entities.map(DocumentAttachmentEntity.toDto)
  }

  static fromDto(dto: DocumentAttachmentDto | DocumentAttachmentWithDataDto | CreateDocumentAttachmentDto | UpdateDocumentAttachmentDto): DocumentAttachmentEntity {
    const e = new DocumentAttachmentEntity()
    const anyDto = dto as Record<string, unknown>
    if (anyDto.id != null) e.id = anyDto.id as number
    if (anyDto.document_id != null) e.document_id = anyDto.document_id as string
    if (anyDto.display_name != null) e.display_name = anyDto.display_name as string
    if (anyDto.file_name != null) e.file_name = anyDto.file_name as string
    if (anyDto.mime_type !== undefined) e.mime_type = anyDto.mime_type as string
    if (anyDto.file_size !== undefined) e.file_size = anyDto.file_size as number
    if (anyDto.file_data !== undefined) e.file_data = anyDto.file_data as string
    if (anyDto.description !== undefined) e.description = anyDto.description as string
    if (anyDto.created_at != null) e.created_at = anyDto.created_at as string
    return e
  }

  static documentType(): string { return 'DocumentAttachment' }
  static documentSchema(): AutomergeDocument<DocumentAttachmentEntity> {
    return buildDocumentSchema(DocumentAttachmentEntity) as AutomergeDocument<DocumentAttachmentEntity>
  }
  static register(): void {
    EntityRegistry.getInstance().register({
      type: this.documentType(),
      tableName: 'document_attachment',
      documentSchema: this.documentSchema(),
      converter: { toDocument: DocumentAttachmentConverter.toDocument, toEntity: DocumentAttachmentConverter.toEntity },
    })
  }
}
