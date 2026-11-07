import type { VentePharmaciePaiementDto } from '../dto/delivrance.dto'
import { SchemaField } from '../automerge/utils/schema-field'

export class VentePharmaciePaiementEntity {
  @SchemaField() id?: number
  @SchemaField() delivrance_id?: number
  @SchemaField() montant?: number
  @SchemaField() mode_paiement?: string
  @SchemaField() date_paiement?: string
  @SchemaField() reference?: string
  @SchemaField() numero_recu?: string
  @SchemaField() created_by?: number
  @SchemaField() created_at?: string

  static toDto(entity: VentePharmaciePaiementEntity): VentePharmaciePaiementDto {
    return {
      id: entity.id,
      delivranceId: entity.delivrance_id,
      montant: entity.montant,
      modePaiement: entity.mode_paiement as VentePharmaciePaiementDto['modePaiement'],
      datePaiement: entity.date_paiement,
      reference: entity.reference,
      numeroRecu: entity.numero_recu,
      createdBy: entity.created_by,
      createdAt: entity.created_at,
    }
  }

  static toDtos(entities: VentePharmaciePaiementEntity[]): VentePharmaciePaiementDto[] {
    return entities.map(VentePharmaciePaiementEntity.toDto)
  }

  static fromDto(dto: VentePharmaciePaiementDto): VentePharmaciePaiementEntity {
    const e = new VentePharmaciePaiementEntity()
    e.id = dto.id
    e.delivrance_id = dto.delivranceId
    e.montant = dto.montant
    e.mode_paiement = dto.modePaiement
    e.date_paiement = dto.datePaiement
    e.reference = dto.reference
    e.numero_recu = dto.numeroRecu
    e.created_by = dto.createdBy
    e.created_at = dto.createdAt
    return e
  }

  static documentType(): string { return 'VentePharmaciePaiement' }
}
