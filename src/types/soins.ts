/** Voie d'administration */
export type VoieAdministration = 'PO' | 'SC' | 'IV' | 'IM' | 'SL'

/** Statut d'un soin planifié */
export type StatutSoin = 'en_attente' | 'valide' | 'suspendu'

/** Un item de soin individuel dans un plan de distribution */
export interface SoinItem {
  id: number
  planSoinsId?: number
  medicament: string
  dosage: string
  voie: VoieAdministration
  statut: StatutSoin
  validePar?: string
  valideA?: string
  motifSuspension?: string
  createdAt?: string
  updatedAt?: string
}

/** Bloc horaire contenant une liste de soins */
export interface BlocHoraire {
  heure: string
  soins: SoinItem[]
}

/** Plan de soins complet pour un patient à une date donnée */
export interface PlanSoins {
  id: number
  patientId: number
  date: string
  blocs: BlocHoraire[]
  createdBy: number
  createdAt: string
  updatedAt: string
}

/** Dispositif/voie d'abord */
export interface Dispositif {
  id: number
  patientId: number
  type: string
  datePose: string
  aspect: 'Sain' | 'Rouge' | 'Douloureux'
  volumeMl: number | null
  createdBy?: number
  createdAt?: string
  updatedAt?: string
}

/** Couleur Element Plus associée à une voie d'administration */
export function voieColor(voie: VoieAdministration): { type: 'warning' | 'primary' | 'info' | 'success' | 'danger' } {
  switch (voie) {
    case 'PO': return { type: 'warning' }
    case 'SC': return { type: 'primary' }
    case 'IV': return { type: 'info' }
    case 'IM': return { type: 'danger' }
    case 'SL': return { type: 'success' }
  }
}

/** Vérifie si un médicament est une insuline */
const INSULIN_DRUGS = ['Insuline', 'NOVORAPID', 'TOUJEO', 'LANTUS', 'APIDRA', 'HUMALOG', 'LEVEMIR']

export function isInsulin(medicament: string): boolean {
  return INSULIN_DRUGS.some(d => medicament.toLowerCase().includes(d.toLowerCase()))
}
