import type { DispositifTypeDto } from '../dto/settings.dto'
import { EntityRegistry } from '../automerge/entity-registry'
import { DispositifTypeConverter } from '../automerge/converters/dispositif-type.converter'
import type { AutomergeDocument } from '../automerge/utils/entity-types'
import { SchemaField, buildDocumentSchema } from '../automerge/utils/schema-field'

export class DispositifTypeEntity {
  @SchemaField() id?: number
  @SchemaField() label?: string
  @SchemaField() is_active?: number
  @SchemaField() created_at?: string
  @SchemaField() updated_at?: string

  static toDto(entity: DispositifTypeEntity): DispositifTypeDto {
    return { id: entity.id, label: entity.label as string, is_active: entity.is_active as unknown as boolean, created_at: entity.created_at, updated_at: entity.updated_at }
  }
  static toDtos(entities: DispositifTypeEntity[]): DispositifTypeDto[] { return entities.map(DispositifTypeEntity.toDto) }
  static fromDto(dto: DispositifTypeDto): DispositifTypeEntity {
    const e = new DispositifTypeEntity()
    e.id = dto.id; e.label = dto.label; e.is_active = dto.is_active as unknown as number; e.created_at = dto.created_at; e.updated_at = dto.updated_at
    return e
  }
  static documentType(): string { return 'DispositifType' }
  static documentSchema(): AutomergeDocument<DispositifTypeEntity> {
    return buildDocumentSchema(DispositifTypeEntity) as AutomergeDocument<DispositifTypeEntity>
  }
  static register(): void {
    EntityRegistry.getInstance().register({
      type: this.documentType(),
      tableName: 'dispositif_type',
      documentSchema: this.documentSchema(),
      converter: { toDocument: DispositifTypeConverter.toDocument, toEntity: DispositifTypeConverter.toEntity },
    })
  }
}
