import type { CareUnitDto } from '../dto/care-unit.dto'

export class CareUnitEntity {
  id?: number
  service_id?: number
  name?: string
  code?: string | null
  description?: string | null
  is_active?: number
  sort_order?: number
  created_at?: string
  updated_at?: string

  static toDto(entity: CareUnitEntity): CareUnitDto {
    return {
      id: entity.id,
      service_id: entity.service_id as number,
      name: entity.name as string,
      code: entity.code as string | null,
      description: entity.description as string | null,
      is_active: entity.is_active as unknown as boolean,
      sort_order: entity.sort_order as number,
      created_at: entity.created_at,
      updated_at: entity.updated_at,
    }
  }
  static toDtos(entities: CareUnitEntity[]): CareUnitDto[] { return entities.map(CareUnitEntity.toDto) }
  static fromDto(dto: CareUnitDto): CareUnitEntity {
    const e = new CareUnitEntity()
    e.id = dto.id; e.service_id = dto.service_id; e.name = dto.name; e.code = dto.code; e.description = dto.description; e.is_active = dto.is_active as unknown as number; e.sort_order = dto.sort_order; e.created_at = dto.created_at; e.updated_at = dto.updated_at
    return e
  }
  static documentType(): string { return 'CareUnit' }
  static documentSchema(): any { return {} }
  static register(): void {}
}
