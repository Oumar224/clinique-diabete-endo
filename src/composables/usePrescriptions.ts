import { ref } from 'vue'
import { ipcInvoke } from '@/utils/ipc'

export interface PrescriptionInput {
  type: 'medicament' | 'soins'
  medicament: string
  dosage: string
  voie: string
  duree: number
  dureeType?: 'courte' | 'longue'
  frequence: string[]
  frequenceType?: string
  prn: boolean
  instructions: string | null
}

export interface PrescriptionRecord extends PrescriptionInput {
  id: number
  patientId: number
  datePrescription: string
  prescripteurId: number
  prescripteurNom?: string
  prescripteurRole?: string
  statut: string
  type: 'medicament' | 'soins'
  createdAt: string
  updatedAt: string
  formeGalenique?: string
  momentPrises?: string
  quantiteTotale?: string
  renouvellement?: boolean
  nbRenouvellements?: number
  nbSeances?: number
  objectifClinique?: string
  consignesSpecifiques?: string
  dispositifsMedicaux?: string
  professionnelCible?: string
  frequenceType?: string
}

export interface PrescriptionCreateResult {
  prescription: PrescriptionRecord
  itemsGenerated: number
}

const prescriptions = ref<PrescriptionRecord[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

export function usePrescriptions() {
  async function fetchPrescriptions(patientId: number): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const result = await ipcInvoke<PrescriptionRecord[]>('prescription:list', { patientId })
      prescriptions.value = result ?? []
    } catch (e) {
      error.value = (e as Error).message
      prescriptions.value = []
    } finally {
      loading.value = false
    }
  }

  async function getPrescription(id: number): Promise<PrescriptionRecord | null> {
    loading.value = true
    error.value = null
    try {
      return await ipcInvoke<PrescriptionRecord | null>('prescription:get', { id })
    } catch (e) {
      error.value = (e as Error).message
      return null
    } finally {
      loading.value = false
    }
  }

  async function createPrescription(
    patientId: number,
    data: PrescriptionInput & { prescripteurId: number },
  ): Promise<PrescriptionCreateResult | null> {
    loading.value = true
    error.value = null
    try {
      return await ipcInvoke<PrescriptionCreateResult>('prescription:create', {
        patientId,
        ...data,
      })
    } catch (e) {
      error.value = (e as Error).message
      return null
    } finally {
      loading.value = false
    }
  }

  async function updatePrescription(
    id: number,
    data: Partial<PrescriptionInput>,
  ): Promise<{ prescription: PrescriptionRecord; itemsGenerated: number } | null> {
    loading.value = true
    error.value = null
    try {
      return await ipcInvoke<{ prescription: PrescriptionRecord; itemsGenerated: number }>(
        'prescription:update',
        { id, ...data },
      )
    } catch (e) {
      error.value = (e as Error).message
      return null
    } finally {
      loading.value = false
    }
  }

  async function stopPrescription(id: number): Promise<void> {
    loading.value = true
    error.value = null
    try {
      await ipcInvoke('prescription:stop', { id })
    } catch (e) {
      error.value = (e as Error).message
    } finally {
      loading.value = false
    }
  }

  async function deletePrescription(id: number): Promise<void> {
    loading.value = true
    error.value = null
    try {
      await ipcInvoke('prescription:delete', { id })
    } catch (e) {
      error.value = (e as Error).message
    } finally {
      loading.value = false
    }
  }

  return {
    prescriptions,
    loading,
    error,
    fetchPrescriptions,
    getPrescription,
    createPrescription,
    updatePrescription,
    stopPrescription,
    deletePrescription,
  }
}
