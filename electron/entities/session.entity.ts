import type { SessionDto } from '../dto/auth.dto'
import { EntityRegistry } from '../automerge/entity-registry'
import { SessionConverter } from '../automerge/converters/session.converter'
import type { AutomergeDocument } from '../automerge/utils/entity-types'
import { SchemaField, buildDocumentSchema } from '../automerge/utils/schema-field'

export class SessionEntity {
  @SchemaField() id?: string
  @SchemaField() user_id?: number
  @SchemaField() created_at?: string
  @SchemaField() expires_at?: string
  @SchemaField() last_activity?: string
  @SchemaField() remember_me?: number

  static toDto(entity: SessionEntity): SessionDto {
    return {
      id: entity.id,
      user_id: entity.user_id!,
      created_at: entity.created_at,
      expires_at: entity.expires_at!,
      last_activity: entity.last_activity,
      remember_me: entity.remember_me === 1,
    }
  }

  static toDtos(entities: SessionEntity[]): SessionDto[] {
    return entities.map(SessionEntity.toDto)
  }

  static fromDto(dto: SessionDto): SessionEntity {
    const e = new SessionEntity()
    e.id = dto.id
    e.user_id = dto.user_id
    e.created_at = dto.created_at
    e.expires_at = dto.expires_at
    e.last_activity = dto.last_activity
    if (dto.remember_me !== undefined) e.remember_me = dto.remember_me ? 1 : 0
    return e
  }

  static documentType(): string { return 'Session' }
  static documentSchema(): AutomergeDocument<SessionEntity> {
    return buildDocumentSchema(SessionEntity) as AutomergeDocument<SessionEntity>
  }
  static register(): void {
    EntityRegistry.getInstance().register({
      type: this.documentType(),
      tableName: 'session',
      documentSchema: this.documentSchema(),
      converter: { toDocument: SessionConverter.toDocument, toEntity: SessionConverter.toEntity },
    })
  }
}
