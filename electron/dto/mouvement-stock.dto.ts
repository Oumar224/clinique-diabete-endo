export type MouvementStockType = 'entree' | 'sortie_manuelle' | 'delivrance' | 'administration' | 'ajustement'

export type MouvementStockReferenceType = 'ordonnance_libre' | 'prescription' | 'plan_soins_item'

export interface MouvementStockDto {
  id?: number
  medicamentId?: number
  lotId?: number
  type?: MouvementStockType
  quantite?: number
  stockAvant?: number
  stockApres?: number
  referenceType?: MouvementStockReferenceType
  referenceId?: string
  motif?: string
  userId?: number
  createdAt?: string
}
