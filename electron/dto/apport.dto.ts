import type { ModePaiement } from './invoice.dto'

export type ApportType = 'fonds_propres' | 'dette'
export type ApportStatut = 'ouvert' | 'rembourse' | 'annule'

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

export interface ApportUpdateDto {
  libelle?: string
  montant?: number
  dateApport?: string
  modePaiement?: ModePaiement
  notes?: string | null
}

export interface ApportRemboursementCreateDto {
  montant: number
  dateRemboursement?: string
  modePaiement?: ModePaiement
  reference?: string | null
  notes?: string | null
  createdBy?: number
}

export interface ApportListFiltres {
  type?: ApportType
  statut?: ApportStatut
  dateDebut?: string
  dateFin?: string
  search?: string
}
