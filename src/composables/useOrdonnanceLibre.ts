import { ref } from 'vue'
import { ipcInvoke } from '@/utils/ipc'
import { ElMessage } from 'element-plus'

export interface OrdonnanceLibreRecord {
  id: number
  contact_id: string
  document_type_id: string
  title: string | null
  status: string
  form_data: string | null
  created_at: string | null
  updated_at: string | null
  linkedPrescriptions?: any[]
  medecin_nom?: string
  medecin_prenom?: string
}

const ordonnances = ref<OrdonnanceLibreRecord[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

export function useOrdonnanceLibre() {
  async function fetchOrdonnances(patientId: number) {
    loading.value = true
    error.value = null
    try {
      const result = await ipcInvoke<OrdonnanceLibreRecord[]>('ordonnance-libre:list', { patientId })
      ordonnances.value = result ?? []
    } catch (e) {
      error.value = (e as Error).message || 'Erreur lors du chargement des ordonnances'
      ordonnances.value = []
    } finally {
      loading.value = false
    }
  }

  async function getOrdonnance(id: number): Promise<OrdonnanceLibreRecord | null> {
    try {
      return await ipcInvoke<OrdonnanceLibreRecord | null>('ordonnance-libre:get', { id })
    } catch {
      ElMessage.error('Impossible de charger l\'ordonnance')
      return null
    }
  }

  async function fetchAvailablePrescriptions(patientId: number): Promise<any[]> {
    try {
      return await ipcInvoke<any[]>('prescription:list', { patientId })
    } catch {
      return []
    }
  }

  async function deleteOrdonnance(id: number): Promise<void> {
    loading.value = true
    error.value = null
    try {
      await ipcInvoke('ordonnance-libre:delete', { id })
    } catch (e) {
      error.value = (e as Error).message
    } finally {
      loading.value = false
    }
  }

  return {
    ordonnances,
    loading,
    error,
    fetchOrdonnances,
    getOrdonnance,
    fetchAvailablePrescriptions,
    deleteOrdonnance,
  }
}
