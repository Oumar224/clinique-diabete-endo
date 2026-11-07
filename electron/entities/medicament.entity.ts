import type { MedicamentDto } from '../dto/medicament.dto'
import { SchemaField } from '../automerge/utils/schema-field'

export class MedicamentEntity {
  @SchemaField() id?: number
  @SchemaField() dci?: string
  @SchemaField() nom_commercial?: string
  @SchemaField() dosage?: string
  @SchemaField() forme?: string
  @SchemaField() unite_stock?: string
  @SchemaField() seuil_alerte?: number
  @SchemaField() actif?: number
  @SchemaField() created_at?: string
  @SchemaField() updated_at?: string
  @SchemaField() type_produit?: string
  @SchemaField() conditionnement?: string
  @SchemaField() contenance_qte?: number
  @SchemaField() unite_contenance?: string
  @SchemaField() prix_achat?: number
  @SchemaField() prix_vente?: number
  @SchemaField() fournisseur_principal_id?: number
  @SchemaField() autre_unite_precision?: string

  static toDto(entity: MedicamentEntity): MedicamentDto {
    return {
      id: entity.id,
      dci: entity.dci,
      nomCommercial: entity.nom_commercial,
      dosage: entity.dosage,
      forme: entity.forme,
      uniteStock: entity.unite_stock,
      seuilAlerte: entity.seuil_alerte,
      actif: entity.actif === 1,
      createdAt: entity.created_at,
      updatedAt: entity.updated_at,
      typeProduit: entity.type_produit as MedicamentDto['typeProduit'],
      conditionnement: entity.conditionnement,
      contenanceQte: entity.contenance_qte,
      uniteContenance: entity.unite_contenance,
      prixAchat: entity.prix_achat,
      prixVente: entity.prix_vente,
      fournisseurPrincipalId: entity.fournisseur_principal_id,
      autreUnitePrecision: entity.autre_unite_precision,
    }
  }

  static toDtos(entities: MedicamentEntity[]): MedicamentDto[] {
    return entities.map(MedicamentEntity.toDto)
  }

  static fromDto(dto: MedicamentDto): MedicamentEntity {
    const e = new MedicamentEntity()
    e.id = dto.id
    e.dci = dto.dci
    e.nom_commercial = dto.nomCommercial
    e.dosage = dto.dosage
    e.forme = dto.forme
    e.unite_stock = dto.uniteStock
    e.seuil_alerte = dto.seuilAlerte
    e.actif = dto.actif ? 1 : 0
    e.created_at = dto.createdAt
    e.updated_at = dto.updatedAt
    e.type_produit = dto.typeProduit
    e.conditionnement = dto.conditionnement
    e.contenance_qte = dto.contenanceQte ?? undefined
    e.unite_contenance = dto.uniteContenance
    e.prix_achat = dto.prixAchat ?? undefined
    e.prix_vente = dto.prixVente ?? undefined
    e.fournisseur_principal_id = dto.fournisseurPrincipalId ?? undefined
    e.autre_unite_precision = dto.autreUnitePrecision
    return e
  }

  static documentType(): string { return 'Medicament' }
}
