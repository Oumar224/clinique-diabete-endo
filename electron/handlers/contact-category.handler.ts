import { container } from 'tsyringe'
import { ContactCategoryService } from '../services/contact-category.service'
import { ContactCategoryEntity } from '../entities/contact-category.entity'
import type { ContactCategoryCreateDto, ContactCategoryUpdateDto } from '../entities/contact-category.entity'
import { createHandler } from '../utils/create-handler'

export function registerContactCategoryHandlers(): void {
  createHandler('contact-categories:list', async () => {
    const entities = await container.resolve(ContactCategoryService).listAll()
    return ContactCategoryEntity.toDtos(entities)
  })

  createHandler('contact-categories:list-active', async () => {
    const entities = await container.resolve(ContactCategoryService).listActive()
    return ContactCategoryEntity.toDtos(entities)
  })

  createHandler('contact-categories:create', async (dto: ContactCategoryCreateDto) => {
    const created = await container.resolve(ContactCategoryService).create(dto)
    return ContactCategoryEntity.toDto(created)
  })

  createHandler('contact-categories:update', async (dto: ContactCategoryUpdateDto) => {
    const { id, ...data } = dto
    const updated = await container.resolve(ContactCategoryService).update(id, data)
    return ContactCategoryEntity.toDto(updated)
  })

  createHandler('contact-categories:delete', async ({ id }: { id: number }) => {
    await container.resolve(ContactCategoryService).delete(id)
    return { success: true }
  })
}
