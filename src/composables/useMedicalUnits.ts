import { ref } from 'vue'
import { ipcInvoke } from '@/utils/ipc'

export interface MedicalUnitDto {
  id?: number
  code: string
  name: string
  is_active: boolean
}

const units = ref<MedicalUnitDto[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

export function useMedicalUnits() {
  async function fetchUnits(activeOnly?: boolean): Promise<void> {
    loading.value = true
    error.value = null
    try {
      units.value = await ipcInvoke<MedicalUnitDto[]>('medical-units:list', { activeOnly })
    } catch (e) {
      error.value = (e as Error).message
    } finally {
      loading.value = false
    }
  }

  async function createUnit(dto: { code: string; name: string }): Promise<MedicalUnitDto | null> {
    try {
      const created = await ipcInvoke<MedicalUnitDto>('medical-units:create', dto)
      await fetchUnits()
      return created
    } catch {
      return null
    }
  }

  async function updateUnit(id: number, dto: Partial<Pick<MedicalUnitDto, 'code' | 'name'>>): Promise<MedicalUnitDto | null> {
    try {
      const updated = await ipcInvoke<MedicalUnitDto>('medical-units:update', { id, ...dto })
      await fetchUnits()
      return updated
    } catch {
      return null
    }
  }

  async function deleteUnit(id: number): Promise<boolean> {
    try {
      await ipcInvoke('medical-units:delete', { id })
      await fetchUnits()
      return true
    } catch {
      return false
    }
  }

  async function toggleUnit(id: number, isActive: boolean): Promise<MedicalUnitDto | null> {
    try {
      const toggled = await ipcInvoke<MedicalUnitDto>('medical-units:toggle', { id, is_active: isActive })
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
