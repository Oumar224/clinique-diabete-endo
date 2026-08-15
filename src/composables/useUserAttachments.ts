import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { ipcInvoke } from '@/utils/ipc'

export interface AttachmentDto {
  id: number
  user_id: number
  display_name: string
  file_name: string
  mime_type: string | null
  file_size: number | null
  file_data?: string
  created_at: string
  attachment_type_id?: number | null
  attachment_type_name?: string | null
}

const attachments = ref<AttachmentDto[]>([])
const loading = ref(false)
const loadedForUserId = ref<number | null>(null)
const error = ref<string | null>(null)

export function useUserAttachments() {
  async function loadAttachments(userId: number) {
    if (loadedForUserId.value === userId) return
    loading.value = true
    attachments.value = []
    try {
      attachments.value = await ipcInvoke<AttachmentDto[]>('user-attachments:list', userId)
      loadedForUserId.value = userId
    } catch {
      ElMessage.error('Erreur lors du chargement des pièces jointes')
    }
    loading.value = false
  }

  async function addAttachment(dto: {
    user_id: number
    display_name: string
    file_name: string
    mime_type: string
    file_size: number
    file_data: string
    attachment_type_id?: number | null
  }): Promise<boolean> {
    try {
      const created = await ipcInvoke<AttachmentDto>('user-attachments:create', dto)
      attachments.value.unshift(created)
      return true
    } catch (e) {
      error.value = (e as Error).message
      return false
    }
  }

  async function removeAttachment(id: number): Promise<boolean> {
    try {
      await ipcInvoke('user-attachments:delete', id)
      attachments.value = attachments.value.filter(a => a.id !== id)
      return true
    } catch (e) {
      error.value = (e as Error).message
      return false
    }
  }

  async function getAttachmentFile(id: number): Promise<string | null> {
    try {
      const data = await ipcInvoke<AttachmentDto>('user-attachments:get', id)
      return data.file_data ?? null
    } catch (e) {
      error.value = (e as Error).message
      return null
    }
  }

  function reset() {
    attachments.value = []
    loadedForUserId.value = null
  }

  return {
    attachments,
    loading,
    error,
    loadAttachments,
    addAttachment,
    removeAttachment,
    getAttachmentFile,
    reset,
  }
}
