import type { PatientAttachmentDto, CreatePatientAttachmentDto, UpdatePatientAttachmentDto } from '../dto/patient-attachment.dto'

export class PatientAttachmentEntity {
  id?: number
  patient_id?: number
  display_name?: string
  file_name?: string
  mime_type?: string | null
  file_size?: number | null
  file_data?: string
  category?: string
  attachment_type_id?: number | null
  created_at?: string

  static toDto(entity: PatientAttachmentEntity): PatientAttachmentDto {
    return {
      id: entity.id!,
      patient_id: entity.patient_id!,
      display_name: entity.display_name!,
      file_name: entity.file_name!,
      mime_type: entity.mime_type ?? null,
      file_size: entity.file_size ?? null,
      file_data: entity.file_data,
      category: entity.category,
      attachment_type_id: entity.attachment_type_id ?? undefined,
      created_at: entity.created_at!,
    }
  }

  static toDtos(entities: PatientAttachmentEntity[]): PatientAttachmentDto[] {
    return entities.map(PatientAttachmentEntity.toDto)
  }

  static fromDto(dto: PatientAttachmentDto | CreatePatientAttachmentDto | UpdatePatientAttachmentDto): PatientAttachmentEntity {
    const e = new PatientAttachmentEntity()
    const anyDto = dto as unknown as Record<string, unknown>
    if (anyDto.id != null) e.id = anyDto.id as number
    if (anyDto.patient_id != null) e.patient_id = anyDto.patient_id as number
    if (anyDto.display_name != null) e.display_name = anyDto.display_name as string
    if (anyDto.file_name != null) e.file_name = anyDto.file_name as string
    if (anyDto.mime_type !== undefined) e.mime_type = anyDto.mime_type as string | null
    if (anyDto.file_size !== undefined) e.file_size = anyDto.file_size as number | null
    if (anyDto.file_data !== undefined) e.file_data = anyDto.file_data as string
    if (anyDto.category !== undefined) e.category = anyDto.category as string
    if (anyDto.attachment_type_id !== undefined) e.attachment_type_id = anyDto.attachment_type_id as number | null
    if (anyDto.created_at != null) e.created_at = anyDto.created_at as string
    return e
  }

  static documentType(): string { return 'PatientAttachment' }
  static documentSchema(): any { return {} }
  static register(): void { /* No Automerge sync needed */ }
}
