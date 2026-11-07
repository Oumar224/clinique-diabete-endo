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
  commandeReceptionId?: number | null
  /** Nombre de pièces jointes (BL, facture…). */
  attachmentsCount?: number
}
