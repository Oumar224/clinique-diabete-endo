import type { UserAttachmentDto, CreateAttachmentDto } from '../dto/user-attachment.dto'

export interface UserAttachmentRow {
  id: number
  user_id: number
  display_name: string
  file_name: string
  mime_type: string | null
  file_size: number | null
  file_data: string
  attachment_type_id?: number | null
  created_at: string
}

export class UserAttachmentEntity {
  id?: number
  userId?: number
  displayName?: string
  fileName?: string
  mimeType?: string | null
  fileSize?: number | null
  fileData?: string
  attachmentTypeId?: number
  createdAt?: string

  static createSchema = {
    attachmentTypeId: { type: 'number', optional: true },
  }

  static toDto(entity: UserAttachmentEntity): UserAttachmentDto {
    return {
      id: entity.id!,
      userId: entity.userId!,
      displayName: entity.displayName!,
      fileName: entity.fileName!,
      mimeType: entity.mimeType ?? null,
      fileSize: entity.fileSize ?? null,
      fileData: entity.fileData,
      attachmentTypeId: entity.attachmentTypeId,
      createdAt: entity.createdAt!,
    }
  }

  static toDtos(entities: UserAttachmentEntity[]): UserAttachmentDto[] {
    return entities.map(UserAttachmentEntity.toDto)
  }

  static fromDto(dto: UserAttachmentDto | CreateAttachmentDto): UserAttachmentEntity {
    const e = new UserAttachmentEntity()
    if ('id' in dto) e.id = dto.id
    e.userId = dto.userId
    e.displayName = dto.displayName
    e.fileName = dto.fileName
    e.mimeType = dto.mimeType ?? null
    e.fileSize = dto.fileSize ?? null
    e.fileData = 'fileData' in dto ? dto.fileData : undefined
    e.attachmentTypeId = dto.attachmentTypeId
    if ('createdAt' in dto) e.createdAt = dto.createdAt
    return e
  }
}
