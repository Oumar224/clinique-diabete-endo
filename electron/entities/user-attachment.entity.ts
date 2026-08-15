import type { UserAttachmentDto, CreateAttachmentDto } from '../dto/user-attachment.dto'
import { EntityRegistry } from '../automerge/entity-registry'
import { UserAttachmentConverter } from '../automerge/converters/user-attachment.converter'
import type { AutomergeDocument } from '../automerge/utils/entity-types'
import { SchemaField, buildDocumentSchema } from '../automerge/utils/schema-field'

export class UserAttachmentEntity {
  @SchemaField() id?: number
  @SchemaField() user_id?: number
  @SchemaField() display_name?: string
  @SchemaField() file_name?: string
  @SchemaField() mime_type?: string
  @SchemaField() file_size?: number
  @SchemaField() file_data?: string
  @SchemaField() attachment_type_id?: number
  @SchemaField() created_at?: string

  static toDto(entity: UserAttachmentEntity): UserAttachmentDto {
    return {
      id: entity.id!,
      user_id: entity.user_id!,
      display_name: entity.display_name!,
      file_name: entity.file_name!,
      mime_type: entity.mime_type ?? undefined,
      file_size: entity.file_size ?? undefined,
      file_data: entity.file_data,
      attachment_type_id: entity.attachment_type_id ?? undefined,
      created_at: entity.created_at!,
    }
  }

  static toDtos(entities: UserAttachmentEntity[]): UserAttachmentDto[] {
    return entities.map(UserAttachmentEntity.toDto)
  }

  static fromDto(dto: UserAttachmentDto | CreateAttachmentDto): UserAttachmentEntity {
    const e = new UserAttachmentEntity()
    if ('id' in dto) e.id = dto.id
    e.user_id = dto.user_id
    e.display_name = dto.display_name
    e.file_name = dto.file_name
    e.mime_type = dto.mime_type ?? undefined
    e.file_size = dto.file_size ?? undefined
    e.file_data = 'file_data' in dto ? dto.file_data : undefined
    e.attachment_type_id = dto.attachment_type_id ?? undefined
    if ('created_at' in dto) e.created_at = dto.created_at
    return e
  }

  static documentType(): string { return 'UserAttachment' }
  static documentSchema(): AutomergeDocument<UserAttachmentEntity> {
    return buildDocumentSchema(UserAttachmentEntity) as AutomergeDocument<UserAttachmentEntity>
  }
  static register(): void {
    EntityRegistry.getInstance().register({
      type: this.documentType(),
      tableName: 'user_attachment',
      documentSchema: this.documentSchema(),
      converter: { toDocument: UserAttachmentConverter.toDocument, toEntity: UserAttachmentConverter.toEntity },
    })
  }
}
