import { container } from 'tsyringe'
import { StayService } from '../services/stay.service'
import type { StayCreateDto } from '../dto/stay.dto'
import { createHandler } from '../utils/create-handler'

export function registerStayHandlers() {
  createHandler('stays:create', async (dto: StayCreateDto) => {
    return await container.resolve(StayService).create(dto)
  })

  createHandler('stays:get-active', async ({ patient_id }: { patient_id: number }) => {
    return await container.resolve(StayService).getActiveByPatient(patient_id)
  })

  createHandler('stays:list-by-patient', async ({ patient_id }: { patient_id: number }) => {
    return await container.resolve(StayService).listByPatient(patient_id)
  })

  createHandler('stays:get-movements', async ({ stay_id }: { stay_id: number }) => {
    return await container.resolve(StayService).getMovements(stay_id)
  })
}
