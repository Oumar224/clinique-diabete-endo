export interface AttachmentTypeDto {
  id: number
  name: string
  createdAt: string
}

export interface CreateAttachmentTypeDto {
  name: string
}

export interface UpdateAttachmentTypeDto {
  name?: string
}
