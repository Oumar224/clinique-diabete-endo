import { ref } from 'vue'
import { ElMessage } from 'element-plus'

interface ServiceControllerResultType {
  success?: boolean
  data?: any
  message?: string
}

export interface InvoiceItem {
  id?: number
  invoice_id?: number
  libelle: string
  quantite: number
  prix_unitaire: number
  montant: number
  type: 'consultation' | 'acte' | 'medicament' | 'autre'
  /** Référence `medical_acts.id` (TEXT côté SQLite) pour l'attribution du CA. */
  acte_id?: string | null
}

export type ModePaiement = 'espèces' | 'carte_bancaire' | 'chèque' | 'virement' | 'mobile_money' | 'assurance' | 'autre'

export interface InvoicePayment {
  id?: number
  invoice_id?: number
  montant: number
  mode_paiement: ModePaiement
  date_paiement: string
  reference?: string
  numero_recu?: string
  created_by?: number
  created_at?: string
  caissier_nom?: string
}

export interface Invoice {
  id?: number
  numero: string
  patient_id: number
  patient_nom?: string
  patient_prenom?: string
  patient_nip?: string
  date: string
  montant_total: number
  montant_restant: number
  status: 'payé' | 'en_attente' | 'annulé' | 'partiel'
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
  items?: InvoiceItem[]
  payments?: InvoicePayment[]
}

export interface InvoiceStats {
  ca_jour: number
  /** Montant facturé le jour d'ancrage (séparé de l'encaissé). */
  ca_facture_jour?: number
  ca_semaine?: number
  ca_mois?: number
  ca_annee?: number
  en_attente: number
  impayes?: number
  reste_a_recouvrer?: number
  nb_mois: number
  /** Nombre de factures sur la période demandée (ou le jour d'ancrage sans période). */
  nb_jour?: number
  /** Nombre de jours de la période demandée (1 sans période). */
  nb_jours_periode?: number
  taux_encaissement: number
  taux_recouvrement?: number
  top_actes?: Array<{ libelle: string; total: number; quantite: number; type?: string; montant?: number }>
  ca_par_mode?: Array<{ mode: string; total: number; nb: number }>
  ca_30j?: Array<{ date: string; montant: number; encaisse: number }>
}

export interface Recu {
  payment: InvoicePayment
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

export const invoices = ref<Invoice[]>([])

async function invoke(channel: string, params?: any) {
  if (!window.electronAPI) {
    throw new Error('electronAPI not available')
  }
  const result = await window.electronAPI.invoke(channel, params) as ServiceControllerResultType
  if (!result.success) {
    ElMessage({ type: 'error', message: result.message })
    throw new Error(result.message)
  }
  return result
}

export function computeTotals(items: InvoiceItem[], remisePct = 0, tvaPct = 0) {
  const sousTotal = items.reduce((s, i) => s + (i.quantite * i.prix_unitaire), 0)
  const remiseMontant = (sousTotal * (remisePct || 0)) / 100
  const base = sousTotal - remiseMontant
  const tvaMontant = (base * (tvaPct || 0)) / 100
  const total = Math.round(base + tvaMontant)
  return { sousTotal, remiseMontant, tvaMontant, total }
}

export async function fetchInvoices(params?: { search?: string; status?: string; date_debut?: string; date_fin?: string }) {
  const r = await invoke('invoices:list', params || {})
  invoices.value = r.data as Invoice[]
}

export async function fetchInvoiceStats(params?: { date_debut?: string; date_fin?: string }): Promise<InvoiceStats | null> {
  try {
    const r = await invoke('invoices:stats', params ?? {})
    return r.data as InvoiceStats
  } catch {
    return null
  }
}

export async function fetchRecu(params: { payment_id?: number; numero_recu?: string }): Promise<Recu | null> {
  try {
    const r = await invoke('invoices:recu:get', params)
    return r.data as Recu
  } catch {
    return null
  }
}

export async function getInvoice(id: number): Promise<Invoice | null> {
  try {
    const r = await invoke('invoices:get', { id })
    return r.data as Invoice | null
  } catch {
    return null
  }
}

export async function createInvoice(data: { patient_id: number; date: string; notes?: string; remise_pct?: number; tva_pct?: number; assurance_id?: number | null; taux_prise_en_charge?: number; items: InvoiceItem[] }): Promise<Invoice | null> {
  try {
    const r = await invoke('invoices:create', data)
    return r.data as Invoice
  } catch {
    return null
  }
}

export async function updateInvoice(id: number, data: {
  notes?: string
  status?: string
  remise_pct?: number
  tva_pct?: number
  assurance_id?: number | null
  taux_prise_en_charge?: number
  items?: InvoiceItem[]
}): Promise<Invoice | null> {
  try {
    const r = await invoke('invoices:update', { id, ...data })
    return r.data as Invoice
  } catch {
    return null
  }
}

export async function addPayment(payment: InvoicePayment): Promise<Invoice | null> {
  try {
    const r = await invoke('invoices:add-payment', payment)
    return r.data as Invoice
  } catch {
    return null
  }
}

export async function fetchPatientInvoices(patientId: number) {
  const r = await invoke('invoices:get-by-patient', { patient_id: patientId })
  invoices.value = r.data as Invoice[]
}
