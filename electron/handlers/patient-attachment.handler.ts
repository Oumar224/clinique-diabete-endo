import { container } from 'tsyringe'
import { createHandler } from '../utils/create-handler'
import { PatientAttachmentService } from '../services/patient-attachment.service'
import { PatientAttachmentEntity } from '../entities/patient-attachment.entity'
import type { CreatePatientAttachmentDto, UpdatePatientAttachmentDto } from '../dto/patient-attachment.dto'

export function registerPatientAttachmentHandlers(): void {
  const svc = container.resolve(PatientAttachmentService)

  createHandler('patient-attachments:list', async (params: { patientId: number; category?: string }) => {
    const entities = await svc.listByPatient(params.patientId, params.category)
    return PatientAttachmentEntity.toDtos(entities)
  })

  createHandler('patient-attachments:create', async (dto: CreatePatientAttachmentDto) => {
    const entity = PatientAttachmentEntity.fromDto(dto)
    const created = await svc.create(entity)
    return PatientAttachmentEntity.toDto(created)
  })

  createHandler('patient-attachments:update', async (dto: UpdatePatientAttachmentDto) => {
    const entity = PatientAttachmentEntity.fromDto(dto)
    const updated = await svc.update(entity)
    return PatientAttachmentEntity.toDto(updated)
  })

  createHandler('patient-attachments:delete', async (id: number) => {
    await svc.delete(id)
    return { success: true }
  })

  createHandler('patient-attachments:get', async (id: number) => {
    const entity = await svc.getById(id)
    return PatientAttachmentEntity.toDto(entity)
  })
}
