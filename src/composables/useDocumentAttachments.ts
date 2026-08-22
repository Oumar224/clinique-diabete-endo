import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { ipcInvoke } from '@/utils/ipc'

export interface DocumentAttachment {
  id: number
  document_id: string
  display_name: string
  file_name: string
  mime_type: string | null
  file_size: number | null
  description: string | null
  created_at: string
}

export interface DocumentAttachmentWithData extends DocumentAttachment {
  file_data: string
}

export interface DocumentAttachmentDto {
  document_id: string
  display_name: string
  file_name: string
  mime_type?: string
  file_size?: number
  file_data: string
  description?: string
}

export function useDocumentAttachments() {
  const attachments = ref<DocumentAttachment[]>([])
  const loading = ref(false)
  const loadedKey = ref<string | null>(null)

  async function loadAttachments(documentId: string, force = false) {
    if (!force && loadedKey.value === documentId) return
    loading.value = true
    attachments.value = []
    try {
      attachments.value = await ipcInvoke<DocumentAttachment[]>('document-attachments:list', { documentId })
      loadedKey.value = documentId
    } catch {
      ElMessage.error('Erreur lors du chargement des pièces jointes')
    }
    loading.value = false
  }

  async function addAttachment(dto: DocumentAttachmentDto): Promise<boolean> {
    try {
      const created = await ipcInvoke<DocumentAttachment>('document-attachments:create', dto)
      attachments.value.unshift(created)
      return true
    } catch {
      return false
    }
  }

  async function updateDescription(id: number, description: string): Promise<boolean> {
    try {
      const updated = await ipcInvoke<DocumentAttachment>('document-attachments:update', { id, description })
      const idx = attachments.value.findIndex(a => a.id === id)
      if (idx !== -1) attachments.value[idx] = updated
      return true
    } catch {
      return false
    }
  }

  async function removeAttachment(id: number): Promise<boolean> {
    try {
      await ipcInvoke<{ success: boolean }>('document-attachments:delete', id)
      attachments.value = attachments.value.filter(a => a.id !== id)
      return true
    } catch {
      return false
    }
  }

  async function getAttachmentFile(id: number): Promise<string | null> {
    try {
      const data = await ipcInvoke<DocumentAttachmentWithData>('document-attachments:get', id)
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
    updateDescription,
    removeAttachment,
    getAttachmentFile,
    reset,
  }
}
