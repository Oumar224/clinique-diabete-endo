import type { InvoiceItemDto } from '../dto/invoice.dto'
import { EntityRegistry } from '../automerge/entity-registry'
import { InvoiceItemConverter } from '../automerge/converters/invoice-item.converter'
import type { AutomergeDocument } from '../automerge/utils/entity-types'
import { SchemaField, buildDocumentSchema } from '../automerge/utils/schema-field'

export class InvoiceItemEntity {
  @SchemaField() id?: number
  @SchemaField() invoice_id?: number
  @SchemaField() libelle?: string
  @SchemaField() quantite?: number
  @SchemaField() prix_unitaire?: number
  @SchemaField() montant?: number
  @SchemaField() type?: string
  @SchemaField() acte_id?: string
  @SchemaField() created_at?: string

  static toDto(entity: InvoiceItemEntity): InvoiceItemDto {
    return {
      id: entity.id,
      invoice_id: entity.invoice_id,
      libelle: entity.libelle!,
      quantite: entity.quantite!,
      prix_unitaire: entity.prix_unitaire!,
      montant: entity.montant!,
      type: entity.type as InvoiceItemDto['type'],
      acte_id: entity.acte_id,
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
    e.acte_id = dto.acte_id
    return e
  }

  static documentType(): string { return 'InvoiceItem' }
  static documentSchema(): AutomergeDocument<InvoiceItemEntity> {
    return buildDocumentSchema(InvoiceItemEntity) as AutomergeDocument<InvoiceItemEntity>
  }
  static register(): void {
    EntityRegistry.getInstance().register({
      type: this.documentType(),
      tableName: 'invoice_item',
      documentSchema: this.documentSchema(),
      converter: { toDocument: InvoiceItemConverter.toDocument, toEntity: InvoiceItemConverter.toEntity },
    })
  }
}
