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
  category: string
  site_ids?: number[]
  created_at?: string
  updated_at?: string
}

export const SERVICE_CATEGORIES = [
  'Consultation',
  'Hospitalisation',
  'Soins',
  'Technique',
  'Radiologie',
  'Laboratoire',
  'Rééducation',
  'Administration',
] as const

const services = ref<ServiceDto[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

const favorites = ref<number[]>([])

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

  async function createService(dto: {
    name: string
    category?: string
    description?: string | null
    duration?: number
    color?: string | null
    site_ids?: number[]
  }): Promise<ServiceDto | null> {
    try {
      const created = await ipcInvoke<ServiceDto>('services:create', dto)
      await fetchServices()
      return created
    } catch {
      return null
    }
  }

  async function updateService(
    id: number,
    dto: {
      name?: string
      category?: string
      description?: string | null
      duration?: number
      color?: string | null
      site_ids?: number[]
    },
  ): Promise<ServiceDto | null> {
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

  async function fetchServicesBySite(siteId: number): Promise<ServiceDto[]> {
    try {
      return await ipcInvoke<ServiceDto[]>('services:list-by-site', { siteId })
    } catch {
      return []
    }
  }

  async function getServiceSites(serviceId: number): Promise<number[]> {
    try {
      return await ipcInvoke<number[]>('services:get-sites', { id: serviceId })
    } catch {
      return []
    }
  }

  /* ─── Favorites ────────────────────────────────────────────── */

  async function fetchFavorites(userId: number): Promise<void> {
    try {
      favorites.value = await ipcInvoke<number[]>('favorites:list', { userId })
    } catch {
      favorites.value = []
    }
  }

  async function addFavorite(serviceId: number): Promise<void> {
    try {
      await ipcInvoke('favorites:add', { serviceId })
      if (!favorites.value.includes(serviceId)) {
        favorites.value.push(serviceId)
      }
    } catch {
      // silently fail
    }
  }

  async function removeFavorite(serviceId: number): Promise<void> {
    try {
      await ipcInvoke('favorites:remove', { serviceId })
      favorites.value = favorites.value.filter(id => id !== serviceId)
    } catch {
      // silently fail
    }
  }

  function isFavorite(serviceId: number): boolean {
    return favorites.value.includes(serviceId)
  }

  async function toggleFavorite(serviceId: number): Promise<void> {
    if (isFavorite(serviceId)) {
      await removeFavorite(serviceId)
    } else {
      await addFavorite(serviceId)
    }
  }

  return {
    services,
    loading,
    error,
    favorites,

    fetchServices,
    createService,
    updateService,
    deleteService,
    toggleService,
    reorderServices,
    fetchServicesBySite,
    getServiceSites,

    fetchFavorites,
    addFavorite,
    removeFavorite,
    isFavorite,
    toggleFavorite,
  }
}
