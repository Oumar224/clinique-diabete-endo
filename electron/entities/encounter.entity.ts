import type { EncounterDto, EncounterMovementDto } from '../dto/encounter.dto'

export interface EncounterRow {
  id: number
  patient_id: number
  contact_type: string
  contact_type_precision: string | null
  start_date: string
  end_date: string | null
  service_id: number
  medecin_id: number | null
  responsable_id: number | null
  origin: string
  origin_precision: string | null
  zone_situation: string
  zone_precision: string | null
  prise_en_charge: string
  prise_en_charge_precision: string | null
  contact_category_id: number | null
  care_unit_id: number | null
  sinistre_info: string | null
  notes: string | null
  status: string
  created_by: number | null
  created_at: string | null
  updated_at: string | null
}

export class EncounterEntity {
  id?: number
  patient_id?: number
  contact_type?: string
  contact_type_precision?: string | null
  start_date?: string
  end_date?: string | null
  service_id?: number
  medecin_id?: number | null
  responsable_id?: number | null
  origin?: string
  origin_precision?: string | null
  zone_situation?: string
  zone_precision?: string | null
  prise_en_charge?: string
  prise_en_charge_precision?: string | null
  contact_category_id?: number | null
  care_unit_id?: number | null
  sinistre_info?: string | null
  notes?: string | null
  status?: string
  created_by?: number | null
  created_at?: string
  updated_at?: string

  static documentType(): string { return 'Encounter' }
  static documentSchema(): any { return {} }
  static register(): void {}

  static toDto(entity: EncounterRow & { service_name?: string; medecin_name?: string; responsable_name?: string; contact_category_label?: string; care_unit_name?: string }): EncounterDto {
    return {
      id: entity.id,
      patient_id: entity.patient_id,
      contact_type: entity.contact_type as EncounterDto['contact_type'],
      contact_type_precision: entity.contact_type_precision,
      start_date: entity.start_date,
      end_date: entity.end_date ?? undefined,
      service_id: entity.service_id,
      service_name: entity.service_name,
      medecin_id: entity.medecin_id,
      medecin_name: entity.medecin_name ?? null,
      responsable_id: entity.responsable_id,
      responsable_name: entity.responsable_name ?? null,
      contact_category_id: entity.contact_category_id,
      contact_category_label: entity.contact_category_label ?? null,
      care_unit_id: entity.care_unit_id,
      care_unit_name: entity.care_unit_name ?? null,
      origin: entity.origin,
      origin_precision: entity.origin_precision,
      zone_situation: entity.zone_situation,
      zone_precision: entity.zone_precision,
      prise_en_charge: entity.prise_en_charge,
      prise_en_charge_precision: entity.prise_en_charge_precision,
      sinistre_info: entity.sinistre_info,
      notes: entity.notes,
      status: entity.status as EncounterDto['status'],
      created_by: entity.created_by,
      created_at: entity.created_at ?? undefined,
      updated_at: entity.updated_at ?? undefined,
    }
  }

  static toDtos(entities: (EncounterRow & { service_name?: string; medecin_name?: string; responsable_name?: string; contact_category_label?: string; care_unit_name?: string })[]): EncounterDto[] {
    return entities.map(EncounterEntity.toDto)
  }

  static fromDto(dto: EncounterDto): EncounterEntity {
    const e = new EncounterEntity()
    e.id = dto.id
    e.patient_id = dto.patient_id
    e.contact_type = dto.contact_type
    e.contact_type_precision = dto.contact_type_precision ?? null
    e.start_date = dto.start_date
    e.end_date = dto.end_date ?? null
    e.service_id = dto.service_id
    e.medecin_id = dto.medecin_id ?? null
    e.responsable_id = dto.responsable_id
    e.contact_category_id = dto.contact_category_id
    e.care_unit_id = dto.care_unit_id ?? null
    e.origin = dto.origin
    e.origin_precision = dto.origin_precision ?? null
    e.zone_situation = dto.zone_situation
    e.zone_precision = dto.zone_precision ?? null
    e.prise_en_charge = dto.prise_en_charge
    e.prise_en_charge_precision = dto.prise_en_charge_precision ?? null
    e.sinistre_info = dto.sinistre_info ?? null
    e.notes = dto.notes ?? null
    e.status = dto.status
    e.created_by = dto.created_by ?? null
    return e
  }
}

export class EncounterMovementEntity {
  id?: number
  encounter_id?: number
  service_id?: number | null
  step_label?: string
  entered_at?: string
  exited_at?: string | null
  notes?: string | null
  created_at?: string

  static documentType(): string { return 'EncounterMovement' }
  static documentSchema(): any { return {} }
  static register(): void {}

  static toDto(entity: EncounterMovementEntity & { service_name?: string }): EncounterMovementDto {
    return {
      id: entity.id,
      encounter_id: entity.encounter_id!,
      service_id: entity.service_id,
      service_name: entity.service_name,
      step_label: entity.step_label!,
      entered_at: entity.entered_at!,
      exited_at: entity.exited_at,
      notes: entity.notes,
      created_at: entity.created_at,
    }
  }
}
