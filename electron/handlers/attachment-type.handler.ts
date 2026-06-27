import { container } from 'tsyringe'
import { createHandler } from '../utils/create-handler'
import { AttachmentTypeService } from '../services/attachment-type.service'

export function registerAttachmentTypeHandlers(): void {
  const svc = container.resolve(AttachmentTypeService)

  createHandler('attachment-types:list', async () => {
    return await svc.list()
  })

  createHandler('attachment-types:create', async (dto: { name: string }) => {
    return await svc.create(dto)
  })

  createHandler('attachment-types:update', async ({ id, ...dto }: { id: number; name?: string }) => {
    return await svc.update(id, dto)
  })

  createHandler('attachment-types:delete', async ({ id }: { id: number }) => {
    await svc.delete(id)
    return { success: true }
  })
}
