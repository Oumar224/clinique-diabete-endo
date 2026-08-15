import { EntityRegistry } from '../automerge/entity-registry'
import { AppSettingsConverter } from '../automerge/converters/app-settings.converter'
import type { AutomergeDocument } from '../automerge/utils/entity-types'
import { SchemaField, buildDocumentSchema } from '../automerge/utils/schema-field'

export class AppSettingsEntity {
  @SchemaField() key?: string
  @SchemaField() value?: string

  static documentType(): string { return 'AppSettings' }
  static documentSchema(): AutomergeDocument<AppSettingsEntity> {
    return buildDocumentSchema(AppSettingsEntity) as AutomergeDocument<AppSettingsEntity>
  }
  static register(): void {
    EntityRegistry.getInstance().register({
      type: this.documentType(),
      tableName: 'app_settings',
      documentSchema: this.documentSchema(),
      converter: { toDocument: AppSettingsConverter.toDocument, toEntity: AppSettingsConverter.toEntity },
    })
  }
}
