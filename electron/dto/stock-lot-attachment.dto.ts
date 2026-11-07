export interface StockLotAttachmentDto {
  id?: number
  stockLotId?: number
  fileName?: string
  fileType?: string
  fileSize?: number
  uploadedBy?: number | null
  createdAt?: string
}

export interface StockLotAttachmentWithDataDto extends StockLotAttachmentDto {
  /** Data URI base64 complet (`data:<mime>;base64,...`). */
  fileData?: string
}

export interface StockLotAttachmentCreateDto {
  stockLotId: number
  fileName: string
  fileType: string
  fileSize?: number
  fileData: string
  uploadedBy?: number
}
