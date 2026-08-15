import { container } from 'tsyringe'
import { ExamResultService } from '../services/exam-result.service'
import { ExamResultEntity } from '../entities/exam-result.entity'
import { createHandler } from '../utils/create-handler'

export function registerExamResultHandlers() {
  createHandler('exam-results:list-by-request', async ({ examRequestId }: { examRequestId: number }) => {
    const entities = await container.resolve(ExamResultService).listByRequest(examRequestId)
    return ExamResultEntity.toDtos(entities)
  })

  createHandler('exam-results:list-by-patient', async ({
    patientId, typeId, examId, parameterId, examRequestId, dateFrom, dateTo
  }: {
    patientId: number
    typeId?: number
    examId?: number
    parameterId?: number
    examRequestId?: number
    dateFrom?: string
    dateTo?: string
  }) => {
    const entities = await container.resolve(ExamResultService).listByPatient(patientId, {
      typeId, examId, parameterId, examRequestId, dateFrom, dateTo
    })
    return ExamResultEntity.toDtos(entities)
  })

  createHandler('exam-results:validate', async ({
    examRequestId, results, filledBy
  }: {
    examRequestId: number
    results: Array<{ parameterId: number; value: string | undefined; isNormal: boolean | undefined }>
    filledBy: number
  }) => {
    await container.resolve(ExamResultService).validateExamRequest(examRequestId, results, filledBy)
    return { success: true }
  })
}
