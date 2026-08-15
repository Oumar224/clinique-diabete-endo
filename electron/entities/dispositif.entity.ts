import type { DispositifDto } from '../dto/dispositif.dto'
import { EntityRegistry } from '../automerge/entity-registry'
import { DispositifConverter } from '../automerge/converters/dispositif.converter'
import type { AutomergeDocument } from '../automerge/utils/entity-types'
import { SchemaField, buildDocumentSchema } from '../automerge/utils/schema-field'

export class DispositifEntity {
  @SchemaField() id?: number
  @SchemaField() patient_id?: number
  @SchemaField() type?: string
  @SchemaField() date_pose?: string
  @SchemaField() aspect?: string
  @SchemaField() volume_ml?: number
  @SchemaField() created_by?: number
  @SchemaField() created_at?: string
  @SchemaField() updated_at?: string

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
  static documentSchema(): AutomergeDocument<DispositifEntity> {
    return buildDocumentSchema(DispositifEntity) as AutomergeDocument<DispositifEntity>
  }
  static register(): void {
    EntityRegistry.getInstance().register({
      type: this.documentType(),
      tableName: 'dispositif',
      documentSchema: this.documentSchema(),
      converter: { toDocument: DispositifConverter.toDocument, toEntity: DispositifConverter.toEntity },
    })
  }
}
