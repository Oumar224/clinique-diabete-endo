import type { DelivranceDto, DelivranceLigneDto } from '../dto/delivrance.dto'
import { SchemaField } from '../automerge/utils/schema-field'

export class DelivranceEntity {
  @SchemaField() id?: number
  @SchemaField() source?: string
  @SchemaField() source_document_id?: string
  @SchemaField() patient_id?: number
  @SchemaField() statut?: string
  @SchemaField() served_by?: number
  @SchemaField() served_at?: string
  @SchemaField() motif?: string
  @SchemaField() date_vente?: string
  @SchemaField() type_vente?: string
  @SchemaField() motif_gratuite?: string
  @SchemaField() montant_total?: number
  @SchemaField() created_at?: string

  static toDto(entity: DelivranceEntity): DelivranceDto {
    return {
      id: entity.id,
      source: entity.source ?? undefined,
      sourceDocumentId: entity.source_document_id ?? undefined,
      patientId: entity.patient_id ?? undefined,
      statut: entity.statut as DelivranceDto['statut'],
      servedBy: entity.served_by ?? undefined,
      servedAt: entity.served_at ?? undefined,
      motif: entity.motif ?? undefined,
      dateVente: entity.date_vente ?? undefined,
      typeVente: (entity.type_vente as DelivranceDto['typeVente']) ?? undefined,
      motifGratuite: entity.motif_gratuite ?? undefined,
      montantTotal: entity.montant_total,
      createdAt: entity.created_at,
    }
  }

  static toDtos(entities: DelivranceEntity[]): DelivranceDto[] {
    return entities.map(DelivranceEntity.toDto)
  }

  static fromDto(dto: DelivranceDto): DelivranceEntity {
    const e = new DelivranceEntity()
    e.id = dto.id
    e.source = dto.source
    e.source_document_id = dto.sourceDocumentId
    e.patient_id = dto.patientId
    e.statut = dto.statut
    e.served_by = dto.servedBy
    e.served_at = dto.servedAt
    e.motif = dto.motif
    e.date_vente = dto.dateVente
    e.type_vente = dto.typeVente
    e.motif_gratuite = dto.motifGratuite
    e.montant_total = dto.montantTotal
    e.created_at = dto.createdAt
    return e
  }

  static documentType(): string { return 'Delivrance' }
}

export class DelivranceLigneEntity {
  @SchemaField() id?: number
  @SchemaField() delivrance_id?: number
  @SchemaField() medicament_id?: number
  @SchemaField() libelle?: string
  @SchemaField() quantite_demandee?: number
  @SchemaField() quantite_servie?: number
  @SchemaField() lot_id?: number
  @SchemaField() prix_unitaire?: number
  @SchemaField() montant?: number
  @SchemaField() cout_achat_total?: number
  @SchemaField() created_at?: string

  static toDto(entity: DelivranceLigneEntity): DelivranceLigneDto {
    return {
      id: entity.id,
      delivranceId: entity.delivrance_id,
      medicamentId: entity.medicament_id,
      libelle: entity.libelle,
      quantiteDemandee: entity.quantite_demandee,
      quantiteServie: entity.quantite_servie,
      lotId: entity.lot_id,
      prixUnitaire: entity.prix_unitaire,
      montant: entity.montant,
      coutAchatTotal: entity.cout_achat_total,
      createdAt: entity.created_at,
    }
  }

  static toDtos(entities: DelivranceLigneEntity[]): DelivranceLigneDto[] {
    return entities.map(DelivranceLigneEntity.toDto)
  }

  static fromDto(dto: DelivranceLigneDto): DelivranceLigneEntity {
    const e = new DelivranceLigneEntity()
    e.id = dto.id
    e.delivrance_id = dto.delivranceId
    e.medicament_id = dto.medicamentId
    e.libelle = dto.libelle
    e.quantite_demandee = dto.quantiteDemandee
    e.quantite_servie = dto.quantiteServie
    e.lot_id = dto.lotId
    e.prix_unitaire = dto.prixUnitaire
    e.montant = dto.montant
    e.cout_achat_total = dto.coutAchatTotal
    e.created_at = dto.createdAt
    return e
  }

  static documentType(): string { return 'DelivranceLigne' }
}
