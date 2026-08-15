import type { CareUnitDto } from '../dto/care-unit.dto'
import { EntityRegistry } from '../automerge/entity-registry'
import { CareUnitConverter } from '../automerge/converters/care-unit.converter'
import type { AutomergeDocument } from '../automerge/utils/entity-types'
import { SchemaField, buildDocumentSchema } from '../automerge/utils/schema-field'

export class CareUnitEntity {
  @SchemaField() id?: number
  @SchemaField() service_id?: number
  @SchemaField() name?: string
  @SchemaField() code?: string
  @SchemaField() description?: string
  @SchemaField() is_active?: number
  @SchemaField() sort_order?: number
  @SchemaField() created_at?: string
  @SchemaField() updated_at?: string

  static toDto(entity: CareUnitEntity): CareUnitDto {
    return {
      id: entity.id,
      service_id: entity.service_id as number,
      name: entity.name as string,
      code: entity.code,
      description: entity.description,
      is_active: entity.is_active as unknown as boolean,
      sort_order: entity.sort_order as number,
      created_at: entity.created_at,
      updated_at: entity.updated_at,
    }
  }
  static toDtos(entities: CareUnitEntity[]): CareUnitDto[] { return entities.map(CareUnitEntity.toDto) }
  static fromDto(dto: CareUnitDto): CareUnitEntity {
    const e = new CareUnitEntity()
    e.id = dto.id; e.service_id = dto.service_id; e.name = dto.name; e.code = dto.code; e.description = dto.description; e.is_active = dto.is_active as unknown as number; e.sort_order = dto.sort_order; e.created_at = dto.created_at; e.updated_at = dto.updated_at
    return e
  }
  static documentType(): string { return 'CareUnit' }
  static documentSchema(): AutomergeDocument<CareUnitEntity> {
    return buildDocumentSchema(CareUnitEntity) as AutomergeDocument<CareUnitEntity>
  }
  static register(): void {
    EntityRegistry.getInstance().register({
      type: this.documentType(),
      tableName: 'care_unit',
      documentSchema: this.documentSchema(),
      converter: { toDocument: CareUnitConverter.toDocument, toEntity: CareUnitConverter.toEntity },
    })
  }
}
