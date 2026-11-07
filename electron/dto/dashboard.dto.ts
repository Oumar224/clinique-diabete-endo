export interface DashboardStatsParams {
  date_debut?: string
  date_fin?: string
  medecin_id?: number
}

export interface DashboardDayPoint {
  date: string
  count: number
  montant?: number
}

export interface DashboardStatsDto {
  periode: { date_debut: string; date_fin: string }
  ca: {
    /**
     * @deprecated Utiliser `ca_facture_jour` (facturé) ou `ca_jour`
     * (encaissé). Conservé pour la compatibilité du renderer.
     */
    jour: number
    /** @deprecated CA facturé sur 7 jours. */
    semaine: number
    /**
     * @deprecated Utiliser `ca_facture_mois` (facturé) ou `ca_mois`
     * (encaissé). Conservé pour la compatibilité du renderer.
     */
    mois: number
    /** @deprecated CA facturé sur la période. */
    periode: number
    /** CA facturé aujourd'hui (hors factures annulées). */
    ca_facture_jour: number
    /** CA facturé sur la période « mois » (bornée par date_debut/date_fin). */
    ca_facture_mois: number
    /** Encaissements réels aujourd'hui (`invoice_payment`). */
    ca_jour: number
    /** Encaissements réels sur la période « mois ». */
    ca_mois: number
    encaisse_periode: number
    /**
     * Taux d'encaissement de la PÉRIODE : encaissé / facturé, borné à
     * 0..100. Vaut 0 si rien n'a été facturé sur la période.
     */
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
  consultations: {
    jour: number
    periode: number
  }
  top_actes: Array<{ libelle: string; type?: string; montant: number; quantite: number }>
}
