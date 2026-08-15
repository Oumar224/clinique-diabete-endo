import type { ExamParameterDto } from '../dto/settings.dto'
import type { ExamParameterReferenceValues } from '../dto/settings.dto'
import { EntityRegistry } from '../automerge/entity-registry'
import { ExamParameterConverter } from '../automerge/converters/exam-parameter.converter'
import type { AutomergeDocument } from '../automerge/utils/entity-types'
import { SchemaField, buildDocumentSchema } from '../automerge/utils/schema-field'

export class ExamParameterEntity {
  @SchemaField() id?: number
  @SchemaField() exam_id?: number
  @SchemaField() name?: string
  @SchemaField() unit?: string
  @SchemaField() input_type?: string
  @SchemaField() reference_values?: string
  @SchemaField() sort_order?: number
  @SchemaField() is_active?: number
  @SchemaField() created_at?: string
  @SchemaField() updated_at?: string
  // Transient (joined, not synced)
  exam_name?: string

  static parseReferenceValues(json: string | undefined): ExamParameterReferenceValues {
    if (!json) return {}
    try { return JSON.parse(json) } catch { return {} }
  }

  static toDto(entity: ExamParameterEntity): ExamParameterDto {
    return {
      id: entity.id,
      examId: entity.exam_id as number,
      sortOrder: entity.sort_order ?? 0,
      name: entity.name as string,
      unit: entity.unit ?? undefined,
      inputType: entity.input_type as ExamParameterDto['inputType'],
      referenceValues: ExamParameterEntity.parseReferenceValues(entity.reference_values),
      isActive: entity.is_active === 1,
      createdAt: entity.created_at,
      updatedAt: entity.updated_at,
      examName: entity.exam_name,
    }
  }

  static toDtos(entities: ExamParameterEntity[]): ExamParameterDto[] {
    return entities.map(ExamParameterEntity.toDto)
  }

  static fromDto(dto: Partial<ExamParameterDto>): ExamParameterEntity {
    const e = new ExamParameterEntity()
    if (dto.id != null) e.id = dto.id
    if (dto.examId != null) e.exam_id = dto.examId
    if (dto.sortOrder != null) e.sort_order = dto.sortOrder
    if (dto.name != null) e.name = dto.name
    if (dto.unit != null) e.unit = dto.unit
    if (dto.inputType != null) e.input_type = dto.inputType
    if (dto.referenceValues != null) e.reference_values = JSON.stringify(dto.referenceValues)
    if (dto.isActive != null) e.is_active = dto.isActive ? 1 : 0
    return e
  }

  static documentType(): string { return 'ExamParameter' }
  static documentSchema(): AutomergeDocument<ExamParameterEntity> {
    return buildDocumentSchema(ExamParameterEntity) as AutomergeDocument<ExamParameterEntity>
  }
  static register(): void {
    EntityRegistry.getInstance().register({
      type: this.documentType(),
      tableName: 'exam_parameter',
      documentSchema: this.documentSchema(),
      converter: { toDocument: ExamParameterConverter.toDocument, toEntity: ExamParameterConverter.toEntity },
    })
  }
}
