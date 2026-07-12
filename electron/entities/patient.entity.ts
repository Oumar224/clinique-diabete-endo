import type { PatientDto } from '../dto/patient.dto'
import { EntityRegistry } from '../automerge/entity-registry'
import { PatientConverter } from '../automerge/converters/patient.converter'
import type { AutomergeDocument } from '../automerge/utils/entity-types'

export class PatientEntity {
  id?: number
  civilite?: '' | 'M' | 'Mme' | 'Mlle'
  nom?: string
  prenom?: string
  date_naissance?: string
  nir?: string
  telephone?: string
  email?: string
  medecin_traitant?: string
  allergies?: string
  automerge_id?: string
  photo?: string
  nip?: string
  lieu_naissance?: string
  residence_code?: string
  adresse?: string
  complement_adresse?: string
  region?: string
  profession?: string
  site_id?: number
  assurance_mutuelle?: string
  consentement_etude?: string
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
