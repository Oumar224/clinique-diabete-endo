import { EntityRegistry } from '../automerge/entity-registry'
import { UserSiteConverter } from '../automerge/converters/user-site.converter'
import type { AutomergeDocument } from '../automerge/utils/entity-types'
import { SchemaField, buildDocumentSchema } from '../automerge/utils/schema-field'

export class UserSiteEntity {
  @SchemaField() user_id?: number
  @SchemaField() site_id?: number

  static documentType(): string { return 'UserSite' }
  static documentSchema(): AutomergeDocument<UserSiteEntity> {
    return buildDocumentSchema(UserSiteEntity) as AutomergeDocument<UserSiteEntity>
  }
  static register(): void {
    EntityRegistry.getInstance().register({
      type: this.documentType(),
      tableName: 'user_site',
      documentSchema: this.documentSchema(),
      converter: { toDocument: UserSiteConverter.toDocument, toEntity: UserSiteConverter.toEntity },
    })
  }
}
