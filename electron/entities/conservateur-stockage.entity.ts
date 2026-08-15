import type { StockagePhysiqueDto } from '../dto/conservateur.dto'
import { EntityRegistry } from '../automerge/entity-registry'
import { ConservateurStockageConverter } from '../automerge/converters/conservateur-stockage.converter'
import type { AutomergeDocument } from '../automerge/utils/entity-types'
import { SchemaField, buildDocumentSchema } from '../automerge/utils/schema-field'

export class ConservateurStockageEntity {
  @SchemaField() id?: number
  @SchemaField() code?: string
  @SchemaField() name?: string
  @SchemaField() description?: string
  @SchemaField() sort_order?: number
  @SchemaField() is_active?: number
  @SchemaField() created_at?: string
  @SchemaField() updated_at?: string

  static toDto(entity: ConservateurStockageEntity): StockagePhysiqueDto {
    return {
      id: entity.id,
      code: entity.code!,
      name: entity.name!,
      description: entity.description ?? undefined,
      sort_order: entity.sort_order!,
      is_active: entity.is_active === 1,
      created_at: entity.created_at,
      updated_at: entity.updated_at,
    }
  }

  static toDtos(entities: ConservateurStockageEntity[]): StockagePhysiqueDto[] {
    return entities.map(ConservateurStockageEntity.toDto)
  }

  static fromDto(dto: StockagePhysiqueDto): ConservateurStockageEntity {
    const e = new ConservateurStockageEntity()
    e.id = dto.id
    e.code = dto.code
    e.name = dto.name
    e.description = dto.description ?? undefined
    e.sort_order = dto.sort_order
    e.is_active = dto.is_active ? 1 : 0
    e.created_at = dto.created_at
    e.updated_at = dto.updated_at
    return e
  }

  static documentType(): string { return 'ConservateurStockage' }
  static documentSchema(): AutomergeDocument<ConservateurStockageEntity> {
    return buildDocumentSchema(ConservateurStockageEntity) as AutomergeDocument<ConservateurStockageEntity>
  }
  static register(): void {
    EntityRegistry.getInstance().register({
      type: this.documentType(),
      tableName: 'conservateur_stockage',
      documentSchema: this.documentSchema(),
      converter: { toDocument: ConservateurStockageConverter.toDocument, toEntity: ConservateurStockageConverter.toEntity },
    })
  }
}
