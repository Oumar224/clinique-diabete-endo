import type { InvoicePaymentDto } from '../dto/invoice.dto'

export class InvoicePaymentEntity {
  id?: number
  invoice_id?: number
  montant?: number
  mode_paiement?: string
  date_paiement?: string
  reference?: string
  created_by?: number
  created_at?: string

  static toDto(entity: InvoicePaymentEntity): InvoicePaymentDto {
    return {
      id: entity.id,
      invoice_id: entity.invoice_id,
      montant: entity.montant!,
      mode_paiement: entity.mode_paiement as InvoicePaymentDto['mode_paiement'],
      date_paiement: entity.date_paiement!,
      reference: entity.reference,
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
    e.created_by = dto.created_by
    e.created_at = dto.created_at
    return e
  }

  static documentType(): string { return 'InvoicePayment' }
  static documentSchema(): any { return {} }
  static register(): void { /* No Automerge sync needed */ }
}
