import { ref } from 'vue'
import { ipcInvoke } from '@/utils/ipc'

/**
 * Statuts d'un bon de commande pharmacie.
 *
 * Cycle nominal : `brouillon` → `envoyee` → `partielle` → `livree` → `cloturee`.
 * `annulee` est terminal. Les réceptions ne sont autorisées que depuis
 * `envoyee` ou `partielle`.
 */
export type CommandeStatut =
  | 'brouillon'
  | 'envoyee'
  | 'partielle'
  | 'livree'
  | 'cloturee'
  | 'annulee'

/** Ligne d'un bon de commande (quantités entières, aucun montant). */
export interface CommandeLigneDto {
  id?: number
  commandeId?: number
  medicamentId?: number
  designation?: string
  forme?: string | null
  dosage?: string | null
  conditionnement?: string | null
  unite?: string | null
  cmm?: number
  stockRestant?: number
  quantiteCommandee?: number
  quantiteLivree?: number
  resteALivrer?: number
  ordre?: number
}

/** Pièce jointe d'une réception (BL, facture…), sans le contenu binaire. */
export interface CommandeReceptionAttachmentDto {
  id?: number
  receptionId?: number
  fileName?: string
  fileType?: string
  fileSize?: number
  uploadedBy?: number | null
  createdAt?: string
}

/** Pièce jointe de réception avec son contenu (data URI base64). */
export interface CommandeReceptionAttachmentWithDataDto extends CommandeReceptionAttachmentDto {
  fileData?: string
}

/** Ligne reçue lors d'une réception. */
export interface CommandeReceptionLigneDto {
  id?: number
  receptionId?: number
  commandeLigneId?: number
  medicamentId?: number
  designation?: string
  forme?: string | null
  dosage?: string | null
  conditionnement?: string | null
  unite?: string | null
  cmm?: number
  stockRestant?: number
  quantiteCommandee?: number
  quantiteLivree?: number
  quantiteRecue?: number
  numeroLot?: string | null
  datePeremption?: string | null
}

/** Réception (partielle ou totale) d'un bon de commande. */
export interface CommandeReceptionDto {
  id?: number
  commandeId?: number
  dateReception?: string
  refBl?: string | null
  notes?: string | null
  createdBy?: number | null
  createdAt?: string
  lignes?: CommandeReceptionLigneDto[]
  attachments?: CommandeReceptionAttachmentDto[]
}

/** Bon de commande complet tel que renvoyé par `commande:get`. */
export interface CommandeDto {
  id?: number
  numero?: string
  fournisseurId?: number
  fournisseurNom?: string
  dateCommande?: string
  datePrevue?: string | null
  periode?: string | null
  urgence?: boolean
  statut?: CommandeStatut
  notes?: string | null
  createdBy?: number | null
  createdAt?: string
  updatedAt?: string
  lignes?: CommandeLigneDto[]
  receptions?: CommandeReceptionDto[]
  totalLignes?: number
  totalQuantiteCommandee?: number
  totalQuantiteLivree?: number
}

/** Ligne saisie dans le formulaire de commande. */
export interface CommandeLigneInputDto {
  medicamentId: number
  cmm?: number
  stockRestant?: number
  quantiteCommandee: number
}

/** Charge utile de création d'un bon de commande. */
export interface CommandeCreateDto {
  fournisseurId: number
  dateCommande?: string
  datePrevue?: string | null
  periode?: string | null
  urgence?: boolean
  notes?: string | null
  lignes: CommandeLigneInputDto[]
  createdBy?: number
}

/** Charge utile de modification (le statut n'est jamais modifiable ici). */
export interface CommandeUpdateDto {
  fournisseurId?: number
  dateCommande?: string
  datePrevue?: string | null
  periode?: string | null
  urgence?: boolean
  notes?: string | null
  lignes?: CommandeLigneInputDto[]
}

