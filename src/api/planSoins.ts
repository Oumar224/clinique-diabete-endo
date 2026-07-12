import { apiClient } from './client'
import type { SoinItem, BlocHoraire } from '@/types/soins'

/** A validated medication administration record (from IPC join query) */
export interface ValideRecord {
  date: string
  heure: string
  medicament: string
  dosage: string
  voie: string
  validePar: string | null
  valideA: string | null
}

/** Plan de soins record returned from backend */
export interface PlanSoinsRecord {
  id: number
  patientId: number
  date: string
  blocs: BlocHoraire[]
  createdBy: number
  createdAt: string
  updatedAt: string
}

/**
 * Fetch validated medication administrations for a patient within a date range.
 */
export function getValidesPlanSoins(patientId: number, startDate: string, endDate: string): Promise<ValideRecord[]> {
  return apiClient.get<ValideRecord[]>('plan-soins:valides', { patientId, startDate, endDate })
}

/**
 * Fetch the medication/distribution plan for a patient at a given date.
 */
export function getPlanSoins(patientId: number, date: string): Promise<PlanSoinsRecord | null> {
  return apiClient.get<PlanSoinsRecord | null>('plan-soins:list', { patientId, date })
}

/**
 * Validate a specific soin item (mark as administered).
 */
export function validerSoin(soinId: number, validePar: string): Promise<SoinItem> {
  return apiClient.post<SoinItem>('plan-soins:valider', { soinId, validePar })
}

/**
 * Suspend a specific soin item with a reason.
 */
export function suspendreSoin(soinId: number, motif: string): Promise<SoinItem> {
  return apiClient.post<SoinItem>('plan-soins:suspendre', { soinId, motif })
}

/**
 * Resume a previously suspended soin item (sets it back to en_attente).
 */
export function reprendreSoin(soinId: number): Promise<SoinItem> {
  return apiClient.post<SoinItem>('plan-soins:reprise', { soinId })
}

/**
 * Suspend ALL soin items for a prescription (sets them all to suspendu).
 */
export function suspendrePrescription(prescriptionId: number, motif: string): Promise<SoinItem[]> {
  return apiClient.post<SoinItem[]>('plan-soins:suspendre-prescription', { prescriptionId, motif })
}

/**
 * Resume ALL soin items for a prescription (sets them all to en_attente).
 */
export function reprendrePrescription(prescriptionId: number): Promise<SoinItem[]> {
  return apiClient.post<SoinItem[]>('plan-soins:reprendre-prescription', { prescriptionId })
}
