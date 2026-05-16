import { container } from 'tsyringe'
import { PatientService } from '../services/patient.service'
import { PatientEntity } from '../entities/patient.entity'
import type { PatientDto } from '../dto/patient.dto'
import { createHandler } from '../utils/create-handler'

export function registerPatientHandlers() {
  createHandler('patients:list', async ({ search }: { search?: string }) => {
    const entities = await container.resolve(PatientService).list(search)
    return PatientEntity.toDtos(entities)
  })

  createHandler('patients:get', async ({ id }: { id: number }) => {
    const entity = await container.resolve(PatientService).getById(id)
    return entity ? PatientEntity.toDto(entity) : null
  })

  createHandler('patients:create', async (dto: PatientDto) => {
    const entity = PatientEntity.fromDto(dto)
    const created = await container.resolve(PatientService).create(entity)
    return PatientEntity.toDto(created)
  })

  createHandler('patients:update', async (dto: PatientDto) => {
    const entity = PatientEntity.fromDto(dto)
    const updated = await container.resolve(PatientService).update(entity)
    return PatientEntity.toDto(updated)
  })

  createHandler('patients:delete', async ({ id }: { id: number }) => {
    const deleted = await container.resolve(PatientService).delete(id)
    return PatientEntity.toDto(deleted)
  })
}
