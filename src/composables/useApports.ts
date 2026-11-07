import { ref } from 'vue'
import { ipcInvoke } from '@/utils/ipc'
import type { ModePaiement } from './useSalaires'

/** Nature d'un apport de trésorerie. */
export type ApportType = 'fonds_propres' | 'dette'

/** Statut d'un apport. */
export type ApportStatut = 'ouvert' | 'rembourse' | 'annule'

/** Remboursement partiel ou total d'une dette. */
export interface ApportRemboursementDto {
  id?: number
  apportId?: number
  montant?: number
  dateRemboursement?: string
  modePaiement?: ModePaiement
  reference?: string | null
  notes?: string | null
  createdBy?: number | null
  createdAt?: string
}

/** Apport enrichi de son cumul remboursé et de son reste dû. */
export interface ApportDto {
  id?: number
  reference?: string
  type?: ApportType
  libelle?: string
  montant?: number
  dateApport?: string
  modePaiement?: ModePaiement
  statut?: ApportStatut
  notes?: string | null
  createdBy?: number | null
  createdAt?: string
  updatedAt?: string
  montantRembourse?: number
  resteARembourser?: number
  remboursements?: ApportRemboursementDto[]
}

/** Charge utile de création d'un apport. */
export interface ApportCreateDto {
  reference?: string
  type: ApportType
  libelle: string
  montant: number
  dateApport?: string
  modePaiement?: ModePaiement
  notes?: string | null
  createdBy?: number
}

/** Charge utile de modification (type et statut non modifiables). */
export interface ApportUpdateDto {
  libelle?: string
  montant?: number
  dateApport?: string
  modePaiement?: ModePaiement
  notes?: string | null
}

/** Charge utile d'un remboursement. */
export interface ApportRemboursementCreateDto {
  montant: number
  dateRemboursement?: string
  modePaiement?: ModePaiement
  reference?: string | null
  notes?: string | null
  createdBy?: number
}

/** Filtres de la liste des apports. */
export interface ApportListFiltres {
  type?: ApportType
  statut?: ApportStatut
  dateDebut?: string
  dateFin?: string
  search?: string
}

/** Libellés français des types d'apport. */
export const APPORT_TYPE_LABEL: Record<ApportType, string> = {
  fonds_propres: 'Fonds propres',
  dette: 'Dette',
}

/** Libellés français des statuts d'apport. */
export const APPORT_STATUT_LABEL: Record<ApportStatut, string> = {
  ouvert: 'Ouvert',
  rembourse: 'Remboursé',
  annule: 'Annulé',
}

/** Ton de badge associé à chaque statut. */
export const APPORT_STATUT_TONE: Record<ApportStatut, 'info' | 'warning' | 'success' | 'muted'> = {
  ouvert: 'info',
  rembourse: 'success',
  annule: 'muted',
}

/**
 * Accès aux apports de trésorerie.
 *
 * Canaux IPC consommés :
 * - `apport:list`, `apport:get` — lecture ;
 * - `apport:create`, `apport:update`, `apport:delete` — écriture ;
 * - `apport:annuler` — annulation d'un apport non remboursé ;
 * - `apport:rembourser`, `apport:delete-remboursement` — dettes.
 *
 * Les montants sont des entiers GNF strictement positifs.
 */
export function useApports() {
  const apports = ref<ApportDto[]>([])
  const apport = ref<ApportDto | null>(null)
  const loading = ref(false)
  const saving = ref(false)
  const error = ref<string | null>(null)

  let pending = 0

  /** Suit une opération asynchrone et maintient `loading` sans doublon. */
  async function track<T>(task: () => Promise<T>): Promise<T> {
    pending += 1
    loading.value = true
    try {
      return await task()
    } finally {
      pending -= 1
      loading.value = pending > 0
    }
  }

  /** Vide le dernier message d'erreur. */
  function clearError(): void {
    error.value = null
  }

  /**
   * Charge la liste des apports.
   *
   * @param filtres - Type, statut, période et recherche libre.
   * @returns Les apports, ou `[]` en cas d'échec.
   */
  async function fetchApports(filtres: ApportListFiltres = {}): Promise<ApportDto[]> {
    return track(async () => {
      error.value = null
      try {
        apports.value = (await ipcInvoke<ApportDto[]>(
          'apport:list',
          filtres as Record<string, unknown>,
          { silent: true },
        )) ?? []
        return apports.value
      } catch (e) {
        error.value = (e as Error).message
        apports.value = []
        return []
      }
    })
  }

  /**
   * Charge un apport complet avec ses remboursements.
   *
   * @param id - Identifiant de l'apport.
   * @returns L'apport, ou `null` en cas d'échec.
   */
  async function fetchApport(id: number): Promise<ApportDto | null> {
    error.value = null
    try {
      apport.value = (await ipcInvoke<ApportDto>('apport:get', { id }, { silent: true })) ?? null
      return apport.value
    } catch (e) {
      error.value = (e as Error).message
      apport.value = null
      return null
    }
  }

  /** Crée un apport (référence auto `AP-AAAAMMJJ-NNNN` si absente). */
  async function createApport(dto: ApportCreateDto): Promise<ApportDto | null> {
    saving.value = true
    error.value = null
    try {
      return await ipcInvoke<ApportDto>('apport:create', dto, { silent: true })
    } catch (e) {
      error.value = (e as Error).message
      return null
    } finally {
      saving.value = false
    }
  }

  /** Modifie un apport non annulé. */
  async function updateApport(dto: ApportUpdateDto & { id: number }): Promise<ApportDto | null> {
    saving.value = true
    error.value = null
    try {
      return await ipcInvoke<ApportDto>('apport:update', dto, { silent: true })
    } catch (e) {
      error.value = (e as Error).message
      return null
    } finally {
      saving.value = false
    }
  }

  /** Supprime définitivement un apport. */
  async function deleteApport(id: number): Promise<boolean> {
    saving.value = true
    error.value = null
    try {
      await ipcInvoke('apport:delete', { id }, { silent: true })
      return true
    } catch (e) {
      error.value = (e as Error).message
      return false
    } finally {
      saving.value = false
    }
  }

  /** Annule un apport sans remboursement. */
  async function annulerApport(id: number): Promise<ApportDto | null> {
    saving.value = true
    error.value = null
    try {
      return await ipcInvoke<ApportDto>('apport:annuler', { id }, { silent: true })
    } catch (e) {
      error.value = (e as Error).message
      return null
    } finally {
      saving.value = false
    }
  }

  /** Ajoute un remboursement à une dette ouverte. */
  async function rembourserApport(
    id: number,
    dto: ApportRemboursementCreateDto,
  ): Promise<ApportDto | null> {
    saving.value = true
    error.value = null
    try {
      return await ipcInvoke<ApportDto>('apport:rembourser', { id, ...dto }, { silent: true })
    } catch (e) {
      error.value = (e as Error).message
      return null
    } finally {
      saving.value = false
    }
  }

  /** Supprime un remboursement et recalcule le statut de l'apport. */
  async function deleteRemboursement(id: number): Promise<ApportDto | null> {
    saving.value = true
    error.value = null
    try {
      return await ipcInvoke<ApportDto>('apport:delete-remboursement', { id }, { silent: true })
    } catch (e) {
      error.value = (e as Error).message
      return null
    } finally {
      saving.value = false
    }
  }

  return {
    apports,
    apport,
    loading,
    saving,
    error,
    clearError,
    fetchApports,
    fetchApport,
    createApport,
    updateApport,
    deleteApport,
    annulerApport,
    rembourserApport,
    deleteRemboursement,
  }
}
