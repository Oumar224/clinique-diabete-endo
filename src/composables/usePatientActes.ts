import { ref } from 'vue'
import { ipcInvoke } from '@/utils/ipc'

export interface PatientActeDto {
  id?: number
  encounter_id?: number
  patient_id: number
  acte_id: number
  tarif_id?: number
  quantite: number
  statut_paiement: 'A_PAYER' | 'PAYE'
  created_at?: string
  acte_code?: string
  acte_label?: string
  prix_unitaire?: number
  code_tarif?: string
}

const patientActes = ref<PatientActeDto[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

export function usePatientActes() {
  async function fetchPatientActes(patientId: number): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const result = await ipcInvoke<PatientActeDto[]>('patient-actes:list-by-patient', { patient_id: patientId })
      patientActes.value = Array.isArray(result) ? result : []
    } catch (e) {
      error.value = (e as Error).message
      patientActes.value = []
    } finally {
      loading.value = false
    }
  }

  async function fetchEncounterActes(encounterId: number): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const result = await ipcInvoke<PatientActeDto[]>('patient-actes:list-by-encounter', { encounter_id: encounterId })
      patientActes.value = Array.isArray(result) ? result : []
    } catch (e) {
      error.value = (e as Error).message
      patientActes.value = []
    } finally {
      loading.value = false
    }
  }

  async function createPatientActe(dto: { patient_id: number; acte_id: number; encounter_id?: number; quantite?: number }): Promise<PatientActeDto | null> {
    try {
      const created = await ipcInvoke<PatientActeDto>('patient-actes:create', dto)
      return created
    } catch (e) {
      error.value = (e as Error).message
      return null
    }
  }

  async function updateStatut(id: number, statut: 'A_PAYER' | 'PAYE'): Promise<boolean> {
    try {
      await ipcInvoke('patient-actes:update-statut', { id, statut })
      const idx = patientActes.value.findIndex(a => a.id === id)
      if (idx !== -1) {
        patientActes.value[idx] = { ...patientActes.value[idx], statut_paiement: statut }
      }
      return true
    } catch (e) {
      error.value = (e as Error).message
      return false
    }
  }

  async function deletePatientActe(id: number): Promise<boolean> {
    try {
      await ipcInvoke('patient-actes:delete', { id })
      patientActes.value = patientActes.value.filter(a => a.id !== id)
      return true
    } catch (e) {
      error.value = (e as Error).message
      return false
    }
  }

  return {
    patientActes,
    loading,
    error,
    fetchPatientActes,
    fetchEncounterActes,
    createPatientActe,
    updateStatut,
    deletePatientActe,
  }
}
