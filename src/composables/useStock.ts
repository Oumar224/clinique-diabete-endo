import { ref } from 'vue'
import { ipcInvoke } from '@/utils/ipc'

export interface StockNiveau {
  medicamentId: number
  dci: string
  nomCommercial?: string
  uniteStock: string
  seuilAlerte: number
  stockTotal: number
  nbLots: number
  prochainePeremption?: string
}

export interface StockLotDto {
  id?: number
  medicamentId?: number
  numeroLot?: string
  quantite?: number
  quantiteInitiale?: number
  datePeremption?: string
  dateEntree?: string
  createdAt?: string
  /** Phase 1 — traçabilité lot. */
  fournisseurId?: number | null
  fournisseurNom?: string
  prixAchat?: number | null
  refBl?: string
  refFacture?: string
  /** Renseigné lorsqu'un lot provient d'une réception de bon de commande. */
  commandeReceptionId?: number | null
  /** Nombre de pièces jointes (BL, facture…). */
  attachmentsCount?: number
}

export interface AlerteLot {
  lotId: number
  medicamentId: number
  dci: string
  numeroLot?: string
  quantite: number
  datePeremption?: string
}

export interface AlertesStock {
  ruptures: StockNiveau[]
  sousSeuil: StockNiveau[]
  perimes: AlerteLot[]
  peremptionProche: AlerteLot[]
}

export type MouvementStockType = 'entree' | 'sortie_manuelle' | 'delivrance' | 'administration' | 'ajustement'

export interface MouvementStockDto {
  id?: number
  medicamentId?: number
  lotId?: number
  type?: MouvementStockType
  quantite?: number
  stockAvant?: number
  stockApres?: number
  referenceType?: string
  referenceId?: string
  motif?: string
  userId?: number
  createdAt?: string
}

export interface MouvementStockRow extends MouvementStockDto {
  medicamentLabel: string
}

export interface EntreeStockParams {
  medicamentId: number
  quantite: number
  numeroLot?: string
  datePeremption?: string
  dateEntree?: string
  userId?: number | string
  /** Phase 1 — fournisseur du lot (défaut : principal du médicament). */
  fournisseurId?: number | null
  /** Phase 1 — prix d'achat du lot (pré-rempli catalogue, modifiable). */
  prixAchat?: number | null
  refBl?: string
  refFacture?: string
}

export interface SortieStockParams {
  medicamentId: number
  quantite: number
  motif: string
  userId?: number | string
}

export interface AjustementStockParams {
  medicamentId: number
  lotId?: number
  quantiteNouvelle: number
  motif: string
  userId?: number | string
}

const EMPTY_ALERTES: AlertesStock = { ruptures: [], sousSeuil: [], perimes: [], peremptionProche: [] }

const niveaux = ref<StockNiveau[]>([])
const lots = ref<StockLotDto[]>([])
const lotsMedicamentId = ref<number | null>(null)
const alertes = ref<AlertesStock>({ ...EMPTY_ALERTES })
const mouvements = ref<MouvementStockRow[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

export function useStock() {
  async function fetchNiveaux(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      niveaux.value = (await ipcInvoke<StockNiveau[]>('stock:niveaux')) ?? []
    } catch (e) {
      error.value = (e as Error).message
      niveaux.value = []
    } finally {
      loading.value = false
    }
  }

  async function fetchLots(medicamentId: number): Promise<StockLotDto[]> {
    lotsMedicamentId.value = medicamentId
    error.value = null
    try {
      lots.value = (await ipcInvoke<StockLotDto[]>('stock:lots', { medicamentId })) ?? []
    } catch (e) {
      error.value = (e as Error).message
      lots.value = []
    }
    return lots.value
  }

  async function fetchAlertes(peremptionMois = 3): Promise<void> {
    error.value = null
    try {
      alertes.value = (await ipcInvoke<AlertesStock>('stock:alertes', { peremptionMois })) ?? { ...EMPTY_ALERTES }
    } catch (e) {
      error.value = (e as Error).message
      alertes.value = { ...EMPTY_ALERTES }
    }
  }

  async function fetchMouvements(params?: { medicamentId?: number; type?: MouvementStockType; limit?: number }): Promise<void> {
    error.value = null
    try {
      const query: { medicamentId?: number; type?: MouvementStockType; limit?: number } = { limit: 100 }
      if (params?.medicamentId != null) query.medicamentId = params.medicamentId
      if (params?.type != null) query.type = params.type
      if (params?.limit != null) query.limit = params.limit
      mouvements.value = (await ipcInvoke<MouvementStockRow[]>('stock:mouvements', query)) ?? []
    } catch (e) {
      error.value = (e as Error).message
      mouvements.value = []
    }
  }

  async function refreshStock(medicamentId?: number): Promise<void> {
    await fetchNiveaux()
    await fetchAlertes()
    const target = medicamentId ?? lotsMedicamentId.value
    if (target != null) await fetchLots(target)
  }

  async function entreeStock(params: EntreeStockParams): Promise<StockLotDto | null> {
    error.value = null
    try {
      const lot = await ipcInvoke<StockLotDto>('stock:entree', params)
      await refreshStock(params.medicamentId)
      return lot
    } catch (e) {
      error.value = (e as Error).message
      return null
    }
  }

  async function sortieManuelle(params: SortieStockParams): Promise<boolean> {
    error.value = null
    try {
      await ipcInvoke('stock:sortie-manuelle', params)
      await refreshStock(params.medicamentId)
      return true
    } catch (e) {
      error.value = (e as Error).message
      return false
    }
  }

  async function ajustementStock(params: AjustementStockParams): Promise<StockLotDto | null> {
    error.value = null
    try {
      const lot = await ipcInvoke<StockLotDto>('stock:ajustement', params)
      await refreshStock(params.medicamentId)
      return lot
    } catch (e) {
      error.value = (e as Error).message
      return null
    }
  }

  return {
    niveaux,
    lots,
    lotsMedicamentId,
    alertes,
    mouvements,
    loading,
    error,
    fetchNiveaux,
    fetchLots,
    fetchAlertes,
    fetchMouvements,
    refreshStock,
    entreeStock,
    sortieManuelle,
    ajustementStock,
  }
}
