import { ref } from 'vue'
import { ipcInvoke } from '@/utils/ipc'

export type LaboStatut = 'en_attente' | 'en_cours' | 'realise' | 'annule'
export type LaboPriorite = 'normale' | 'urgente'
export type LaboStatutPaiement = 'non_paye' | 'partiel' | 'paye' | 'exonere'
export type LaboModePaiement = 'espece' | 'mobile_money' | 'carte' | 'virement' | 'cheque' | 'exonere'

export interface LaboDemande {
  id?: number
  numero?: string
  patientId?: number | null
  encounterId?: number | null
  type?: 'laboratoire' | 'imagerie' | 'avis'
  examenId?: number | null
  examIds?: number[]
  specialite?: string
  specialtyId?: number | null
  plannedHour?: number | null
  plannedDate?: string | null
  motif?: string
  statut?: LaboStatut
  priorite?: LaboPriorite
  patientExterne?: boolean
  externeNom?: string
  externePrenom?: string
  externeSexe?: string
  externeDateNaissance?: string
  externeTelephone?: string
  externeAdresse?: string
  prescripteurExterneNom?: string
  prescripteurExterneStructure?: string
  prescripteurExterneTelephone?: string
  prelevementType?: string
  prelevementAt?: string
  prelevementPar?: number
  validatedAt?: string | null
  realizedAt?: string | null
  resultat?: string
  prescripteurId?: number | null
  factureId?: number | null
  montant?: number | null
  statutPaiement?: LaboStatutPaiement
  montantPaye?: number
  createdBy?: number | null
  createdAt?: string
  updatedAt?: string
  prescripteurNom?: string
  examenLabel?: string
  specialtyName?: string
  patientNom?: string
  patientPrenom?: string
}

export interface LaboFilters {
  statut?: LaboStatut | 'tous'
  dateFrom?: string
  dateTo?: string
  priorite?: LaboPriorite | ''
  patientExterne?: boolean
  search?: string
}

export interface LaboStats {
  enAttente: number
  enCours: number
  realise: number
  urgentes: number
  externes: number
}

export interface LaboExamen {
  id: number
  name: string
  categoryId: number
  categoryName?: string
}

export interface LaboPaiement {
  id?: number
  examRequestId?: number
  montant?: number
  modePaiement?: LaboModePaiement
  datePaiement?: string
  reference?: string
  createdBy?: number | null
  createdAt?: string
}

const demandes = ref<LaboDemande[]>([])
const facturation = ref<LaboDemande[]>([])
const stats = ref<LaboStats>({ enAttente: 0, enCours: 0, realise: 0, urgentes: 0, externes: 0 })
const examens = ref<LaboExamen[]>([])
const loading = ref(false)
const facturationLoading = ref(false)
const error = ref<string | null>(null)

