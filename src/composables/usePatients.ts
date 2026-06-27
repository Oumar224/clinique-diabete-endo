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

export const patients = ref<PatientDto[]>([])

export async function fetchPatients(search?: string) {
  patients.value = await ipcInvoke<PatientDto[]>('patients:list', { search })
}

export async function getPatient(id: number): Promise<PatientDto | null> {
  return await ipcInvoke<PatientDto | null>('patients:get', { id })
}

export async function createPatient(data: Omit<PatientDto, 'id'>): Promise<PatientDto | null> {
  return await ipcInvoke<PatientDto | null>('patients:create', data)
}

export async function updatePatient(data: PatientDto): Promise<PatientDto | null> {
  return await ipcInvoke<PatientDto | null>('patients:update', data)
}

export async function deletePatient(id: number) {
  await ipcInvoke<void>('patients:delete', { id })
}
