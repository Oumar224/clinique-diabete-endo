import type { UniteStockDto } from '../dto/unite-stock.dto'
import { SchemaField } from '../automerge/utils/schema-field'

export class UniteStockEntity {
  @SchemaField() id?: number
  @SchemaField() nom?: string
  @SchemaField() ordre?: number
  @SchemaField() created_at?: string

  static toDto(entity: UniteStockEntity): UniteStockDto {
    return {
      id: entity.id,
      nom: entity.nom,
      ordre: entity.ordre,
      createdAt: entity.created_at,
    }
  }

  static toDtos(entities: UniteStockEntity[]): UniteStockDto[] {
    return entities.map(UniteStockEntity.toDto)
  }

  static documentType(): string { return 'UniteStock' }
}
