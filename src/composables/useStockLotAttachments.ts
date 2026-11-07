import { ref } from 'vue'
import { ipcInvoke } from '@/utils/ipc'

/** Métadonnées d'une pièce jointe de lot de stock. */
export interface StockLotAttachmentDto {
  id?: number
  stockLotId?: number
  fileName?: string
  fileType?: string
  fileSize?: number
  uploadedBy?: number | null
  createdAt?: string
}

/** Pièce jointe de lot avec son contenu (data URI base64). */
export interface StockLotAttachmentWithDataDto extends StockLotAttachmentDto {
  fileData?: string
}

/** Charge utile d'ajout d'une pièce jointe à un lot. */
export interface StockLotAttachmentInputDto {
  stockLotId: number
  fileName: string
  fileType: string
  fileSize?: number
  fileData: string
}

/** Types MIME acceptés par le backend (`attachment-utils.ts`). */
export const ALLOWED_ATTACHMENT_MIME_TYPES: readonly string[] = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]

/** Taille maximale d'une pièce jointe (10 Mo, aligné sur le backend). */
export const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024

/**
 * Vérifie qu'un fichier respecte les contraintes backend.
 *
 * @param file - Fichier sélectionné par l'utilisateur.
 * @returns Un message d'erreur, ou `null` si le fichier est valide.
 */
export function validateAttachmentFile(file: File): string | null {
  if (!ALLOWED_ATTACHMENT_MIME_TYPES.includes(file.type)) {
    return 'Format non pris en charge (PDF, JPEG, PNG ou WebP uniquement).'
  }
  if (file.size > MAX_ATTACHMENT_SIZE) {
    return 'Le fichier ne doit pas dépasser 10 Mo.'
  }
  return null
}

/**
 * Lit un fichier en data URI base64.
 *
 * @param file - Fichier à lire.
 * @returns Le contenu `data:<mime>;base64,...`.
 */
export function readFileAsDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(new Error('Lecture du fichier impossible'))
    reader.readAsDataURL(file)
  })
}

/**
 * Accès aux pièces jointes (BL, facture…) des lots de stock.
 *
 * Canaux IPC consommés : `stock:lot-attachments:list|download|create|delete`.
 */
export function useStockLotAttachments() {
  const attachments = ref<StockLotAttachmentDto[]>([])
  const loading = ref(false)
  const saving = ref(false)
  const error = ref<string | null>(null)

  /**
   * Charge les pièces jointes d'un lot.
   *
   * @param stockLotId - Identifiant du lot.
   * @returns Les métadonnées, ou `[]` en cas d'échec.
   */
  async function fetchAttachments(stockLotId: number): Promise<StockLotAttachmentDto[]> {
    loading.value = true
    error.value = null
    try {
      attachments.value = (await ipcInvoke<StockLotAttachmentDto[]>(
        'stock:lot-attachments:list',
        { stockLotId },
        { silent: true },
      )) ?? []
      return attachments.value
    } catch (e) {
      error.value = (e as Error).message
      attachments.value = []
      return []
    } finally {
      loading.value = false
    }
  }

  /**
   * Récupère le contenu binaire d'une pièce jointe.
   *
   * @param id - Identifiant de la pièce jointe.
   * @param stockLotId - Lot parent, vérifié par le backend pour empêcher
   *   l'accès à une pièce jointe appartenant à un autre lot.
   * @returns La pièce jointe avec `fileData`, ou `null`.
   */
  async function downloadAttachment(
    id: number,
    stockLotId: number,
  ): Promise<StockLotAttachmentWithDataDto | null> {
    error.value = null
    try {
      return (await ipcInvoke<StockLotAttachmentWithDataDto>(
        'stock:lot-attachments:download',
        { id, stockLotId },
        { silent: true },
      )) ?? null
    } catch (e) {
      error.value = (e as Error).message
      return null
    }
  }

  /**
   * Ajoute une pièce jointe à un lot.
   *
   * @param dto - Lot cible et contenu `data:` base64.
   * @returns La pièce jointe créée, ou `null` en cas d'échec.
   */
  async function addAttachment(dto: StockLotAttachmentInputDto): Promise<StockLotAttachmentDto | null> {
    saving.value = true
    error.value = null
    try {
      return await ipcInvoke<StockLotAttachmentDto>(
        'stock:lot-attachments:create',
        dto,
        { silent: true },
      )
    } catch (e) {
      error.value = (e as Error).message
      return null
    } finally {
      saving.value = false
    }
  }

  /**
   * Supprime une pièce jointe.
   *
   * @param id - Identifiant de la pièce jointe.
   * @param stockLotId - Lot parent, vérifié par le backend.
   * @returns `true` si la suppression a réussi.
   */
  async function removeAttachment(id: number, stockLotId: number): Promise<boolean> {
    saving.value = true
    error.value = null
    try {
      await ipcInvoke(
        'stock:lot-attachments:delete',
        { id, stockLotId },
        { silent: true },
      )
      return true
    } catch (e) {
      error.value = (e as Error).message
      return false
    } finally {
      saving.value = false
    }
  }

  return {
    attachments,
    loading,
    saving,
    error,
    fetchAttachments,
    downloadAttachment,
    addAttachment,
    removeAttachment,
  }
}
