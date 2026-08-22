export interface DocumentAttachmentDto {
  id?: number
  document_id?: string
  display_name?: string
  file_name?: string
  mime_type?: string
  file_size?: number
  description?: string
  created_at?: string
}

export interface DocumentAttachmentWithDataDto extends DocumentAttachmentDto {
  file_data?: string
}

export interface CreateDocumentAttachmentDto {
  document_id?: string
  display_name?: string
  file_name?: string
  mime_type?: string
  file_size?: number
  file_data?: string
  description?: string
}

export interface UpdateDocumentAttachmentDto {
  id?: number
  description: string
}
