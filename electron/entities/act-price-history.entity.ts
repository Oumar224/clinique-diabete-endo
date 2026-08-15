import type { ActPriceHistoryDto } from '../dto/settings.dto'
import { EntityRegistry } from '../automerge/entity-registry'
import { ActPriceHistoryConverter } from '../automerge/converters/act-price-history.converter'
import type { AutomergeDocument } from '../automerge/utils/entity-types'
import { SchemaField, buildDocumentSchema } from '../automerge/utils/schema-field'

export class ActPriceHistoryEntity {
  @SchemaField() id?: number
  @SchemaField() act_id?: number
  @SchemaField() old_price?: number
  @SchemaField() new_price?: number
  @SchemaField() change_reason?: string
  @SchemaField() changed_at?: string

  static toDto(entity: ActPriceHistoryEntity): ActPriceHistoryDto {
    return { id: entity.id as number, act_id: entity.act_id as number, old_price: entity.old_price, new_price: entity.new_price as number, change_reason: entity.change_reason, changed_at: entity.changed_at as string }
  }
  static toDtos(entities: ActPriceHistoryEntity[]): ActPriceHistoryDto[] { return entities.map(ActPriceHistoryEntity.toDto) }
  static fromDto(dto: ActPriceHistoryDto): ActPriceHistoryEntity {
    const e = new ActPriceHistoryEntity()
    e.id = dto.id; e.act_id = dto.act_id; e.old_price = dto.old_price; e.new_price = dto.new_price; e.change_reason = dto.change_reason; e.changed_at = dto.changed_at
    return e
  }
  static documentType(): string { return 'ActPriceHistory' }
  static documentSchema(): AutomergeDocument<ActPriceHistoryEntity> {
    return buildDocumentSchema(ActPriceHistoryEntity) as AutomergeDocument<ActPriceHistoryEntity>
  }
  static register(): void {
    EntityRegistry.getInstance().register({
      type: this.documentType(),
      tableName: 'act_price_history',
      documentSchema: this.documentSchema(),
      converter: { toDocument: ActPriceHistoryConverter.toDocument, toEntity: ActPriceHistoryConverter.toEntity },
    })
  }
}
