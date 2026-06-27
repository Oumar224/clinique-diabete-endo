import type { TrustedPersonDto } from '../dto/trusted-person.dto'

export interface TrustedPersonRow {
  id?: number
  patient_id: number
  has_trusted: number
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
}

export class TrustedPersonEntity {
  id?: number
  patient_id!: number
  has_trusted!: number
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

  static toDto(row: TrustedPersonRow): TrustedPersonDto {
    return {
      id: row.id,
      patient_id: row.patient_id,
      has_trusted: row.has_trusted === 1,
      nom: row.nom,
      prenom: row.prenom,
      profession: row.profession,
      residence: row.residence,
      residence_code: row.residence_code,
      telephone: row.telephone,
      email: row.email,
      complement_adresse: row.complement_adresse,
      lien_parente: row.lien_parente,
      attachments: row.attachments,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }
  }

  static toDtos(rows: TrustedPersonRow[]): TrustedPersonDto[] {
    return rows.map(TrustedPersonEntity.toDto)
  }
}
