import type { AttachmentTypeDto, CreateAttachmentTypeDto, UpdateAttachmentTypeDto } from '../dto/attachment-type.dto'
import { EntityRegistry } from '../automerge/entity-registry'
import { AttachmentTypeConverter } from '../automerge/converters/attachment-type.converter'
import type { AutomergeDocument } from '../automerge/utils/entity-types'
import { SchemaField, buildDocumentSchema } from '../automerge/utils/schema-field'

export class AttachmentTypeEntity {
  @SchemaField() id?: number
  @SchemaField() name?: string
  @SchemaField() created_at?: string

  static toDto(entity: AttachmentTypeEntity): AttachmentTypeDto {
    return {
      id: entity.id!,
      name: entity.name!,
      created_at: entity.created_at!,
    }
  }

  static toDtos(entities: AttachmentTypeEntity[]): AttachmentTypeDto[] {
    return entities.map(AttachmentTypeEntity.toDto)
  }

  static fromDto(dto: AttachmentTypeDto | CreateAttachmentTypeDto | UpdateAttachmentTypeDto): AttachmentTypeEntity {
    const e = new AttachmentTypeEntity()
    if ('id' in dto && dto.id != null) e.id = dto.id as number
    e.name = (dto as any).name
    if ('created_at' in dto) e.created_at = (dto as any).created_at
    return e
  }

  static documentType(): string { return 'AttachmentType' }
  static documentSchema(): AutomergeDocument<AttachmentTypeEntity> {
    return buildDocumentSchema(AttachmentTypeEntity) as AutomergeDocument<AttachmentTypeEntity>
  }
  static register(): void {
    EntityRegistry.getInstance().register({
      type: this.documentType(),
      tableName: 'attachment_type',
      documentSchema: this.documentSchema(),
      converter: { toDocument: AttachmentTypeConverter.toDocument, toEntity: AttachmentTypeConverter.toEntity },
    })
  }
}
