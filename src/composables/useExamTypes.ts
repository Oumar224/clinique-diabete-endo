import { ref } from 'vue'
import { ipcInvoke } from '@/utils/ipc'

export interface ExamCategoryDto {
  id?: number
  code: string
  label: string
  sort_order?: number
}

export interface ExamTypeDto {
  id?: number
  category_id: number
  parent_id?: number | null
  code?: string
  label: string
  is_active: boolean
  category_label?: string
  parent_label?: string
  created_at?: string
  updated_at?: string
}

const categories = ref<ExamCategoryDto[]>([])
const types = ref<ExamTypeDto[]>([])
const allTypes = ref<ExamTypeDto[]>([])
const loading = ref(false)
const typesLoading = ref(false)
const error = ref<string | null>(null)

export function useExamTypes() {
  async function fetchCategories(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const result = await ipcInvoke<ExamCategoryDto[]>('exam-categories:list')
      categories.value = Array.isArray(result) ? result : []
    } catch (e) {
      error.value = (e as Error).message
      categories.value = []
    } finally {
      loading.value = false
    }
  }

  async function fetchTypesByCategory(categoryCode: string): Promise<void> {
    typesLoading.value = true
    error.value = null
    try {
      const result = await ipcInvoke<ExamTypeDto[]>('exam-types:list-by-category', {
        category_code: categoryCode,
      })
      types.value = Array.isArray(result) ? result : []
    } catch (e) {
      error.value = (e as Error).message
      types.value = []
    } finally {
      typesLoading.value = false
    }
  }

  async function fetchAllByCategory(categoryCode: string): Promise<void> {
    typesLoading.value = true
    error.value = null
    try {
      const result = await ipcInvoke<ExamTypeDto[]>('exam-types:list-all-by-category', {
        category_code: categoryCode,
      })
      allTypes.value = Array.isArray(result) ? result : []
    } catch (e) {
      error.value = (e as Error).message
      allTypes.value = []
    } finally {
      typesLoading.value = false
    }
  }

  async function fetchByType(typeId: number): Promise<void> {
    typesLoading.value = true
    error.value = null
    try {
      const result = await ipcInvoke<ExamTypeDto[]>('exam-types:list-by-type', { type_id: typeId })
      types.value = Array.isArray(result) ? result : []
    } catch (e) {
      error.value = (e as Error).message
      types.value = []
    } finally {
      typesLoading.value = false
    }
  }

  async function createType(dto: {
    label: string
    category_id: number
    parent_id?: number | null
    code?: string
  }): Promise<ExamTypeDto | null> {
    try {
      const created = await ipcInvoke<ExamTypeDto>('exam-types:create', dto)
      return created
    } catch (e) {
      error.value = (e as Error).message
      return null
    }
  }

  async function updateType(
    id: number,
    dto: { label?: string; is_active?: boolean; parent_id?: number | null },
  ): Promise<ExamTypeDto | null> {
    try {
      const updated = await ipcInvoke<ExamTypeDto>('exam-types:update', { id, ...dto })
      return updated
    } catch (e) {
      error.value = (e as Error).message
      return null
    }
  }

  async function deleteType(id: number): Promise<boolean> {
    try {
      await ipcInvoke('exam-types:delete', { id })
      return true
    } catch (e) {
      error.value = (e as Error).message
      return false
    }
  }

  return {
    categories,
    types,
    allTypes,
    loading,
    typesLoading,
    error,
    fetchCategories,
    fetchTypesByCategory,
    fetchAllByCategory,
    fetchByType,
    createType,
    updateType,
    deleteType,
  }
}
