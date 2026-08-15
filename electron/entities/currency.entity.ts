import type { CurrencyDto } from '../dto/settings.dto'
import { EntityRegistry } from '../automerge/entity-registry'
import { CurrencyConverter } from '../automerge/converters/currency.converter'
import type { AutomergeDocument } from '../automerge/utils/entity-types'
import { SchemaField, buildDocumentSchema } from '../automerge/utils/schema-field'

export class CurrencyEntity {
  @SchemaField() code?: string
  @SchemaField() name?: string
  @SchemaField() symbol?: string
  @SchemaField() decimals?: number
  @SchemaField() is_active?: number

  static toDto(entity: CurrencyEntity): CurrencyDto {
    return { code: entity.code as string, name: entity.name as string, symbol: entity.symbol as string, decimals: entity.decimals as number, is_active: entity.is_active as unknown as boolean }
  }
  static toDtos(entities: CurrencyEntity[]): CurrencyDto[] { return entities.map(CurrencyEntity.toDto) }
  static fromDto(dto: CurrencyDto): CurrencyEntity {
    const e = new CurrencyEntity()
    e.code = dto.code; e.name = dto.name; e.symbol = dto.symbol; e.decimals = dto.decimals; e.is_active = dto.is_active as unknown as number
    return e
  }
  static documentType(): string { return 'Currency' }
  static documentSchema(): AutomergeDocument<CurrencyEntity> {
    return buildDocumentSchema(CurrencyEntity) as AutomergeDocument<CurrencyEntity>
  }
  static register(): void {
    EntityRegistry.getInstance().register({
      type: this.documentType(),
      tableName: 'currency',
      documentSchema: this.documentSchema(),
      converter: { toDocument: CurrencyConverter.toDocument, toEntity: CurrencyConverter.toEntity },
    })
  }
}
