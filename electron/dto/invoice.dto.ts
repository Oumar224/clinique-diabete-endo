export interface InvoiceItemDto {
  id?: number
  invoice_id?: number
  libelle: string
  quantite: number
  prix_unitaire: number
  montant: number
  type: 'consultation' | 'acte' | 'medicament' | 'autre'
}

export interface InvoicePaymentDto {
  id?: number
  invoice_id?: number
  montant: number
  mode_paiement: 'espèces' | 'carte_bancaire' | 'chèque' | 'virement' | 'autre'
  date_paiement: string
  reference?: string
  created_by?: number
  created_at?: string
}

export interface InvoiceDto {
  id?: number
  numero: string
  patient_id: number
  patient_nom?: string
  patient_prenom?: string
  date: string
  montant_total: number
  montant_restant: number
  status: 'payé' | 'en_attente' | 'annulé' | 'partiel'
  notes?: string
  created_by?: number
  created_at?: string
  updated_at?: string
  items?: InvoiceItemDto[]
  payments?: InvoicePaymentDto[]
}

export interface InvoiceCreateDto {
  patient_id: number
  date: string
  notes?: string
  created_by?: number
  items: InvoiceItemDto[]
}

export interface InvoiceStatsDto {
  ca_jour: number
  en_attente: number
  nb_mois: number
  taux_encaissement: number
}
