import { ref } from 'vue'
import { ElMessage } from 'element-plus'

interface ServiceControllerResultType {
  success?: boolean
  data?: unknown
  message?: string
}

export interface PatientDto {
  id: number
  civilite: 'M' | 'Mme' | 'Mlle'
  nom: string
  prenom: string
  date_naissance: string
  nir: string
  telephone: string
  email?: string
  adresse?: string
  mutuelle?: string
  medecin_traitant?: string
  allergies: string[]
}

export const patients = ref<PatientDto[]>([])

async function invoke(channel: string, params?: unknown) {
  if (!window.electronAPI) {
    throw new Error('electronAPI not available')
  }
  const result = await window.electronAPI.invoke(channel, params) as ServiceControllerResultType
  if (!result.success) {
    ElMessage({ type: 'error', message: result.message })
    throw new Error(result.message)
  }
  return result
}

export async function fetchPatients(search?: string) {
  const r = await invoke('patients:list', { search })
  patients.value = (r.data as PatientDto[]) ?? []
}

export async function getPatient(id: number): Promise<PatientDto | null> {
  const r = await invoke('patients:get', { id })
  return (r.data as PatientDto) ?? null
}

export async function createPatient(data: Omit<PatientDto, 'id'>): Promise<PatientDto | null> {
  const r = await invoke('patients:create', data)
  return (r.data as PatientDto) ?? null
}

export async function updatePatient(data: PatientDto): Promise<PatientDto | null> {
  const r = await invoke('patients:update', data)
  return (r.data as PatientDto) ?? null
}

export async function deletePatient(id: number) {
  await invoke('patients:delete', { id })
}
