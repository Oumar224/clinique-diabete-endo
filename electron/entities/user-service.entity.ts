import { EntityRegistry } from '../automerge/entity-registry'
import { UserServiceConverter } from '../automerge/converters/user-service.converter'
import type { AutomergeDocument } from '../automerge/utils/entity-types'
import { SchemaField, buildDocumentSchema } from '../automerge/utils/schema-field'

export class UserServiceEntity {
  @SchemaField() user_id?: number
  @SchemaField() service_id?: number

  static documentType(): string { return 'UserService' }
  static documentSchema(): AutomergeDocument<UserServiceEntity> {
    return buildDocumentSchema(UserServiceEntity) as AutomergeDocument<UserServiceEntity>
  }
  static register(): void {
    EntityRegistry.getInstance().register({
      type: this.documentType(),
      tableName: 'user_service',
      documentSchema: this.documentSchema(),
      converter: { toDocument: UserServiceConverter.toDocument, toEntity: UserServiceConverter.toEntity },
    })
  }
}
