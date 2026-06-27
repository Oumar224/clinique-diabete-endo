import { apiClient } from './client'

/** Frontend model for vital signs form data */
export interface VitalSignsInput {
  date: string
  taSystolique: number | null
  taDiastolique: number | null
  frequenceCardiaque: number | null
  temperature: number | null
  glycemie: number | null
}

/** Full vital signs record as returned from the backend */
export interface VitalSignsRecord extends VitalSignsInput {
  id: number
  patientId: number
  createdBy: number
  createdAt: string
  updatedAt: string
}

/**
 * Fetch today's vital signs for a given patient.
 * Returns `null` if none recorded yet today.
 */
export function getVitalSigns(patientId: number): Promise<VitalSignsRecord | null> {
  return apiClient.get<VitalSignsRecord | null>('vital-signs:get-today', { patientId })
}

/**
 * Save (upsert) vital signs for a patient for today.
 * If a record already exists for today, it is updated; otherwise created.
 */
export function saveVitalSigns(patientId: number, data: VitalSignsInput): Promise<VitalSignsRecord> {
  return apiClient.post<VitalSignsRecord>('vital-signs:save', { patientId, ...data })
}
