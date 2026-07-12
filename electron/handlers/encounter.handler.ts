import { container } from 'tsyringe'
import { EncounterService } from '../services/encounter.service'
import type { EncounterCreateDto, EncounterUpdateDto } from '../dto/encounter.dto'
import { createHandler } from '../utils/create-handler'

export function registerEncounterHandlers() {
  createHandler('encounters:list-by-patient', async ({ patient_id, status }: { patient_id: number; status?: string }) => {
    return await container.resolve(EncounterService).listByPatient(patient_id, status)
  })

  createHandler('encounters:get', async ({ id }: { id: number }) => {
    return await container.resolve(EncounterService).getById(id)
  })

  createHandler('encounters:create', async (dto: EncounterCreateDto) => {
    return await container.resolve(EncounterService).create(dto)
  })

  createHandler('encounters:get-movements', async ({ encounter_id }: { encounter_id: number }) => {
    return await container.resolve(EncounterService).getMovements(encounter_id)
  })

  createHandler('encounters:update', async ({ id, ...dto }: EncounterUpdateDto) => {
    return await container.resolve(EncounterService).update(id, dto)
  })

  createHandler('encounters:delete', async ({ id }: { id: number }) => {
    await container.resolve(EncounterService).delete(id)
    return { success: true }
  })

  createHandler('encounters:close', async ({ id }: { id: number }) => {
    await container.resolve(EncounterService).closeEncounter(id)
    return { success: true }
  })
}
