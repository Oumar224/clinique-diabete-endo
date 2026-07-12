import type { LocaliteDto } from '../dto/localite.dto'

export class LocaliteEntity {
  id?: number
  code?: string
  name?: string
  type?: string
  parent_id?: number | null
  country?: string
  region?: string
  is_active?: number
  created_at?: string
  updated_at?: string

  static toDto(entity: LocaliteEntity): LocaliteDto {
    return { id: entity.id, code: entity.code as string, name: entity.name as string, type: entity.type as 'region' | 'prefecture' | 'commune' | 'sous_prefecture', parent_id: entity.parent_id, country: entity.country as string, region: entity.region, is_active: entity.is_active === 1, created_at: entity.created_at, updated_at: entity.updated_at }
  }
  static toDtos(entities: LocaliteEntity[]): LocaliteDto[] { return entities.map(LocaliteEntity.toDto) }
  static fromDto(dto: LocaliteDto): LocaliteEntity {
    const e = new LocaliteEntity()
    e.id = dto.id; e.code = dto.code; e.name = dto.name; e.type = dto.type; e.parent_id = dto.parent_id; e.country = dto.country; e.region = dto.region; e.is_active = dto.is_active as unknown as number; e.created_at = dto.created_at; e.updated_at = dto.updated_at
    return e
  }
  static documentType(): string { return 'Localite' }
  static documentSchema(): any { return {} }
  static register(): void {}
}
