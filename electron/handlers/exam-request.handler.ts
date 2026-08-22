import { container } from 'tsyringe'
import { createHandler } from '../utils/create-handler'
import { ExamRequestService } from '../services/exam-request.service'
import { ExamRequestEntity } from '../entities/exam-request.entity'
import { ExamRequestAttachmentEntity } from '../entities/exam-request-attachment.entity'
import type { ExamRequestDto } from '../dto/exam-request.dto'
import type { CreateExamRequestAttachmentDto } from '../dto/exam-request-attachment.dto'

export function registerExamRequestHandlers() {
  createHandler('exam-request:list', async ({ patientId }: { patientId: number }) => {
    if (!patientId) throw new Error('patientId requis')
    const entities = await container.resolve(ExamRequestService).listByPatient(patientId)
    return ExamRequestEntity.toDtos(entities)
  })

  createHandler('exam-request:get', async ({ id }: { id: number }) => {
    if (!id) throw new Error('id requis')
    const entity = await container.resolve(ExamRequestService).getById(id)
    return entity ? ExamRequestEntity.toDto(entity) : null
  })

  createHandler('exam-request:create', async (dto: ExamRequestDto) => {
    const entity = ExamRequestEntity.fromDto(dto)
    const created = await container.resolve(ExamRequestService).create(entity)
    return ExamRequestEntity.toDto(created)
  })

  createHandler('exam-request:update', async (dto: ExamRequestDto) => {
    const entity = ExamRequestEntity.fromDto(dto)
    const updated = await container.resolve(ExamRequestService).update(entity)
    return ExamRequestEntity.toDto(updated)
  })

  createHandler('exam-request:list-by-date', async ({ patientId, date }: { patientId: number; date: string }) => {
    if (!patientId) throw new Error('patientId requis')
    if (!date) throw new Error('date requise')
    const entities = await container.resolve(ExamRequestService).listByDate(patientId, date)
    return ExamRequestEntity.toDtos(entities)
  })

  createHandler('exam-request:delete', async ({ id }: { id: number }) => {
    if (!id) throw new Error('id requis')
    await container.resolve(ExamRequestService).delete(id)
    return { success: true }
  })

  // ─── Mark an exam request as realized (+ store result) ──────────
  createHandler('exam-request:realize', async (params: {
    id: number
    resultat?: string | null
    realizedBy?: number
  }) => {
    if (!params.id) throw new Error('id requis')
    const entity = new ExamRequestEntity()
    entity.id = params.id
    entity.resultat = params.resultat ?? undefined
    const updated = await container.resolve(ExamRequestService).realize(entity)
    return ExamRequestEntity.toDto(updated)
  })

  // ─── Attachments ────────────────────────────────────────────────
  createHandler('exam-request-attachments:list', async ({ examRequestId }: { examRequestId: number }) => {
    if (!examRequestId) throw new Error('examRequestId requis')
    const entities = await container.resolve(ExamRequestService).listAttachments(examRequestId)
    return ExamRequestAttachmentEntity.toDtos(entities)
  })

  createHandler('exam-request-attachments:create', async (dto: CreateExamRequestAttachmentDto) => {
    const created = await container.resolve(ExamRequestService).createAttachment(dto)
    return ExamRequestAttachmentEntity.toDtoWithData(created)
  })

  createHandler('exam-request-attachments:delete', async ({ id }: { id: number }) => {
    if (!id) throw new Error('id requis')
    await container.resolve(ExamRequestService).deleteAttachment(id)
    return { success: true }
  })
}
