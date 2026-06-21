import { ref } from 'vue'
import { ipcInvoke } from '@/utils/ipc'

export interface AttachmentDto {
  id: number
  userId: number
  displayName: string
  fileName: string
  mimeType: string | null
  fileSize: number | null
  fileData?: string
  createdAt: string
}

const attachments = ref<AttachmentDto[]>([])
const loading = ref(false)
const loadedForUserId = ref<number | null>(null)

export function useUserAttachments() {
  async function loadAttachments(userId: number) {
    if (loadedForUserId.value === userId) return
    loading.value = true
    try {
      attachments.value = await ipcInvoke<AttachmentDto[]>('user-attachments:list', userId)
      loadedForUserId.value = userId
    } catch {
      // ipcInvoke affiche déjà ElMessage en cas d'erreur
    }
    loading.value = false
  }

  async function addAttachment(dto: {
    userId: number
    displayName: string
    fileName: string
    mimeType: string
    fileSize: number
    fileData: string
  }): Promise<boolean> {
    try {
      const created = await ipcInvoke<AttachmentDto>('user-attachments:create', dto)
      attachments.value.unshift(created)
      return true
    } catch {
      return false
    }
  }

  async function removeAttachment(id: number): Promise<boolean> {
    try {
      await ipcInvoke('user-attachments:delete', id)
      attachments.value = attachments.value.filter(a => a.id !== id)
      return true
    } catch {
      return false
    }
  }

  async function getAttachmentFile(id: number): Promise<string | null> {
    try {
      const data = await ipcInvoke<AttachmentDto>('user-attachments:get', id)
      return data.fileData ?? null
    } catch {
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
    loadAttachments,
    addAttachment,
    removeAttachment,
    getAttachmentFile,
    reset,
  }
}
