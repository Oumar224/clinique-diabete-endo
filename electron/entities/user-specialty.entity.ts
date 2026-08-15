import { EntityRegistry } from '../automerge/entity-registry'
import { UserSpecialtyConverter } from '../automerge/converters/user-specialty.converter'
import type { AutomergeDocument } from '../automerge/utils/entity-types'
import { SchemaField, buildDocumentSchema } from '../automerge/utils/schema-field'

export class UserSpecialtyEntity {
  @SchemaField() user_id?: number
  @SchemaField() specialty_id?: number

  static documentType(): string { return 'UserSpecialty' }
  static documentSchema(): AutomergeDocument<UserSpecialtyEntity> {
    return buildDocumentSchema(UserSpecialtyEntity) as AutomergeDocument<UserSpecialtyEntity>
  }
  static register(): void {
    EntityRegistry.getInstance().register({
      type: this.documentType(),
      tableName: 'user_specialty',
      documentSchema: this.documentSchema(),
      converter: { toDocument: UserSpecialtyConverter.toDocument, toEntity: UserSpecialtyConverter.toEntity },
    })
  }
}
