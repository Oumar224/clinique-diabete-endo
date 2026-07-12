import { ref } from 'vue'
import { ipcInvoke } from '@/utils/ipc'

export interface VoieTypeDto {
  id?: number
  label: string
  is_active?: boolean
}

const types = ref<VoieTypeDto[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

export function useVoieTypes() {
  async function fetchTypes(params?: { activeOnly?: boolean }): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const result = await ipcInvoke<VoieTypeDto[]>('voie-types:list', params || {})
      types.value = Array.isArray(result) ? result : []
    } catch (e) {
      error.value = (e as Error).message
      types.value = []
    } finally {
      loading.value = false
    }
  }

  async function createType(dto: { label: string }): Promise<VoieTypeDto | null> {
    try {
      const created = await ipcInvoke<VoieTypeDto>('voie-types:create', dto)
      await fetchTypes()
      return created
    } catch {
      return null
    }
  }

  async function deleteType(id: number): Promise<boolean> {
    try {
      await ipcInvoke('voie-types:delete', { id })
      await fetchTypes()
      return true
    } catch {
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
