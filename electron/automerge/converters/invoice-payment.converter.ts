import { EntityConverter } from './entity-converter'
import type { AutomergeDocument } from '../utils/entity-types'
import { InvoicePaymentEntity } from '../../entities/invoice-payment.entity'

export class InvoicePaymentConverter {
  static toDocument(entity: InvoicePaymentEntity): AutomergeDocument<InvoicePaymentEntity> {
    return EntityConverter.toDocument(entity)
  }
  static toEntity(doc: AutomergeDocument<InvoicePaymentEntity>): InvoicePaymentEntity {
    return EntityConverter.toEntity(doc, InvoicePaymentEntity)
  }
}
