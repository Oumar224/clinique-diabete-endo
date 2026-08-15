import { EntityRegistry } from '../automerge/entity-registry'
import { UserMedicalUnitConverter } from '../automerge/converters/user-medical-unit.converter'
import type { AutomergeDocument } from '../automerge/utils/entity-types'
import { SchemaField, buildDocumentSchema } from '../automerge/utils/schema-field'

export class UserMedicalUnitEntity {
  @SchemaField() user_id?: number
  @SchemaField() medical_unit_id?: number

  static documentType(): string { return 'UserMedicalUnit' }
  static documentSchema(): AutomergeDocument<UserMedicalUnitEntity> {
    return buildDocumentSchema(UserMedicalUnitEntity) as AutomergeDocument<UserMedicalUnitEntity>
  }
  static register(): void {
    EntityRegistry.getInstance().register({
      type: this.documentType(),
      tableName: 'user_medical_unit',
      documentSchema: this.documentSchema(),
      converter: { toDocument: UserMedicalUnitConverter.toDocument, toEntity: UserMedicalUnitConverter.toEntity },
    })
  }
}
