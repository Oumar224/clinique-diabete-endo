import type { StayDto, StayCreateDto, StayMovementDto } from '../dto/stay.dto'
import { EntityRegistry } from '../automerge/entity-registry'
import { StayConverter } from '../automerge/converters/stay.converter'
import { StayMovementConverter } from '../automerge/converters/stay-movement.converter'
import type { AutomergeDocument } from '../automerge/utils/entity-types'
import { SchemaField, buildDocumentSchema } from '../automerge/utils/schema-field'

export class StayEntity {
  @SchemaField() id?: number
  @SchemaField() patient_id?: number
  @SchemaField() admission_date?: string
  @SchemaField() mode_admission?: string
  @SchemaField() service_id?: number
  @SchemaField() chambre?: string
  @SchemaField() lit?: string
  @SchemaField() medecin_id?: number
  @SchemaField() notes?: string
  @SchemaField() status?: string
  @SchemaField() sortie_date?: string
  @SchemaField() created_by?: number
  @SchemaField() created_at?: string
  @SchemaField() updated_at?: string

  service_name?: string
  medecin_name?: string

  static toDto(entity: StayEntity): StayDto {
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
      created_at: entity.created_at,
      updated_at: entity.updated_at,
    }
  }

  static toDtos(entities: StayEntity[]): StayDto[] {
    return entities.map(StayEntity.toDto)
  }

  static fromDto(dto: StayCreateDto): StayEntity {
    const e = new StayEntity()
    e.patient_id = dto.patient_id
    e.admission_date = dto.admission_date
    e.mode_admission = dto.mode_admission
    e.service_id = dto.service_id
    e.medecin_id = dto.medecin_id
    e.chambre = dto.chambre
    e.lit = dto.lit
    e.notes = dto.notes
    e.created_by = dto.created_by
    return e
  }

  static documentType(): string {
    return 'Stay'
  }

  static documentSchema(): AutomergeDocument<StayEntity> {
    return buildDocumentSchema(StayEntity) as AutomergeDocument<StayEntity>
  }

  static register(): void {
    EntityRegistry.getInstance().register({
      type: this.documentType(),
      tableName: 'stay',
      documentSchema: this.documentSchema(),
      converter: { toDocument: StayConverter.toDocument, toEntity: StayConverter.toEntity },
    })
  }
}

export class StayMovementEntity {
  @SchemaField() id?: number
  @SchemaField() stay_id?: number
  @SchemaField() movement_type?: string
  @SchemaField() from_service_id?: number
  @SchemaField() to_service_id?: number
  @SchemaField() chambre?: string
  @SchemaField() lit?: string
  @SchemaField() moved_at?: string
  @SchemaField() notes?: string
  @SchemaField() created_at?: string

  from_service_name?: string
  to_service_name?: string

  static toDto(entity: StayMovementEntity): StayMovementDto {
    return {
      id: entity.id,
      stay_id: entity.stay_id,
      movement_type: entity.movement_type as StayMovementDto['movement_type'],
      from_service_id: entity.from_service_id,
      from_service_name: entity.from_service_name,
      to_service_id: entity.to_service_id,
      to_service_name: entity.to_service_name,
      chambre: entity.chambre,
      lit: entity.lit,
      moved_at: entity.moved_at,
      notes: entity.notes,
      created_at: entity.created_at,
    }
  }

  static toDtos(entities: StayMovementEntity[]): StayMovementDto[] {
    return entities.map(StayMovementEntity.toDto)
  }

  static documentType(): string {
    return 'StayMovement'
  }

  static documentSchema(): AutomergeDocument<StayMovementEntity> {
    return buildDocumentSchema(StayMovementEntity) as AutomergeDocument<StayMovementEntity>
  }

  static register(): void {
    EntityRegistry.getInstance().register({
      type: this.documentType(),
      tableName: 'stay_movement',
      documentSchema: this.documentSchema(),
      converter: { toDocument: StayMovementConverter.toDocument, toEntity: StayMovementConverter.toEntity },
    })
  }
}
