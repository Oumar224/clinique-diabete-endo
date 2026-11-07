import type { InvoicePaymentDto } from '../dto/invoice.dto'
import { EntityRegistry } from '../automerge/entity-registry'
import { InvoicePaymentConverter } from '../automerge/converters/invoice-payment.converter'
import type { AutomergeDocument } from '../automerge/utils/entity-types'
import { SchemaField, buildDocumentSchema } from '../automerge/utils/schema-field'

export class InvoicePaymentEntity {
  @SchemaField() id?: number
  @SchemaField() invoice_id?: number
  @SchemaField() montant?: number
  @SchemaField() mode_paiement?: string
  @SchemaField() date_paiement?: string
  @SchemaField() reference?: string
  @SchemaField() numero_recu?: string
  @SchemaField() created_by?: number
  @SchemaField() created_at?: string

  static toDto(entity: InvoicePaymentEntity): InvoicePaymentDto {
    return {
      id: entity.id,
      invoice_id: entity.invoice_id,
      montant: entity.montant!,
      mode_paiement: entity.mode_paiement as InvoicePaymentDto['mode_paiement'],
      date_paiement: entity.date_paiement!,
      reference: entity.reference,
      numero_recu: entity.numero_recu,
      created_by: entity.created_by,
      created_at: entity.created_at,
    }
  }

  static toDtos(entities: InvoicePaymentEntity[]): InvoicePaymentDto[] {
    return entities.map(InvoicePaymentEntity.toDto)
  }

  static fromDto(dto: InvoicePaymentDto): InvoicePaymentEntity {
    const e = new InvoicePaymentEntity()
    e.id = dto.id
    e.invoice_id = dto.invoice_id
    e.montant = dto.montant
    e.mode_paiement = dto.mode_paiement
    e.date_paiement = dto.date_paiement
    e.reference = dto.reference
    e.numero_recu = dto.numero_recu
    e.created_by = dto.created_by
    e.created_at = dto.created_at
    return e
  }

  static documentType(): string { return 'InvoicePayment' }
  static documentSchema(): AutomergeDocument<InvoicePaymentEntity> {
    return buildDocumentSchema(InvoicePaymentEntity) as AutomergeDocument<InvoicePaymentEntity>
  }
  static register(): void {
    EntityRegistry.getInstance().register({
      type: this.documentType(),
      tableName: 'invoice_payment',
      documentSchema: this.documentSchema(),
      converter: { toDocument: InvoicePaymentConverter.toDocument, toEntity: InvoicePaymentConverter.toEntity },
    })
  }
}
