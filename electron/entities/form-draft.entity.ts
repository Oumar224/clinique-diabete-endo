import type { FormDraftDto } from '../dto/form-draft.dto'

export class FormDraftEntity {
  id?: number
  form_type?: string
  form_data?: string
  patient_id?: number | null
  active_step?: number
  created_at?: string
  updated_at?: string

  static toDto(entity: FormDraftEntity): FormDraftDto {
    return {
      id: entity.id!,
      form_type: entity.form_type as 'patient_create' | 'patient_edit',
      form_data: entity.form_data!,
      patient_id: entity.patient_id ?? null,
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
    e.patient_id = dto.patient_id ?? null
    e.active_step = dto.active_step
    e.created_at = dto.created_at
    e.updated_at = dto.updated_at
    return e
  }

  static documentType(): string { return 'FormDraft' }
  static documentSchema(): any { return {} }
  static register(): void { /* No Automerge sync needed */ }
}