/** Suggestion de ligne calculée par le backend (CMM 3 mois, stock restant). */
export interface CommandeLigneSuggestionDto {
  medicamentId?: number
  designation?: string
  forme?: string | null
  dosage?: string | null
  conditionnement?: string | null
  unite?: string | null
  cmm?: number
  stockRestant?: number
}

/** Quantité à réceptionner pour une ligne de commande. */
export interface CommandeReceptionLigneInputDto {
  commandeLigneId: number
  quantiteRecue: number
  numeroLot?: string
  datePeremption?: string
}

/** Pièce jointe fournie lors de la réception. */
export interface CommandeReceptionAttachmentInputDto {
  fileName: string
  fileType: string
  fileSize?: number
  fileData: string
}

/** Charge utile de réception d'un bon de commande. */
export interface CommandeReceptionInputDto {
  dateReception?: string
  refBl?: string
  notes?: string
  lignes: CommandeReceptionLigneInputDto[]
  attachments?: CommandeReceptionAttachmentInputDto[]
  createdBy?: number
}

/** Filtres de la liste des bons de commande. */
export interface CommandeListFiltres {
  statut?: CommandeStatut
  fournisseurId?: number
  dateDebut?: string
  dateFin?: string
  search?: string
}

/** Point mensuel d'une série fournisseur. */
export interface FournisseurSeriePointDto {
  fournisseurId: number
  /** Mois au format `YYYY-MM`. */
  mois: string
  quantite: number
  montant?: number
}

/** Séries mensuelles commandes / ventes par fournisseur. */
export interface FournisseursSeriesDto {
  mois: string[]
  fournisseurs: { id: number; nom: string }[]
  commandes: FournisseurSeriePointDto[]
  ventes: FournisseurSeriePointDto[]
}

/** Filtres des séries fournisseurs (période obligatoire). */
export interface FournisseursSeriesFiltres {
  dateDebut: string
  dateFin: string
  fournisseurIds?: number[]
}

/** Libellés français des statuts de bon de commande. */
export const COMMANDE_STATUT_LABEL: Record<CommandeStatut, string> = {
  brouillon: 'Brouillon',
  envoyee: 'Envoyée',
  partielle: 'Partielle',
  livree: 'Livrée',
  cloturee: 'Clôturée',
  annulee: 'Annulée',
}

/** Ton de badge associé à chaque statut. */
export const COMMANDE_STATUT_TONE: Record<CommandeStatut, 'info' | 'warning' | 'success' | 'muted' | 'danger'> = {
  brouillon: 'muted',
  envoyee: 'info',
  partielle: 'warning',
  livree: 'success',
  cloturee: 'success',
  annulee: 'danger',
}

/**
 * Accès aux bons de commande pharmacie et aux séries fournisseurs.
 *
 * Canaux IPC consommés :
 * - `commande:list`, `commande:get` — lecture ;
 * - `commande:prefill` — CMM / stock restant d'une sélection d'articles ;
 * - `commande:create`, `commande:update`, `commande:delete` — écriture ;
 * - `commande:envoyer`, `commande:receptionner`, `commande:cloturer`,
 *   `commande:annuler` — transitions de statut ;
 * - `commande:reception-attachments:*` — pièces jointes de réception ;
 * - `commande:series-fournisseurs` — séries mensuelles par fournisseur.
 *
 * Les erreurs IPC sont capturées dans `error` ; les lectures renvoient
 * `null` / `[]` pour laisser l'écran afficher un état vide sans démonter
 * l'onglet.
 */
