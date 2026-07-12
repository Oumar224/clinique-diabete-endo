import { ref } from 'vue'
import { ipcInvoke } from '@/utils/ipc'

export interface CareUnitDto {
  id?: number
  service_id: number
  name: string
  code?: string | null
  description?: string | null
  is_active: boolean
  sort_order: number
  service_name?: string
  created_at?: string
  updated_at?: string
}

const units = ref<CareUnitDto[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

export function useCareUnits() {
  async function fetchUnits(serviceId?: number): Promise<void> {
    loading.value = true
    error.value = null
    try {
      units.value = await ipcInvoke<CareUnitDto[]>('care-units:list', { serviceId })
    } catch (e) {
      error.value = (e as Error).message
    } finally {
      loading.value = false
    }
  }

  async function createUnit(dto: { service_id: number; name: string; code?: string | null; description?: string | null }): Promise<CareUnitDto | null> {
    try {
      const created = await ipcInvoke<CareUnitDto>('care-units:create', dto)
      await fetchUnits()
      return created
    } catch {
      return null
    }
  }

  async function updateUnit(id: number, dto: Partial<Pick<CareUnitDto, 'service_id' | 'name' | 'code' | 'description'>>): Promise<CareUnitDto | null> {
    try {
      const updated = await ipcInvoke<CareUnitDto>('care-units:update', { id, ...dto })
      await fetchUnits()
      return updated
    } catch {
      return null
    }
  }

  async function deleteUnit(id: number): Promise<boolean> {
    try {
      await ipcInvoke('care-units:delete', { id })
      await fetchUnits()
      return true
    } catch {
      return false
    }
  }

  async function toggleUnit(id: number, isActive: boolean): Promise<CareUnitDto | null> {
    try {
      const toggled = await ipcInvoke<CareUnitDto>('care-units:toggle', { id, is_active: isActive })
      const idx = units.value.findIndex(u => u.id === id)
      if (idx !== -1) units.value[idx] = toggled
      return toggled
    } catch {
      return null
    }
  }

  return {
    units,
    loading,
    error,
    fetchUnits,
    createUnit,
    updateUnit,
    deleteUnit,
    toggleUnit,
  }
}
