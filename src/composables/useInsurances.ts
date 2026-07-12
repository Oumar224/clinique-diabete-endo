import { ref } from 'vue'
import { ipcInvoke } from '@/utils/ipc'

export interface InsuranceDto {
  id?: number
  name: string
  code: string
  is_active: boolean
}

const insurances = ref<InsuranceDto[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

export function useInsurances() {
  async function fetchInsurances(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const result = await ipcInvoke<InsuranceDto[]>('insurances:list')
      insurances.value = result ?? []
    } catch (e) {
      error.value = (e as Error).message
      insurances.value = []
    } finally {
      loading.value = false
    }
  }

  async function fetchActiveInsurances(): Promise<InsuranceDto[]> {
    try {
      const result = await ipcInvoke<InsuranceDto[]>('insurances:list-active')
      return result ?? []
    } catch {
      return []
    }
  }

  async function createInsurance(data: {
    name: string
    code: string
    is_active: boolean
  }): Promise<InsuranceDto | null> {
    try {
      const created = await ipcInvoke<InsuranceDto>('insurances:create', data)
      await fetchInsurances()
      return created ?? null
    } catch {
      return null
    }
  }

  async function updateInsurance(id: number, data: {
    name?: string
    code?: string
    is_active?: boolean
  }): Promise<InsuranceDto | null> {
    try {
      const updated = await ipcInvoke<InsuranceDto>('insurances:update', { id, ...data })
      await fetchInsurances()
      return updated
    } catch {
      return null
    }
  }

  async function deleteInsurance(id: number): Promise<boolean> {
    try {
      await ipcInvoke('insurances:delete', { id })
      await fetchInsurances()
      return true
    } catch {
      return false
    }
  }

  return {
    insurances,
    loading,
    error,
    fetchInsurances,
    fetchActiveInsurances,
    createInsurance,
    updateInsurance,
    deleteInsurance,
  }
}
