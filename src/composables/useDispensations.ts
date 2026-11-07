import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { ipcInvoke } from '@/utils/ipc'
import type { ModePaiement } from './useSalaires'

export type DelivranceStatut = 'a_servir' | 'partielle' | 'servie' | 'annulee'
export type DelivranceTypeVente = 'facturee' | 'gratuite'

/** Motifs de gratuité proposés lors du service d'une délivrance. */
export type MotifGratuite = 'depistage_gratuit' | 'indigent' | 'autre'

export const MOTIFS_GRATUITE: ReadonlyArray<{ value: MotifGratuite; label: string }> = [
  { value: 'depistage_gratuit', label: 'Dépistage gratuit' },
  { value: 'indigent', label: 'Indigent' },
  { value: 'autre', label: 'Autre' },
]

/**
 * Statut financier d'une délivrance réalisée.
 *
 * Miroir de `computeStatutFinancier` (backend `dispensation.service.ts`) :
 * une gratuité n'a jamais de montant, une vente sans prix de vente est
 * « sans montant », sinon on compare le cumul payé au total.
 */
export type StatutFinancierDelivrance = 'gratuite' | 'sans_montant' | 'credit' | 'partielle' | 'payee'

/**
 * Calcule le statut financier d'une délivrance.
 *
 * @param typeVente - Type de vente de la délivrance.
 * @param montantTotal - Total valorisé de la délivrance (entier GNF).
 * @param montantPaye - Cumul des paiements encaissés (entier GNF).
 * @returns Le statut financier correspondant.
 */
export function computeStatutFinancierDelivrance(
  typeVente: DelivranceTypeVente | null | undefined,
  montantTotal: number,
  montantPaye: number,
): StatutFinancierDelivrance {
  if ((typeVente ?? 'facturee') === 'gratuite') return 'gratuite'
  if (montantTotal <= 0) return 'sans_montant'
  if (montantPaye <= 0) return 'credit'
  if (montantPaye >= montantTotal) return 'payee'
  return 'partielle'
}

export interface DelivranceDto {
  id?: number
  source?: string
  sourceDocumentId?: string
  patientId?: number
  statut?: DelivranceStatut
  servedBy?: number
  servedAt?: string
  motif?: string
  /** Date effective de la vente (comptabilité pharmacie). */
  dateVente?: string
  typeVente?: DelivranceTypeVente
  motifGratuite?: string
  /** Montant total figé par le serveur au premier service. */
  montantTotal?: number
  /** Somme des paiements déjà encaissés sur cette délivrance. */
  montantPaye?: number
  /** Reste à payer (`montantTotal - montantPaye`). */
  reste?: number
  /** Statut financier calculé par le serveur. */
  statutFinancier?: StatutFinancierDelivrance
  /** Vrai si une ligne servie n'a pas de prix de vente renseigné. */
  prixManquant?: boolean
  createdAt?: string
}

export interface DelivranceLigneDto {
  id?: number
  delivranceId?: number
  medicamentId?: number
  libelle?: string
  quantiteDemandee?: number
  quantiteServie?: number
  lotId?: number
  /** Montants figés au moment de la délivrance (entiers GNF). */
  prixUnitaire?: number
  montant?: number
  coutAchatTotal?: number
  createdAt?: string
}

export interface DelivranceFileEntry {
  delivrance: DelivranceDto
  lignes: DelivranceLigneDto[]
  patient: { id: number; nom?: string; prenom?: string } | null
  document: { id: string; title?: string } | null
}

export interface DelivranceResult {
  delivrance: DelivranceDto
  lignes: DelivranceLigneDto[]
  created?: boolean
  /** Encaissement créé lors du service (vente facturée payée). */
  paiement?: ServirPaiementResultDto
}

export interface OrphelineTransfert {
  documentId: string
  patient: { id: number; nom?: string; prenom?: string } | null
  nbLignes: number
  signedAt?: string
}

export interface ServirLigneParams {
  ligneId: number
  quantite: number
  lotId?: number
  /**
   * Prix unitaire saisi pour cette délivrance. Utilisé par le serveur
   * uniquement si aucun prix n'est figé et si le catalogue n'en fournit pas.
   * Réservé aux rôles d'encaissement.
   */
  prixUnitaire?: number
}

