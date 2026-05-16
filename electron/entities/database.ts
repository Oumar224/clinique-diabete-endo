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
}

export const ENTITIES: Entity[] = [
  AutomergeDocumentEntity,
  UserEntity,
  PatientEntity,
  AppointmentEntity,
  InvoiceEntity,
]
