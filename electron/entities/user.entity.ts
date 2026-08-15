import type { UserDto } from '../dto/auth.dto'
import { EntityRegistry } from '../automerge/entity-registry'
import { UserConverter } from '../automerge/converters/user.converter'
import type { AutomergeDocument } from '../automerge/utils/entity-types'
import { SchemaField, buildDocumentSchema } from '../automerge/utils/schema-field'

export class UserEntity {
  @SchemaField() id?: number
  @SchemaField() nom?: string
  @SchemaField() prenom?: string
  @SchemaField() email?: string
  @SchemaField() password_hash?: string
  @SchemaField() role?: 'MEDECIN' | 'SECRETAIRE' | 'PHARMACIEN' | 'COMPTABLE' | 'ADMIN' | 'INFIRMIER'
  @SchemaField() service?: string
  @SchemaField() photo?: string
  @SchemaField() telephone?: string
  @SchemaField() telephone_country_code?: string
  @SchemaField() fonction?: string
  @SchemaField() fonction_id?: number
  @SchemaField() date_debut_contrat?: string
  @SchemaField() date_fin_contrat?: string
  @SchemaField() type_contrat?: string
  @SchemaField() statut_resiliation?: string
  @SchemaField() motif_resiliation?: string
  @SchemaField() date_resiliation?: string
  @SchemaField() resilie_par?: number
  @SchemaField() is_active?: number
  @SchemaField() is_validated?: number
  @SchemaField() automerge_id?: string
  @SchemaField() created_at?: string
  @SchemaField() updated_at?: string

  static toDto(entity: UserEntity): UserDto {
    return {
      id: entity.id,
      nom: entity.nom,
      prenom: entity.prenom,
      email: entity.email,
      role: entity.role,
      service: entity.service,
      photo: entity.photo,
      telephone: entity.telephone,
      telephone_country_code: entity.telephone_country_code,
      fonction: entity.fonction,
      fonction_id: entity.fonction_id,
      date_debut_contrat: entity.date_debut_contrat,
      date_fin_contrat: entity.date_fin_contrat,
      type_contrat: entity.type_contrat,
      statut_resiliation: entity.statut_resiliation,
      motif_resiliation: entity.motif_resiliation,
      date_resiliation: entity.date_resiliation,
      resilie_par: entity.resilie_par,
      is_active: entity.is_active === 1,
      is_validated: entity.is_validated === 1,
    }
  }

  static toDtos(entities: UserEntity[]): UserDto[] {
    return entities.map(UserEntity.toDto)
  }

  static fromDto(dto: UserDto): UserEntity {
    const e = new UserEntity()
    e.id = dto.id
    e.nom = dto.nom
    e.prenom = dto.prenom
    e.email = dto.email
    e.role = dto.role
    e.service = dto.service
    e.photo = dto.photo
    e.telephone = dto.telephone
    e.telephone_country_code = dto.telephone_country_code
    e.fonction = dto.fonction
    e.fonction_id = dto.fonction_id
    e.date_debut_contrat = dto.date_debut_contrat
    e.date_fin_contrat = dto.date_fin_contrat
    e.type_contrat = dto.type_contrat
    e.statut_resiliation = dto.statut_resiliation
    e.motif_resiliation = dto.motif_resiliation
    e.date_resiliation = dto.date_resiliation
    e.resilie_par = dto.resilie_par
    if (dto.is_active !== undefined) e.is_active = dto.is_active ? 1 : 0
    if (dto.is_validated !== undefined) e.is_validated = dto.is_validated ? 1 : 0
    return e
  }

  static documentType(): string {
    return 'User'
  }

  static documentSchema(): AutomergeDocument<UserEntity> {
    return buildDocumentSchema(UserEntity) as AutomergeDocument<UserEntity>
  }

  static register(): void {
    EntityRegistry.getInstance().register({
      type: this.documentType(),
      tableName: 'user',
      documentSchema: this.documentSchema(),
      converter: { toDocument: UserConverter.toDocument, toEntity: UserConverter.toEntity },
    })
  }
}
