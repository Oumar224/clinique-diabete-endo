import { computed, ref } from 'vue'
import { ipcInvoke } from '@/utils/ipc'
import { UNITES_AUTORISEES } from '@/composables/useMedicaments'

export interface UniteStockDto {
  id?: number
  nom?: string
  ordre?: number
  createdAt?: string
}

/**
 * Référentiel des unités de stock, partagé entre les écrans pharmacie.
 *
 * Tant que la liste n'est pas chargée (ou si l'IPC échoue), on retombe sur les
 * unités historiques codées en dur : le formulaire reste utilisable hors ligne.
 */
const unites = ref<UniteStockDto[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

const noms = computed<string[]>(() => {
  const fromDb = unites.value
    .map((u) => u.nom?.trim())
    .filter((nom): nom is string => Boolean(nom))
  return fromDb.length > 0 ? fromDb : [...UNITES_AUTORISEES]
})

const uniteOptions = computed(() => noms.value.map((nom) => ({ label: nom, value: nom })))

export function useUnitesStock() {
  async function fetchUnites(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const rows = await ipcInvoke<UniteStockDto[]>('unites-stock:list')
      unites.value = Array.isArray(rows) ? rows : []
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Impossible de charger les unités'
    } finally {
      loading.value = false
    }
  }

  /**
   * Ajoute une unité (idempotent côté service).
   *
   * @returns L'unité créée ou existante, ou `null` en cas d'échec.
   */
  async function createUnite(nom: string): Promise<UniteStockDto | null> {
    error.value = null
    try {
      const created = await ipcInvoke<UniteStockDto>(
        'unites-stock:create',
        { nom },
        { silent: true },
      )
      if (!created?.nom) return null
      const exists = unites.value.some((u) => u.nom?.toLowerCase() === created.nom!.toLowerCase())
      if (!exists) unites.value = [...unites.value, created]
      return created
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Création de l'unité impossible"
      return null
    }
  }

  return {
    unites,
    noms,
    uniteOptions,
    loading,
    error,
    fetchUnites,
    createUnite,
  }
}
