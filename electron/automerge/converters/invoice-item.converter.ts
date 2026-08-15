import { EntityConverter } from './entity-converter'
import type { AutomergeDocument } from '../utils/entity-types'
import { InvoiceItemEntity } from '../../entities/invoice-item.entity'

export class InvoiceItemConverter {
  static toDocument(entity: InvoiceItemEntity): AutomergeDocument<InvoiceItemEntity> {
    return EntityConverter.toDocument(entity)
  }
  static toEntity(doc: AutomergeDocument<InvoiceItemEntity>): InvoiceItemEntity {
    return EntityConverter.toEntity(doc, InvoiceItemEntity)
  }
}
