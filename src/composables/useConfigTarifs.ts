import { ref } from 'vue'
import { ipcInvoke } from '@/utils/ipc'

export interface TarifDto {
  id?: number
  acte_id: number
  code_tarif: string
  prix_unitaire: number
  date_application: string
  created_at?: string
  updated_at?: string
  acte_code?: string
  acte_label?: string
  service_name?: string
}

const tarifs = ref<TarifDto[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

export function useConfigTarifs() {
  async function fetchTarifs(acteId?: number, codeTarif?: string): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const params: Record<string, any> = {}
      if (acteId !== undefined) params.acte_id = acteId
      if (codeTarif !== undefined) params.code_tarif = codeTarif
      const result = await ipcInvoke<TarifDto[]>('tarifs:list', params)
      tarifs.value = Array.isArray(result) ? result : []
    } catch (e) {
      error.value = (e as Error).message
      tarifs.value = []
    } finally {
      loading.value = false
    }
  }

  async function getActiveTarif(acteId: number, codeTarif?: string): Promise<TarifDto | null> {
    try {
      const params: Record<string, any> = { acte_id: acteId }
      if (codeTarif !== undefined) params.code_tarif = codeTarif
      return await ipcInvoke<TarifDto | null>('tarifs:get-active', params)
    } catch {
      return null
    }
  }

  async function createTarif(dto: { acte_id: number; prix_unitaire: number; code_tarif?: string }): Promise<TarifDto | null> {
    try {
      const created = await ipcInvoke<TarifDto>('tarifs:create', { ...dto, code_tarif: dto.code_tarif || 'TARIF.STANDARD' })
      await fetchTarifs()
      return created
    } catch {
      return null
    }
  }

  async function updateTarif(id: number, dto: { prix_unitaire?: number }): Promise<TarifDto | null> {
    try {
      const updated = await ipcInvoke<TarifDto>('tarifs:update', { id, ...dto })
      await fetchTarifs()
      return updated
    } catch {
      return null
    }
  }

  async function bulkUpdateTarifs(items: { acte_id: number; code_tarif: string; prix_unitaire: number }[]): Promise<boolean> {
    try {
      await ipcInvoke('tarifs:bulk-update', { items })
      await fetchTarifs()
      return true
    } catch {
      return false
    }
  }

  async function deleteTarif(id: number): Promise<boolean> {
    try {
      await ipcInvoke('tarifs:delete', { id })
      await fetchTarifs()
      return true
    } catch {
      return false
    }
  }

  async function fetchPriceHistory(acteId: number): Promise<any[]> {
    if (acteId == null) return []
    try {
      return await ipcInvoke<any[]>('tarifs:price-history', { acteId })
    } catch {
      return []
    }
  }

  return {
    tarifs,
    loading,
    error,
    fetchTarifs,
    getActiveTarif,
    createTarif,
    updateTarif,
    bulkUpdateTarifs,
    deleteTarif,
    fetchPriceHistory,
  }
}
