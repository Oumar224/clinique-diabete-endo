export interface FormDraftDto {
  id?: number
  form_type?: 'patient_create' | 'patient_edit'
  form_data?: string
  patient_id?: number
  active_step?: number
  created_at?: string
  updated_at?: string
}