export function useCommandes() {
  const commandes = ref<CommandeDto[]>([])
  const commande = ref<CommandeDto | null>(null)
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
   * Charge la liste des bons de commande.
   *
   * @param filtres - Statut, fournisseur, période et recherche libre.
   * @returns Les bons, ou `[]` en cas d'échec.
   */
  async function fetchCommandes(filtres: CommandeListFiltres = {}): Promise<CommandeDto[]> {
    return track(async () => {
      error.value = null
      try {
        commandes.value = (await ipcInvoke<CommandeDto[]>(
          'commande:list',
          filtres as Record<string, unknown>,
          { silent: true },
        )) ?? []
        return commandes.value
      } catch (e) {
        error.value = (e as Error).message
        commandes.value = []
        return []
      }
    })
  }

  /**
   * Charge un bon de commande complet (lignes + réceptions).
   *
   * @param id - Identifiant du bon.
   * @returns Le bon, ou `null` en cas d'échec.
   */
  async function fetchCommande(id: number): Promise<CommandeDto | null> {
    return track(async () => {
      error.value = null
      try {
        commande.value = (await ipcInvoke<CommandeDto>('commande:get', { id }, { silent: true })) ?? null
        return commande.value
      } catch (e) {
        error.value = (e as Error).message
        commande.value = null
        return null
      }
    })
  }

  /**
   * Demande au backend les suggestions CMM / stock restant.
   *
   * @param medicamentIds - Articles sélectionnés.
   * @param dateCommande - Date de référence de la CMM (`YYYY-MM-DD`).
   * @returns Les suggestions, ou `[]` en cas d'échec.
   */
  async function prefill(
    medicamentIds: number[],
    dateCommande?: string,
  ): Promise<CommandeLigneSuggestionDto[]> {
    error.value = null
    try {
      return (await ipcInvoke<CommandeLigneSuggestionDto[]>(
        'commande:prefill',
        { medicamentIds, dateCommande },
        { silent: true },
      )) ?? []
    } catch (e) {
      error.value = (e as Error).message
      return []
    }
  }

  /** Crée un bon de commande (statut forcé `brouillon` côté backend). */
  async function createCommande(dto: CommandeCreateDto): Promise<CommandeDto | null> {
    saving.value = true
    error.value = null
    try {
      return await ipcInvoke<CommandeDto>('commande:create', dto, { silent: true })
    } catch (e) {
      error.value = (e as Error).message
      return null
    } finally {
      saving.value = false
    }
  }

  /** Met à jour un bon de commande en brouillon. */
  async function updateCommande(dto: CommandeUpdateDto & { id: number }): Promise<CommandeDto | null> {
    saving.value = true
    error.value = null
    try {
      return await ipcInvoke<CommandeDto>('commande:update', dto, { silent: true })
    } catch (e) {
      error.value = (e as Error).message
      return null
    } finally {
      saving.value = false
    }
  }

  /** Passe un brouillon au statut `envoyee`. */
  async function envoyerCommande(id: number): Promise<CommandeDto | null> {
    saving.value = true
    error.value = null
    try {
      return await ipcInvoke<CommandeDto>('commande:envoyer', { id }, { silent: true })
    } catch (e) {
      error.value = (e as Error).message
      return null
    } finally {
      saving.value = false
    }
  }

  /** Enregistre une réception et crée les lots de stock associés. */
  async function receptionnerCommande(
    id: number,
    dto: CommandeReceptionInputDto,
  ): Promise<CommandeDto | null> {
    saving.value = true
    error.value = null
    try {
      return await ipcInvoke<CommandeDto>('commande:receptionner', { id, ...dto }, { silent: true })
    } catch (e) {
      error.value = (e as Error).message
      return null
    } finally {
      saving.value = false
    }
  }

  /** Clôture un bon envoyé, partiel ou livré. */
  async function cloturerCommande(id: number): Promise<CommandeDto | null> {
    saving.value = true
    error.value = null
    try {
      return await ipcInvoke<CommandeDto>('commande:cloturer', { id }, { silent: true })
    } catch (e) {
      error.value = (e as Error).message
      return null
    } finally {
      saving.value = false
    }
  }

  /** Annule un brouillon ou un bon envoyé. */
  async function annulerCommande(id: number): Promise<CommandeDto | null> {
    saving.value = true
    error.value = null
    try {
      return await ipcInvoke<CommandeDto>('commande:annuler', { id }, { silent: true })
    } catch (e) {
      error.value = (e as Error).message
      return null
    } finally {
      saving.value = false
    }
  }

  /** Supprime un bon en brouillon ou annulé. */
  async function deleteCommande(id: number): Promise<boolean> {
    saving.value = true
    error.value = null
    try {
      await ipcInvoke('commande:delete', { id }, { silent: true })
      return true
    } catch (e) {
      error.value = (e as Error).message
      return false
    } finally {
      saving.value = false
    }
  }

  /** Liste les pièces jointes d'une réception. */
  async function listReceptionAttachments(receptionId: number): Promise<CommandeReceptionAttachmentDto[]> {
    error.value = null
    try {
      return (await ipcInvoke<CommandeReceptionAttachmentDto[]>(
        'commande:reception-attachments:list',
        { receptionId },
        { silent: true },
      )) ?? []
    } catch (e) {
      error.value = (e as Error).message
      return []
    }
  }

  /**
   * Télécharge le contenu d'une pièce jointe de réception (data URI).
   *
   * @param id - Identifiant de la pièce jointe.
   * @param receptionId - Réception parente ; le backend refuse une pièce
   *   jointe qui appartient à une autre réception.
   * @returns La pièce jointe avec `fileData`, ou `null` en cas d'échec.
   */
  async function downloadReceptionAttachment(
    id: number,
    receptionId: number,
  ): Promise<CommandeReceptionAttachmentWithDataDto | null> {
    error.value = null
    try {
      return (await ipcInvoke<CommandeReceptionAttachmentWithDataDto>(
        'commande:reception-attachments:download',
        { id, receptionId },
        { silent: true },
      )) ?? null
    } catch (e) {
      error.value = (e as Error).message
      return null
    }
  }

  /** Ajoute une pièce jointe à une réception. */
  async function createReceptionAttachment(
    receptionId: number,
    dto: CommandeReceptionAttachmentInputDto,
  ): Promise<CommandeReceptionAttachmentDto | null> {
    error.value = null
    try {
      return await ipcInvoke<CommandeReceptionAttachmentDto>(
        'commande:reception-attachments:create',
        { receptionId, ...dto },
        { silent: true },
      )
    } catch (e) {
      error.value = (e as Error).message
      return null
    }
  }

  /**
   * Supprime une pièce jointe de réception.
   *
   * @param id - Identifiant de la pièce jointe.
   * @param receptionId - Réception parente ; le backend refuse une pièce
   *   jointe qui appartient à une autre réception.
   * @returns `true` si la suppression a réussi.
   */
  async function deleteReceptionAttachment(
    id: number,
    receptionId: number,
  ): Promise<boolean> {
    error.value = null
    try {
      await ipcInvoke(
        'commande:reception-attachments:delete',
        { id, receptionId },
        { silent: true },
      )
      return true
    } catch (e) {
      error.value = (e as Error).message
      return false
    }
  }

  /**
   * Charge les séries mensuelles commandes / ventes par fournisseur.
   *
   * @param filtres - Période obligatoire et fournisseurs optionnels.
   * @returns Les séries, ou `null` si le canal est indisponible.
   */
  async function fetchSeriesFournisseurs(
    filtres: FournisseursSeriesFiltres,
  ): Promise<FournisseursSeriesDto | null> {
    return track(async () => {
      error.value = null
      try {
        return (await ipcInvoke<FournisseursSeriesDto>(
          'commande:series-fournisseurs',
          filtres as unknown as Record<string, unknown>,
          { silent: true },
        )) ?? null
      } catch (e) {
        error.value = (e as Error).message
        return null
      }
    })
  }

  return {
    commandes,
    commande,
    loading,
    saving,
    error,
    clearError,
    fetchCommandes,
    fetchCommande,
    prefill,
    createCommande,
    updateCommande,
    envoyerCommande,
    receptionnerCommande,
    cloturerCommande,
    annulerCommande,
    deleteCommande,
    listReceptionAttachments,
    downloadReceptionAttachment,
    createReceptionAttachment,
    deleteReceptionAttachment,
    fetchSeriesFournisseurs,
  }
}
