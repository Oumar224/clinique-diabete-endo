export interface FormDraftDto {
  id?: number
  formType: 'patient_create' | 'patient_edit'
  formData: string       // JSON string
  patientId?: number | null
  activeStep: number
  createdAt?: string
  updatedAt?: string
}
