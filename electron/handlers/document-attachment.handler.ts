import { container } from 'tsyringe'
import { createHandler } from '../utils/create-handler'
import { DocumentAttachmentService } from '../services/document-attachment.service'
import { DocumentAttachmentEntity } from '../entities/document-attachment.entity'
import type { CreateDocumentAttachmentDto, UpdateDocumentAttachmentDto } from '../dto/document-attachment.dto'

export function registerDocumentAttachmentHandlers(): void {
  const svc = container.resolve(DocumentAttachmentService)

  createHandler('document-attachments:list', async (params: { documentId: string }) => {
    const entities = await svc.listByDocument(params.documentId)
    return DocumentAttachmentEntity.toDtos(entities)
  })

  createHandler('document-attachments:create', async (dto: CreateDocumentAttachmentDto) => {
    const created = await svc.create(dto)
    return DocumentAttachmentEntity.toDto(created)
  })

  createHandler('document-attachments:update', async (dto: UpdateDocumentAttachmentDto) => {
    const updated = await svc.update(dto.id!, dto.description)
    return DocumentAttachmentEntity.toDto(updated)
  })

  createHandler('document-attachments:delete', async (id: number) => {
    await svc.delete(id)
    return { success: true }
  })

  createHandler('document-attachments:get', async (id: number) => {
    const entity = await svc.getById(id)
    return DocumentAttachmentEntity.toDtoWithData(entity)
  })
}
