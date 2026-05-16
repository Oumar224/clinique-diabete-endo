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
}

export interface InvoicePayment {
  id?: number
  invoice_id?: number
  montant: number
  mode_paiement: 'espèces' | 'carte_bancaire' | 'chèque' | 'virement' | 'autre'
  date_paiement: string
  reference?: string
  created_by?: number
  created_at?: string
}

export interface Invoice {
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
  items?: InvoiceItem[]
  payments?: InvoicePayment[]
}

export interface InvoiceStats {
  ca_jour: number
  en_attente: number
  nb_mois: number
  taux_encaissement: number
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

export async function fetchInvoices(params?: { search?: string; status?: string; date_debut?: string; date_fin?: string }) {
  const r = await invoke('invoices:list', params || {})
  invoices.value = r.data as Invoice[]
}

export async function fetchInvoiceStats(): Promise<InvoiceStats | null> {
  try {
    const r = await invoke('invoices:stats')
    return r.data as InvoiceStats
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

export async function createInvoice(data: { patient_id: number; date: string; notes?: string; items: InvoiceItem[] }): Promise<Invoice | null> {
  try {
    const r = await invoke('invoices:create', data)
    return r.data as Invoice
  } catch {
    return null
  }
}

export async function updateInvoice(id: number, data: { notes?: string; status?: string }): Promise<Invoice | null> {
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
