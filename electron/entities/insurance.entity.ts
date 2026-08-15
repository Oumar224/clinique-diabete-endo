import type { InsuranceDto, InsuranceCreateDto } from '../dto/insurance.dto'
import { EntityRegistry } from '../automerge/entity-registry'
import { InsuranceConverter } from '../automerge/converters/insurance.converter'
import type { AutomergeDocument } from '../automerge/utils/entity-types'
import { SchemaField, buildDocumentSchema } from '../automerge/utils/schema-field'

export class InsuranceEntity {
  @SchemaField() id?: number
  @SchemaField() name?: string
  @SchemaField() code?: string
  @SchemaField() is_active?: number
  @SchemaField() created_at?: string
  @SchemaField() updated_at?: string

  static toDto(entity: InsuranceEntity): InsuranceDto {
    return {
      id: entity.id,
      name: entity.name,
      code: entity.code,
      is_active: entity.is_active === 1,
      created_at: entity.created_at,
      updated_at: entity.updated_at,
    }
  }

  static toDtos(entities: InsuranceEntity[]): InsuranceDto[] {
    return entities.map(InsuranceEntity.toDto)
  }

  static fromDto(dto: InsuranceCreateDto): InsuranceEntity {
    const e = new InsuranceEntity()
    e.name = dto.name
    e.code = dto.code
    return e
  }

  static documentType(): string {
    return 'Insurance'
  }

  static documentSchema(): AutomergeDocument<InsuranceEntity> {
    return buildDocumentSchema(InsuranceEntity) as AutomergeDocument<InsuranceEntity>
  }

  static register(): void {
    EntityRegistry.getInstance().register({
      type: this.documentType(),
      tableName: 'insurance',
      documentSchema: this.documentSchema(),
      converter: { toDocument: InsuranceConverter.toDocument, toEntity: InsuranceConverter.toEntity },
    })
  }
}
