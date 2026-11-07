import { ref, computed } from 'vue'
import { ipcInvoke } from '@/utils/ipc'

export interface FournisseurDto {
  id?: number
  nom?: string
  contact?: string
  telephone?: string
  email?: string
  adresse?: string
  actif?: boolean
  /** Fournisseur désigné comme pharmacie centrale (priorité d'achat). */
  estPharmacieCentrale?: boolean
  createdAt?: string
  updatedAt?: string
}

export interface FournisseurOption {
  label: string
  value: number
}

const fournisseurs = ref<FournisseurDto[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

export function useFournisseurs() {
  const fournisseurOptions = computed<FournisseurOption[]>(() =>
    fournisseurs.value
      .filter((f) => f.id != null)
      .map((f) => ({ label: f.nom ?? `#${f.id}`, value: f.id as number })),
  )

  async function fetchFournisseurs(params?: { actif?: boolean; search?: string; estPharmacieCentrale?: boolean }): Promise<void> {
    loading.value = true
    error.value = null
    try {
      fournisseurs.value = (await ipcInvoke<FournisseurDto[]>('fournisseur:list', params ?? {})) ?? []
    } catch (e) {
      error.value = (e as Error).message
      fournisseurs.value = []
    } finally {
      loading.value = false
    }
  }

  async function getFournisseur(id: number): Promise<FournisseurDto | null> {
    error.value = null
    try {
      return (await ipcInvoke<FournisseurDto | null>('fournisseur:get', { id })) ?? null
    } catch (e) {
      error.value = (e as Error).message
      return null
    }
  }

  async function saveFournisseur(dto: FournisseurDto): Promise<FournisseurDto | null> {
    error.value = null
    try {
      const saved = dto.id
        ? await ipcInvoke<FournisseurDto>('fournisseur:update', dto)
        : await ipcInvoke<FournisseurDto>('fournisseur:create', dto)
      await fetchFournisseurs()
      return saved
    } catch (e) {
      error.value = (e as Error).message
      return null
    }
  }

  return {
    fournisseurs,
    fournisseurOptions,
    loading,
    error,
    fetchFournisseurs,
    getFournisseur,
    saveFournisseur,
  }
}