/** Paiement optionnel encaissé immédiatement lors de la délivrance. */
export interface ServirPaiementParams {
  montant: number
  modePaiement: ModePaiement
  datePaiement?: string
  reference?: string
}

/** Paiement retourné par le backend après un encaissement immédiat. */
export interface ServirPaiementResultDto {
  id?: number
  delivranceId?: number
  montant?: number
  modePaiement?: ModePaiement
  datePaiement?: string
  reference?: string
  numeroRecu?: string
}

export interface ServirDelivranceParams {
  delivranceId: number
  lignes: ServirLigneParams[]
  userId?: number | string
  /** Type de vente figé au premier service. Défaut : `facturee`. */
  typeVente?: DelivranceTypeVente
  /** Motif obligatoire pour une vente gratuite. */
  motifGratuite?: string
  /** Encaissement immédiat (vente facturée uniquement, montant > 0). */
  paiement?: ServirPaiementParams
}

const file = ref<DelivranceFileEntry[]>([])
const fileStatut = ref<DelivranceStatut | undefined>(undefined)
const orphelines = ref<OrphelineTransfert[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

export function useDispensations() {
  async function fetchFile(statut?: DelivranceStatut): Promise<void> {
    fileStatut.value = statut
    loading.value = true
    error.value = null
    try {
      const params: { statut?: DelivranceStatut } = {}
      if (statut != null) params.statut = statut
      file.value = (await ipcInvoke<DelivranceFileEntry[]>('dispensation:file', params)) ?? []
    } catch (e) {
      error.value = (e as Error).message
      file.value = []
    } finally {
      loading.value = false
    }
  }

  async function getDelivrance(id: number): Promise<DelivranceFileEntry | null> {
    error.value = null
    try {
      return (await ipcInvoke<DelivranceFileEntry | null>('dispensation:get', { id })) ?? null
    } catch (e) {
      error.value = (e as Error).message
      return null
    }
  }

  async function createFromDocument(documentId: string): Promise<DelivranceResult | null> {
    error.value = null
    try {
      return (await ipcInvoke<DelivranceResult | null>('dispensation:create-from-document', { documentId })) ?? null
    } catch (e) {
      error.value = (e as Error).message
      return null
    }
  }

  async function servirDelivrance(params: ServirDelivranceParams): Promise<DelivranceResult | null> {
    error.value = null
    try {
      const result = await ipcInvoke<DelivranceResult>('dispensation:servir', params)
      await fetchFile(fileStatut.value)
      return result
    } catch (e) {
      error.value = (e as Error).message
      return null
    }
  }

  async function annulerDelivrance(delivranceId: number, motif: string): Promise<boolean> {
    error.value = null
    try {
      await ipcInvoke('dispensation:annuler', { delivranceId, motif })
      await fetchFile(fileStatut.value)
      return true
    } catch (e) {
      error.value = (e as Error).message
      return false
    }
  }

  async function mapLigne(ligneId: number, medicamentId: number): Promise<DelivranceLigneDto | null> {
    error.value = null
    try {
      const ligne = await ipcInvoke<DelivranceLigneDto>('dispensation:map-ligne', { ligneId, medicamentId })
      await fetchFile(fileStatut.value)
      return ligne
    } catch (e) {
      error.value = (e as Error).message
      return null
    }
  }

  async function reouvrirDelivrance(delivranceId: number, motif: string): Promise<DelivranceDto | null> {
    error.value = null
    try {
      const reopened = await ipcInvoke<DelivranceDto>('dispensation:reouvrir', { delivranceId, motif })
      await fetchFile(fileStatut.value)
      return reopened
    } catch (e) {
      error.value = (e as Error).message
      return null
    }
  }

  async function fetchOrphelines(): Promise<OrphelineTransfert[]> {
    try {
      const list = (await ipcInvoke<OrphelineTransfert[]>('dispensation:orphelines', {}, { silent: true })) ?? []
      orphelines.value = list
      return list
    } catch (e) {
      ElMessage.warning((e as Error).message || 'Transferts manquants indisponibles')
      orphelines.value = []
      return []
    }
  }

  return {
    file,
    fileStatut,
    orphelines,
    loading,
    error,
    fetchFile,
    getDelivrance,
    createFromDocument,
    servirDelivrance,
    annulerDelivrance,
    mapLigne,
    reouvrirDelivrance,
    fetchOrphelines,
  }
}
