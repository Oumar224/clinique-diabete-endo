import { apiClient } from './client'

export interface PrescriptionInput {
  type: 'medicament' | 'soins'
  medicament: string
  dosage: string
  voie: string
  duree: number
  frequence: string[]
  frequenceType?: string
  prn: boolean
  instructions: string | null
}

export interface PrescriptionRecord extends PrescriptionInput {
  id: number
  patientId: number
  datePrescription: string
  prescripteurId: number
  prescripteurNom?: string
  prescripteurRole?: string
  statut: string
  type: 'medicament' | 'soins'
  createdAt: string
  updatedAt: string
  // Medicament-specific
  formeGalenique?: string
  momentPrises?: string
  quantiteTotale?: string
  renouvellement?: boolean
  nbRenouvellements?: number
  allergiesAlertes?: string
  // Soin-specific
  nbSeances?: number
  objectifClinique?: string
  consignesSpecifiques?: string
  dispositifsMedicaux?: string
  professionnelCible?: string
  frequenceType?: string
}

export interface PrescriptionCreateResult {
  prescription: PrescriptionRecord
  itemsGenerated: number
}

/**
 * List all prescriptions for a given patient.
 */
export function getPrescriptions(patientId: number): Promise<PrescriptionRecord[]> {
  return apiClient.get<PrescriptionRecord[]>('prescription:list', { patientId })
}

/**
 * Get a single prescription by id.
 */
export function getPrescription(id: number): Promise<PrescriptionRecord | null> {
  return apiClient.get<PrescriptionRecord | null>('prescription:get', { id })
}

/**
 * Create a new prescription and auto-generate plan_soins_items.
 */
export function createPrescription(
  patientId: number,
  data: PrescriptionInput & { prescripteurId: number },
): Promise<PrescriptionCreateResult> {
  return apiClient.post<PrescriptionCreateResult>('prescription:create', {
    patientId,
    ...data,
  })
}

/**
 * Update an existing prescription and regenerate en_attente plan_soins_items.
 */
export function updatePrescription(
  id: number,
  data: Partial<PrescriptionInput>,
): Promise<{ prescription: PrescriptionRecord; itemsGenerated: number }> {
  return apiClient.post<{ prescription: PrescriptionRecord; itemsGenerated: number }>(
    'prescription:update',
    { id, ...data },
  )
}

/**
 * Stop an active prescription.
 */
export function stopPrescription(id: number): Promise<void> {
  return apiClient.post<void>('prescription:stop', { id })
}

/**
 * Delete a prescription and disassociate its plan_soins_items.
 */
export function deletePrescription(id: number): Promise<void> {
  return apiClient.delete<void>('prescription:delete', { id })
}
