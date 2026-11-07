import { ref } from 'vue'
import { ipcInvoke } from '@/utils/ipc'

export interface DashboardDayPoint {
  date: string
  count: number
  montant?: number
}

export interface DashboardStats {
  periode: { date_debut: string; date_fin: string }
  ca: {
    /**
     * @deprecated Alias FACTURÉ du jour. Utiliser `ca_facture_jour` (facturé)
     * ou `ca_jour` (encaissé).
     */
    jour: number
    /** @deprecated CA facturé sur 7 jours. */
    semaine: number
    /**
     * @deprecated Alias FACTURÉ du mois. Utiliser `ca_facture_mois` (facturé)
     * ou `ca_mois` (encaissé).
     */
    mois: number
    /** @deprecated CA facturé sur la période. */
    periode: number
    /** CA facturé aujourd'hui (hors factures annulées). */
    ca_facture_jour: number
    /** CA facturé sur la période « mois ». */
    ca_facture_mois: number
    /** Encaissements réels aujourd'hui (`invoice_payment`). */
    ca_jour: number
    /** Encaissements réels sur la période « mois ». */
    ca_mois: number
    encaisse_periode: number
    /** Taux d'encaissement de la période, déjà borné à 0..100 par le backend. */
    taux_encaissement: number
    reste_a_recouvrer: number
    serie_30j: Array<{ date: string; montant: number; encaisse: number }>
  }
  patients: {
    total: number
    nouveaux_jour: number
    nouveaux_periode: number
    recents: Array<{ id: number; nom: string; prenom: string; created_at?: string }>
  }
  rendez_vous: {
    jour: number
    semaine: number
    total_periode: number
    taux_presence: number
    par_jour: DashboardDayPoint[]
    par_statut: Record<string, number>
    prochains: Array<{
      id?: number
      date?: string
      time?: string
      motif?: string
      status?: string
      medecin_id?: number
      medecin_name?: string
      patient_id?: number
      patient_nom?: string
    }>
  }
  consultations: { jour: number; periode: number }
  top_actes: Array<{ libelle: string; type?: string; montant: number; quantite: number }>
}

const stats = ref<DashboardStats | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

/**
 * Composable central pour les métriques du tableau de bord.
 * Agrège CA, patients, RDV et consultations via le canal `dashboard:stats`.
 */
export function useDashboard() {
  async function fetchDashboardStats(params?: {
    date_debut?: string
    date_fin?: string
    medecin_id?: number
  }): Promise<DashboardStats | null> {
    loading.value = true
    error.value = null
    try {
      const data = await ipcInvoke<DashboardStats>('dashboard:stats', params ?? {}, { silent: true })
      stats.value = data
      return data
    } catch (e) {
      error.value = (e as Error).message
      return null
    } finally {
      loading.value = false
    }
  }

  return { stats, loading, error, fetchDashboardStats }
}
