import type { ExamCategoryDto } from '../dto/settings.dto'

export class ExamCategoryEntity {
  id?: number
  code?: string
  name?: string
  sort_order?: number
  created_at?: string
  updated_at?: string

  static toDto(entity: ExamCategoryEntity): ExamCategoryDto {
    return { id: entity.id, code: entity.code as string, label: entity.name as string, sort_order: entity.sort_order as number }
  }
  static toDtos(entities: ExamCategoryEntity[]): ExamCategoryDto[] { return entities.map(ExamCategoryEntity.toDto) }
  static fromDto(dto: Partial<ExamCategoryDto>): ExamCategoryEntity {
    const e = new ExamCategoryEntity()
    if (dto.id != null) e.id = dto.id
    if (dto.code != null) e.code = dto.code
    if (dto.label != null) e.name = dto.label
    if (dto.sort_order != null) e.sort_order = dto.sort_order
    return e
  }
  static documentType(): string { return 'ExamCategory' }
  static documentSchema(): any { return {} }
  static register(): void {}
}
