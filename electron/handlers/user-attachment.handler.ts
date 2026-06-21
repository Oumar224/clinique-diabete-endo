import { container } from 'tsyringe'
import { createHandler } from '../utils/create-handler'
import { UserAttachmentService } from '../services/user-attachment.service'
import type { CreateAttachmentDto } from '../dto/user-attachment.dto'

export function registerUserAttachmentHandlers(): void {
  const svc = container.resolve(UserAttachmentService)

  createHandler('user-attachments:list', async (userId: unknown) => {
    if (typeof userId !== 'number') throw new Error('ID utilisateur invalide')
    return await svc.listByUser(userId)
  })

  createHandler('user-attachments:create', async (dto: CreateAttachmentDto) => {
    // Validation des champs obligatoires
    if (typeof dto.userId !== 'number' || dto.userId <= 0 || !Number.isInteger(dto.userId)) {
      throw new Error('ID utilisateur invalide')
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

  createHandler('user-attachments:delete', async (id: unknown) => {
    if (typeof id !== 'number') throw new Error('ID pièce jointe invalide')
    await svc.delete(id)
    return { success: true }
  })

  createHandler('user-attachments:get', async (id: unknown) => {
    if (typeof id !== 'number') throw new Error('ID pièce jointe invalide')
    return await svc.getById(id)
  })
}
