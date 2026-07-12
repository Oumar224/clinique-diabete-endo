import { container } from 'tsyringe'
import { createHandler } from '../utils/create-handler'
import { UserAttachmentService } from '../services/user-attachment.service'
import { UserAttachmentEntity } from '../entities/user-attachment.entity'
import type { CreateAttachmentDto } from '../dto/user-attachment.dto'

export function registerUserAttachmentHandlers(): void {
  const svc = container.resolve(UserAttachmentService)

  createHandler('user-attachments:list', async (userId: number) => {
    const entities = await svc.listByUser(userId)
    return UserAttachmentEntity.toDtos(entities)
  })

  createHandler('user-attachments:create', async (dto: CreateAttachmentDto) => {
    const entity = UserAttachmentEntity.fromDto(dto)
    const created = await svc.create(entity)
    return UserAttachmentEntity.toDto(created)
  })

  createHandler('user-attachments:delete', async (id: number) => {
    await svc.delete(id)
    return { success: true }
  })

  createHandler('user-attachments:get', async (id: number) => {
    const entity = await svc.getById(id)
    return UserAttachmentEntity.toDto(entity)
  })
}
