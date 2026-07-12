import { container } from 'tsyringe'
import { ExamTypeService } from '../services/exam-type.service'
import { ExamCategoryEntity } from '../entities/exam-category.entity'
import { ExamTypeEntity } from '../entities/exam-type.entity'
import { createHandler } from '../utils/create-handler'

export function registerExamTypeHandlers() {
  createHandler('exam-categories:list', async () => {
    const entities = await container.resolve(ExamTypeService).listCategories()
    return ExamCategoryEntity.toDtos(entities)
  })

  createHandler('exam-types:list-by-category', async ({ category_code }: { category_code: string }) => {
    const entities = await container.resolve(ExamTypeService).listByCategory(category_code)
    return ExamTypeEntity.toDtos(entities)
  })

  createHandler('exam-types:list-by-type', async ({ type_id }: { type_id: number }) => {
    const entities = await container.resolve(ExamTypeService).listByType(type_id)
    return ExamTypeEntity.toDtos(entities)
  })

  createHandler('exam-types:list-all-by-category', async ({ category_code }: { category_code: string }) => {
    const entities = await container.resolve(ExamTypeService).listAllByCategory(category_code)
    return ExamTypeEntity.toDtos(entities)
  })

  createHandler('exam-types:create', async (dto: { label: string; category_id: number; parent_id?: number | null; code?: string }) => {
    const entity = ExamTypeEntity.fromDto(dto)
    const created = await container.resolve(ExamTypeService).createType(entity)
    return ExamTypeEntity.toDto(created)
  })

  createHandler('exam-types:update', async (dto: { id: number; label?: string; is_active?: boolean; parent_id?: number | null }) => {
    const entity = ExamTypeEntity.fromDto(dto)
    const updated = await container.resolve(ExamTypeService).updateType(entity)
    return ExamTypeEntity.toDto(updated)
  })

  createHandler('exam-types:delete', async ({ id }: { id: number }) => {
    await container.resolve(ExamTypeService).deleteType(id)
    return { success: true }
  })
}
