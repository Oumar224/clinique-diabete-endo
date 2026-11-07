import { container } from 'tsyringe'
import { AppointmentService } from '../services/appointment.service'
import { AppointmentEntity } from '../entities/appointment.entity'
import type { AppointmentDto } from '../dto/appointment.dto'
import { createHandler } from '../utils/create-handler'

export function registerAppointmentHandlers() {
  createHandler('appointments:list', async (params?: { date?: string; date_debut?: string; date_fin?: string; medecin_id?: number; status?: string }) => {
    return await container.resolve(AppointmentService).listFiltered(params ?? {})
  })

  createHandler('appointments:list-by-patient', async ({ patient_id }: { patient_id: number }) => {
    return await container.resolve(AppointmentService).listByPatient(patient_id)
  })

  createHandler('appointments:get', async ({ id }: { id: number }) => {
    return await container.resolve(AppointmentService).getById(id)
  })

  createHandler('appointments:create', async (dto: AppointmentDto) => {
    const entity = AppointmentEntity.fromDto(dto)
    return await container.resolve(AppointmentService).create(entity)
  })

  createHandler('appointments:update', async ({ id, ...dto }: AppointmentDto & { id: number }) => {
    const entity = AppointmentEntity.fromDto(dto)
    return await container.resolve(AppointmentService).update(id, entity)
  })

  createHandler('appointments:delete', async ({ id }: { id: number }) => {
    await container.resolve(AppointmentService).delete(id)
    return { success: true }
  })

  createHandler('appointments:update-status', async ({ id, status }: { id: number; status: AppointmentEntity['status'] }) => {
    await container.resolve(AppointmentService).updateStatus(id, status)
    return { success: true }
  })
}
