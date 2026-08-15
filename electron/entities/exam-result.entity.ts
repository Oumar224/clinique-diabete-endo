import type { ExamResultDto } from '../dto/settings.dto'
import { ExamParameterEntity } from './exam-parameter.entity'
import { EntityRegistry } from '../automerge/entity-registry'
import { ExamResultConverter } from '../automerge/converters/exam-result.converter'
import type { AutomergeDocument } from '../automerge/utils/entity-types'
import { SchemaField, buildDocumentSchema } from '../automerge/utils/schema-field'

export class ExamResultEntity {
  @SchemaField() id?: number
  @SchemaField() exam_request_id?: number
  @SchemaField() parameter_id?: number
  @SchemaField() value?: string
  @SchemaField() is_normal?: number
  @SchemaField() filled_by?: number
  @SchemaField() filled_at?: string
  @SchemaField() created_at?: string
  @SchemaField() updated_at?: string
  parameter_name?: string
  parameter_unit?: string
  parameter_input_type?: string
  parameter_reference_values?: string
  filled_by_name?: string
  request_date?: string
  request_status?: string
  exam_name?: string
  validated_at?: string

  static toDto(entity: ExamResultEntity): ExamResultDto {
    return {
      id: entity.id,
      examRequestId: entity.exam_request_id as number,
      parameterId: entity.parameter_id as number,
      value: entity.value ?? undefined,
      isNormal: entity.is_normal != null ? entity.is_normal === 1 : undefined,
      filledBy: entity.filled_by ?? undefined,
      filledAt: entity.filled_at ?? undefined,
      createdAt: entity.created_at,
      parameterName: entity.parameter_name,
      parameterUnit: entity.parameter_unit,
      parameterInputType: entity.parameter_input_type as ExamResultDto['parameterInputType'],
      parameterReferenceValues: entity.parameter_reference_values
        ? ExamParameterEntity.parseReferenceValues(entity.parameter_reference_values)
        : undefined,
      filledByName: entity.filled_by_name,
      requestDate: entity.request_date,
      requestStatus: entity.request_status,
      examName: entity.exam_name,
      validatedAt: entity.validated_at,
    }
  }

  static toDtos(entities: ExamResultEntity[]): ExamResultDto[] {
    return entities.map(ExamResultEntity.toDto)
  }

  static fromDto(dto: Partial<ExamResultDto>): ExamResultEntity {
    const e = new ExamResultEntity()
    if (dto.id != null) e.id = dto.id
    if (dto.examRequestId != null) e.exam_request_id = dto.examRequestId
    if (dto.parameterId != null) e.parameter_id = dto.parameterId
    if (dto.value !== undefined) e.value = dto.value
    if (dto.isNormal !== undefined) e.is_normal = dto.isNormal ? 1 : 0
    if (dto.filledBy != null) e.filled_by = dto.filledBy
    if (dto.filledAt != null) e.filled_at = dto.filledAt
    return e
  }

  static documentType(): string { return 'ExamResult' }
  static documentSchema(): AutomergeDocument<ExamResultEntity> {
    return buildDocumentSchema(ExamResultEntity) as AutomergeDocument<ExamResultEntity>
  }
  static register(): void {
    EntityRegistry.getInstance().register({
      type: this.documentType(),
      tableName: 'exam_result',
      documentSchema: this.documentSchema(),
      converter: { toDocument: ExamResultConverter.toDocument, toEntity: ExamResultConverter.toEntity },
    })
  }
}
