import type { FormDraftDto } from '../dto/form-draft.dto'
import { EntityRegistry } from '../automerge/entity-registry'
import { FormDraftConverter } from '../automerge/converters/form-draft.converter'
import type { AutomergeDocument } from '../automerge/utils/entity-types'
import { SchemaField, buildDocumentSchema } from '../automerge/utils/schema-field'

export class FormDraftEntity {
  @SchemaField() id?: number
  @SchemaField() form_type?: string
  @SchemaField() form_data?: string
  @SchemaField() patient_id?: number 
  @SchemaField() active_step?: number
  @SchemaField() created_at?: string
  @SchemaField() updated_at?: string

  static toDto(entity: FormDraftEntity): FormDraftDto {
    return {
      id: entity.id!,
      form_type: entity.form_type as 'patient_create' | 'patient_edit',
      form_data: entity.form_data!,
      patient_id: entity.patient_id ?? undefined,
      active_step: entity.active_step!,
      created_at: entity.created_at!,
      updated_at: entity.updated_at!,
    }
  }

  static toDtos(entities: FormDraftEntity[]): FormDraftDto[] {
    return entities.map(FormDraftEntity.toDto)
  }

  static fromDto(dto: FormDraftDto): FormDraftEntity {
    const e = new FormDraftEntity()
    e.id = dto.id
    e.form_type = dto.form_type
    e.form_data = dto.form_data
    e.patient_id = dto.patient_id ?? undefined
    e.active_step = dto.active_step
    e.created_at = dto.created_at
    e.updated_at = dto.updated_at
    return e
  }

  static documentType(): string { return 'FormDraft' }
  static documentSchema(): AutomergeDocument<FormDraftEntity> {
    return buildDocumentSchema(FormDraftEntity) as AutomergeDocument<FormDraftEntity>
  }
  static register(): void {
    EntityRegistry.getInstance().register({
      type: this.documentType(),
      tableName: 'form_draft',
      documentSchema: this.documentSchema(),
      converter: { toDocument: FormDraftConverter.toDocument, toEntity: FormDraftConverter.toEntity },
    })
  }
}
