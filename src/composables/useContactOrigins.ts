import { ref } from 'vue'
import { ipcInvoke } from '@/utils/ipc'

export interface ContactOriginDto {
  id?: number
  value: string
  label: string
  sort_order: number
  is_active: boolean
}

const origins = ref<ContactOriginDto[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

export function useContactOrigins() {
  async function fetchOrigins(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const result = await ipcInvoke<ContactOriginDto[]>('contact-origins:list')
      origins.value = result ?? []
    } catch (e) {
      error.value = (e as Error).message
      origins.value = []
    } finally {
      loading.value = false
    }
  }

  async function fetchActiveOrigins(): Promise<ContactOriginDto[]> {
    try {
      const result = await ipcInvoke<ContactOriginDto[]>('contact-origins:list-active')
      return result ?? []
    } catch {
      return []
    }
  }

  async function createOrigin(data: {
    value: string
    label: string
    sort_order: number
    is_active: boolean
  }): Promise<ContactOriginDto | null> {
    try {
      const created = await ipcInvoke<ContactOriginDto>('contact-origins:create', data)
      await fetchOrigins()
      return created ?? null
    } catch {
      return null
    }
  }

  async function updateOrigin(id: number, data: {
    value?: string
    label?: string
    sort_order?: number
    is_active?: boolean
  }): Promise<ContactOriginDto | null> {
    try {
      const updated = await ipcInvoke<ContactOriginDto>('contact-origins:update', { id, ...data })
      await fetchOrigins()
      return updated
    } catch {
      return null
    }
  }

  async function deleteOrigin(id: number): Promise<boolean> {
    try {
      await ipcInvoke('contact-origins:delete', { id })
      await fetchOrigins()
      return true
    } catch {
      return false
    }
  }

  return {
    origins,
    loading,
    error,
    fetchOrigins,
    fetchActiveOrigins,
    createOrigin,
    updateOrigin,
    deleteOrigin,
  }
}
