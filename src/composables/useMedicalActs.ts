import { ref } from 'vue'
import { ElMessage } from 'element-plus'

export interface MedicalActDto {
  id?: number
  code: string
  label: string
  price: number
  currency_code?: string
  service_id: number
  service_name?: string
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export interface ActPriceHistoryDto {
  id: number
  act_id: number
  old_price: number | null
  new_price: number
  change_reason?: string | null
  changed_at: string
}

const acts = ref<MedicalActDto[]>([])
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

export function useMedicalActs() {
  async function fetchActs(params?: { activeOnly?: boolean }): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const result = await invoke<MedicalActDto[]>('acts:list', params || {})
      acts.value = Array.isArray(result) ? result : []
    } catch (e) {
      error.value = (e as Error).message
      acts.value = []
    } finally {
      loading.value = false
    }
  }

  async function createAct(dto: { code: string; label: string; price: number; service_id: number; currency_code?: string }): Promise<MedicalActDto | null> {
    try {
      const created = await invoke<MedicalActDto>('acts:create', dto)
      await fetchActs()
      return created
    } catch {
      return null
    }
  }

  async function updateAct(id: number, dto: { code?: string; label?: string; price?: number; currency_code?: string; service_id?: number; is_active?: boolean }): Promise<MedicalActDto | null> {
    try {
      const updated = await invoke<MedicalActDto>('acts:update', { id, ...dto })
      await fetchActs()
      return updated
    } catch {
      return null
    }
  }

  async function deleteAct(id: number): Promise<boolean> {
    try {
      await invoke('acts:delete', { id })
      await fetchActs()
      return true
    } catch {
      return false
    }
  }

  async function fetchPriceHistory(actId: number): Promise<ActPriceHistoryDto[]> {
    if (actId == null) return []
    try {
      return await invoke<ActPriceHistoryDto[]>('acts:price-history', { actId })
    } catch {
      return []
    }
  }

  return {
    acts,
    loading,
    error,
    fetchActs,
    createAct,
    updateAct,
    deleteAct,
    fetchPriceHistory,
  }
}
