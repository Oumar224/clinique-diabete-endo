import type { UserAttachmentDto, CreateAttachmentDto } from '../dto/user-attachment.dto'

export class UserAttachmentEntity {
  id?: number
  user_id?: number
  display_name?: string
  file_name?: string
  mime_type?: string | null
  file_size?: number | null
  file_data?: string
  attachment_type_id?: number | null
  created_at?: string

  static toDto(entity: UserAttachmentEntity): UserAttachmentDto {
    return {
      id: entity.id!,
      user_id: entity.user_id!,
      display_name: entity.display_name!,
      file_name: entity.file_name!,
      mime_type: entity.mime_type ?? null,
      file_size: entity.file_size ?? null,
      file_data: entity.file_data,
      attachment_type_id: entity.attachment_type_id ?? undefined,
      created_at: entity.created_at!,
    }
  }

  static toDtos(entities: UserAttachmentEntity[]): UserAttachmentDto[] {
    return entities.map(UserAttachmentEntity.toDto)
  }

  static fromDto(dto: UserAttachmentDto | CreateAttachmentDto): UserAttachmentEntity {
    const e = new UserAttachmentEntity()
    if ('id' in dto) e.id = dto.id
    e.user_id = dto.user_id
    e.display_name = dto.display_name
    e.file_name = dto.file_name
    e.mime_type = dto.mime_type ?? null
    e.file_size = dto.file_size ?? null
    e.file_data = 'file_data' in dto ? dto.file_data : undefined
    e.attachment_type_id = dto.attachment_type_id ?? null
    if ('created_at' in dto) e.created_at = dto.created_at
    return e
  }

  static documentType(): string { return 'UserAttachment' }
  static documentSchema(): any { return {} }
  static register(): void { /* No Automerge sync needed */ }
}
