import { container } from 'tsyringe'
import { createHandler } from '../utils/create-handler'
import { PatientAttachmentService } from '../services/patient-attachment.service'
import type { CreatePatientAttachmentDto } from '../dto/patient-attachment.dto'

export function registerPatientAttachmentHandlers(): void {
  const svc = container.resolve(PatientAttachmentService)

  createHandler('patient-attachments:list', async (patientId: unknown) => {
    if (typeof patientId !== 'number') throw new Error('ID patient invalide')
    return await svc.listByPatient(patientId)
  })

  createHandler('patient-attachments:create', async (dto: CreatePatientAttachmentDto) => {
    return await svc.create(dto)
  })

  createHandler('patient-attachments:delete', async (id: unknown) => {
    if (typeof id !== 'number') throw new Error('ID pièce jointe invalide')
    await svc.delete(id)
    return { success: true }
  })

  createHandler('patient-attachments:get', async (id: unknown) => {
    if (typeof id !== 'number') throw new Error('ID pièce jointe invalide')
    return await svc.getById(id)
  })
}
