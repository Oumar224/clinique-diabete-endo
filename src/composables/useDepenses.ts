import { ref } from 'vue'
import { ipcInvoke } from '@/utils/ipc'
import type { ModePaiement } from '@/composables/useSalaires'

/** Types alignés sur `electron/dto/depense.dto.ts`. Tous les montants sont en GNF entiers. */

export type DepenseSource = 'manuel' | 'stock_entree'
export type DepenseStatutPaiement = 'payee' | 'credit'
/** Date retenue pour borner la période d'une dépense. */
export type DepenseDateReference = 'ecriture' | 'decaissement'

export interface DepenseCategorie {
  id?: number
  code?: string
  nom?: string
  couleur?: string
  actif?: boolean
  ordre?: number
  createdAt?: string
  updatedAt?: string
}

export interface Depense {
  id?: number
  date?: string
  categorieId?: number
  categorieNom?: string
  categorieCode?: string
  categorieCouleur?: string | null
  libelle?: string
  montant?: number
  modePaiement?: ModePaiement | null
  fournisseurId?: number | null
  fournisseurNom?: string
  reference?: string
  notes?: string
  source?: DepenseSource
  sourceId?: number | null
  statutPaiement?: DepenseStatutPaiement
  datePaiement?: string
  createdBy?: number
  createdAt?: string
  updatedAt?: string
}

export interface DepenseCategorieCreate {
  code?: string
  nom: string
  couleur?: string
  actif?: boolean
  ordre?: number
}

export interface DepenseCategorieUpdate {
  nom?: string
  couleur?: string | null
  actif?: boolean
  ordre?: number
}

export interface DepenseCreate {
  date: string
  categorieId: number
  libelle: string
  montant: number
  modePaiement?: ModePaiement | null
  fournisseurId?: number | null
  fournisseurNom?: string
  reference?: string
  notes?: string
  statutPaiement?: DepenseStatutPaiement
  datePaiement?: string
  createdBy?: number
}

export interface DepenseUpdate {
  date?: string
  categorieId?: number
  libelle?: string
  montant?: number
  modePaiement?: ModePaiement | null
  fournisseurId?: number | null
  fournisseurNom?: string | null
  reference?: string | null
  notes?: string | null
  statutPaiement?: DepenseStatutPaiement
  datePaiement?: string | null
}

export interface DepenseListFiltres {
  dateDebut?: string
  dateFin?: string
  categorieId?: number
  statutPaiement?: DepenseStatutPaiement
  source?: DepenseSource
  search?: string
  /** Défaut backend de la liste : `ecriture`. */
  dateReference?: DepenseDateReference
}

export interface DepenseMarquerPayee {
  datePaiement?: string
  modePaiement: ModePaiement
}

export interface DepenseSyntheseCategorie {
  categorieId?: number
  code?: string
  nom?: string
  couleur?: string | null
  total: number
  count: number
}

export interface DepenseSyntheseFournisseur {
  fournisseurNom: string
  total: number
  count: number
}

export interface DepenseSynthese {
  total: number
  totalPaye: number
  totalCredit: number
  count: number
  parCategorie: DepenseSyntheseCategorie[]
  parFournisseur: DepenseSyntheseFournisseur[]
  /** Date de référence effectivement utilisée par le backend. */
  dateReference?: DepenseDateReference
}

export function useDepenses() {
  const depenses = ref<Depense[]>([])
  const categories = ref<DepenseCategorie[]>([])
  const synthese = ref<DepenseSynthese | null>(null)
  const loading = ref(false)
  const saving = ref(false)
  const error = ref<string | null>(null)

  async function run<T>(task: () => Promise<T>, state: 'loading' | 'saving' = 'loading'): Promise<T> {
    const target = state === 'saving' ? saving : loading
    target.value = true
    error.value = null
    try {
      return await task()
    } catch (e) {
      error.value = (e as Error).message
      throw e
    } finally {
      target.value = false
    }
  }

  /** Liste les dépenses filtrées (`depense:list`). */
  async function fetchDepenses(filtres: DepenseListFiltres = {}): Promise<Depense[]> {
    const rows = await run(() => ipcInvoke<Depense[]>('depense:list', filtres))
    depenses.value = rows ?? []
    return depenses.value
  }

  /** Synthèse des dépenses filtrées (`depense:synthese`). */
  async function fetchSynthese(filtres: DepenseListFiltres = {}): Promise<DepenseSynthese | null> {
    const data = await run(() => ipcInvoke<DepenseSynthese>('depense:synthese', filtres))
    synthese.value = data ?? null
    return synthese.value
  }

  /** Crée une dépense manuelle (`depense:create`). */
  async function createDepense(dto: DepenseCreate): Promise<Depense> {
    return run(() => ipcInvoke<Depense>('depense:create', dto), 'saving')
  }

  /** Met à jour une dépense manuelle (`depense:update`). */
  async function updateDepense(id: number, dto: DepenseUpdate): Promise<Depense> {
    return run(() => ipcInvoke<Depense>('depense:update', { id, ...dto }), 'saving')
  }

  /** Supprime une dépense manuelle (`depense:delete`). */
  async function deleteDepense(id: number): Promise<void> {
    await run(() => ipcInvoke<{ deleted: true }>('depense:delete', { id }), 'saving')
  }

  /** Marque une dépense à crédit comme payée (`depense:marquer-payee`). */
  async function marquerPayee(id: number, dto: DepenseMarquerPayee): Promise<Depense> {
    return run(() => ipcInvoke<Depense>('depense:marquer-payee', { id, ...dto }), 'saving')
  }

  /** Liste les catégories (`depense:categories`). */
  async function fetchCategories(includeInactive = false): Promise<DepenseCategorie[]> {
    const rows = await run(() => ipcInvoke<DepenseCategorie[]>('depense:categories', { includeInactive }))
    categories.value = rows ?? []
    return categories.value
  }

  /** Crée une catégorie (`depense:categorie:create`). */
  async function createCategorie(dto: DepenseCategorieCreate): Promise<DepenseCategorie> {
    return run(() => ipcInvoke<DepenseCategorie>('depense:categorie:create', dto), 'saving')
  }

  /** Met à jour une catégorie (`depense:categorie:update`). */
  async function updateCategorie(id: number, dto: DepenseCategorieUpdate): Promise<DepenseCategorie> {
    return run(() => ipcInvoke<DepenseCategorie>('depense:categorie:update', { id, ...dto }), 'saving')
  }

  /** Supprime une catégorie (`depense:categorie:delete`). */
  async function deleteCategorie(id: number): Promise<void> {
    await run(() => ipcInvoke<{ deleted: true }>('depense:categorie:delete', { id }), 'saving')
  }

  return {
    depenses,
    categories,
    synthese,
    loading,
    saving,
    error,
    fetchDepenses,
    fetchSynthese,
    createDepense,
    updateDepense,
    deleteDepense,
    marquerPayee,
    fetchCategories,
    createCategorie,
    updateCategorie,
    deleteCategorie,
  }
}
