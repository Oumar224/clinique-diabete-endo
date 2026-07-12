import { container } from 'tsyringe'
import { CareUnitService } from '../services/care-unit.service'
import { CareUnitEntity } from '../entities/care-unit.entity'
import { createHandler } from '../utils/create-handler'

export function registerCareUnitHandlers(): void {
  createHandler('care-units:list', async ({ serviceId, activeOnly }: { serviceId?: number; activeOnly?: boolean } = {}) => {
    return await container.resolve(CareUnitService).list(serviceId, activeOnly)
  })

  createHandler('care-units:get', async ({ id }: { id: number }) => {
    const entity = await container.resolve(CareUnitService).getById(id)
    return entity ? CareUnitEntity.toDto(entity) : null
  })

  createHandler('care-units:create', async (dto: any) => {
    const entity = CareUnitEntity.fromDto(dto)
    const created = await container.resolve(CareUnitService).create(entity)
    return CareUnitEntity.toDto(created)
  })

  createHandler('care-units:update', async (dto: any) => {
    const entity = CareUnitEntity.fromDto(dto)
    const updated = await container.resolve(CareUnitService).update(entity)
    return CareUnitEntity.toDto(updated)
  })

  createHandler('care-units:delete', async ({ id }: { id: number }) => {
    await container.resolve(CareUnitService).delete(id)
    return { success: true }
  })

  createHandler('care-units:toggle', async ({ id, is_active }: { id: number; is_active: boolean }) => {
    const entity = await container.resolve(CareUnitService).toggle(id, is_active)
    return CareUnitEntity.toDto(entity)
  })
}
