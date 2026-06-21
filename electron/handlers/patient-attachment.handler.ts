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
    // Validation des champs obligatoires
    if (typeof dto.patientId !== 'number' || dto.patientId <= 0 || !Number.isInteger(dto.patientId)) {
      throw new Error('ID patient invalide')
    }
    if (typeof dto.displayName !== 'string' || dto.displayName.trim().length === 0) {
      throw new Error('Le nom d\'affichage est requis')
    }
    if (typeof dto.fileName !== 'string' || dto.fileName.trim().length === 0) {
      throw new Error('Le nom du fichier est requis')
    }
    if (typeof dto.fileData !== 'string' || dto.fileData.length === 0) {
      throw new Error('Les données du fichier sont requises')
    }
    if (dto.mimeType != null && typeof dto.mimeType !== 'string') {
      throw new Error('Le type MIME doit être une chaîne de caractères')
    }
    // Validation de la taille du fichier depuis le base64
    const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 Mo
    const base64Data = dto.fileData.includes('base64,')
      ? dto.fileData.substring(dto.fileData.indexOf('base64,') + 7)
      : dto.fileData
    const padding = base64Data.endsWith('==') ? 2 : base64Data.endsWith('=') ? 1 : 0
    const decodedSize = (base64Data.length * 3) / 4 - padding
    if (decodedSize > MAX_FILE_SIZE) {
      throw new Error('La taille du fichier ne doit pas dépasser 10 Mo')
    }

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