export function useLaboratoire() {
  async function fetchWorklist(filters: LaboFilters = {}): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const payload: Record<string, unknown> = {}
      if (filters.statut && filters.statut !== 'tous') payload.statut = filters.statut
      if (filters.dateFrom) payload.dateFrom = filters.dateFrom
      if (filters.dateTo) payload.dateTo = filters.dateTo
      if (filters.priorite) payload.priorite = filters.priorite
      if (filters.patientExterne !== undefined) payload.patientExterne = filters.patientExterne
      if (filters.search?.trim()) payload.search = filters.search.trim()
      const rows = await ipcInvoke<LaboDemande[]>('labo:worklist', payload)
      demandes.value = Array.isArray(rows) ? rows : []
    } catch (e) {
      error.value = (e as Error).message
      demandes.value = []
    } finally {
      loading.value = false
    }
  }

  /**
   * Charge la liste dédiée à l'onglet Facturation.
   *
   * Elle utilise son propre tableau (`facturation`) pour ne pas écraser la
   * worklist interne/externe partagée par le reste de l'écran.
   */
  async function fetchFacturation(filters: LaboFilters = {}): Promise<void> {
    facturationLoading.value = true
    error.value = null
    try {
      const payload: Record<string, unknown> = {}
      if (filters.statut && filters.statut !== 'tous') payload.statut = filters.statut
      if (filters.dateFrom) payload.dateFrom = filters.dateFrom
      if (filters.dateTo) payload.dateTo = filters.dateTo
      if (filters.patientExterne !== undefined) payload.patientExterne = filters.patientExterne
      if (filters.search?.trim()) payload.search = filters.search.trim()
      const rows = await ipcInvoke<LaboDemande[]>('labo:worklist', payload)
      facturation.value = Array.isArray(rows) ? rows : []
    } catch (e) {
      error.value = (e as Error).message
      facturation.value = []
    } finally {
      facturationLoading.value = false
    }
  }

  async function fetchStats(): Promise<void> {    try {
      const result = await ipcInvoke<LaboStats>('labo:stats', {}, { silent: true })
      if (result) stats.value = result
    } catch {
      // Statistiques non bloquantes : on garde les valeurs précédentes.
    }
  }

  async function fetchExamens(): Promise<void> {
    if (examens.value.length > 0) return
    try {
      const rows = await ipcInvoke<LaboExamen[]>('labo:examens', {}, { silent: true })
      examens.value = Array.isArray(rows) ? rows : []
    } catch {
      examens.value = []
    }
  }

  async function createDemande(dto: LaboDemande): Promise<LaboDemande | null> {
    error.value = null
    try {
      const created = await ipcInvoke<LaboDemande>('labo:create', dto, { silent: true })
      return created
    } catch (e) {
      error.value = (e as Error).message
      return null
    }
  }

  async function updateStatut(id: number, statut: LaboStatut): Promise<LaboDemande | null> {
    error.value = null
    try {
      return await ipcInvoke<LaboDemande>('labo:statut', { id, statut }, { silent: true })
    } catch (e) {
      error.value = (e as Error).message
      return null
    }
  }

  async function enregistrerPrelevement(
    id: number,
    payload: { prelevementType?: string; prelevementAt?: string; prelevementPar?: number } = {},
  ): Promise<LaboDemande | null> {
    error.value = null
    try {
      return await ipcInvoke<LaboDemande>('labo:prelevement', { id, ...payload }, { silent: true })
    } catch (e) {
      error.value = (e as Error).message
      return null
    }
  }

  async function fetchPaiements(examRequestId: number): Promise<LaboPaiement[]> {
    try {
      const rows = await ipcInvoke<LaboPaiement[]>('labo:paiements', { examRequestId }, { silent: true })
      return Array.isArray(rows) ? rows : []
    } catch {
      return []
    }
  }

  async function enregistrerPaiement(
    id: number,
    payload: {
      montant?: number
      modePaiement?: LaboModePaiement
      datePaiement?: string
      reference?: string
      exonere?: boolean
      createdBy?: number
    },
  ): Promise<LaboDemande | null> {
    error.value = null
    try {
      return await ipcInvoke<LaboDemande>('labo:paiement', { id, ...payload }, { silent: true })
    } catch (e) {
      error.value = (e as Error).message
      return null
    }
  }

  return {
    demandes,
    facturation,
    stats,
    examens,
    loading,
    facturationLoading,
    error,
    fetchWorklist,
    fetchFacturation,
    fetchStats,
    fetchExamens,
    createDemande,
    updateStatut,
    enregistrerPrelevement,
    fetchPaiements,
    enregistrerPaiement,
  }
}

/** Libellés français des statuts et priorités. */
export const LABO_STATUT_LABEL: Record<LaboStatut, string> = {
  en_attente: 'En attente',
  en_cours: 'En cours',
  realise: 'Réalisé',
  annule: 'Annulé',
}

export const LABO_STATUT_TYPE: Record<LaboStatut, 'success' | 'warning' | 'info' | 'danger'> = {
  en_attente: 'warning',
  en_cours: 'info',
  realise: 'success',
  annule: 'danger',
}

export const LABO_PAIEMENT_LABEL: Record<LaboStatutPaiement, string> = {
  non_paye: 'Non payé',
  partiel: 'Partiel',
  paye: 'Payé',
  exonere: 'Exonéré',
}

export const LABO_MODE_PAIEMENT_LABEL: Record<LaboModePaiement, string> = {
  espece: 'Espèces',
  mobile_money: 'Mobile money',
  carte: 'Carte bancaire',
  virement: 'Virement',
  cheque: 'Chèque',
  exonere: 'Exonération',
}

export const LABO_PRELEVEMENT_TYPES = [
  'Sang',
  'Urine',
  'Selles',
  'Sécrétions',
  'LCR',
  'Autre',
]
