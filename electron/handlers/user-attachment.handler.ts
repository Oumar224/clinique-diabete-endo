import { container } from 'tsyringe'
import { createHandler } from '../utils/create-handler'
import { UserAttachmentService } from '../services/user-attachment.service'
import type { CreateAttachmentDto } from '../dto/user-attachment.dto'

export function registerUserAttachmentHandlers(): void {
  const svc = container.resolve(UserAttachmentService)

  createHandler('user-attachments:list', async (userId: unknown) => {
    if (typeof userId !== 'number') throw new Error('ID utilisateur invalide')
    return await svc.listByUser(userId)
  })

  createHandler('user-attachments:create', async (dto: CreateAttachmentDto) => {
    return await svc.create(dto)
  })

  createHandler('user-attachments:delete', async (id: unknown) => {
    if (typeof id !== 'number') throw new Error('ID pièce jointe invalide')
    await svc.delete(id)
    return { success: true }
  })

  createHandler('user-attachments:get', async (id: unknown) => {
    if (typeof id !== 'number') throw new Error('ID pièce jointe invalide')
    return await svc.getById(id)
  })
}
