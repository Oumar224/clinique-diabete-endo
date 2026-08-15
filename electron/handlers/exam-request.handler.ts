import { container } from 'tsyringe'
import { createHandler } from '../utils/create-handler'
import { ExamRequestService } from '../services/exam-request.service'
import { ExamRequestEntity } from '../entities/exam-request.entity'
import type { ExamRequestDto } from '../dto/exam-request.dto'

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
}
