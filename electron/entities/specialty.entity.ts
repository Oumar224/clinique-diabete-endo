import type { SpecialtyDto } from '../dto/specialty.dto'
import { EntityRegistry } from '../automerge/entity-registry'
import { SpecialtyConverter } from '../automerge/converters/specialty.converter'
import type { AutomergeDocument } from '../automerge/utils/entity-types'
import { SchemaField, buildDocumentSchema } from '../automerge/utils/schema-field'

export class SpecialtyEntity {
  @SchemaField() id?: number
  @SchemaField() name?: string
  @SchemaField() code?: string
  @SchemaField() title_prefix?: string
  @SchemaField() is_active?: number
  @SchemaField() created_at?: string
  @SchemaField() updated_at?: string

  static toDto(entity: SpecialtyEntity): SpecialtyDto {
    return { id: entity.id, name: entity.name as string, code: entity.code as string, title_prefix: entity.title_prefix as string, is_active: entity.is_active as unknown as boolean, created_at: entity.created_at, updated_at: entity.updated_at }
  }
  static toDtos(entities: SpecialtyEntity[]): SpecialtyDto[] { return entities.map(SpecialtyEntity.toDto) }
  static fromDto(dto: SpecialtyDto): SpecialtyEntity {
    const e = new SpecialtyEntity()
    e.id = dto.id; e.name = dto.name; e.code = dto.code; e.title_prefix = dto.title_prefix; e.is_active = dto.is_active as unknown as number; e.created_at = dto.created_at; e.updated_at = dto.updated_at
    return e
  }
  static documentType(): string { return 'Specialty' }
  static documentSchema(): AutomergeDocument<SpecialtyEntity> {
    return buildDocumentSchema(SpecialtyEntity) as AutomergeDocument<SpecialtyEntity>
  }
  static register(): void {
    EntityRegistry.getInstance().register({
      type: this.documentType(),
      tableName: 'specialty',
      documentSchema: this.documentSchema(),
      converter: { toDocument: SpecialtyConverter.toDocument, toEntity: SpecialtyConverter.toEntity },
    })
  }
}
