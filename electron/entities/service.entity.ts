import type { ServiceDto } from '../dto/settings.dto'
import { EntityRegistry } from '../automerge/entity-registry'
import { ServiceConverter } from '../automerge/converters/service.converter'
import type { AutomergeDocument } from '../automerge/utils/entity-types'
import { SchemaField, buildDocumentSchema } from '../automerge/utils/schema-field'

export class ServiceEntity {
  @SchemaField() id?: number
  @SchemaField() name?: string
  @SchemaField() description?: string 
  @SchemaField() duration?: number
  @SchemaField() color?: string 
  @SchemaField() sort_order?: number
  @SchemaField() is_active?: number
  @SchemaField() category?: string
  @SchemaField() site_ids?: number[]
  @SchemaField() created_at?: string
  @SchemaField() updated_at?: string

  static toDto(entity: ServiceEntity): ServiceDto {
    return {
      id: entity.id,
      name: entity.name as string,
      description: entity.description,
      duration: entity.duration as number,
      color: entity.color,
      sort_order: entity.sort_order as number,
      is_active: entity.is_active as unknown as boolean,
      category: entity.category ?? 'Consultation',
      site_ids: entity.site_ids,
      created_at: entity.created_at,
      updated_at: entity.updated_at,
    }
  }
  static toDtos(entities: ServiceEntity[]): ServiceDto[] { return entities.map(ServiceEntity.toDto) }
  static fromDto(dto: ServiceDto): ServiceEntity {
    const e = new ServiceEntity()
    e.id = dto.id; e.name = dto.name; e.description = dto.description; e.duration = dto.duration; e.color = dto.color; e.sort_order = dto.sort_order; e.is_active = dto.is_active as unknown as number; e.category = dto.category; e.site_ids = dto.site_ids; e.created_at = dto.created_at; e.updated_at = dto.updated_at
    return e
  }
  static documentType(): string { return 'Service' }
  static documentSchema(): AutomergeDocument<ServiceEntity> { return buildDocumentSchema(ServiceEntity) as AutomergeDocument<ServiceEntity> }
  static register(): void {
    EntityRegistry.getInstance().register({
      type: this.documentType(),
      tableName: 'service',
      documentSchema: this.documentSchema(),
      converter: { toDocument: ServiceConverter.toDocument, toEntity: ServiceConverter.toEntity },
    })
  }
}
