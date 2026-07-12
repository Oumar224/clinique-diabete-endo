import type { PlanSoinsDto } from '../dto/plan-soins.dto'

export class PlanSoinsEntity {
  id?: number
  patient_id?: number
  date?: string
  created_by?: number
  created_at?: string
  updated_at?: string

  static toDto(entity: PlanSoinsEntity): PlanSoinsDto {
    return {
      id: entity.id,
      patientId: entity.patient_id,
      date: entity.date,
      blocs: undefined,
      createdBy: entity.created_by,
      createdAt: entity.created_at,
      updatedAt: entity.updated_at,
    } as unknown as PlanSoinsDto
  }

  static toDtos(entities: PlanSoinsEntity[]): PlanSoinsDto[] {
    return entities.map(PlanSoinsEntity.toDto)
  }

  static fromDto(dto: PlanSoinsDto): PlanSoinsEntity {
    const e = new PlanSoinsEntity()
    e.id = dto.id
    e.patient_id = dto.patientId
    e.date = dto.date
    e.created_by = dto.createdBy
    e.created_at = dto.createdAt
    e.updated_at = dto.updatedAt
    return e
  }

  static documentType(): string { return 'PlanSoins' }
  static documentSchema(): any { return {} }
  static register(): void { /* No Automerge sync needed */ }
}

export class PlanSoinsItemEntity {
  id?: number
  plan_soins_id?: number
  bloc_heure?: string
  medicament?: string
  dosage?: string
  voie?: string
  statut?: string
  valide_par?: string | null
  valide_a?: string | null
  motif_suspension?: string | null
  prescription_id?: number | null
  created_at?: string
  updated_at?: string
}
