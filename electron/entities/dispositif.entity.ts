import type { DispositifDto } from '../dto/dispositif.dto'

export class DispositifEntity {
  id?: number
  patient_id?: number
  type?: string
  date_pose?: string
  aspect?: string
  volume_ml?: number | null
  created_by?: number
  created_at?: string
  updated_at?: string

  static toDto(entity: DispositifEntity): DispositifDto {
    return {
      id: entity.id,
      patientId: entity.patient_id,
      type: entity.type,
      datePose: entity.date_pose,
      aspect: entity.aspect,
      volumeMl: entity.volume_ml,
      createdBy: entity.created_by,
      createdAt: entity.created_at,
      updatedAt: entity.updated_at,
    } as DispositifDto
  }

  static toDtos(entities: DispositifEntity[]): DispositifDto[] {
    return entities.map(DispositifEntity.toDto)
  }

  static fromDto(dto: DispositifDto): DispositifEntity {
    const e = new DispositifEntity()
    e.id = dto.id
    e.patient_id = dto.patientId
    e.type = dto.type
    e.date_pose = dto.datePose
    e.aspect = dto.aspect
    e.volume_ml = dto.volumeMl
    e.created_by = dto.createdBy
    e.created_at = dto.createdAt
    e.updated_at = dto.updatedAt
    return e
  }

  static documentType(): string { return 'Dispositif' }
  static documentSchema(): any { return {} }
  static register(): void { /* No Automerge sync needed */ }
}
