/**
 * Bons de commande pharmacie.
 *
 * Les montants n'existent volontairement pas dans ce contrat : un bon de
 * commande est un document logistique, pas une pièce comptable. Les quantités
 * sont des entiers (unités de stock).
 */

export type CommandeStatut =
  | 'brouillon'
  | 'envoyee'
  | 'partielle'
  | 'livree'
  | 'cloturee'
  | 'annulee'

export interface CommandeLigneDto {
  id?: number
  commandeId?: number
  medicamentId?: number
  /** Snapshot lisible : « DCI — nom commercial ». */
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

export interface CommandeReceptionAttachmentDto {
  id?: number
  receptionId?: number
  fileName?: string
  fileType?: string
  fileSize?: number
  uploadedBy?: number | null
  createdAt?: string
}

export interface CommandeReceptionAttachmentWithDataDto extends CommandeReceptionAttachmentDto {
  fileData?: string
}

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

export interface CommandeLigneInputDto {
  medicamentId: number
  /** Surcharge manuelle de la CMM calculée sur 3 mois. */
  cmm?: number
  /** Surcharge manuelle du stock restant. */
  stockRestant?: number
  quantiteCommandee: number
}

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

export interface CommandeUpdateDto {
  fournisseurId?: number
  dateCommande?: string
  datePrevue?: string | null
  periode?: string | null
  urgence?: boolean
  notes?: string | null
  lignes?: CommandeLigneInputDto[]
}

export interface CommandePrefillDto {
  medicamentIds: number[]
  dateCommande?: string
}

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

export interface CommandeReceptionLigneInputDto {
  commandeLigneId: number
  quantiteRecue: number
  numeroLot?: string
  datePeremption?: string
}

export interface CommandeReceptionAttachmentInputDto {
  fileName: string
  fileType: string
  fileSize?: number
  fileData: string
}

export interface CommandeReceptionInputDto {
  dateReception?: string
  refBl?: string
  notes?: string
  lignes: CommandeReceptionLigneInputDto[]
  attachments?: CommandeReceptionAttachmentInputDto[]
  createdBy?: number
}

export interface CommandeListFiltres {
  statut?: CommandeStatut
  fournisseurId?: number
  dateDebut?: string
  dateFin?: string
  search?: string
}

export interface FournisseurSeriePointDto {
  fournisseurId: number
  mois: string // YYYY-MM
  quantite: number
  montant?: number
}

export interface FournisseursSeriesDto {
  mois: string[] // continuous YYYY-MM from dateDebut to dateFin
  fournisseurs: { id: number; nom: string }[]
  commandes: FournisseurSeriePointDto[] // quantities only
  ventes: FournisseurSeriePointDto[] // quantities + montant
}

export interface FournisseursSeriesFiltres {
  dateDebut: string
  dateFin: string
  fournisseurIds?: number[]
}
