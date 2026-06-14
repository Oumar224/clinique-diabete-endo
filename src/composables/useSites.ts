import { ref } from 'vue'
import { ipcInvoke } from '@/utils/ipc'

export interface SiteDto {
  id?: number
  name: string
  address?: string | null
  phone?: string | null
  email?: string | null
  is_default: boolean
  is_active: boolean
}

const sites = ref<SiteDto[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

export function useSites() {
  async function fetchSites(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      sites.value = await ipcInvoke<SiteDto[]>('sites:list')
    } catch (e) {
      error.value = (e as Error).message
    } finally {
      loading.value = false
    }
  }

  async function createSite(dto: { name: string; address?: string | null; phone?: string | null; email?: string | null; is_default?: boolean }): Promise<SiteDto | null> {
    try {
      const created = await ipcInvoke<SiteDto>('sites:create', dto)
      await fetchSites()
      return created
    } catch {
      return null
    }
  }

  async function updateSite(id: number, dto: Partial<Pick<SiteDto, 'name' | 'address' | 'phone' | 'email' | 'is_default'>>): Promise<SiteDto | null> {
    try {
      const updated = await ipcInvoke<SiteDto>('sites:update', { id, ...dto })
      await fetchSites()
      return updated
    } catch {
      return null
    }
  }

  async function deleteSite(id: number): Promise<boolean> {
    try {
      await ipcInvoke('sites:delete', { id })
      await fetchSites()
      return true
    } catch {
      return false
    }
  }

  async function toggleSite(id: number, isActive: boolean): Promise<SiteDto | null> {
    try {
      const toggled = await ipcInvoke<SiteDto>('sites:toggle', { id, is_active: isActive })
      const idx = sites.value.findIndex(s => s.id === id)
      if (idx !== -1) sites.value[idx] = toggled
      return toggled
    } catch {
      return null
    }
  }

  async function setDefaultSite(id: number): Promise<SiteDto | null> {
    try {
      const updated = await ipcInvoke<SiteDto>('sites:set-default', { id })
      await fetchSites()
      return updated
    } catch {
      return null
    }
  }

  return {
    sites,
    loading,
    error,
    fetchSites,
    createSite,
    updateSite,
    deleteSite,
    toggleSite,
    setDefaultSite,
  }
}
