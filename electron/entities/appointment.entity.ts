import type { AppointmentDto } from '../dto/appointment.dto'
import { EntityRegistry } from '../automerge/entity-registry'
import { AppointmentConverter } from '../automerge/converters/appointment.converter'
import type { AutomergeDocument } from '../automerge/utils/entity-types'

export class AppointmentEntity {
  id?: number
  patient_id?: number
  date?: string
  time?: string
  motif?: string
  status?: 'confirmed' | 'pending' | 'cancelled' | 'done'
  medecin_id?: number
  medecin_name?: string
  service_id?: number
  service_name?: string
  care_unit_id?: number
  care_unit_name?: string
  notes?: string
  automerge_id?: string
  created_at?: string
  updated_at?: string

  static toDto(entity: AppointmentEntity): AppointmentDto {
    return {
      id: entity.id,
      patient_id: entity.patient_id,
      date: entity.date,
      time: entity.time,
      motif: entity.motif,
      status: entity.status,
      medecin_id: entity.medecin_id,
      medecin_name: entity.medecin_name,
      service_id: entity.service_id,
      service_name: entity.service_name,
      care_unit_id: entity.care_unit_id,
      care_unit_name: entity.care_unit_name,
      notes: entity.notes,
      created_at: entity.created_at,
      updated_at: entity.updated_at,
    }
  }

  static toDtos(entities: AppointmentEntity[]): AppointmentDto[] {
    return entities.map(AppointmentEntity.toDto)
  }

  static fromDto(dto: AppointmentDto): AppointmentEntity {
    const e = new AppointmentEntity()
    e.id = dto.id
    e.patient_id = dto.patient_id
    e.date = dto.date
    e.time = dto.time
    e.motif = dto.motif
    e.status = dto.status
    e.medecin_id = dto.medecin_id
    e.medecin_name = dto.medecin_name
    e.service_id = dto.service_id
    e.service_name = dto.service_name
    e.care_unit_id = dto.care_unit_id
    e.care_unit_name = dto.care_unit_name
    e.notes = dto.notes
    return e
  }

  static documentType(): string {
    return 'Appointment'
  }

  static documentSchema(): AutomergeDocument<AppointmentEntity> {
    return {} as AutomergeDocument<AppointmentEntity>
  }

  static register(): void {
    EntityRegistry.getInstance().register({
      type: this.documentType(),
      tableName: 'appointment',
      documentSchema: this.documentSchema(),
      converter: { toDocument: AppointmentConverter.toDocument, toEntity: AppointmentConverter.toEntity },
    })
  }
}
