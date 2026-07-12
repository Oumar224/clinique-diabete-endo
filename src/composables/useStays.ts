import { ipcInvoke } from '@/utils/ipc'

export interface StayDto {
  id?: number
  patient_id: number
  admission_date: string
  mode_admission: 'urgences' | 'programmee' | 'transfert'
  service_id: number
  service_name?: string
  chambre?: string | null
  lit?: string | null
  medecin_id?: number | null
  medecin_name?: string | null
  notes?: string | null
  status: 'en_cours' | 'cloture' | 'transfere'
  sortie_date?: string | null
  created_by?: number | null
  created_at?: string
  updated_at?: string
}

export interface StayMovementDto {
  id?: number
  stay_id: number
  movement_type: 'admission' | 'transfert_chambre' | 'transfert_service' | 'sortie'
  from_service_id?: number | null
  from_service_name?: string
  to_service_id?: number | null
  to_service_name?: string
  chambre?: string | null
  lit?: string | null
  moved_at: string
  notes?: string | null
  created_at?: string
}

export async function getActiveStay(patientId: number): Promise<StayDto | null> {
  return ipcInvoke<StayDto | null>('stays:get-active', { patient_id: patientId })
}

export async function listStaysByPatient(patientId: number): Promise<StayDto[]> {
  return ipcInvoke<StayDto[]>('stays:list-by-patient', { patient_id: patientId })
}

export async function getStayMovements(stayId: number): Promise<StayMovementDto[]> {
  return ipcInvoke<StayMovementDto[]>('stays:get-movements', { stay_id: stayId })
}
