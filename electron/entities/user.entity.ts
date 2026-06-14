import type { UserDto } from '../dto/auth.dto'
import type { Kysely } from 'kysely'
import { CompiledQuery } from 'kysely'
import { EntityRegistry } from '../automerge/entity-registry'
import { UserConverter } from '../automerge/converters/user.converter'
import type { AutomergeDocument } from '../automerge/utils/entity-types'

export class UserEntity {
  id?: number
  nom?: string
  prenom?: string
  email?: string
  password_hash?: string
  role?: 'MEDECIN' | 'SECRETAIRE' | 'PHARMACIEN' | 'COMPTABLE' | 'ADMIN'
  service?: string
  photo?: string
  telephone?: string
  telephone_country_code?: string
  fonction?: string
  fonction_id?: number
  date_debut_contrat?: string
  date_fin_contrat?: string
  type_contrat?: string
  statut_resiliation?: string
  motif_resiliation?: string
  date_resiliation?: string
  resilie_par?: number
  is_active?: number
  is_validated?: number
  automerge_id?: string
  created_at?: string
  updated_at?: string

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

  static async createSchema(db: Kysely<unknown>): Promise<void> {
    await db.executeQuery(CompiledQuery.raw(`
      CREATE TABLE IF NOT EXISTS user (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nom TEXT NOT NULL,
        prenom TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('MEDECIN','SECRETAIRE','PHARMACIEN','COMPTABLE','ADMIN')),
        service TEXT,
        is_active INTEGER DEFAULT 1,
        is_validated INTEGER DEFAULT 0,
        automerge_id TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `))
    await db.executeQuery(CompiledQuery.raw('CREATE INDEX IF NOT EXISTS idx_user_email ON user(email)'))
    await db.executeQuery(CompiledQuery.raw('CREATE INDEX IF NOT EXISTS idx_user_role ON user(role)'))
  }

  static async dropSchema(db: Kysely<unknown>): Promise<void> {
    await db.executeQuery(CompiledQuery.raw('DROP TABLE IF EXISTS user'))
  }

  static async recreateSchema(db: Kysely<unknown>): Promise<void> {
    await this.dropSchema(db)
    await this.createSchema(db)
  }

  static documentType(): string {
    return 'User'
  }

  static documentSchema(): AutomergeDocument<UserEntity> {
    return {} as AutomergeDocument<UserEntity>
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
