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
  attachmentTypeId?: number | null
  attachmentTypeName?: string | null
}

export function usePatientAttachments() {
  const attachments = ref<PatientAttachmentDto[]>([])
  const loading = ref(false)
  const loadedKey = ref<string | null>(null)
  async function loadAttachments(patientId: number, category: string = 'patient', force = false) {
    const key = `${patientId}:${category}`
    if (!force && loadedKey.value === key) return
    loading.value = true
    attachments.value = []
    try {
      attachments.value = await ipcInvoke<PatientAttachmentDto[]>('patient-attachments:list', { patientId, category })
      loadedKey.value = key
    } catch {
      ElMessage.error('Erreur lors du chargement des pièces jointes')
    }
    loading.value = false
  }

  async function addAttachment(dto: {
    patientId: number
    displayName: string
    fileName: string
    category?: string
    mimeType: string
    fileSize: number
    fileData: string
    attachmentTypeId?: number | null
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
    loadedKey.value = null
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
