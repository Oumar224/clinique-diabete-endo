import type { AttachmentTypeDto, CreateAttachmentTypeDto, UpdateAttachmentTypeDto } from '../dto/attachment-type.dto'

export class AttachmentTypeEntity {
  id?: number
  name?: string
  created_at?: string

  static toDto(entity: AttachmentTypeEntity): AttachmentTypeDto {
    return {
      id: entity.id!,
      name: entity.name!,
      created_at: entity.created_at!,
    }
  }

  static toDtos(entities: AttachmentTypeEntity[]): AttachmentTypeDto[] {
    return entities.map(AttachmentTypeEntity.toDto)
  }

  static fromDto(dto: AttachmentTypeDto | CreateAttachmentTypeDto | UpdateAttachmentTypeDto): AttachmentTypeEntity {
    const e = new AttachmentTypeEntity()
    if ('id' in dto && dto.id != null) e.id = dto.id as number
    e.name = (dto as any).name
    if ('created_at' in dto) e.created_at = (dto as any).created_at
    return e
  }

  static documentType(): string { return 'AttachmentType' }
  static documentSchema(): any { return {} }
  static register(): void { /* No Automerge sync needed */ }
}
