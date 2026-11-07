import type { MouvementStockDto } from '../dto/mouvement-stock.dto'
import { SchemaField } from '../automerge/utils/schema-field'

export class MouvementStockEntity {
  @SchemaField() id?: number
  @SchemaField() medicament_id?: number
  @SchemaField() lot_id?: number
  @SchemaField() type?: string
  @SchemaField() quantite?: number
  @SchemaField() stock_avant?: number
  @SchemaField() stock_apres?: number
  @SchemaField() reference_type?: string
  @SchemaField() reference_id?: string
  @SchemaField() motif?: string
  @SchemaField() user_id?: number
  @SchemaField() created_at?: string

  static toDto(entity: MouvementStockEntity): MouvementStockDto {
    return {
      id: entity.id,
      medicamentId: entity.medicament_id,
      lotId: entity.lot_id,
      type: entity.type as MouvementStockDto['type'],
      quantite: entity.quantite,
      stockAvant: entity.stock_avant,
      stockApres: entity.stock_apres,
      referenceType: entity.reference_type as MouvementStockDto['referenceType'],
      referenceId: entity.reference_id,
      motif: entity.motif,
      userId: entity.user_id,
      createdAt: entity.created_at,
    }
  }

  static toDtos(entities: MouvementStockEntity[]): MouvementStockDto[] {
    return entities.map(MouvementStockEntity.toDto)
  }

  static fromDto(dto: MouvementStockDto): MouvementStockEntity {
    const e = new MouvementStockEntity()
    e.id = dto.id
    e.medicament_id = dto.medicamentId
    e.lot_id = dto.lotId
    e.type = dto.type
    e.quantite = dto.quantite
    e.stock_avant = dto.stockAvant
    e.stock_apres = dto.stockApres
    e.reference_type = dto.referenceType
    e.reference_id = dto.referenceId
    e.motif = dto.motif
    e.user_id = dto.userId
    e.created_at = dto.createdAt
    return e
  }

  static documentType(): string { return 'MouvementStock' }
}
