import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { ipcInvoke } from '@/utils/ipc'

export interface ExamParameterReferenceValues {
  min?: number
  max?: number
  min_h?: number
  max_h?: number
  min_f?: number
  max_f?: number
  options?: Array<{ value: string; is_normal: boolean }>
  normal_value?: string
}

export interface ExamParameterDto {
  id?: number
  examId?: number
  sortOrder?: number
  name?: string
  unit?: string
  inputType?: 'numeric' | 'text' | 'select' | 'boolean'
  referenceValues?: ExamParameterReferenceValues
  isActive?: boolean
  createdAt?: string
  updatedAt?: string
  examName?: string
}

export type { ExamParameterDto as ExamParameter }

export function useExamParameters() {
  const parameters = ref<ExamParameterDto[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchByExam(examId: number): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const result = await ipcInvoke<ExamParameterDto[]>('exam-params:list-by-exam', { examId })
      parameters.value = Array.isArray(result) ? result : []
    } catch (e) {
      error.value = (e as Error).message
      parameters.value = []
    } finally {
      loading.value = false
    }
  }

  async function fetchByType(typeId: number): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const result = await ipcInvoke<ExamParameterDto[]>('exam-params:list-by-type', { typeId })
      parameters.value = Array.isArray(result) ? result : []
    } catch (e) {
      error.value = (e as Error).message
      parameters.value = []
    } finally {
      loading.value = false
    }
  }

  async function fetchByExamIds(examIds: number[]): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const result = await ipcInvoke<ExamParameterDto[]>('exam-params:list-by-exam-ids', { examIds })
      parameters.value = Array.isArray(result) ? result : []
    } catch (e) {
      error.value = (e as Error).message
      parameters.value = []
    } finally {
      loading.value = false
    }
  }

  async function countByExam(examId: number): Promise<number> {
    try {
      return await ipcInvoke<number>('exam-params:count-by-exam', { examId })
    } catch {
      return 0
    }
  }

  async function createParameter(dto: Partial<ExamParameterDto>): Promise<ExamParameterDto | null> {
    try {
      const created = await ipcInvoke<ExamParameterDto>('exam-params:create', dto)
      ElMessage.success('Paramètre créé')
      return created
    } catch (e) {
      ElMessage.error(`Erreur: ${(e as Error).message}`)
      return null
    }
  }

  async function updateParameter(dto: ExamParameterDto): Promise<ExamParameterDto | null> {
    try {
      const updated = await ipcInvoke<ExamParameterDto>('exam-params:update', dto)
      ElMessage.success('Paramètre mis à jour')
      return updated
    } catch (e) {
      ElMessage.error(`Erreur: ${(e as Error).message}`)
      return null
    }
  }

  async function reorderParameters(items: Array<{ id: number; sort_order: number }>): Promise<void> {
    try {
      await ipcInvoke('exam-params:reorder', { items })
    } catch (e) {
      ElMessage.error(`Erreur: ${(e as Error).message}`)
    }
  }

  async function deleteParameter(id: number): Promise<boolean> {
    try {
      await ipcInvoke('exam-params:delete', { id })
      ElMessage.success('Paramètre supprimé')
      return true
    } catch (e) {
      ElMessage.error(`Erreur: ${(e as Error).message}`)
      return false
    }
  }

  return {
    parameters,
    loading,
    error,
    fetchByExam,
    fetchByType,
    fetchByExamIds,
    countByExam,
    createParameter,
    updateParameter,
    reorderParameters,
    deleteParameter,
  }
}
