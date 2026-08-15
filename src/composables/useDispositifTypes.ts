import { ref } from 'vue'
import { ipcInvoke } from '@/utils/ipc'

export interface DispositifTypeDto {
  id?: number
  label: string
  is_active?: boolean
}

const types = ref<DispositifTypeDto[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

export function useDispositifTypes() {
  async function fetchTypes(params?: { activeOnly?: boolean }): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const result = await ipcInvoke<DispositifTypeDto[]>('dispositif-types:list', params || {})
      types.value = Array.isArray(result) ? result : []
    } catch (e) {
      error.value = (e as Error).message
      types.value = []
    } finally {
      loading.value = false
    }
  }

  async function createType(dto: { label: string }): Promise<DispositifTypeDto | null> {
    try {
      const created = await ipcInvoke<DispositifTypeDto>('dispositif-types:create', dto)
      await fetchTypes()
      return created
    } catch (e) {
      error.value = (e as Error).message
      return null
    }
  }

  async function deleteType(id: number): Promise<boolean> {
    try {
      await ipcInvoke('dispositif-types:delete', { id })
      await fetchTypes()
      return true
    } catch (e) {
      error.value = (e as Error).message
      return false
    }
  }

  return {
    types,
    loading,
    error,
    fetchTypes,
    createType,
    deleteType,
  }
}
