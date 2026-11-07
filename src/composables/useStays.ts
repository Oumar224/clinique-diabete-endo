import { ref } from 'vue'
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
  /** Type de séjour (migration 110). */
  type?: 'jour' | 'complete' | null
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
  exited_at?: string | null
  notes?: string | null
  created_at?: string
}

const loading = ref(false)
const error = ref<string | null>(null)

export function useStays() {
  async function getActiveStay(patientId: number): Promise<StayDto | null> {
    loading.value = true
    error.value = null
    try {
      return await ipcInvoke<StayDto | null>('stays:get-active', { patient_id: patientId })
    } catch (e) {
      error.value = (e as Error).message
      return null
    } finally {
      loading.value = false
    }
  }

  async function listStaysByPatient(patientId: number): Promise<StayDto[]> {
    loading.value = true
    error.value = null
    try {
      return await ipcInvoke<StayDto[]>('stays:list-by-patient', { patient_id: patientId })
    } catch (e) {
      error.value = (e as Error).message
      return []
    } finally {
      loading.value = false
    }
  }

  async function getStayMovements(stayId: number): Promise<StayMovementDto[]> {
    loading.value = true
    error.value = null
    try {
      return await ipcInvoke<StayMovementDto[]>('stays:get-movements', { stay_id: stayId })
    } catch (e) {
      error.value = (e as Error).message
      return []
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    getActiveStay,
    listStaysByPatient,
    getStayMovements,
  }
}
