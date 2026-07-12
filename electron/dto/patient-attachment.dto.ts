export interface PatientAttachmentDto {
  id: number
  patient_id: number
  display_name: string
  file_name: string
  mime_type: string | null
  file_size: number | null
  file_data?: string
  category?: string
  attachment_type_id?: number
  attachment_type_name?: string
  created_at: string
}

export interface CreatePatientAttachmentDto {
  patient_id: number
  display_name: string
  file_name: string
  mime_type?: string | null
  file_size?: number | null
  file_data: string
  category?: string
  attachment_type_id?: number
}

export interface UpdatePatientAttachmentDto {
  id: number
  display_name?: string
  file_name?: string
  mime_type?: string | null
  file_size?: number | null
  file_data?: string
  category?: string
  attachment_type_id?: number | null
}
