import type {
  StockLotAttachmentDto,
  StockLotAttachmentWithDataDto,
} from '../dto/stock-lot-attachment.dto'

export class StockLotAttachmentEntity {
  id?: number
  stock_lot_id?: number
  file_name?: string
  file_type?: string
  file_size?: number
  file_data?: string
  uploaded_by?: number | null
  created_at?: string

  static toDto(entity: StockLotAttachmentEntity): StockLotAttachmentDto {
    return {
      id: entity.id,
      stockLotId: entity.stock_lot_id,
      fileName: entity.file_name,
      fileType: entity.file_type,
      fileSize: entity.file_size,
      uploadedBy: entity.uploaded_by ?? null,
      createdAt: entity.created_at,
    }
  }

  static toDtos(entities: StockLotAttachmentEntity[]): StockLotAttachmentDto[] {
    return entities.map(StockLotAttachmentEntity.toDto)
  }

  static toDtoWithData(entity: StockLotAttachmentEntity): StockLotAttachmentWithDataDto {
    return {
      ...StockLotAttachmentEntity.toDto(entity),
      fileData: entity.file_data,
    }
  }
}
