import type { FonctionDto } from '../dto/settings.dto'
import { EntityRegistry } from '../automerge/entity-registry'
import { FonctionConverter } from '../automerge/converters/fonction.converter'
import type { AutomergeDocument } from '../automerge/utils/entity-types'
import { SchemaField, buildDocumentSchema } from '../automerge/utils/schema-field'

export class FonctionEntity {
  @SchemaField() id?: number
  @SchemaField() name?: string
  @SchemaField() is_active?: number
  @SchemaField() created_at?: string
  @SchemaField() updated_at?: string

  static toDto(entity: FonctionEntity): FonctionDto {
    return { id: entity.id, name: entity.name as string, is_active: entity.is_active as unknown as boolean, created_at: entity.created_at, updated_at: entity.updated_at }
  }
  static toDtos(entities: FonctionEntity[]): FonctionDto[] { return entities.map(FonctionEntity.toDto) }
  static fromDto(dto: FonctionDto): FonctionEntity {
    const e = new FonctionEntity()
    e.id = dto.id; e.name = dto.name; e.is_active = dto.is_active as unknown as number; e.created_at = dto.created_at; e.updated_at = dto.updated_at
    return e
  }
  static documentType(): string { return 'Fonction' }
  static documentSchema(): AutomergeDocument<FonctionEntity> {
    return buildDocumentSchema(FonctionEntity) as AutomergeDocument<FonctionEntity>
  }
  static register(): void {
    EntityRegistry.getInstance().register({
      type: this.documentType(),
      tableName: 'fonction',
      documentSchema: this.documentSchema(),
      converter: { toDocument: FonctionConverter.toDocument, toEntity: FonctionConverter.toEntity },
    })
  }
}
