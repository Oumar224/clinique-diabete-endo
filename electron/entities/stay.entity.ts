      import type { StayDto, StayMovementDto } from '../dto/stay.dto'

export interface StayRow {
  id: number
  patient_id: number
  admission_date: string
  mode_admission: string
  service_id: number
  chambre: string | null
  lit: string | null
  medecin_id: number | null
  notes: string | null
  status: string
  sortie_date: string | null
  created_by: number | null
  created_at: string | null
  updated_at: string | null
}

export class StayEntity {
  id?: number
  patient_id?: number
  admission_date?: string
  mode_admission?: string
  service_id?: number
  chambre?: string | null
  lit?: string | null
  medecin_id?: number | null
  notes?: string | null
  status?: string
  sortie_date?: string | null
  created_by?: number | null
  created_at?: string
  updated_at?: string

  static documentType(): string { return 'Stay' }
  static documentSchema(): any { return {} }
  static register(): void {}

  static toDto(entity: StayRow & { service_name?: string; medecin_name?: string }): StayDto {
    return {
      id: entity.id,
      patient_id: entity.patient_id,
      admission_date: entity.admission_date,
      mode_admission: entity.mode_admission as StayDto['mode_admission'],
      service_id: entity.service_id,
      service_name: entity.service_name,
      chambre: entity.chambre,
      lit: entity.lit,
      medecin_id: entity.medecin_id,
      medecin_name: entity.medecin_name,
      notes: entity.notes,
      status: entity.status as StayDto['status'],
      sortie_date: entity.sortie_date,
      created_by: entity.created_by,
      created_at: entity.created_at ?? undefined,
      updated_at: entity.updated_at ?? undefined,
    }
  }

  static toDtos(entities: (StayRow & { service_name?: string; medecin_name?: string })[]): StayDto[] {
    return entities.map(StayEntity.toDto)
  }
}

export class StayMovementEntity {
  id?: number
  stay_id?: number
  movement_type?: string
  from_service_id?: number | null
  to_service_id?: number | null
  chambre?: string | null
  lit?: string | null
  moved_at?: string
  notes?: string | null
  created_at?: string

  static documentType(): string { return 'StayMovement' }
  static documentSchema(): any { return {} }
  static register(): void {}

  static toDto(entity: StayMovementEntity & { from_service_name?: string; to_service_name?: string }): StayMovementDto {
    return {
      id: entity.id,
      stay_id: entity.stay_id!,
      movement_type: entity.movement_type as StayMovementDto['movement_type'],
      from_service_id: entity.from_service_id,
      from_service_name: entity.from_service_name,
      to_service_id: entity.to_service_id,
      to_service_name: entity.to_service_name,
      chambre: entity.chambre,
      lit: entity.lit,
      moved_at: entity.moved_at!,
      notes: entity.notes,
      created_at: entity.created_at,
    }
  }

  static toDtos(entities: (StayMovementEntity & { from_service_name?: string; to_service_name?: string })[]): StayMovementDto[] {
    return entities.map(StayMovementEntity.toDto)
  }
}
