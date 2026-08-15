import type { ExamCategoryDto } from '../dto/settings.dto'
import { EntityRegistry } from '../automerge/entity-registry'
import { ExamCategoryConverter } from '../automerge/converters/exam-category.converter'
import type { AutomergeDocument } from '../automerge/utils/entity-types'
import { SchemaField, buildDocumentSchema } from '../automerge/utils/schema-field'

export class ExamCategoryEntity {
  @SchemaField() id?: number
  @SchemaField() code?: string
  @SchemaField() name?: string
  @SchemaField() sort_order?: number
  @SchemaField() created_at?: string
  @SchemaField() updated_at?: string

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
  static documentSchema(): AutomergeDocument<ExamCategoryEntity> {
    return buildDocumentSchema(ExamCategoryEntity) as AutomergeDocument<ExamCategoryEntity>
  }
  static register(): void {
    EntityRegistry.getInstance().register({
      type: this.documentType(),
      tableName: 'exam_category',
      documentSchema: this.documentSchema(),
      converter: { toDocument: ExamCategoryConverter.toDocument, toEntity: ExamCategoryConverter.toEntity },
    })
  }
}
