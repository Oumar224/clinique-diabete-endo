import type { MedicalActDto } from '../dto/settings.dto'
import { EntityRegistry } from '../automerge/entity-registry'
import { MedicalActConverter } from '../automerge/converters/medical-act.converter'
import type { AutomergeDocument } from '../automerge/utils/entity-types'
import { SchemaField, buildDocumentSchema } from '../automerge/utils/schema-field'

export class MedicalActEntity {
  @SchemaField() id?: number
  @SchemaField() code?: string
  @SchemaField() label?: string
  @SchemaField() service_id?: number
  @SchemaField() is_active?: number
  @SchemaField() created_at?: string
  @SchemaField() updated_at?: string

  static toDto(entity: MedicalActEntity): MedicalActDto {
    return { id: entity.id, code: entity.code as string, label: entity.label as string, service_id: entity.service_id as number, is_active: entity.is_active as unknown as boolean, created_at: entity.created_at, updated_at: entity.updated_at }
  }
  static toDtos(entities: MedicalActEntity[]): MedicalActDto[] { return entities.map(MedicalActEntity.toDto) }
  static fromDto(dto: MedicalActDto): MedicalActEntity {
    const e = new MedicalActEntity()
    e.id = dto.id; e.code = dto.code; e.label = dto.label; e.service_id = dto.service_id; e.is_active = dto.is_active as unknown as number; e.created_at = dto.created_at; e.updated_at = dto.updated_at
    return e
  }
  static documentType(): string { return 'MedicalAct' }
  static documentSchema(): AutomergeDocument<MedicalActEntity> {
    return buildDocumentSchema(MedicalActEntity) as AutomergeDocument<MedicalActEntity>
  }
  static register(): void {
    EntityRegistry.getInstance().register({
      type: this.documentType(),
      tableName: 'medical_act',
      documentSchema: this.documentSchema(),
      converter: { toDocument: MedicalActConverter.toDocument, toEntity: MedicalActConverter.toEntity },
    })
  }
}
