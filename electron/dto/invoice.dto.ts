export interface InvoiceItemDto {
  id?: number
  invoice_id?: number
  libelle?: string
  quantite?: number
  prix_unitaire?: number
  montant?: number
  type?: 'consultation' | 'acte' | 'medicament' | 'autre'
  acte_id?: string
}

export type ModePaiement = 'espèces' | 'carte_bancaire' | 'chèque' | 'virement' | 'mobile_money' | 'assurance' | 'autre'

export interface InvoicePaymentDto {
  id?: number
  invoice_id?: number
  montant?: number
  mode_paiement?: ModePaiement
  date_paiement?: string
  reference?: string
  numero_recu?: string
  created_by?: number
  created_at?: string
  caissier_nom?: string
}

export interface InvoiceDto {
  id?: number
  numero?: string
  patient_id?: number
  patient_nom?: string
  patient_prenom?: string
  /** Identifiant permanent du patient (IP / NIP). */
  patient_nip?: string
  date?: string
  montant_total?: number
  montant_restant?: number
  status?: 'payé' | 'en_attente' | 'annulé' | 'partiel'
  notes?: string
  remise_pct?: number
  tva_pct?: number
  assurance_id?: number | null
  assurance_nom?: string
  part_assurance?: number
  part_patient?: number
  mode_paiement?: string | null
  created_by?: number
  created_at?: string
  updated_at?: string
  items?: InvoiceItemDto[]
  payments?: InvoicePaymentDto[]
}

export interface InvoiceCreateDto {
  patient_id?: number
  date?: string
  notes?: string
  created_by?: number
  remise_pct?: number
  tva_pct?: number
  assurance_id?: number | null
  taux_prise_en_charge?: number
  mode_paiement?: string
  items?: InvoiceItemDto[]
}

export interface InvoiceListDto {
  search?: string
  status?: string
  date_debut?: string
  date_fin?: string
}

export interface InvoiceUpdateDto {
  id?: number
  notes?: string
  status?: string
  remise_pct?: number
  tva_pct?: number
  assurance_id?: number | null
  taux_prise_en_charge?: number
  items?: InvoiceItemDto[]
}

export interface InvoiceStatsDto {
  /** Montant ENCAISSÉ le jour d'ancrage (date_debut ?? aujourd'hui). */
  ca_jour?: number
  /** Montant FACTURÉ le jour d'ancrage (nouveau champ, distinct de `ca_jour`). */
  ca_facture_jour?: number
  /** Encaissé sur la semaine calendaire de l'ancre, intersectée avec la plage. */
  ca_semaine?: number
  /** Encaissé sur le mois calendaire de l'ancre, intersecté avec la plage. */
  ca_mois?: number
  /** Encaissé sur l'année calendaire de l'ancre, intersectée avec la plage. */
  ca_annee?: number
  en_attente?: number
  impayes?: number
  reste_a_recouvrer?: number
  /** Nombre de factures du mois calendaire de l'ancre (intersecté avec la plage). */
  nb_mois?: number
  /**
   * Nombre de factures de la plage demandée ; sans plage, factures du jour
   * d'ancrage.
   */
  nb_jour?: number
  /** Nombre de JOURS de la plage demandée (1 sans plage). */
  nb_jours_periode?: number
  /** Taux d'encaissement de la fenêtre mensuelle (plafonné à 100 %). */
  taux_encaissement?: number
  taux_recouvrement?: number
  top_actes?: Array<{ libelle: string; total: number; quantite: number; type?: string; montant?: number }>
  ca_par_mode?: Array<{ mode: string; total: number; nb: number }>
  ca_30j?: Array<{ date: string; montant: number; encaisse: number }>
}

export interface RecuDto {
  payment: InvoicePaymentDto
  invoice_numero?: string
  invoice_date?: string
  invoice_total?: number
  patient_nom?: string
  patient_prenom?: string
  patient_nip?: string
  assurance_nom?: string
  caissier_nom?: string
  montant_lettres?: string
  reste_du?: number
}
