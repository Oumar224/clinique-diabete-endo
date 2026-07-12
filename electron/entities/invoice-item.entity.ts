import type { InvoiceItemDto } from '../dto/invoice.dto'

export class InvoiceItemEntity {
  id?: number
  invoice_id?: number
  libelle?: string
  quantite?: number
  prix_unitaire?: number
  montant?: number
  type?: string
  created_at?: string

  static toDto(entity: InvoiceItemEntity): InvoiceItemDto {
    return {
      id: entity.id,
      invoice_id: entity.invoice_id,
      libelle: entity.libelle!,
      quantite: entity.quantite!,
      prix_unitaire: entity.prix_unitaire!,
      montant: entity.montant!,
      type: entity.type as InvoiceItemDto['type'],
    }
  }

  static toDtos(entities: InvoiceItemEntity[]): InvoiceItemDto[] {
    return entities.map(InvoiceItemEntity.toDto)
  }

  static fromDto(dto: InvoiceItemDto): InvoiceItemEntity {
    const e = new InvoiceItemEntity()
    e.id = dto.id
    e.invoice_id = dto.invoice_id
    e.libelle = dto.libelle
    e.quantite = dto.quantite
    e.prix_unitaire = dto.prix_unitaire
    e.montant = dto.montant
    e.type = dto.type
    return e
  }

  static documentType(): string { return 'InvoiceItem' }
  static documentSchema(): any { return {} }
  static register(): void { /* No Automerge sync needed */ }
}
