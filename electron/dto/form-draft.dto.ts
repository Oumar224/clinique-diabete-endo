export interface FormDraftDto {
  id?: number
  form_type: 'patient_create' | 'patient_edit'
  form_data: string       // JSON string
  patient_id?: number | null
  active_step: number
  created_at?: string
  updated_at?: string
}
