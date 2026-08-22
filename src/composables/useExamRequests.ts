import { ref } from 'vue'
import { ipcInvoke } from '@/utils/ipc'

export interface ExamRequestDto {
  id?: number
  patientId: number
  encounterId?: number | null
  type: 'imagerie' | 'laboratoire' | 'avis'
  examenId?: number | null
  examIds?: number[]
  specialite?: string
  specialtyId?: number | null
  specialtyName?: string
  plannedHour?: number | null
  plannedDate?: string | null
  motif?: string
  statut: 'en_attente' | 'en_cours' | 'realise' | 'annule'
  prescripteurId?: number | null
  createdBy?: number | null
  createdAt?: string
  updatedAt?: string
  prescripteurNom?: string
  examenLabel?: string
  validatedAt?: string | null
  realizedAt?: string | null
  resultat?: string
}

export interface ExamRequestAttachmentDto {
  id?: number
  examRequestId: number
  displayName: string
  fileName: string
  mimeType: string
  fileSize: number
  fileData?: string
  description?: string
  createdAt?: string
}

const requests = ref<ExamRequestDto[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const attachments = ref<ExamRequestAttachmentDto[]>([])
const attachmentsLoading = ref(false)

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

  async function fetchByDate(patientId: number, date: string): Promise<ExamRequestDto[]> {
    loading.value = true
    error.value = null
    try {
      const result = await ipcInvoke<ExamRequestDto[]>('exam-request:list-by-date', { patientId, date })
      return Array.isArray(result) ? result : []
    } catch (e) {
      error.value = (e as Error).message
      return []
    } finally {
      loading.value = false
    }
  }

  async function createRequest(dto: {
    patientId: number
    type: 'imagerie' | 'laboratoire' | 'avis'
    examenId?: number | null
    examIds?: number[]
    specialite?: string
    specialtyId?: number | null
    plannedHour?: number | null
    plannedDate?: string | null
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

  async function updateRequest(id: number, dto: Partial<{
    type: ExamRequestDto['type']
    examenId: number | null
    examIds: number[]
    specialite: string
    specialtyId: number | null
    plannedHour: number | null
    plannedDate: string | null
    motif: string
    statut: ExamRequestDto['statut']
    prescripteurId: number | null
  }>): Promise<ExamRequestDto | null> {
    try {
      const updated = await ipcInvoke<ExamRequestDto>('exam-request:update', { id, ...dto })
      return updated
    } catch (e) {
      error.value = (e as Error).message
      return null
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

  async function realize(id: number, resultat?: string): Promise<boolean> {
    try {
      await ipcInvoke('exam-request:realize', { id, resultat })
      return true
    } catch (e) {
      error.value = (e as Error).message
      return false
    }
  }

  async function listAttachments(examRequestId: number): Promise<ExamRequestAttachmentDto[]> {
    attachmentsLoading.value = true
    try {
      const result = await ipcInvoke<ExamRequestAttachmentDto[]>('exam-request-attachments:list', { examRequestId })
      attachments.value = Array.isArray(result) ? result : []
    } catch (e) {
      error.value = (e as Error).message
      attachments.value = []
    } finally {
      attachmentsLoading.value = false
    }
    return attachments.value
  }

  async function createAttachment(payload: {
    examRequestId: number
    displayName: string
    fileName: string
    mimeType: string
    fileSize: number
    fileData: string
    description?: string
  }): Promise<ExamRequestAttachmentDto | null> {
    try {
      const created = await ipcInvoke<ExamRequestAttachmentDto>('exam-request-attachments:create', payload)
      return created
    } catch (e) {
      error.value = (e as Error).message
      return null
    }
  }

  async function deleteAttachment(id: number): Promise<boolean> {
    try {
      await ipcInvoke('exam-request-attachments:delete', { id })
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
    attachments,
    attachmentsLoading,
    fetchRequests,
    fetchByDate,
    createRequest,
    updateRequest,
    updateStatut,
    deleteRequest,
    realize,
    listAttachments,
    createAttachment,
    deleteAttachment,
  }
}
