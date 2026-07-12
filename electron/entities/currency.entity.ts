import type { CurrencyDto } from '../dto/settings.dto'

export class CurrencyEntity {
  code?: string
  name?: string
  symbol?: string
  decimals?: number
  is_active?: number

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
  static documentSchema(): any { return {} }
  static register(): void {}
}
