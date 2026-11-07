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
  /**
   * Au moins une ligne médicament transférable à la pharmacie.
   * Calculé par le backend (`ordonnance-libre:list` / `ordonnance-libre:get`)
   * à partir de `form_data`.
   */
  hasMedicamentLines?: boolean
  /**
   * Une délivrance pharmacie a déjà été créée pour cette ordonnance.
   * Calculé par le backend depuis la table `delivrances`.
   */
  dejaTransferee?: boolean
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

  async function createOrReplaceFromGroup(params: {
    patientId: number
    contactId: string
    serviceId?: string | null
    siteId?: number | null
    createdBy: string
    title: string
    sourceDocumentId: string
    categorie: string
    items: any[]
  }): Promise<{ documentId: string; replaced: boolean } | null> {
    try {
      return await ipcInvoke<{ documentId: string; replaced: boolean }>(
        'ordonnance-libre:create-from-group',
        params,
      )
    } catch (e) {
      ElMessage.error((e as Error).message || 'Erreur lors de la génération de l\'ordonnance')
      return null
    }
  }

  async function findCrhGroupOrdonnance(
    patientId: number,
    sourceDocumentId: string,
    categorie: string,
  ): Promise<Record<string, any> | null> {
    try {
      const records = await ipcInvoke<OrdonnanceLibreRecord[]>('ordonnance-libre:list', { patientId })
      if (!records || records.length === 0) return null
      for (const record of records) {
        if (!record.form_data) continue
        const fd: Record<string, any> = typeof record.form_data === 'string'
          ? JSON.parse(record.form_data)
          : record.form_data
        if (fd.source === 'crh' && fd.sourceDocumentId === sourceDocumentId && fd.categorie === categorie) {
          return record
        }
      }
      return null
    } catch {
      return null
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
    createOrReplaceFromGroup,
    findCrhGroupOrdonnance,
  }
}
