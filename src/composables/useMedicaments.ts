import { ref, computed } from 'vue'
import { ipcInvoke } from '@/utils/ipc'

export type TypeProduit = 'medicament' | 'dispositif' | 'consommable' | 'autre'

export const TYPES_PRODUIT: readonly TypeProduit[] = ['medicament', 'dispositif', 'consommable', 'autre'] as const

export const TYPE_PRODUIT_LABEL: Record<TypeProduit, string> = {
  medicament: 'Médicament',
  dispositif: 'Dispositif',
  consommable: 'Consommable',
  autre: 'Autre',
}

/** Unités fermées Phase 1 — 13 valeurs autorisées. */
export const UNITES_AUTORISEES: readonly string[] = [
  'cp',
  'gél',
  'stylo',
  'plaquette',
  'blister',
  'tube',
  'flacon',
  'ampoule',
  'mL',
  'mg',
  'UI',
  'boîte',
  'autre',
] as const

export interface MedicamentDto {
  id?: number
  dci?: string
  nomCommercial?: string
  dosage?: string
  forme?: string
  uniteStock?: string
  seuilAlerte?: number
  actif?: boolean
  createdAt?: string
  updatedAt?: string
  /** Phase 1 — catalogue unique. Requis, défaut 'medicament'. */
  typeProduit?: TypeProduit
  /** Phase 1 — texte libre. Ex : 'boîte de 30 comprimés'. */
  conditionnement?: string
  /** Phase 1 — couple contenance tout-ou-rien avec uniteContenance. */
  contenanceQte?: number | null
  uniteContenance?: string
  /** Phase 1 — précision obligatoire si uniteStock ou uniteContenance == 'autre'. */
  autreUnitePrecision?: string
  /** Phase 1 — prix optionnels (NULLables), obligatoires en Phase 2. */
  prixAchat?: number | null
  prixVente?: number | null
  fournisseurPrincipalId?: number | null
}

export interface MedicamentOption {
  label: string
  value: number
}

/** Libellé court pour les selects de prescription : `DCI + dosage`. */
export function medicamentShortLabel(m: MedicamentDto): string {
  return [m.dci, m.dosage].filter(Boolean).join(' ')
}

/** Libellé complet : `DCI dosage — commercial (forme)`. */
export function medicamentLabel(m: MedicamentDto): string {
  const base = medicamentShortLabel(m)
  const extra = [m.nomCommercial, m.forme ? `(${m.forme})` : ''].filter(Boolean).join(' ')
  return extra ? `${base} — ${extra}` : base
}

const medicaments = ref<MedicamentDto[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

export function useMedicaments() {
  const medicamentOptions = computed<MedicamentOption[]>(() =>
    medicaments.value
      .filter(m => m.id != null)
      .map(m => ({ label: medicamentLabel(m), value: m.id as number })),
  )

  async function fetchMedicaments(params?: { actif?: boolean; search?: string }): Promise<void> {
    loading.value = true
    error.value = null
    try {
      medicaments.value = (await ipcInvoke<MedicamentDto[]>('medicament:list', params ?? {})) ?? []
    } catch (e) {
      error.value = (e as Error).message
      medicaments.value = []
    } finally {
      loading.value = false
    }
  }

  async function getMedicament(id: number): Promise<MedicamentDto | null> {
    error.value = null
    try {
      return (await ipcInvoke<MedicamentDto | null>('medicament:get', { id })) ?? null
    } catch (e) {
      error.value = (e as Error).message
      return null
    }
  }

  async function saveMedicament(dto: MedicamentDto): Promise<MedicamentDto | null> {
    error.value = null
    try {
      const saved = dto.id
        ? await ipcInvoke<MedicamentDto>('medicament:update', dto)
        : await ipcInvoke<MedicamentDto>('medicament:create', dto)
      await fetchMedicaments()
      return saved
    } catch (e) {
      error.value = (e as Error).message
      return null
    }
  }

  async function deactivateMedicament(id: number): Promise<boolean> {
    error.value = null
    try {
      await ipcInvoke('medicament:deactivate', { id })
      await fetchMedicaments()
      return true
    } catch (e) {
      error.value = (e as Error).message
      return false
    }
  }

  async function reactivateMedicament(id: number): Promise<MedicamentDto | null> {
    return saveMedicament({ id, actif: true })
  }

  return {
    medicaments,
    medicamentOptions,
    loading,
    error,
    fetchMedicaments,
    getMedicament,
    saveMedicament,
    deactivateMedicament,
    reactivateMedicament,
  }
}
