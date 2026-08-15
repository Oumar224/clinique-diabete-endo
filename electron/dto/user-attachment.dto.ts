export interface UserAttachmentDto {
  id?: number
  user_id?: number
  display_name?: string
  file_name?: string
  mime_type?: string
  file_size?: number
  file_data?: string  // base64 — seulement pour getById
  attachment_type_id?: number
  attachment_type_name?: string
  created_at?: string
}

export interface CreateAttachmentDto {
  user_id?: number
  display_name?: string
  file_name?: string
  mime_type?: string
  file_size?: number
  file_data?: string  // base64 data URL (data:image/png;base64,...)
  attachment_type_id?: number
}
