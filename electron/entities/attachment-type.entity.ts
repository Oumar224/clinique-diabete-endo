import type { AttachmentTypeDto, CreateAttachmentTypeDto, UpdateAttachmentTypeDto } from '../dto/attachment-type.dto'

export interface AttachmentTypeRow {
  id: number
  name: string
  created_at: string
}

export class AttachmentTypeEntity {
  id?: number
  name?: string
  createdAt?: string

  static createSchema = {
    name: { type: 'string', required: true },
  }

  static updateSchema = {
    name: { type: 'string', optional: true },
  }

  static toDto(entity: AttachmentTypeEntity): AttachmentTypeDto {
    return {
      id: entity.id!,
      name: entity.name!,
      createdAt: entity.createdAt!,
    }
  }

  static toDtos(entities: AttachmentTypeEntity[]): AttachmentTypeDto[] {
    return entities.map(AttachmentTypeEntity.toDto)
  }

  static fromDto(dto: AttachmentTypeDto | CreateAttachmentTypeDto | UpdateAttachmentTypeDto): AttachmentTypeEntity {
    const e = new AttachmentTypeEntity()
    if ('id' in dto && dto.id != null) e.id = dto.id as number
    e.name = (dto as any).name
    if ('createdAt' in dto) e.createdAt = (dto as any).createdAt
    return e
  }
}
