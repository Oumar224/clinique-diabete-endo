import type { FournisseurDto } from '../dto/fournisseur.dto'
import { SchemaField } from '../automerge/utils/schema-field'

export class FournisseurEntity {
  @SchemaField() id?: number
  @SchemaField() nom?: string
  @SchemaField() contact?: string
  @SchemaField() telephone?: string
  @SchemaField() email?: string
  @SchemaField() adresse?: string
  @SchemaField() actif?: number
  @SchemaField() est_pharmacie_centrale?: number
  @SchemaField() created_at?: string
  @SchemaField() updated_at?: string

  static toDto(entity: FournisseurEntity): FournisseurDto {
    return {
      id: entity.id,
      nom: entity.nom,
      contact: entity.contact,
      telephone: entity.telephone,
      email: entity.email,
      adresse: entity.adresse,
      actif: entity.actif === 1,
      estPharmacieCentrale: entity.est_pharmacie_centrale === 1,
      createdAt: entity.created_at,
      updatedAt: entity.updated_at,
    }
  }

  static toDtos(entities: FournisseurEntity[]): FournisseurDto[] {
    return entities.map(FournisseurEntity.toDto)
  }

  static fromDto(dto: FournisseurDto): FournisseurEntity {
    const e = new FournisseurEntity()
    e.id = dto.id
    e.nom = dto.nom
    e.contact = dto.contact
    e.telephone = dto.telephone
    e.email = dto.email
    e.adresse = dto.adresse
    e.actif = dto.actif ? 1 : 0
    e.est_pharmacie_centrale = dto.estPharmacieCentrale ? 1 : 0
    e.created_at = dto.createdAt
    e.updated_at = dto.updatedAt
    return e
  }

  static documentType(): string { return 'Fournisseur' }
}
