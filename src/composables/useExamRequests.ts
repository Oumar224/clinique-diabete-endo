import { ref } from 'vue'
import { ipcInvoke } from '@/utils/ipc'

export interface ExamRequestDto {
  id?: number
  patientId: number
  encounterId?: number | null
  type: 'imagerie' | 'avis' | 'laboratoire'
  examenId?: number | null
  examIds?: number[]
  motif?: string
  statut: 'en_attente' | 'en_cours' | 'realise' | 'annule'
  prescripteurId?: number | null
  createdBy?: number | null
  createdAt?: string
  updatedAt?: string
  prescripteurNom?: string
  examenLabel?: string
}

const requests = ref<ExamRequestDto[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

export function useExamRequests() {
  async function fetchRequests(patientId: number): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const result = await ipcInvoke<ExamRequestDto[]>('exam-request:list', { patientId })
      requests.value = Array.isArray(result) ? result : []
    } catch (e) {
      error.value = (e as Error).message
      requests.value = []
    } finally {
      loading.value = false
    }
  }

  async function createRequest(dto: {
    patientId: number
    type: 'imagerie' | 'avis' | 'laboratoire'
    examenId?: number | null
    examIds?: number[]
    motif?: string
    prescripteurId?: number | null
  }): Promise<ExamRequestDto | null> {
    try {
      const created = await ipcInvoke<ExamRequestDto>('exam-request:create', {
        ...dto,
        statut: 'en_attente',
      })
      return created
    } catch (e) {
      error.value = (e as Error).message
      return null
    }
  }

  async function updateStatut(id: number, statut: ExamRequestDto['statut']): Promise<boolean> {
    try {
      await ipcInvoke('exam-request:update', { id, statut } as any)
      return true
    } catch (e) {
      error.value = (e as Error).message
      return false
    }
  }

  async function deleteRequest(id: number): Promise<boolean> {
    try {
      await ipcInvoke('exam-request:delete', { id })
      return true
    } catch (e) {
      error.value = (e as Error).message
      return false
    }
  }

  return {
    requests,
    loading,
    error,
    fetchRequests,
    createRequest,
    updateStatut,
    deleteRequest,
  }
}
