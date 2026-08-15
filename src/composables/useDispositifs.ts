import { ref } from 'vue'
import { ipcInvoke } from '@/utils/ipc'
import type { Dispositif } from '@/types/soins'

export interface DispositifInput {
  patientId: number
  type: string
  datePose: string
  aspect: 'Sain' | 'Rouge' | 'Douloureux'
  volumeMl: number | null
}

const dispositifs = ref<Dispositif[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

export function useDispositifs() {
  async function fetchDispositifs(patientId: number): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const result = await ipcInvoke<Dispositif[]>('dispositifs:list', { patientId })
      dispositifs.value = result ?? []
    } catch (e) {
      error.value = (e as Error).message
      dispositifs.value = []
    } finally {
      loading.value = false
    }
  }

  async function addDispositif(data: DispositifInput): Promise<Dispositif | null> {
    loading.value = true
    error.value = null
    try {
      const created = await ipcInvoke<Dispositif>('dispositifs:create', data as unknown as Record<string, unknown>)
      return created ?? null
    } catch (e) {
      error.value = (e as Error).message
      return null
    } finally {
      loading.value = false
    }
  }

  async function removeDispositif(id: number): Promise<void> {
    loading.value = true
    error.value = null
    try {
      await ipcInvoke('dispositifs:delete', { id })
    } catch (e) {
      error.value = (e as Error).message
    } finally {
      loading.value = false
    }
  }

  return {
    dispositifs,
    loading,
    error,
    fetchDispositifs,
    addDispositif,
    removeDispositif,
  }
}
