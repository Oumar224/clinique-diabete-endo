import type { VitalSignsItemDto } from '../dto/vital-signs-item.dto'

export class VitalSignsItemEntity {
  id?: number
  patient_id?: number
  date?: string
  hour?: number
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

  static toDto(entity: VitalSignsItemEntity): VitalSignsItemDto {
    return {
      id: entity.id!,
      patientId: entity.patient_id!,
      date: entity.date!,
      hour: entity.hour!,
      taSystolique: entity.ta_systolique ?? null,
      taDiastolique: entity.ta_diastolique ?? null,
      frequenceCardiaque: entity.frequence_cardiaque ?? null,
      temperature: entity.temperature ?? null,
      glycemie: entity.glycemie ?? null,
      cetonemie: entity.cetonemie ?? null,
      glucosurie: entity.glucosurie ?? null,
      cetonurie: entity.cetonurie ?? null,
      saO2: entity.sa_o2 ?? null,
      diurese: entity.diurese ?? null,
      poids: entity.poids ?? null,
      createdBy: entity.created_by!,
      createdAt: entity.created_at!,
      updatedAt: entity.updated_at!,
    }
  }

  static toDtos(entities: VitalSignsItemEntity[]): VitalSignsItemDto[] {
    return entities.map(VitalSignsItemEntity.toDto)
  }

  static fromDto(dto: VitalSignsItemDto): VitalSignsItemEntity {
    const e = new VitalSignsItemEntity()
    e.id = dto.id
    e.patient_id = dto.patientId
    e.date = dto.date
    e.hour = dto.hour
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

  static documentType(): string { return 'VitalSignsItem' }
  static documentSchema(): any { return {} }
  static register(): void { /* No Automerge sync needed */ }
}
