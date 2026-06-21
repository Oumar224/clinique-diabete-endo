import { UserEntity } from './user.entity'
import { PatientEntity } from './patient.entity'
import { AppointmentEntity } from './appointment.entity'
import { AutomergeDocumentEntity } from './automerge-document.entity'
import { InvoiceEntity } from './invoice.entity'
import type { Entity } from './entity'

export interface DB {
  user: UserEntity
  patient: PatientEntity
  appointment: AppointmentEntity
  session: { id: string; user_id: number; created_at?: string; expires_at: string; last_activity?: string; remember_me?: number }
  app_settings: { key: string; value: string }
  invoice: InvoiceEntity
  invoice_item: { id?: number; invoice_id: number; libelle: string; quantite: number; prix_unitaire: number; montant: number; type: string; created_at?: string }
  invoice_payment: { id?: number; invoice_id: number; montant: number; mode_paiement: string; date_paiement: string; reference?: string; created_by?: number; created_at?: string }
  automerge_documents: { document_id: string; data: Buffer; last_modified: number }
  currency: {
    code: string
    name: string
    symbol: string
    decimals: number
    is_active: number
  }
  services: {
    id?: number
    name: string
    description: string | null
    duration: number
    color: string | null
    sort_order: number
    is_active: number
    created_at?: string
    updated_at?: string
  }
  medical_acts: {
    id?: number
    code: string
    label: string
    price: number
    currency_code: string
    service_id: number
    is_active: number
    created_at?: string
    updated_at?: string
  }
  act_price_history: {
    id?: number
    act_id: number
    old_price: number | null
    new_price: number
    change_reason: string | null
    changed_at?: string
  }
  medical_units: {
    id?: number
    code: string
    name: string
    is_active: number
    created_at?: string
    updated_at?: string
  }
  sites: {
    id?: number
    name: string
    address: string | null
    phone: string | null
    email: string | null
    is_default: number
    is_active: number
    created_at?: string
    updated_at?: string
  }
  specialties: {
    id?: number
    name: string
    code: string
    title_prefix: string
    is_active: number
    created_at?: string
    updated_at?: string
  }
  user_specialties: {
    user_id: number
    specialty_id: number
  }
  user_sites: {
    user_id: number
    site_id: number
  }
  user_services: {
    user_id: number
    service_id: number
  }
  user_medical_units: {
    user_id: number
    medical_unit_id: number
  }
  email_config: {
    id: number
    smtp_host: string
    smtp_port: number
    smtp_user: string
    smtp_pass_encrypted: string
    sender_email: string
    sender_name: string
    is_configured: number
    created_at?: string
    updated_at?: string
  }
  fonctions: {
    id?: number
    name: string
    is_active: number
    created_at?: string
    updated_at?: string
  }
  localites: {
    id?: number
    code: string
    name: string
    type: string
    parent_id: number | null
    country: string
    region?: string
    is_active: number
    created_at?: string
    updated_at?: string
  }
  user_attachments: {
    id?: number
    user_id: number
    display_name: string
    file_name: string
    mime_type: string | null
    file_size: number | null
    file_data: string
    created_at?: string
  }
  patient_attachments: {
    id?: number
    patient_id: number
    display_name: string
    file_name: string
    mime_type: string | null
    file_size: number | null
    file_data: string
    created_at?: string
  }
}

export const ENTITIES: Entity[] = [
  AutomergeDocumentEntity,
  UserEntity,
  PatientEntity,
  AppointmentEntity,
  InvoiceEntity,
]
