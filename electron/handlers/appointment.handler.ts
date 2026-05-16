import { container } from 'tsyringe'
import { AppointmentService } from '../services/appointment.service'
import { AppointmentEntity } from '../entities/appointment.entity'
import type { AppointmentDto } from '../dto/appointment.dto'
import { createHandler } from '../utils/create-handler'

export function registerAppointmentHandlers() {
  createHandler('appointments:list', async ({ date }: { date?: string }) => {
    const entities = await container.resolve(AppointmentService).list(date)
    return AppointmentEntity.toDtos(entities)
  })

  createHandler('appointments:create', async (dto: AppointmentDto) => {
    const entity = AppointmentEntity.fromDto(dto)
    const created = await container.resolve(AppointmentService).create(entity)
    return AppointmentEntity.toDto(created)
  })

  createHandler('appointments:update-status', async ({ id, status }: { id: number; status: AppointmentEntity['status'] }) => {
    await container.resolve(AppointmentService).updateStatus(id, status)
    return { success: true }
  })
}
