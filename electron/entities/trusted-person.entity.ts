import type { TrustedPersonDto } from '../dto/trusted-person.dto'

export class TrustedPersonEntity {
  id?: number
  patient_id?: number
  has_trusted?: number
  nom?: string
  prenom?: string
  profession?: string
  residence?: string
  residence_code?: string
  telephone?: string
  email?: string
  complement_adresse?: string
  lien_parente?: string
  attachments?: string
  created_at?: string
  updated_at?: string

  static fromDto(dto: TrustedPersonDto): TrustedPersonEntity {
    const e = new TrustedPersonEntity()
    e.id = dto.id
    e.patient_id = dto.patient_id
    e.has_trusted = dto.has_trusted ? 1 : 0
    e.nom = dto.nom
    e.prenom = dto.prenom
    e.profession = dto.profession
    e.residence = dto.residence
    e.residence_code = dto.residence_code
    e.telephone = dto.telephone
    e.email = dto.email
    e.complement_adresse = dto.complement_adresse
    e.lien_parente = dto.lien_parente
    e.attachments = dto.attachments
    return e
  }

  static toDto(entity: TrustedPersonEntity): TrustedPersonDto {
    return {
      id: entity.id,
      patient_id: entity.patient_id!,
      has_trusted: entity.has_trusted === 1,
      nom: entity.nom,
      prenom: entity.prenom,
      profession: entity.profession,
      residence: entity.residence,
      residence_code: entity.residence_code,
      telephone: entity.telephone,
      email: entity.email,
      complement_adresse: entity.complement_adresse,
      lien_parente: entity.lien_parente,
      attachments: entity.attachments,
      created_at: entity.created_at,
      updated_at: entity.updated_at,
    }
  }

  static toDtos(entities: TrustedPersonEntity[]): TrustedPersonDto[] {
    return entities.map(TrustedPersonEntity.toDto)
  }

  static documentType(): string { return 'TrustedPerson' }
  static documentSchema(): any { return {} }
  static register(): void { /* No Automerge sync needed */ }
}
