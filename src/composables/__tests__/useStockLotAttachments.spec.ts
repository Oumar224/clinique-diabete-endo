import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockIpcInvoke } = vi.hoisted(() => ({ mockIpcInvoke: vi.fn() }))

vi.mock('@/utils/ipc', () => ({
  ipcInvoke: mockIpcInvoke,
}))

import {
  ALLOWED_ATTACHMENT_MIME_TYPES,
  MAX_ATTACHMENT_SIZE,
  useStockLotAttachments,
  validateAttachmentFile,
} from '../useStockLotAttachments'

const ATTACHMENT = {
  id: 9,
  stockLotId: 4,
  fileName: 'bon-livraison.pdf',
  fileType: 'application/pdf',
  fileSize: 1024,
}

/** Fabrique un fichier minimal (le validateur ne lit que `type` et `size`). */
function fakeFile(type: string, size: number): File {
  return { type, size } as File
}

describe('useStockLotAttachments — validation des fichiers', () => {
  it('accepte tous les MIME autorisés par le backend', () => {
    for (const mime of ALLOWED_ATTACHMENT_MIME_TYPES) {
      expect(validateAttachmentFile(fakeFile(mime, 1024))).toBeNull()
    }
    expect(ALLOWED_ATTACHMENT_MIME_TYPES).toEqual([
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
    ])
  })

  it('rejette un MIME non autorisé', () => {
    expect(validateAttachmentFile(fakeFile('application/x-msdownload', 1024)))
      .toBe('Format non pris en charge (PDF, JPEG, PNG ou WebP uniquement).')
    expect(validateAttachmentFile(fakeFile('text/plain', 1024)))
      .toBe('Format non pris en charge (PDF, JPEG, PNG ou WebP uniquement).')
    expect(validateAttachmentFile(fakeFile('', 1024)))
      .toBe('Format non pris en charge (PDF, JPEG, PNG ou WebP uniquement).')
  })

  it('accepte exactement 10 Mo et rejette 10 Mo + 1 octet', () => {
    expect(MAX_ATTACHMENT_SIZE).toBe(10 * 1024 * 1024)
    expect(validateAttachmentFile(fakeFile('application/pdf', MAX_ATTACHMENT_SIZE))).toBeNull()
    expect(validateAttachmentFile(fakeFile('application/pdf', MAX_ATTACHMENT_SIZE + 1)))
      .toBe('Le fichier ne doit pas dépasser 10 Mo.')
  })
})

describe('useStockLotAttachments — canaux IPC', () => {
  beforeEach(() => {
    mockIpcInvoke.mockReset()
  })

  it('fetchAttachments appelle stock:lot-attachments:list avec { stockLotId }', async () => {
    mockIpcInvoke.mockResolvedValue([ATTACHMENT])
    const { fetchAttachments, attachments, error, loading } = useStockLotAttachments()

    const result = await fetchAttachments(4)

    expect(mockIpcInvoke).toHaveBeenCalledWith(
      'stock:lot-attachments:list',
      { stockLotId: 4 },
      { silent: true },
    )
    expect(result).toEqual([ATTACHMENT])
    expect(attachments.value).toEqual([ATTACHMENT])
    expect(error.value).toBeNull()
    expect(loading.value).toBe(false)
  })

  it('fetchAttachments renvoie [] et expose l’erreur en cas d’échec', async () => {
    mockIpcInvoke.mockRejectedValue(new Error('lot introuvable'))
    const { fetchAttachments, attachments, error } = useStockLotAttachments()

    const result = await fetchAttachments(404)

    expect(result).toEqual([])
    expect(attachments.value).toEqual([])
    expect(error.value).toBe('lot introuvable')
  })

  it('addAttachment appelle stock:lot-attachments:create avec le DTO', async () => {
    mockIpcInvoke.mockResolvedValue(ATTACHMENT)
    const { addAttachment, saving, error } = useStockLotAttachments()
    const dto = {
      stockLotId: 4,
      fileName: 'bon-livraison.pdf',
      fileType: 'application/pdf',
      fileSize: 1024,
      fileData: 'data:application/pdf;base64,AA==',
    }

    const result = await addAttachment(dto)

    expect(mockIpcInvoke).toHaveBeenCalledWith(
      'stock:lot-attachments:create',
      dto,
      { silent: true },
    )
    expect(result).toEqual(ATTACHMENT)
    expect(saving.value).toBe(false)
    expect(error.value).toBeNull()
  })

  it('addAttachment renvoie null, expose l’erreur et relâche saving', async () => {
    mockIpcInvoke.mockRejectedValue(new Error('Type de fichier non autorisé'))
    const { addAttachment, saving, error } = useStockLotAttachments()

    const result = await addAttachment({
      stockLotId: 4,
      fileName: 'x.exe',
      fileType: 'application/x-msdownload',
      fileData: 'data:application/x-msdownload;base64,AA==',
    })

    expect(result).toBeNull()
    expect(error.value).toBe('Type de fichier non autorisé')
    expect(saving.value).toBe(false)
  })

  it('downloadAttachment transmet l’id et le lot parent', async () => {
    mockIpcInvoke.mockResolvedValue({ ...ATTACHMENT, fileData: 'data:application/pdf;base64,AA==' })
    const { downloadAttachment, error } = useStockLotAttachments()

    const result = await downloadAttachment(9, 4)

    expect(mockIpcInvoke).toHaveBeenCalledWith(
      'stock:lot-attachments:download',
      { id: 9, stockLotId: 4 },
      { silent: true },
    )
    expect(result?.fileData).toBe('data:application/pdf;base64,AA==')
    expect(error.value).toBeNull()
  })

  it('downloadAttachment renvoie null et expose l’erreur', async () => {
    mockIpcInvoke.mockRejectedValue(new Error('pièce jointe introuvable'))
    const { downloadAttachment, error } = useStockLotAttachments()

    const result = await downloadAttachment(99, 4)

    expect(result).toBeNull()
    expect(error.value).toBe('pièce jointe introuvable')
  })

  it('removeAttachment transmet l’id et le lot parent', async () => {
    mockIpcInvoke.mockResolvedValue(undefined)
    const { removeAttachment, saving, error } = useStockLotAttachments()

    const result = await removeAttachment(9, 4)

    expect(mockIpcInvoke).toHaveBeenCalledWith(
      'stock:lot-attachments:delete',
      { id: 9, stockLotId: 4 },
      { silent: true },
    )
    expect(result).toBe(true)
    expect(saving.value).toBe(false)
    expect(error.value).toBeNull()
  })

  it('removeAttachment renvoie false et expose l’erreur', async () => {
    mockIpcInvoke.mockRejectedValue(new Error('suppression refusée'))
    const { removeAttachment, error } = useStockLotAttachments()

    const result = await removeAttachment(9, 4)

    expect(result).toBe(false)
    expect(error.value).toBe('suppression refusée')
  })
})
