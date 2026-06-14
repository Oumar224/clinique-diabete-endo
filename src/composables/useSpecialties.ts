import { ref } from 'vue'
import { ipcInvoke } from '@/utils/ipc'

export interface SpecialtyDto {
  id?: number
  name: string
  code: string
  title_prefix: string
  is_active: boolean
}

const specialties = ref<SpecialtyDto[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

export function useSpecialties() {
  async function fetchSpecialties(activeOnly?: boolean): Promise<void> {
    loading.value = true
    error.value = null
    try {
      specialties.value = await ipcInvoke<SpecialtyDto[]>('specialties:list', { activeOnly })
    } catch (e) {
      error.value = (e as Error).message
    } finally {
      loading.value = false
    }
  }

  async function createSpecialty(dto: { name: string; code: string; title_prefix: string }): Promise<SpecialtyDto | null> {
    try {
      const created = await ipcInvoke<SpecialtyDto>('specialties:create', dto)
      await fetchSpecialties()
      return created
    } catch {
      return null
    }
  }

  async function updateSpecialty(id: number, dto: Partial<Pick<SpecialtyDto, 'name' | 'code' | 'title_prefix'>>): Promise<SpecialtyDto | null> {
    try {
      const updated = await ipcInvoke<SpecialtyDto>('specialties:update', { id, ...dto })
      await fetchSpecialties()
      return updated
    } catch {
      return null
    }
  }

  async function deleteSpecialty(id: number): Promise<boolean> {
    try {
      await ipcInvoke('specialties:delete', { id })
      await fetchSpecialties()
      return true
    } catch {
      return false
    }
  }

  async function toggleSpecialty(id: number, isActive: boolean): Promise<SpecialtyDto | null> {
    try {
      const toggled = await ipcInvoke<SpecialtyDto>('specialties:toggle', { id, is_active: isActive })
      const idx = specialties.value.findIndex(s => s.id === id)
      if (idx !== -1) specialties.value[idx] = toggled
      return toggled
    } catch {
      return null
    }
  }

  return {
    specialties,
    loading,
    error,
    fetchSpecialties,
    createSpecialty,
    updateSpecialty,
    deleteSpecialty,
    toggleSpecialty,
  }
}
