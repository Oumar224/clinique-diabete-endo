import type { DispositifTypeDto } from '../dto/settings.dto'

export class DispositifTypeEntity {
  id?: number
  label?: string
  is_active?: number
  created_at?: string
  updated_at?: string

  static toDto(entity: DispositifTypeEntity): DispositifTypeDto {
    return { id: entity.id, label: entity.label as string, is_active: entity.is_active as unknown as boolean, created_at: entity.created_at, updated_at: entity.updated_at }
  }
  static toDtos(entities: DispositifTypeEntity[]): DispositifTypeDto[] { return entities.map(DispositifTypeEntity.toDto) }
  static fromDto(dto: DispositifTypeDto): DispositifTypeEntity {
    const e = new DispositifTypeEntity()
    e.id = dto.id; e.label = dto.label; e.is_active = dto.is_active as unknown as number; e.created_at = dto.created_at; e.updated_at = dto.updated_at
    return e
  }
  static documentType(): string { return 'DispositifType' }
  static documentSchema(): any { return {} }
  static register(): void {}
}
