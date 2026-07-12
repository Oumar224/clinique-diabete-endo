import { container } from 'tsyringe'
import { createHandler } from '../utils/create-handler'
import { AttachmentTypeService } from '../services/attachment-type.service'
import { AttachmentTypeEntity } from '../entities/attachment-type.entity'
import type { AttachmentTypeDto, CreateAttachmentTypeDto } from '../dto/attachment-type.dto'

export function registerAttachmentTypeHandlers(): void {
  const svc = container.resolve(AttachmentTypeService)

  createHandler('attachment-types:list', async () => {
    const entities = await svc.list()
    return AttachmentTypeEntity.toDtos(entities)
  })

  createHandler('attachment-types:create', async (dto: CreateAttachmentTypeDto) => {
    const entity = AttachmentTypeEntity.fromDto(dto)
    const created = await svc.create(entity)
    return AttachmentTypeEntity.toDto(created)
  })

  createHandler('attachment-types:update', async (dto: AttachmentTypeDto) => {
    const entity = AttachmentTypeEntity.fromDto(dto)
    const updated = await svc.update(entity)
    return AttachmentTypeEntity.toDto(updated)
  })

  createHandler('attachment-types:delete', async ({ id }: { id: number }) => {
    await svc.delete(id)
    return { success: true }
  })
}
