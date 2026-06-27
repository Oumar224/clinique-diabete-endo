import type { PatientAttachmentDto, CreatePatientAttachmentDto } from '../dto/patient-attachment.dto'

export interface PatientAttachmentRow {
  id: number
  patient_id: number
  display_name: string
  file_name: string
  mime_type: string | null
  file_size: number | null
  file_data: string
  category?: string
  attachment_type_id?: number | null
  created_at: string
}

export class PatientAttachmentEntity {
  id?: number
  patientId?: number
  displayName?: string
  fileName?: string
  mimeType?: string | null
  fileSize?: number | null
  fileData?: string
  category?: string
  attachmentTypeId?: number
  createdAt?: string

  static createSchema = {
    attachmentTypeId: { type: 'number', optional: true },
  }

  static toDto(entity: PatientAttachmentEntity): PatientAttachmentDto {
    return {
      id: entity.id!,
      patientId: entity.patientId!,
      displayName: entity.displayName!,
      fileName: entity.fileName!,
      mimeType: entity.mimeType ?? null,
      fileSize: entity.fileSize ?? null,
      fileData: entity.fileData,
      category: entity.category,
      attachmentTypeId: entity.attachmentTypeId,
      createdAt: entity.createdAt!,
    }
  }

  static toDtos(entities: PatientAttachmentEntity[]): PatientAttachmentDto[] {
    return entities.map(PatientAttachmentEntity.toDto)
  }

  static fromDto(dto: PatientAttachmentDto | CreatePatientAttachmentDto): PatientAttachmentEntity {
    const e = new PatientAttachmentEntity()
    if ('id' in dto) e.id = dto.id
    e.patientId = dto.patientId
    e.displayName = dto.displayName
    e.fileName = dto.fileName
    e.mimeType = dto.mimeType ?? null
    e.fileSize = dto.fileSize ?? null
    e.fileData = 'fileData' in dto ? dto.fileData : undefined
    e.category = dto.category
    e.attachmentTypeId = dto.attachmentTypeId
    if ('createdAt' in dto) e.createdAt = dto.createdAt
    return e
  }
}
