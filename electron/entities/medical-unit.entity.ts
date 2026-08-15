import type { MedicalUnitDto } from '../dto/medical-unit.dto'
import { EntityRegistry } from '../automerge/entity-registry'
import { MedicalUnitConverter } from '../automerge/converters/medical-unit.converter'
import type { AutomergeDocument } from '../automerge/utils/entity-types'
import { SchemaField, buildDocumentSchema } from '../automerge/utils/schema-field'

/**
 * Medical unit for service organization
 * Despite the name, this is NOT an organizational care unit.
 */
export class MedicalUnitEntity {
  @SchemaField() id?: number
  @SchemaField() code?: string
  @SchemaField() name?: string
  @SchemaField() is_active?: number
  @SchemaField() created_at?: string
  @SchemaField() updated_at?: string

  static toDto(entity: MedicalUnitEntity): MedicalUnitDto {
    return { id: entity.id, code: entity.code as string, name: entity.name as string, is_active: entity.is_active as unknown as boolean, created_at: entity.created_at, updated_at: entity.updated_at }
  }
  static toDtos(entities: MedicalUnitEntity[]): MedicalUnitDto[] { return entities.map(MedicalUnitEntity.toDto) }
  static fromDto(dto: MedicalUnitDto): MedicalUnitEntity {
    const e = new MedicalUnitEntity()
    e.id = dto.id; e.code = dto.code; e.name = dto.name; e.is_active = dto.is_active as unknown as number; e.created_at = dto.created_at; e.updated_at = dto.updated_at
    return e
  }
  static documentType(): string { return 'MedicalUnit' }
  static documentSchema(): AutomergeDocument<MedicalUnitEntity> {
    return buildDocumentSchema(MedicalUnitEntity) as AutomergeDocument<MedicalUnitEntity>
  }
  static register(): void {
    EntityRegistry.getInstance().register({
      type: this.documentType(),
      tableName: 'medical_unit',
      documentSchema: this.documentSchema(),
      converter: { toDocument: MedicalUnitConverter.toDocument, toEntity: MedicalUnitConverter.toEntity },
    })
  }
}
