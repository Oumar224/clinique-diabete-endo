import type { FormDraftDto } from '../dto/form-draft.dto'

export interface FormDraftRow {
  id: number
  form_type: string
  form_data: string
  patient_id: number | null
  active_step: number
  created_at: string
  updated_at: string
}

export class FormDraftEntity {
  id?: number
  formType?: string
  formData?: string
  patientId?: number | null
  activeStep?: number
  createdAt?: string
  updatedAt?: string

  static createSchema = {
    formType: { type: 'string', required: true },
    formData: { type: 'string', required: true },
    patientId: { type: 'number', optional: true },
    activeStep: { type: 'number', required: true },
  }

  static updateSchema = {
    formData: { type: 'string', optional: true },
    activeStep: { type: 'number', optional: true },
    updatedAt: { type: 'string', optional: true },
  }

  static toDto(entity: FormDraftEntity): FormDraftDto {
    return {
      id: entity.id!,
      formType: entity.formType as 'patient_create' | 'patient_edit',
      formData: entity.formData!,
      patientId: entity.patientId ?? null,
      activeStep: entity.activeStep!,
      createdAt: entity.createdAt!,
      updatedAt: entity.updatedAt!,
    }
  }

  static toDtos(entities: FormDraftEntity[]): FormDraftDto[] {
    return entities.map(FormDraftEntity.toDto)
  }

  static fromRow(row: FormDraftRow): FormDraftEntity {
    const e = new FormDraftEntity()
    e.id = row.id
    e.formType = row.form_type
    e.formData = row.form_data
    e.patientId = row.patient_id
    e.activeStep = row.active_step
    e.createdAt = row.created_at
    e.updatedAt = row.updated_at
    return e
  }

  static fromDto(dto: FormDraftDto): FormDraftEntity {
    const e = new FormDraftEntity()
    e.id = dto.id
    e.formType = dto.formType
    e.formData = dto.formData
    e.patientId = dto.patientId ?? null
    e.activeStep = dto.activeStep
    e.createdAt = dto.createdAt
    e.updatedAt = dto.updatedAt
    return e
  }
}
