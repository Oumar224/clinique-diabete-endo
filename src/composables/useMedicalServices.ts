import { ref } from 'vue'
import { ipcInvoke } from '@/utils/ipc'

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

export function useMedicalServices() {
  async function fetchServices(activeOnly?: boolean): Promise<void> {
    loading.value = true
    error.value = null
    try {
      services.value = await ipcInvoke<ServiceDto[]>('services:list', { activeOnly })
    } catch (e) {
      error.value = (e as Error).message
    } finally {
      loading.value = false
    }
  }

  async function createService(dto: { name: string; description?: string | null; duration?: number; color?: string | null }): Promise<ServiceDto | null> {
    try {
      const created = await ipcInvoke<ServiceDto>('services:create', dto)
      await fetchServices()
      return created
    } catch {
      return null
    }
  }

  async function updateService(id: number, dto: { name?: string; description?: string | null; duration?: number; color?: string | null }): Promise<ServiceDto | null> {
    try {
      const updated = await ipcInvoke<ServiceDto>('services:update', { id, ...dto })
      await fetchServices()
      return updated
    } catch {
      return null
    }
  }

  async function deleteService(id: number): Promise<boolean> {
    try {
      await ipcInvoke('services:delete', { id })
      await fetchServices()
      return true
    } catch {
      return false
    }
  }

  async function toggleService(id: number, isActive: boolean): Promise<ServiceDto | null> {
    try {
      const toggled = await ipcInvoke<ServiceDto>('services:toggle', { id, is_active: isActive })
      const idx = services.value.findIndex(s => s.id === id)
      if (idx !== -1) services.value[idx] = toggled
      return toggled
    } catch {
      return null
    }
  }

  async function reorderServices(ids: number[]): Promise<ServiceDto[] | null> {
    try {
      const reordered = await ipcInvoke<ServiceDto[]>('services:reorder', { ids })
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
