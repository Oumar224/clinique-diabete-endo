export interface ExamRequestAttachmentDto {
  id?: number
  exam_request_id?: number
  display_name?: string
  file_name?: string
  mime_type?: string
  file_size?: number
  description?: string
  created_at?: string
}

export interface ExamRequestAttachmentWithDataDto extends ExamRequestAttachmentDto {
  file_data?: string
}

export interface CreateExamRequestAttachmentDto {
  exam_request_id?: number
  display_name?: string
  file_name?: string
  mime_type?: string
  file_size?: number
  file_data?: string
  description?: string
}

export interface UpdateExamRequestAttachmentDto {
  id?: number
  description: string
}
