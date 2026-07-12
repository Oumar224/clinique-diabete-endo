import type { ExamTypeDto } from '../dto/settings.dto'

export class ExamTypeEntity {
  id?: number
  category_id?: number
  parent_id?: number | null
  code?: string
  name?: string
  is_active?: number
  sort_order?: number
  created_at?: string
  updated_at?: string
  category_name?: string
  parent_name?: string

  static toDto(entity: ExamTypeEntity): ExamTypeDto {
    return {
      id: entity.id,
      category_id: entity.category_id as number,
      parent_id: entity.parent_id ?? null,
      label: entity.name as string,
      is_active: entity.is_active as unknown as boolean,
      category_label: entity.category_name,
      parent_label: entity.parent_name,
      created_at: entity.created_at,
      updated_at: entity.updated_at,
    }
  }
  static toDtos(entities: ExamTypeEntity[]): ExamTypeDto[] { return entities.map(ExamTypeEntity.toDto) }
  static fromDto(dto: Partial<ExamTypeDto>): ExamTypeEntity {
    const e = new ExamTypeEntity()
    if (dto.id != null) e.id = dto.id
    if (dto.category_id != null) e.category_id = dto.category_id
    if (dto.parent_id !== undefined) e.parent_id = dto.parent_id
    if (dto.code != null) e.code = dto.code
    if (dto.label != null) e.name = dto.label
    if (dto.is_active != null) e.is_active = dto.is_active as unknown as number
    e.created_at = dto.created_at
    e.updated_at = dto.updated_at
    return e
  }
  static documentType(): string { return 'ExamType' }
  static documentSchema(): any { return {} }
  static register(): void {}
}
