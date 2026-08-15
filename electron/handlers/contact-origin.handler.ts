import { container } from 'tsyringe'
import { ContactOriginService } from '../services/contact-origin.service'
import { ContactOriginEntity } from '../entities/contact-origin.entity'
import type { ContactOriginCreateDto, ContactOriginUpdateDto } from '../dto/contact-origin.dto'
import { createHandler } from '../utils/create-handler'

export function registerContactOriginHandlers(): void {
  createHandler('contact-origins:list', async () => {
    const entities = await container.resolve(ContactOriginService).listAll()
    return ContactOriginEntity.toDtos(entities)
  })

  createHandler('contact-origins:list-active', async () => {
    const entities = await container.resolve(ContactOriginService).listActive()
    return ContactOriginEntity.toDtos(entities)
  })

  createHandler('contact-origins:create', async (dto: ContactOriginCreateDto) => {
    const created = await container.resolve(ContactOriginService).create({ value: dto.value!, label: dto.label!, sort_order: dto.sort_order })
    return ContactOriginEntity.toDto(created)
  })

  createHandler('contact-origins:update', async (dto: ContactOriginUpdateDto) => {
    const { id, ...data } = dto
    const updated = await container.resolve(ContactOriginService).update(id!, data)
    return ContactOriginEntity.toDto(updated)
  })

  createHandler('contact-origins:delete', async ({ id }: { id: number }) => {
    await container.resolve(ContactOriginService).delete(id)
    return { success: true }
  })
}
