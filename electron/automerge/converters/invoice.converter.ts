import { EntityConverter } from './entity-converter'
import type { AutomergeDocument } from '../utils/entity-types'
import { InvoiceEntity } from '../../entities/invoice.entity'

export class InvoiceConverter {
  static toDocument(invoice: InvoiceEntity): AutomergeDocument<InvoiceEntity> {
    return EntityConverter.toDocument(invoice)
  }
  static toEntity(doc: AutomergeDocument<InvoiceEntity>): InvoiceEntity {
    return EntityConverter.toEntity(doc, InvoiceEntity)
  }
}
