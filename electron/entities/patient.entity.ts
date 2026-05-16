import type { PatientDto } from '../dto/patient.dto'
import type { Kysely } from 'kysely'
import { CompiledQuery } from 'kysely'
import { EntityRegistry } from '../automerge/entity-registry'
import { PatientConverter } from '../automerge/converters/patient.converter'
import type { AutomergeDocument } from '../automerge/utils/entity-types'

export class PatientEntity {
  id?: number
  civilite?: 'M' | 'Mme' | 'Mlle'
  nom?: string
  prenom?: string
  date_naissance?: string
  nir?: string
  telephone?: string
  email?: string
  adresse?: string
  mutuelle?: string
  medecin_traitant?: string
  allergies?: string
  automerge_id?: string
  created_at?: string
  updated_at?: string

  static toDto(entity: PatientEntity): PatientDto {
    return {
      id: entity.id,
      civilite: entity.civilite,
      nom: entity.nom,
      prenom: entity.prenom,
      date_naissance: entity.date_naissance,
      nir: entity.nir,
      telephone: entity.telephone,
      email: entity.email,
      adresse: entity.adresse,
      mutuelle: entity.mutuelle,
      medecin_traitant: entity.medecin_traitant,
      allergies: entity.allergies ? JSON.parse(entity.allergies) : [],
    }
  }

  static toDtos(entities: PatientEntity[]): PatientDto[] {
    return entities.map(PatientEntity.toDto)
  }

  static fromDto(dto: PatientDto): PatientEntity {
    const e = new PatientEntity()
    e.id = dto.id
    e.civilite = dto.civilite
    e.nom = dto.nom
    e.prenom = dto.prenom
    e.date_naissance = dto.date_naissance
    e.nir = dto.nir
    e.telephone = dto.telephone
    e.email = dto.email
    e.adresse = dto.adresse
    e.mutuelle = dto.mutuelle
    e.medecin_traitant = dto.medecin_traitant
    e.allergies = dto.allergies ? JSON.stringify(dto.allergies) : '[]'
    return e
  }

  static async createSchema(db: Kysely<unknown>): Promise<void> {
    await db.executeQuery(CompiledQuery.raw(`
      CREATE TABLE IF NOT EXISTS patient (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        civilite TEXT NOT NULL CHECK(civilite IN ('M','Mme','Mlle')),
        nom TEXT NOT NULL,
        prenom TEXT NOT NULL,
        date_naissance TEXT NOT NULL,
        nir TEXT UNIQUE NOT NULL,
        telephone TEXT NOT NULL,
        email TEXT,
        adresse TEXT,
        mutuelle TEXT,
        medecin_traitant TEXT,
        allergies TEXT DEFAULT '[]',
        automerge_id TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `))
    await db.executeQuery(CompiledQuery.raw('CREATE INDEX IF NOT EXISTS idx_patient_nom ON patient(nom)'))
    await db.executeQuery(CompiledQuery.raw('CREATE INDEX IF NOT EXISTS idx_patient_nir ON patient(nir)'))
  }

  static async dropSchema(db: Kysely<unknown>): Promise<void> {
    await db.executeQuery(CompiledQuery.raw('DROP TABLE IF EXISTS patient'))
  }

  static async recreateSchema(db: Kysely<unknown>): Promise<void> {
    await this.dropSchema(db)
    await this.createSchema(db)
  }

  static documentType(): string {
    return 'Patient'
  }

  static documentSchema(): AutomergeDocument<PatientEntity> {
    return {} as AutomergeDocument<PatientEntity>
  }

  static register(): void {
    EntityRegistry.getInstance().register({
      type: this.documentType(),
      tableName: 'patient',
      documentSchema: this.documentSchema(),
      converter: { toDocument: PatientConverter.toDocument, toEntity: PatientConverter.toEntity },
    })
  }
}
