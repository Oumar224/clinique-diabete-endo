/**
 * Caisse unifiée — flux de trésorerie consolidés.
 *
 * Toutes les sommes sont exprimées en GNF (entiers).
 */

export type CaisseSens = 'entree' | 'sortie'

export type CaisseSource = 'facture' | 'pharmacie' | 'laboratoire' | 'apport' | 'apport_remboursement' | 'salaire' | 'depense'

export interface CaisseParSourceDto {
  source: CaisseSource
  entrees: number
  sorties: number
  solde: number
  count: number
}

export interface CaisseParModeDto {
  mode: string | null
  sens: CaisseSens
  total: number
  count: number
}

export interface CaisseSyntheseDto {
  dateDebut?: string
  dateFin?: string
  entrees: number
  sorties: number
  solde: number
  count: number
  parSource: CaisseParSourceDto[]
  parMode: CaisseParModeDto[]
}
