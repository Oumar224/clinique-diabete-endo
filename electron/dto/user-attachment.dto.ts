export interface UserAttachmentDto {
  id: number
  userId: number
  displayName: string
  fileName: string
  mimeType: string | null
  fileSize: number | null
  fileData?: string  // base64 — seulement pour getById
  createdAt: string
}

export interface CreateAttachmentDto {
  userId: number
  displayName: string
  fileName: string
  mimeType: string | null
  fileSize: number | null
  fileData: string  // base64 data URL (data:image/png;base64,...)
}
