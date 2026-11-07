import type { StockLotDto } from '../dto/stock-lot.dto'
import { SchemaField } from '../automerge/utils/schema-field'

export class StockLotEntity {
  @SchemaField() id?: number
  @SchemaField() medicament_id?: number
  @SchemaField() numero_lot?: string
  @SchemaField() quantite?: number
  @SchemaField() quantite_initiale?: number
  @SchemaField() date_peremption?: string
  @SchemaField() date_entree?: string
  @SchemaField() created_at?: string
  @SchemaField() fournisseur_id?: number
  @SchemaField() prix_achat?: number
  @SchemaField() ref_bl?: string
  @SchemaField() ref_facture?: string
  @SchemaField() commande_reception_id?: number | null
  /** Nombre de pièces jointes (calculé par StockService.lots). */
  attachments_count?: number

  static toDto(entity: StockLotEntity): StockLotDto {
    const extra = entity as unknown as Record<string, unknown>
    const fournisseurNom =
      (extra['fournisseur_nom'] as string | undefined) ??
      (extra['fournisseurNom'] as string | undefined)
    return {
      id: entity.id,
      medicamentId: entity.medicament_id,
      numeroLot: entity.numero_lot,
      quantite: entity.quantite,
      quantiteInitiale: entity.quantite_initiale,
      datePeremption: entity.date_peremption,
      dateEntree: entity.date_entree,
      createdAt: entity.created_at,
      fournisseurId: entity.fournisseur_id,
      fournisseurNom,
      prixAchat: entity.prix_achat,
      refBl: entity.ref_bl,
      refFacture: entity.ref_facture,
      commandeReceptionId: entity.commande_reception_id ?? null,
      attachmentsCount: entity.attachments_count ?? 0,
    }
  }

  static toDtos(entities: StockLotEntity[]): StockLotDto[] {
    return entities.map(StockLotEntity.toDto)
  }

  static fromDto(dto: StockLotDto): StockLotEntity {
    const e = new StockLotEntity()
    e.id = dto.id
    e.medicament_id = dto.medicamentId
    e.numero_lot = dto.numeroLot
    e.quantite = dto.quantite
    e.quantite_initiale = dto.quantiteInitiale
    e.date_peremption = dto.datePeremption
    e.date_entree = dto.dateEntree
    e.created_at = dto.createdAt
    e.fournisseur_id = dto.fournisseurId ?? undefined
    e.prix_achat = dto.prixAchat ?? undefined
    e.ref_bl = dto.refBl
    e.ref_facture = dto.refFacture
    e.commande_reception_id = dto.commandeReceptionId ?? null
    return e
  }

  static documentType(): string { return 'StockLot' }
}
