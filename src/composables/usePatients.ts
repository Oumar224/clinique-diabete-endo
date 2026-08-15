import { ref } from 'vue'
import { ipcInvoke } from '@/utils/ipc'

export interface PatientDto {
  id: number
  civilite: '' | 'M' | 'Mme' | 'Mlle'
  nom: string
  prenom: string
  date_naissance: string
  nir: string
  telephone: string
  email?: string
  profession?: string
  medecin_traitant?: string
  allergies: string[]
  photo?: string | null
  nip?: string
  lieu_naissance?: string
  residence_code?: string
  complement_adresse?: string
  region?: string
  site_id?: number
  assuranceMutuelle?: string
  consentementEtude?: string
}

const patients = ref<PatientDto[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

export function usePatients() {
  async function fetchPatients(search?: string): Promise<void> {
    loading.value = true
    error.value = null
    try {
      patients.value = await ipcInvoke<PatientDto[]>('patients:list', { search })
    } catch (e) {
      error.value = (e as Error).message
    } finally {
      loading.value = false
    }
  }

  async function getPatient(id: number): Promise<PatientDto | null> {
    try {
      return await ipcInvoke<PatientDto | null>('patients:get', { id })
    } catch (e) {
      error.value = (e as Error).message
      return null
    }
  }

  async function createPatient(data: Omit<PatientDto, 'id'>): Promise<PatientDto | null> {
    try {
      const created = await ipcInvoke<PatientDto | null>('patients:create', data)
      await fetchPatients()
      return created
    } catch (e) {
      error.value = (e as Error).message
      return null
    }
  }

  async function updatePatient(data: PatientDto): Promise<PatientDto | null> {
    try {
      const updated = await ipcInvoke<PatientDto | null>('patients:update', data)
      await fetchPatients()
      return updated
    } catch (e) {
      error.value = (e as Error).message
      return null
    }
  }

  async function deletePatient(id: number): Promise<void> {
    loading.value = true
    error.value = null
    try {
      await ipcInvoke<void>('patients:delete', { id })
      await fetchPatients()
    } catch (e) {
      error.value = (e as Error).message
    } finally {
      loading.value = false
    }
  }

  async function checkPatientsExist(ids: number[]): Promise<Record<number, boolean>> {
    try {
      return await ipcInvoke<Record<number, boolean>>('patients:exists', { ids })
    } catch (e) {
      error.value = (e as Error).message
      return {}
    }
  }

  return {
    patients,
    loading,
    error,
    fetchPatients,
    getPatient,
    createPatient,
    updatePatient,
    deletePatient,
    checkPatientsExist,
  }
}
