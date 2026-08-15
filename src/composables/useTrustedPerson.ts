import { ref } from 'vue'
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

const loading = ref(false)
const error = ref<string | null>(null)

export function useTrustedPerson() {
  async function getTrustedPerson(patientId: number): Promise<TrustedPersonDto | null> {
    loading.value = true
    error.value = null
    try {
      return await ipcInvoke<TrustedPersonDto | null>('trusted-person:get', { patientId })
    } catch (e) {
      error.value = (e as Error).message
      return null
    } finally {
      loading.value = false
    }
  }

  async function upsertTrustedPerson(data: TrustedPersonDto): Promise<TrustedPersonDto | null> {
    loading.value = true
    error.value = null
    try {
      return await ipcInvoke<TrustedPersonDto | null>('trusted-person:upsert', data)
    } catch (e) {
      error.value = (e as Error).message
      return null
    } finally {
      loading.value = false
    }
  }

  async function deleteTrustedPerson(patientId: number): Promise<void> {
    loading.value = true
    error.value = null
    try {
      await ipcInvoke<void>('trusted-person:delete', { patientId })
    } catch (e) {
      error.value = (e as Error).message
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    getTrustedPerson,
    upsertTrustedPerson,
    deleteTrustedPerson,
  }
}
