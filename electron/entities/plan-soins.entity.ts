import type { PlanSoinsDto } from '../dto/plan-soins.dto'
import { EntityRegistry } from '../automerge/entity-registry'
import { PlanSoinsConverter } from '../automerge/converters/plan-soins.converter'
import type { AutomergeDocument } from '../automerge/utils/entity-types'
import { SchemaField, buildDocumentSchema } from '../automerge/utils/schema-field'
import { PlanSoinsItemConverter } from '../automerge/converters/plan-soins-item.converter'

export class PlanSoinsEntity {
  @SchemaField() id?: number
  @SchemaField() patient_id?: number
  @SchemaField() date?: string
  @SchemaField() created_by?: number
  @SchemaField() created_at?: string
  @SchemaField() updated_at?: string

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
  static documentSchema(): AutomergeDocument<PlanSoinsEntity> {
    return buildDocumentSchema(PlanSoinsEntity) as AutomergeDocument<PlanSoinsEntity>
  }
  static register(): void {
    EntityRegistry.getInstance().register({
      type: this.documentType(),
      tableName: 'plan_soins',
      documentSchema: this.documentSchema(),
      converter: { toDocument: PlanSoinsConverter.toDocument, toEntity: PlanSoinsConverter.toEntity },
    })
  }
}

export class PlanSoinsItemEntity {
  @SchemaField() id?: number
  @SchemaField() plan_soins_id?: number
  @SchemaField() bloc_heure?: string
  @SchemaField() medicament?: string
  @SchemaField() dosage?: string
  @SchemaField() voie?: string
  @SchemaField() statut?: string
  @SchemaField() valide_par?: string
  @SchemaField() valide_a?: string
  @SchemaField() motif_suspension?: string
  @SchemaField() prescription_id?: number
  @SchemaField() created_at?: string
  @SchemaField() updated_at?: string

  static documentType(): string { return 'PlanSoinsItem' }
  static documentSchema(): AutomergeDocument<PlanSoinsItemEntity> {
    return buildDocumentSchema(PlanSoinsItemEntity) as AutomergeDocument<PlanSoinsItemEntity>
  }
  static register(): void {
    EntityRegistry.getInstance().register({
      type: this.documentType(),
      tableName: 'plan_soins_item',
      documentSchema: this.documentSchema(),
      converter: { toDocument: PlanSoinsItemConverter.toDocument, toEntity: PlanSoinsItemConverter.toEntity },
    })
  }
}
