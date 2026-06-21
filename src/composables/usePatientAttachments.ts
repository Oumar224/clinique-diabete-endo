import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { ipcInvoke } from '@/utils/ipc'

export interface PatientAttachmentDto {
  id: number
  patientId: number
  displayName: string
  fileName: string
  mimeType: string | null
  fileSize: number | null
  fileData?: string
  createdAt: string
}

const attachments = ref<PatientAttachmentDto[]>([])
const loading = ref(false)
const loadedForPatientId = ref<number | null>(null)

export function usePatientAttachments() {
  async function loadAttachments(patientId: number, force = false) {
    if (!force && loadedForPatientId.value === patientId) return
    loading.value = true
    attachments.value = []
    try {
      attachments.value = await ipcInvoke<PatientAttachmentDto[]>('patient-attachments:list', patientId)
      loadedForPatientId.value = patientId
    } catch {
      ElMessage.error('Erreur lors du chargement des pièces jointes')
    }
    loading.value = false
  }

  async function addAttachment(dto: {
    patientId: number
    displayName: string
    fileName: string
    mimeType: string
    fileSize: number
    fileData: string
  }): Promise<boolean> {
    try {
      const created = await ipcInvoke<PatientAttachmentDto>('patient-attachments:create', dto)
      attachments.value.unshift(created)
      return true
    } catch {
      return false
    }
  }

  async function removeAttachment(id: number): Promise<boolean> {
    try {
      await ipcInvoke('patient-attachments:delete', id)
      attachments.value = attachments.value.filter(a => a.id !== id)
      return true
    } catch {
      return false
    }
  }

  async function getAttachmentFile(id: number): Promise<string | null> {
    try {
      const data = await ipcInvoke<PatientAttachmentDto>('patient-attachments:get', id)
      return data.fileData ?? null
    } catch {
      return null
    }
  }

  function reset() {
    attachments.value = []
    loadedForPatientId.value = null
  }

  return {
    attachments,
    loading,
    loadAttachments,
    addAttachment,
    removeAttachment,
    getAttachmentFile,
    reset,
  }
}
