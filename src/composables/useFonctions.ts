import { ref } from 'vue'
import { ipcInvoke } from '@/utils/ipc'

export interface FonctionDto {
  id?: number
  name: string
  is_active: boolean
  created_at?: string
  updated_at?: string
}

const fonctions = ref<FonctionDto[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

export function useFonctions() {
  async function fetchFonctions(activeOnly = false): Promise<void> {
    loading.value = true
    error.value = null
    try {
      fonctions.value = await ipcInvoke<FonctionDto[]>('fonctions:list', { activeOnly })
    } catch (e) {
      error.value = (e as Error).message
    } finally {
      loading.value = false
    }
  }

  async function createFonction(name: string): Promise<FonctionDto | null> {
    try {
      const created = await ipcInvoke<FonctionDto>('fonctions:create', { name })
      fonctions.value.push(created)
      return created
    } catch { return null }
  }

  async function updateFonction(id: number, dto: Partial<FonctionDto>): Promise<FonctionDto | null> {
    try {
      const updated = await ipcInvoke<FonctionDto>('fonctions:update', { id, ...dto })
      const idx = fonctions.value.findIndex(f => f.id === id)
      if (idx !== -1) fonctions.value[idx] = updated
      return updated
    } catch { return null }
  }

  async function deleteFonction(id: number): Promise<boolean> {
    try {
      await ipcInvoke('fonctions:delete', { id })
      fonctions.value = fonctions.value.filter(f => f.id !== id)
      return true
    } catch { return false }
  }

  async function toggleFonction(id: number): Promise<boolean> {
    try {
      await ipcInvoke('fonctions:toggle', { id })
      const f = fonctions.value.find(f => f.id === id)
      if (f) f.is_active = !f.is_active
      return true
    } catch { return false }
  }

  return { fonctions, loading, error, fetchFonctions, createFonction, updateFonction, deleteFonction, toggleFonction }
}
