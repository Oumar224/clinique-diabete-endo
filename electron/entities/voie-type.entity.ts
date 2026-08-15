import type { VoieTypeDto } from '../dto/settings.dto'
import { EntityRegistry } from '../automerge/entity-registry'
import { VoieTypeConverter } from '../automerge/converters/voie-type.converter'
import type { AutomergeDocument } from '../automerge/utils/entity-types'
import { SchemaField, buildDocumentSchema } from '../automerge/utils/schema-field'

export class VoieTypeEntity {
  @SchemaField() id?: number
  @SchemaField() label?: string
  @SchemaField() is_active?: number
  @SchemaField() created_at?: string
  @SchemaField() updated_at?: string

  static toDto(entity: VoieTypeEntity): VoieTypeDto {
    return { id: entity.id, label: entity.label as string, is_active: entity.is_active as unknown as boolean, created_at: entity.created_at, updated_at: entity.updated_at }
  }
  static toDtos(entities: VoieTypeEntity[]): VoieTypeDto[] { return entities.map(VoieTypeEntity.toDto) }
  static fromDto(dto: VoieTypeDto): VoieTypeEntity {
    const e = new VoieTypeEntity()
    e.id = dto.id; e.label = dto.label; e.is_active = dto.is_active as unknown as number; e.created_at = dto.created_at; e.updated_at = dto.updated_at
    return e
  }
  static documentType(): string { return 'VoieType' }
  static documentSchema(): AutomergeDocument<VoieTypeEntity> {
    return buildDocumentSchema(VoieTypeEntity) as AutomergeDocument<VoieTypeEntity>
  }
  static register(): void {
    EntityRegistry.getInstance().register({
      type: this.documentType(),
      tableName: 'voie_type',
      documentSchema: this.documentSchema(),
      converter: { toDocument: VoieTypeConverter.toDocument, toEntity: VoieTypeConverter.toEntity },
    })
  }
}
