import { ipcInvoke } from '@/utils/ipc'

export interface TrustedPersonDto {
  id?: number
  patient_id: number
  has_trusted: boolean
  nom?: string
  prenom?: string
  profession?: string
  residence?: string
  residence_code?: string
  telephone?: string
  email?: string
  complement_adresse?: string
  lien_parente?: string
  attachments?: string
  created_at?: string
  updated_at?: string
}

export async function getTrustedPerson(patientId: number): Promise<TrustedPersonDto | null> {
  return ipcInvoke<TrustedPersonDto | null>('trusted-person:get', { patientId })
}

export async function upsertTrustedPerson(data: TrustedPersonDto): Promise<TrustedPersonDto | null> {
  return ipcInvoke<TrustedPersonDto | null>('trusted-person:upsert', data)
}

export async function deleteTrustedPerson(patientId: number): Promise<void> {
  await ipcInvoke<void>('trusted-person:delete', { patientId })
}
