import { ref } from 'vue'
import { ipcInvoke } from '@/utils/ipc'

export interface ContactCategoryDto {
  id?: number
  value: string
  label: string
  sort_order: number
  is_active: boolean
}

const categories = ref<ContactCategoryDto[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

export function useContactCategories() {
  async function fetchCategories(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const result = await ipcInvoke<ContactCategoryDto[]>('contact-categories:list')
      categories.value = result ?? []
    } catch (e) {
      error.value = (e as Error).message
      categories.value = []
    } finally {
      loading.value = false
    }
  }

  async function fetchActiveCategories(): Promise<ContactCategoryDto[]> {
    try {
      const result = await ipcInvoke<ContactCategoryDto[]>('contact-categories:list-active')
      return result ?? []
    } catch {
      return []
    }
  }

  async function createCategory(data: {
    value: string
    label: string
    sort_order: number
    is_active: boolean
  }): Promise<ContactCategoryDto | null> {
    try {
      const created = await ipcInvoke<ContactCategoryDto>('contact-categories:create', data)
      await fetchCategories()
      return created ?? null
    } catch {
      return null
    }
  }

  async function updateCategory(id: number, data: {
    value?: string
    label?: string
    sort_order?: number
    is_active?: boolean
  }): Promise<ContactCategoryDto | null> {
    try {
      const updated = await ipcInvoke<ContactCategoryDto>('contact-categories:update', { id, ...data })
      await fetchCategories()
      return updated
    } catch {
      return null
    }
  }

  async function deleteCategory(id: number): Promise<boolean> {
    try {
      await ipcInvoke('contact-categories:delete', { id })
      await fetchCategories()
      return true
    } catch {
      return false
    }
  }

  return {
    categories,
    loading,
    error,
    fetchCategories,
    fetchActiveCategories,
    createCategory,
    updateCategory,
    deleteCategory,
  }
}
