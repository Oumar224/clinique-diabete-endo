import { EntityRegistry } from '../automerge/entity-registry'
import { ContactOriginConverter } from '../automerge/converters/contact-origin.converter'
import type { AutomergeDocument } from '../automerge/utils/entity-types'
import { SchemaField, buildDocumentSchema } from '../automerge/utils/schema-field'
import type { ContactOriginDto } from '../dto/contact-origin.dto'

export class ContactOriginEntity {
  @SchemaField() id?: number
  @SchemaField() value?: string
  @SchemaField() label?: string
  @SchemaField() sort_order?: number
  @SchemaField() is_active?: number
  @SchemaField() created_at?: string
  @SchemaField() updated_at?: string

  static toDto(entity: ContactOriginEntity): ContactOriginDto {
    return {
      id: entity.id!,
      value: entity.value!,
      label: entity.label!,
      sort_order: entity.sort_order!,
      is_active: entity.is_active === 1,
      created_at: entity.created_at,
      updated_at: entity.updated_at,
    }
  }

  static toDtos(entities: ContactOriginEntity[]): ContactOriginDto[] {
    return entities.map(ContactOriginEntity.toDto)
  }

  static fromDto(dto: ContactOriginDto): ContactOriginEntity {
    const e = new ContactOriginEntity()
    e.id = dto.id
    e.value = dto.value
    e.label = dto.label
    e.sort_order = dto.sort_order
    e.is_active = dto.is_active ? 1 : 0
    e.created_at = dto.created_at
    e.updated_at = dto.updated_at
    return e
  }

  static documentType(): string { return 'ContactOrigin' }
  static documentSchema(): AutomergeDocument<ContactOriginEntity> { return buildDocumentSchema(ContactOriginEntity) as AutomergeDocument<ContactOriginEntity> }
  static register(): void {
    EntityRegistry.getInstance().register({
      type: this.documentType(),
      tableName: 'contact_origin',
      documentSchema: this.documentSchema(),
      converter: { toDocument: ContactOriginConverter.toDocument, toEntity: ContactOriginConverter.toEntity },
    })
  }
}
