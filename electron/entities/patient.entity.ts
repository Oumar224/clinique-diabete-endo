import type { PatientDto } from '../dto/patient.dto'
import { EntityRegistry } from '../automerge/entity-registry'
import { PatientConverter } from '../automerge/converters/patient.converter'
import type { AutomergeDocument } from '../automerge/utils/entity-types'
import { SchemaField, buildDocumentSchema } from '../automerge/utils/schema-field'

export class PatientEntity {
  @SchemaField() id?: number
  @SchemaField() civilite?: '' | 'M' | 'Mme' | 'Mlle'
  @SchemaField() nom?: string
  @SchemaField() prenom?: string
  @SchemaField() date_naissance?: string
  @SchemaField() nir?: string
  @SchemaField() telephone?: string
  @SchemaField() email?: string
  @SchemaField() medecin_traitant?: string
  @SchemaField() allergies?: string
  @SchemaField() automerge_id?: string
  @SchemaField() photo?: string
  @SchemaField() nip?: string
  @SchemaField() lieu_naissance?: string
  @SchemaField() residence_code?: string
  @SchemaField() adresse?: string
  @SchemaField() complement_adresse?: string
  @SchemaField() region?: string
  @SchemaField() profession?: string
  @SchemaField() site_id?: number
  @SchemaField() assurance_mutuelle?: string
  @SchemaField() consentement_etude?: string
  @SchemaField() created_at?: string
  @SchemaField() updated_at?: string

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
      medecin_traitant: entity.medecin_traitant,
      allergies: entity.allergies ? (() => { try { return JSON.parse(entity.allergies) } catch { return [] } })() : [],
      automerge_id: entity.automerge_id,
      photo: entity.photo,
      nip: entity.nip,
      lieu_naissance: entity.lieu_naissance,
      residence_code: entity.residence_code,
      adresse: entity.adresse,
      complement_adresse: entity.complement_adresse,
      region: entity.region,
      profession: entity.profession,
      site_id: entity.site_id,
      assuranceMutuelle: entity.assurance_mutuelle,
      consentementEtude: entity.consentement_etude,
    }
  }

  static toDtos(entities: PatientEntity[]): PatientDto[] {
    return entities.map(PatientEntity.toDto)
  }

  static fromDto(dto: PatientDto): PatientEntity {
    const e = new PatientEntity()
    e.id = dto.id
    e.civilite = dto.civilite ?? ''
    e.nom = dto.nom
    e.prenom = dto.prenom
    e.date_naissance = dto.date_naissance
    e.nir = dto.nir
    e.telephone = dto.telephone
    e.email = dto.email
    e.medecin_traitant = dto.medecin_traitant
    e.allergies = dto.allergies ? JSON.stringify(dto.allergies) : '[]'
    e.photo = dto.photo
    e.nip = dto.nip
    e.lieu_naissance = dto.lieu_naissance
    e.residence_code = dto.residence_code
    e.adresse = dto.adresse
    e.complement_adresse = dto.complement_adresse
    e.region = dto.region
    e.profession = dto.profession
    e.site_id = dto.site_id
    e.assurance_mutuelle = dto.assuranceMutuelle
    e.consentement_etude = dto.consentementEtude
    return e
  }

  static documentType(): string {
    return 'Patient'
  }

  static documentSchema(): AutomergeDocument<PatientEntity> {
    return buildDocumentSchema(PatientEntity) as AutomergeDocument<PatientEntity>
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
