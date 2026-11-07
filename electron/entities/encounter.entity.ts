import type { EncounterDto, EncounterMovementDto } from '../dto/encounter.dto'
import { EntityRegistry } from '../automerge/entity-registry'
import { EncounterConverter } from '../automerge/converters/encounter.converter'
import { EncounterMovementConverter } from '../automerge/converters/encounter-movement.converter'
import type { AutomergeDocument } from '../automerge/utils/entity-types'
import { SchemaField, buildDocumentSchema } from '../automerge/utils/schema-field'

export class EncounterEntity {
  @SchemaField() id?: number
  @SchemaField() patient_id?: number
  @SchemaField() contact_type?: string
  @SchemaField() contact_type_precision?: string
  @SchemaField() start_date?: string
  @SchemaField() end_date?: string
  @SchemaField() service_id?: number
  @SchemaField() medecin_id?: number
  @SchemaField() responsable_id?: number
  @SchemaField() origin?: string
  @SchemaField() origin_precision?: string
  @SchemaField() zone_situation?: string
  @SchemaField() zone_precision?: string
  @SchemaField() prise_en_charge?: string
  @SchemaField() prise_en_charge_precision?: string
  @SchemaField() care_unit_id?: number
  @SchemaField() sinistre_info?: string
  @SchemaField() notes?: string
  @SchemaField() case_type?: string
  @SchemaField() is_new_case?: number
  @SchemaField() status?: string
  @SchemaField() created_by?: number
  @SchemaField() created_at?: string
  @SchemaField() updated_at?: string

  // Joined fields (populated by SQL JOIN queries)
  stay_type?: string
  service_name?: string
  medecin_name?: string
  responsable_name?: string
  care_unit_name?: string

  static documentType(): string { return 'Encounter' }
  static documentSchema(): AutomergeDocument<EncounterEntity> { return buildDocumentSchema(EncounterEntity) as AutomergeDocument<EncounterEntity> }
  static register(): void {
    EntityRegistry.getInstance().register({
      type: this.documentType(),
      tableName: 'encounter',
      documentSchema: this.documentSchema(),
      converter: { toDocument: EncounterConverter.toDocument, toEntity: EncounterConverter.toEntity },
    })
  }

  static toDto(entity: EncounterEntity): EncounterDto {
    return {
      id: entity.id,
      patient_id: entity.patient_id,
      contact_type: entity.contact_type as EncounterDto['contact_type'],
      contact_type_precision: entity.contact_type_precision,
      start_date: entity.start_date,
      end_date: entity.end_date,
      service_id: entity.service_id,
      service_name: entity.service_name,
      medecin_id: entity.medecin_id,
      medecin_name: entity.medecin_name,
      responsable_id: entity.responsable_id,
      responsable_name: entity.responsable_name,
      care_unit_id: entity.care_unit_id,
      care_unit_name: entity.care_unit_name,
      origin: entity.origin,
      origin_precision: entity.origin_precision,
      zone_situation: entity.zone_situation,
      zone_precision: entity.zone_precision,
      prise_en_charge: entity.prise_en_charge,
      prise_en_charge_precision: entity.prise_en_charge_precision,
      sinistre_info: entity.sinistre_info,
      notes: entity.notes,
      case_type: entity.case_type as EncounterDto['case_type'],
      is_new_case: entity.is_new_case,
      stay_type: entity.stay_type as EncounterDto['stay_type'],
      status: entity.status as EncounterDto['status'],
      created_by: entity.created_by,
      created_at: entity.created_at,
      updated_at: entity.updated_at,
    }
  }

  static toDtos(entities: EncounterEntity[]): EncounterDto[] {
    return entities.map(EncounterEntity.toDto)
  }

  static fromDto(dto: EncounterDto): EncounterEntity {
    const e = new EncounterEntity()
    e.id = dto.id
    e.patient_id = dto.patient_id
    e.contact_type = dto.contact_type
    e.contact_type_precision = dto.contact_type_precision
    e.start_date = dto.start_date
    e.end_date = dto.end_date
    e.service_id = dto.service_id
    e.medecin_id = dto.medecin_id
    e.responsable_id = dto.responsable_id
    e.care_unit_id = dto.care_unit_id
    e.origin = dto.origin
    e.origin_precision = dto.origin_precision
    e.zone_situation = dto.zone_situation
    e.zone_precision = dto.zone_precision
    e.prise_en_charge = dto.prise_en_charge
    e.prise_en_charge_precision = dto.prise_en_charge_precision
    e.sinistre_info = dto.sinistre_info
    e.notes = dto.notes
    e.case_type = dto.case_type
    e.is_new_case = dto.is_new_case
    e.status = dto.status
    e.created_by = dto.created_by
    return e
  }
}

export class EncounterMovementEntity {
  @SchemaField() id?: number
  @SchemaField() encounter_id?: number
  @SchemaField() from_service_id?: number
  @SchemaField() service_id?: number
  @SchemaField() step_label?: string
  @SchemaField() entered_at?: string
  @SchemaField() exited_at?: string
  @SchemaField() motif?: string
  @SchemaField() notes?: string
  @SchemaField() created_by?: number
  @SchemaField() created_at?: string

  // Joined fields
  service_name?: string
  from_service_name?: string

  static documentType(): string { return 'EncounterMovement' }
  static documentSchema(): AutomergeDocument<EncounterMovementEntity> { return buildDocumentSchema(EncounterMovementEntity) as AutomergeDocument<EncounterMovementEntity> }
  static register(): void {
    EntityRegistry.getInstance().register({
      type: this.documentType(),
      tableName: 'encounter_movement',
      documentSchema: this.documentSchema(),
      converter: { toDocument: EncounterMovementConverter.toDocument, toEntity: EncounterMovementConverter.toEntity },
    })
  }

  static toDto(entity: EncounterMovementEntity): EncounterMovementDto {
    return {
      id: entity.id,
      encounter_id: entity.encounter_id,
      from_service_id: entity.from_service_id,
      from_service_name: entity.from_service_name,
      service_id: entity.service_id,
      service_name: entity.service_name,
      step_label: entity.step_label,
      entered_at: entity.entered_at,
      exited_at: entity.exited_at,
      motif: entity.motif,
      notes: entity.notes,
      created_by: entity.created_by,
      created_at: entity.created_at,
    }
  }

  static toDtos(entities: EncounterMovementEntity[]): EncounterMovementDto[] {
    return entities.map(EncounterMovementEntity.toDto)
  }
}