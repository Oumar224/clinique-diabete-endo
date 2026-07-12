export interface AttachmentTypeDto {
  id: number
  name: string
  created_at: string
}

export interface CreateAttachmentTypeDto {
  name: string
}

export interface UpdateAttachmentTypeDto {
  name?: string
}
