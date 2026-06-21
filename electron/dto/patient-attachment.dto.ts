export interface PatientAttachmentDto {
  id: number
  patientId: number
  displayName: string
  fileName: string
  mimeType: string | null
  fileSize: number | null
  fileData?: string
  category?: string
  createdAt: string
}

export interface CreatePatientAttachmentDto {
  patientId: number
  displayName: string
  fileName: string
  mimeType?: string | null
  fileSize?: number | null
  fileData: string
  category?: string
}
