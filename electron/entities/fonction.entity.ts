import type { FonctionDto } from '../dto/settings.dto'

export class FonctionEntity {
  id?: number
  name?: string
  is_active?: number
  created_at?: string
  updated_at?: string

  static toDto(entity: FonctionEntity): FonctionDto {
    return { id: entity.id, name: entity.name as string, is_active: entity.is_active as unknown as boolean, created_at: entity.created_at, updated_at: entity.updated_at }
  }
  static toDtos(entities: FonctionEntity[]): FonctionDto[] { return entities.map(FonctionEntity.toDto) }
  static fromDto(dto: FonctionDto): FonctionEntity {
    const e = new FonctionEntity()
    e.id = dto.id; e.name = dto.name; e.is_active = dto.is_active as unknown as number; e.created_at = dto.created_at; e.updated_at = dto.updated_at
    return e
  }
  static documentType(): string { return 'Fonction' }
  static documentSchema(): any { return {} }
  static register(): void {}
}
