import type { StockagePhysiqueDto } from '../dto/conservateur.dto'

export class ConservateurStockageEntity {
  id?: number
  code?: string
  name?: string
  description?: string | null
  sort_order?: number
  is_active?: number
  created_at?: string
  updated_at?: string

  static toDto(entity: ConservateurStockageEntity): StockagePhysiqueDto {
    return {
      id: entity.id,
      code: entity.code!,
      name: entity.name!,
      description: entity.description ?? null,
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
    e.description = dto.description ?? null
    e.sort_order = dto.sort_order
    e.is_active = dto.is_active ? 1 : 0
    e.created_at = dto.created_at
    e.updated_at = dto.updated_at
    return e
  }

  static documentType(): string { return 'ConservateurStockage' }
  static documentSchema(): any { return {} }
  static register(): void { /* No Automerge sync needed */ }
}
