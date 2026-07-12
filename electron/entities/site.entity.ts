import type { SiteDto } from '../dto/site.dto'

export class SiteEntity {
  id?: number
  name?: string
  address?: string | null
  phone?: string | null
  email?: string | null
  is_default?: number
  is_active?: number
  created_at?: string
  updated_at?: string

  static toDto(entity: SiteEntity): SiteDto {
    return { id: entity.id, name: entity.name as string, address: entity.address, phone: entity.phone, email: entity.email, is_default: entity.is_default as unknown as boolean, is_active: entity.is_active as unknown as boolean, created_at: entity.created_at, updated_at: entity.updated_at }
  }
  static toDtos(entities: SiteEntity[]): SiteDto[] { return entities.map(SiteEntity.toDto) }
  static fromDto(dto: SiteDto): SiteEntity {
    const e = new SiteEntity()
    e.id = dto.id; e.name = dto.name; e.address = dto.address; e.phone = dto.phone; e.email = dto.email; e.is_default = dto.is_default as unknown as number; e.is_active = dto.is_active as unknown as number; e.created_at = dto.created_at; e.updated_at = dto.updated_at
    return e
  }
  static documentType(): string { return 'Site' }
  static documentSchema(): any { return {} }
  static register(): void {}
}
