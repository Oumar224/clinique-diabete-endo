import { container } from 'tsyringe'
import { ExamParameterService } from '../services/exam-parameter.service'
import { ExamParameterEntity } from '../entities/exam-parameter.entity'
import type { ExamParameterDto } from '../dto/settings.dto'
import { createHandler } from '../utils/create-handler'

export function registerExamParameterHandlers() {
  createHandler('exam-params:list-by-exam', async ({ examId }: { examId: number }) => {
    const entities = await container.resolve(ExamParameterService).listByExam(examId)
    return ExamParameterEntity.toDtos(entities)
  })

  createHandler('exam-params:list-by-type', async ({ typeId }: { typeId: number }) => {
    const entities = await container.resolve(ExamParameterService).listByType(typeId)
    return ExamParameterEntity.toDtos(entities)
  })

  createHandler('exam-params:list-by-exam-ids', async ({ examIds }: { examIds: number[] }) => {
    const entities = await container.resolve(ExamParameterService).listByExamIds(examIds)
    return ExamParameterEntity.toDtos(entities)
  })

  createHandler('exam-params:count-by-exam', async ({ examId }: { examId: number }) => {
    return await container.resolve(ExamParameterService).countByExam(examId)
  })

  createHandler('exam-params:create', async (dto: Partial<ExamParameterDto>) => {
    const entity = ExamParameterEntity.fromDto(dto)
    const created = await container.resolve(ExamParameterService).create(entity)
    return ExamParameterEntity.toDto(created)
  })

  createHandler('exam-params:update', async (dto: ExamParameterDto) => {
    const entity = ExamParameterEntity.fromDto(dto)
    const updated = await container.resolve(ExamParameterService).update(entity)
    return ExamParameterEntity.toDto(updated)
  })

  createHandler('exam-params:reorder', async ({ items }: { items: Array<{ id: number; sort_order: number }> }) => {
    await container.resolve(ExamParameterService).reorder(items)
    return { success: true }
  })

  createHandler('exam-params:delete', async ({ id }: { id: number }) => {
    await container.resolve(ExamParameterService).delete(id)
    return { success: true }
  })
}
