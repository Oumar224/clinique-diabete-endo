import { container } from 'tsyringe'
import { InsuranceService } from '../services/insurance.service'
import { InsuranceEntity } from '../entities/insurance.entity'
import type { InsuranceCreateDto, InsuranceUpdateDto } from '../entities/insurance.entity'
import { createHandler } from '../utils/create-handler'

export function registerInsuranceHandlers(): void {
  createHandler('insurances:list', async () => {
    const entities = await container.resolve(InsuranceService).listAll()
    return InsuranceEntity.toDtos(entities)
  })

  createHandler('insurances:list-active', async () => {
    const entities = await container.resolve(InsuranceService).listActive()
    return InsuranceEntity.toDtos(entities)
  })

  createHandler('insurances:create', async (dto: InsuranceCreateDto) => {
    const created = await container.resolve(InsuranceService).create(dto)
    return InsuranceEntity.toDto(created)
  })

  createHandler('insurances:update', async (dto: InsuranceUpdateDto) => {
    const { id, ...data } = dto
    const updated = await container.resolve(InsuranceService).update(id, data)
    return InsuranceEntity.toDto(updated)
  })

  createHandler('insurances:delete', async ({ id }: { id: number }) => {
    await container.resolve(InsuranceService).delete(id)
    return { success: true }
  })
}
