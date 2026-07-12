import type { SpecialtyDto } from '../dto/specialty.dto'

export class SpecialtyEntity {
  id?: number
  name?: string
  code?: string
  title_prefix?: string
  is_active?: number
  created_at?: string
  updated_at?: string

  static toDto(entity: SpecialtyEntity): SpecialtyDto {
    return { id: entity.id, name: entity.name as string, code: entity.code as string, title_prefix: entity.title_prefix as string, is_active: entity.is_active as unknown as boolean, created_at: entity.created_at, updated_at: entity.updated_at }
  }
  static toDtos(entities: SpecialtyEntity[]): SpecialtyDto[] { return entities.map(SpecialtyEntity.toDto) }
  static fromDto(dto: SpecialtyDto): SpecialtyEntity {
    const e = new SpecialtyEntity()
    e.id = dto.id; e.name = dto.name; e.code = dto.code; e.title_prefix = dto.title_prefix; e.is_active = dto.is_active as unknown as number; e.created_at = dto.created_at; e.updated_at = dto.updated_at
    return e
  }
  static documentType(): string { return 'Specialty' }
  static documentSchema(): any { return {} }
  static register(): void {}
}
