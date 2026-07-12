import { apiClient } from './client'

/** Frontend model for vital signs form data */
export interface VitalSignsInput {
  date: string
  taSystolique: number | null
  taDiastolique: number | null
  frequenceCardiaque: number | null
  temperature: number | null
  glycemie: number | null
  cetonemie: number | null
  glucosurie: string | null
  cetonurie: string | null
  saO2: number | null
  diurese: number | null
  poids: number | null
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
 * Fetch vital signs for a patient within a date range.
 */
export function getVitalSignsList(patientId: number, startDate: string, endDate: string): Promise<VitalSignsRecord[]> {
  return apiClient.get<VitalSignsRecord[]>('vital-signs:list', { patientId, startDate, endDate })
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

// ── Vital Signs Items (per-hour) ─────────────────────────────────────────

export interface VitalSignsItemInput {
  date: string
  hour: number
  taSystolique: number | null
  taDiastolique: number | null
  frequenceCardiaque: number | null
  temperature: number | null
  glycemie: number | null
  cetonemie: number | null
  glucosurie: string | null
  cetonurie: string | null
  saO2: number | null
  diurese: number | null
  poids: number | null
}

export interface VitalSignsItemRecord extends VitalSignsItemInput {
  id: number
  patientId: number
  createdBy: number
  createdAt: string
  updatedAt: string
}

export function getVitalSignsItemsList(patientId: number, startDate: string, endDate: string): Promise<VitalSignsItemRecord[]> {
  return apiClient.get<VitalSignsItemRecord[]>('vital-signs-items:list', { patientId, startDate, endDate })
}

export function saveVitalSignsItem(patientId: number, data: VitalSignsItemInput): Promise<VitalSignsItemRecord> {
  return apiClient.post<VitalSignsItemRecord>('vital-signs-items:save', { patientId, ...data })
}
