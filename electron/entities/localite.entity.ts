import type { LocaliteDto } from '../dto/localite.dto'
import { EntityRegistry } from '../automerge/entity-registry'
import { LocaliteConverter } from '../automerge/converters/localite.converter'
import type { AutomergeDocument } from '../automerge/utils/entity-types'
import { SchemaField, buildDocumentSchema } from '../automerge/utils/schema-field'

export class LocaliteEntity {
  @SchemaField() id?: number
  @SchemaField() code?: string
  @SchemaField() name?: string
  @SchemaField() type?: string
  @SchemaField() parent_id?: number 
  @SchemaField() country?: string
  @SchemaField() region?: string
  @SchemaField() is_active?: number
  @SchemaField() created_at?: string
  @SchemaField() updated_at?: string

  static toDto(entity: LocaliteEntity): LocaliteDto {
    return { id: entity.id, code: entity.code as string, name: entity.name as string, type: entity.type as 'region' | 'prefecture' | 'commune' | 'sous_prefecture', parent_id: entity.parent_id, country: entity.country as string, region: entity.region, is_active: entity.is_active === 1, created_at: entity.created_at, updated_at: entity.updated_at }
  }
  static toDtos(entities: LocaliteEntity[]): LocaliteDto[] { return entities.map(LocaliteEntity.toDto) }
  static fromDto(dto: LocaliteDto): LocaliteEntity {
    const e = new LocaliteEntity()
    e.id = dto.id; e.code = dto.code; e.name = dto.name; e.type = dto.type; e.parent_id = dto.parent_id; e.country = dto.country; e.region = dto.region; e.is_active = dto.is_active as unknown as number; e.created_at = dto.created_at; e.updated_at = dto.updated_at
    return e
  }
  static documentType(): string { return 'Localite' }
  static documentSchema(): AutomergeDocument<LocaliteEntity> {
    return buildDocumentSchema(LocaliteEntity) as AutomergeDocument<LocaliteEntity>
  }
  static register(): void {
    EntityRegistry.getInstance().register({
      type: this.documentType(),
      tableName: 'localite',
      documentSchema: this.documentSchema(),
      converter: { toDocument: LocaliteConverter.toDocument, toEntity: LocaliteConverter.toEntity },
    })
  }
}
