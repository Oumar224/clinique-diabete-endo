import { apiClient } from './client'
import type { Dispositif } from '@/types/soins'

/** Input shape for creating a new dispositif */
export interface DispositifInput {
  patientId: number
  type: string
  datePose: string
  aspect: 'Sain' | 'Rouge' | 'Douloureux'
  volumeMl: number | null
}

/**
 * List all access devices for a patient.
 */
export function getDispositifs(patientId: number): Promise<Dispositif[]> {
  return apiClient.get<Dispositif[]>('dispositifs:list', { patientId })
}

/**
 * Create a new access device.
 */
export function ajouterDispositif(data: DispositifInput): Promise<Dispositif> {
  return apiClient.post<Dispositif>('dispositifs:create', data as unknown as Record<string, unknown>)
}

/**
 * Delete an access device.
 */
export function supprimerDispositif(id: number): Promise<void> {
  return apiClient.delete<void>('dispositifs:delete', { id })
}
