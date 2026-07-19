import { container } from 'tsyringe'
import { createHandler } from '../utils/create-handler'
import { SpecialtyService } from '../services/specialty.service'
import { SpecialtyEntity } from '../entities/specialty.entity'
import type { SpecialtyDto } from '../dto/specialty.dto'

export function registerSpecialtyHandlers() {
  createHandler('specialties:list', async ({ activeOnly }: { activeOnly?: boolean }) => {
    const entities = await container.resolve(SpecialtyService).list(activeOnly)
    return SpecialtyEntity.toDtos(entities)
  })

  createHandler('specialties:get', async ({ id }: { id: number }) => {
    const entity = await container.resolve(SpecialtyService).getById(id)
    return entity ? SpecialtyEntity.toDto(entity) : null
  })

  createHandler('specialties:create', async (dto: SpecialtyDto) => {
    const entity = SpecialtyEntity.fromDto(dto)
    const created = await container.resolve(SpecialtyService).create(entity)
    return SpecialtyEntity.toDto(created)
  })

  createHandler('specialties:update', async (dto: SpecialtyDto) => {
    const entity = SpecialtyEntity.fromDto(dto)
    const updated = await container.resolve(SpecialtyService).update(entity)
    return SpecialtyEntity.toDto(updated)
  })

  createHandler('specialties:delete', async ({ id }: { id: number }) => {
    if (!id) throw new Error('ID requis')
    await container.resolve(SpecialtyService).delete(id)
    return { success: true }
  })

  createHandler('specialties:toggle', async ({ id, is_active }: { id: number; is_active: boolean }) => {
    if (!id) throw new Error('ID requis')
    const updated = await container.resolve(SpecialtyService).toggle(id, is_active)
    return SpecialtyEntity.toDto(updated)
  })
}
