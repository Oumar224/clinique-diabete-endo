import { ref } from 'vue'
import { ipcInvoke } from '@/utils/ipc'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface StockageDto {
  id?: number
  code: string
  name: string
  description?: string | null
  sort_order: number
  champs_count?: number
  is_active: boolean
}

export interface ChampLocalisationDto {
  id?: number
  stockage_id: number
  cle: string
  label: string
  type?: string
  sort_order: number
}

/* ------------------------------------------------------------------ */
/*  State (module-level)                                               */
/* ------------------------------------------------------------------ */

const stockages = ref<StockageDto[]>([])
const champs = ref<ChampLocalisationDto[]>([])
const loading = ref(false)
const champsLoading = ref(false)
const error = ref<string | null>(null)

/* ------------------------------------------------------------------ */
/*  Composable                                                         */
/* ------------------------------------------------------------------ */

export function useConservateurs() {
  /* ---- Stockages ---- */

  async function fetchStockages(activeOnly?: boolean): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const params = activeOnly !== undefined ? { activeOnly } : undefined
      const result = await ipcInvoke<StockageDto[]>('conservateurs:list', params)
      stockages.value = result ?? []
    } catch (e) {
      error.value = (e as Error).message
      stockages.value = []
    } finally {
      loading.value = false
    }
  }

  async function createStockage(dto: {
    code: string
    name: string
    description?: string | null
    sort_order: number
  }): Promise<StockageDto | null> {
    try {
      const created = await ipcInvoke<StockageDto>('conservateurs:create', dto)
      await fetchStockages()
      return created ?? null
    } catch (e) {
      error.value = (e as Error).message
      return null
    }
  }

  async function updateStockage(id: number, dto: Partial<Pick<StockageDto, 'code' | 'name' | 'description' | 'sort_order'>>): Promise<StockageDto | null> {
    try {
      const updated = await ipcInvoke<StockageDto>('conservateurs:update', { id, ...dto })
      await fetchStockages()
      return updated
    } catch (e) {
      error.value = (e as Error).message
      return null
    }
  }

  async function deleteStockage(id: number): Promise<boolean> {
    try {
      await ipcInvoke('conservateurs:delete', { id })
      await fetchStockages()
      return true
    } catch (e) {
      error.value = (e as Error).message
      return false
    }
  }

  async function toggleStockage(id: number, isActive: boolean): Promise<StockageDto | null> {
    try {
      const toggled = await ipcInvoke<StockageDto>('conservateurs:toggle', { id, is_active: isActive })
      const idx = stockages.value.findIndex(s => s.id === id)
      if (idx !== -1) stockages.value[idx] = toggled
      return toggled
    } catch (e) {
      error.value = (e as Error).message
      return null
    }
  }

  /* ---- Champs de localisation ---- */

  async function fetchChampsByStockage(stockageId: number): Promise<void> {
    champsLoading.value = true
    error.value = null
    try {
      const result = await ipcInvoke<ChampLocalisationDto[]>('conservateurs:champs-list', { stockage_id: stockageId })
      champs.value = result ?? []
    } catch (e) {
      error.value = (e as Error).message
      champs.value = []
    } finally {
      champsLoading.value = false
    }
  }

  async function createChamp(dto: {
    stockage_id: number
    cle: string
    label: string
    type?: string
    sort_order: number
  }): Promise<ChampLocalisationDto | null> {
    try {
      const created = await ipcInvoke<ChampLocalisationDto>('conservateurs:champs-create', dto)
      await fetchChampsByStockage(dto.stockage_id)
      return created ?? null
    } catch (e) {
      error.value = (e as Error).message
      return null
    }
  }

  async function updateChamp(id: number, dto: Partial<Pick<ChampLocalisationDto, 'cle' | 'label' | 'type' | 'sort_order'>> & { stockage_id: number }): Promise<ChampLocalisationDto | null> {
    try {
      const updated = await ipcInvoke<ChampLocalisationDto>('conservateurs:champs-update', { id, ...dto })
      await fetchChampsByStockage(dto.stockage_id)
      return updated
    } catch (e) {
      error.value = (e as Error).message
      return null
    }
  }

  async function deleteChamp(id: number, stockageId?: number): Promise<boolean> {
    try {
      await ipcInvoke('conservateurs:champs-delete', { id })
      if (stockageId) {
        await fetchChampsByStockage(stockageId)
      }
      return true
    } catch (e) {
      error.value = (e as Error).message
      return false
    }
  }

  return {
    stockages,
    champs,
    loading,
    champsLoading,
    error,
    fetchStockages,
    fetchChampsByStockage,
    createStockage,
    updateStockage,
    deleteStockage,
    toggleStockage,
    createChamp,
    updateChamp,
    deleteChamp,
  }
}
