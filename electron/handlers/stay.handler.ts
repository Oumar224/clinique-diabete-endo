import { container } from 'tsyringe'
import { StayService } from '../services/stay.service'
import { createHandler } from '../utils/create-handler'

export function registerStayHandlers() {
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
