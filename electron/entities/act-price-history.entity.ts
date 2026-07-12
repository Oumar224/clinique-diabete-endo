import type { ActPriceHistoryDto } from '../dto/settings.dto'

export class ActPriceHistoryEntity {
  id?: number
  act_id?: number
  old_price?: number | null
  new_price?: number
  change_reason?: string | null
  changed_at?: string

  static toDto(entity: ActPriceHistoryEntity): ActPriceHistoryDto {
    return { id: entity.id as number, act_id: entity.act_id as number, old_price: entity.old_price as number | null, new_price: entity.new_price as number, change_reason: entity.change_reason, changed_at: entity.changed_at as string }
  }
  static toDtos(entities: ActPriceHistoryEntity[]): ActPriceHistoryDto[] { return entities.map(ActPriceHistoryEntity.toDto) }
  static fromDto(dto: ActPriceHistoryDto): ActPriceHistoryEntity {
    const e = new ActPriceHistoryEntity()
    e.id = dto.id; e.act_id = dto.act_id; e.old_price = dto.old_price; e.new_price = dto.new_price; e.change_reason = dto.change_reason; e.changed_at = dto.changed_at
    return e
  }
  static documentType(): string { return 'ActPriceHistory' }
  static documentSchema(): any { return {} }
  static register(): void {}
}
