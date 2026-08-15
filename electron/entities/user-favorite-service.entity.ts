import type { ServiceFavoriteDto } from '../dto/settings.dto'
import { EntityRegistry } from '../automerge/entity-registry'
import { UserFavoriteServiceConverter } from '../automerge/converters/user-favorite-service.converter'
import type { AutomergeDocument } from '../automerge/utils/entity-types'
import { SchemaField, buildDocumentSchema } from '../automerge/utils/schema-field'

export class UserFavoriteServiceEntity {
  @SchemaField() user_id?: number
  @SchemaField() service_id?: number
  @SchemaField() created_at?: string

  static toDto(entity: UserFavoriteServiceEntity): ServiceFavoriteDto {
    return {
      user_id: entity.user_id!,
      service_id: entity.service_id!,
      created_at: entity.created_at,
    }
  }

  static toDtos(entities: UserFavoriteServiceEntity[]): ServiceFavoriteDto[] {
    return entities.map(UserFavoriteServiceEntity.toDto)
  }

  static fromDto(dto: ServiceFavoriteDto): UserFavoriteServiceEntity {
    const e = new UserFavoriteServiceEntity()
    e.user_id = dto.user_id
    e.service_id = dto.service_id
    e.created_at = dto.created_at
    return e
  }

  static documentType(): string { return 'UserFavoriteService' }
  static documentSchema(): AutomergeDocument<UserFavoriteServiceEntity> {
    return buildDocumentSchema(UserFavoriteServiceEntity) as AutomergeDocument<UserFavoriteServiceEntity>
  }
  static register(): void {
    EntityRegistry.getInstance().register({
      type: this.documentType(),
      tableName: 'user_favorite_service',
      documentSchema: this.documentSchema(),
      converter: { toDocument: UserFavoriteServiceConverter.toDocument, toEntity: UserFavoriteServiceConverter.toEntity },
    })
  }
}
