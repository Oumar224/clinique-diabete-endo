import type { VoieTypeDto } from '../dto/settings.dto'

export class VoieTypeEntity {
  id?: number
  label?: string
  is_active?: number
  created_at?: string
  updated_at?: string

  static toDto(entity: VoieTypeEntity): VoieTypeDto {
    return { id: entity.id, label: entity.label as string, is_active: entity.is_active as unknown as boolean, created_at: entity.created_at, updated_at: entity.updated_at }
  }
  static toDtos(entities: VoieTypeEntity[]): VoieTypeDto[] { return entities.map(VoieTypeEntity.toDto) }
  static fromDto(dto: VoieTypeDto): VoieTypeEntity {
    const e = new VoieTypeEntity()
    e.id = dto.id; e.label = dto.label; e.is_active = dto.is_active as unknown as number; e.created_at = dto.created_at; e.updated_at = dto.updated_at
    return e
  }
  static documentType(): string { return 'VoieType' }
  static documentSchema(): any { return {} }
  static register(): void {}
}
