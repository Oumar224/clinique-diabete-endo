import type { VitalSignsDto } from '../dto/vital-signs.dto'

export class VitalSignEntity {
  id?: number
  patient_id?: number
  date?: string
  ta_systolique?: number | null
  ta_diastolique?: number | null
  frequence_cardiaque?: number | null
  temperature?: number | null
  glycemie?: number | null
  cetonemie?: number | null
  glucosurie?: string | null
  cetonurie?: string | null
  sa_o2?: number | null
  diurese?: number | null
  poids?: number | null
  created_by?: number
  created_at?: string
  updated_at?: string

  static toDto(entity: VitalSignEntity): VitalSignsDto {
    return {
      id: entity.id,
      patientId: entity.patient_id,
      date: entity.date,
      taSystolique: entity.ta_systolique,
      taDiastolique: entity.ta_diastolique,
      frequenceCardiaque: entity.frequence_cardiaque,
      temperature: entity.temperature,
      glycemie: entity.glycemie,
      cetonemie: entity.cetonemie,
      glucosurie: entity.glucosurie,
      cetonurie: entity.cetonurie,
      saO2: entity.sa_o2,
      diurese: entity.diurese,
      poids: entity.poids,
      createdBy: entity.created_by,
      createdAt: entity.created_at,
      updatedAt: entity.updated_at,
    } as VitalSignsDto
  }

  static toDtos(entities: VitalSignEntity[]): VitalSignsDto[] {
    return entities.map(VitalSignEntity.toDto)
  }

  static fromDto(dto: VitalSignsDto): VitalSignEntity {
    const e = new VitalSignEntity()
    e.id = dto.id
    e.patient_id = dto.patientId
    e.date = dto.date
    e.ta_systolique = dto.taSystolique
    e.ta_diastolique = dto.taDiastolique
    e.frequence_cardiaque = dto.frequenceCardiaque
    e.temperature = dto.temperature
    e.glycemie = dto.glycemie
    e.cetonemie = dto.cetonemie
    e.glucosurie = dto.glucosurie
    e.cetonurie = dto.cetonurie
    e.sa_o2 = dto.saO2
    e.diurese = dto.diurese
    e.poids = dto.poids
    e.created_by = dto.createdBy
    e.created_at = dto.createdAt
    e.updated_at = dto.updatedAt
    return e
  }

  static documentType(): string { return 'VitalSign' }
  static documentSchema(): any { return {} }
  static register(): void { /* No Automerge sync needed */ }
}
