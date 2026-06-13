import { ref } from 'vue'
import { ElMessage } from 'element-plus'

export interface ServiceDto {
  id?: number
  name: string
  description?: string | null
  duration: number
  color?: string | null
  sort_order: number
  is_active: boolean
  created_at?: string
  updated_at?: string
}

const services = ref<ServiceDto[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

async function invoke<T = unknown>(channel: string, params?: unknown): Promise<T> {
  if (!window.electronAPI) throw new Error('electronAPI not available')
  const result = await window.electronAPI.invoke(channel, params) as { success: boolean; data: T; message: string }
  if (!result.success) {
    ElMessage({ type: 'error', message: result.message })
    throw new Error(result.message)
  }
  return result.data
}

export function useMedicalServices() {
  async function fetchServices(activeOnly?: boolean): Promise<void> {
    loading.value = true
    error.value = null
    try {
      services.value = await invoke<ServiceDto[]>('services:list', { activeOnly })
    } catch (e) {
      error.value = (e as Error).message
    } finally {
      loading.value = false
    }
  }

  async function createService(dto: { name: string; description?: string | null; duration?: number; color?: string | null }): Promise<ServiceDto | null> {
    try {
      const created = await invoke<ServiceDto>('services:create', dto)
      await fetchServices()
      return created
    } catch {
      return null
    }
  }

  async function updateService(id: number, dto: { name?: string; description?: string | null; duration?: number; color?: string | null }): Promise<ServiceDto | null> {
    try {
      const updated = await invoke<ServiceDto>('services:update', { id, ...dto })
      await fetchServices()
      return updated
    } catch {
      return null
    }
  }

  async function deleteService(id: number): Promise<boolean> {
    try {
      await invoke('services:delete', { id })
      await fetchServices()
      return true
    } catch {
      return false
    }
  }

  async function toggleService(id: number, isActive: boolean): Promise<ServiceDto | null> {
    try {
      const toggled = await invoke<ServiceDto>('services:toggle', { id, is_active: isActive })
      const idx = services.value.findIndex(s => s.id === id)
      if (idx !== -1) services.value[idx] = toggled
      return toggled
    } catch {
      return null
    }
  }

  async function reorderServices(ids: number[]): Promise<ServiceDto[] | null> {
    try {
      const reordered = await invoke<ServiceDto[]>('services:reorder', { ids })
      services.value = reordered
      return reordered
    } catch {
      return null
    }
  }

  return {
    services,
    loading,
    error,
    fetchServices,
    createService,
    updateService,
    deleteService,
    toggleService,
    reorderServices,
  }
}
