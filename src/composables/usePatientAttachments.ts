import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { ipcInvoke } from '@/utils/ipc'

export interface PatientAttachmentDto {
  id: number
  patient_id: number
  display_name: string
  file_name: string
  mime_type: string | null
  file_size: number | null
  file_data?: string
  created_at: string
  attachment_type_id?: number | null
  attachment_type_name?: string | null
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
    patient_id: number
    display_name: string
    file_name: string
    category?: string
    mime_type: string
    file_size: number
    file_data: string
    attachment_type_id?: number | null
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
      return data.file_data ?? null
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
