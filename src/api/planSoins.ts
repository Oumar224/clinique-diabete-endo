import { apiClient } from './client'
import type { SoinItem, BlocHoraire } from '@/types/soins'

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
