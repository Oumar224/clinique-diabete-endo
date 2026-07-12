import type { InvoiceDto, InvoiceItemDto, InvoicePaymentDto } from '../dto/invoice.dto'
import { EntityRegistry } from '../automerge/entity-registry'
import type { AutomergeDocument } from '../automerge/utils/entity-types'
import { InvoiceConverter } from '../automerge/converters/invoice.converter'

  export class InvoiceEntity {
  id?: number
  numero?: string
  patient_id?: number
  date?: string
  montant_total?: number
  montant_restant?: number
  status?: 'payé' | 'en_attente' | 'annulé' | 'partiel'
  notes?: string
  created_by?: number
  created_at?: string
  updated_at?: string

  static toDto(
    entity: InvoiceEntity,
    items?: InvoiceItemDto[],
    payments?: InvoicePaymentDto[],
    patientNom?: string,
    patientPrenom?: string,
  ): InvoiceDto {
    return {
      id: entity.id,
      numero: entity.numero!,
      patient_id: entity.patient_id!,
      patient_nom: patientNom,
      patient_prenom: patientPrenom,
      date: entity.date!,
      montant_total: entity.montant_total ?? 0,
      montant_restant: entity.montant_restant ?? 0,
      status: entity.status!,
      notes: entity.notes,
      created_by: entity.created_by,
      created_at: entity.created_at,
      updated_at: entity.updated_at,
      items,
      payments,
    }
  }

  static toDtos(entities: InvoiceEntity[]): InvoiceDto[] {
    return entities.map((e) => InvoiceEntity.toDto(e))
  }

  static fromDto(dto: InvoiceDto | InvoiceDto): InvoiceEntity {
    const e = new InvoiceEntity()
    e.id = dto.id
    e.numero = dto.numero
    e.patient_id = dto.patient_id
    e.date = dto.date
    e.montant_total = dto.montant_total
    e.montant_restant = dto.montant_restant
    e.status = dto.status
    e.notes = dto.notes
    e.created_by = dto.created_by
    return e
  }

  static documentType(): string {
    return 'Invoice'
  }

  static documentSchema(): AutomergeDocument<InvoiceEntity> {
    return {} as AutomergeDocument<InvoiceEntity>
  }

  static register(): void {
    EntityRegistry.getInstance().register({
      type: this.documentType(),
      tableName: 'invoice',
      documentSchema: this.documentSchema(),
      converter: { toDocument: InvoiceConverter.toDocument, toEntity: InvoiceConverter.toEntity },
    })
  }
}
