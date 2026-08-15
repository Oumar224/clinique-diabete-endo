import type { ClinicalDocumentSignatureDTO } from '../dto/clinical-document-signature.dto'
import { EntityRegistry } from '../automerge/entity-registry'
import { ClinicalDocumentSignatureConverter } from '../automerge/converters/clinical-document-signature.converter'
import type { AutomergeDocument } from '../automerge/utils/entity-types'
import { SchemaField, buildDocumentSchema } from '../automerge/utils/schema-field'

export class ClinicalDocumentSignatureEntity {
  @SchemaField() id?: number
  @SchemaField() document_id?: string
  @SchemaField() user_id?: string
  @SchemaField() signature_hash?: string
  @SchemaField() signed_at?: string

  static toDto(entity: ClinicalDocumentSignatureEntity): ClinicalDocumentSignatureDTO {
    return {
      id: entity.id!,
      documentId: entity.document_id!,
      userId: entity.user_id!,
      signatureHash: entity.signature_hash!,
      signedAt: entity.signed_at!,
    }
  }

  static toDtos(entities: ClinicalDocumentSignatureEntity[]): ClinicalDocumentSignatureDTO[] {
    return entities.map(ClinicalDocumentSignatureEntity.toDto)
  }

  static fromDto(dto: ClinicalDocumentSignatureDTO): ClinicalDocumentSignatureEntity {
    const e = new ClinicalDocumentSignatureEntity()
    e.id = dto.id
    e.document_id = dto.documentId
    e.user_id = dto.userId
    e.signature_hash = dto.signatureHash
    e.signed_at = dto.signedAt
    return e
  }

  static documentType(): string {
    return 'ClinicalDocumentSignature'
  }

  static documentSchema(): AutomergeDocument<ClinicalDocumentSignatureEntity> {
    return buildDocumentSchema(ClinicalDocumentSignatureEntity) as AutomergeDocument<ClinicalDocumentSignatureEntity>
  }

  static register(): void {
    EntityRegistry.getInstance().register({
      type: this.documentType(),
      tableName: 'clinical_document_signature',
      documentSchema: this.documentSchema(),
      converter: { toDocument: ClinicalDocumentSignatureConverter.toDocument, toEntity: ClinicalDocumentSignatureConverter.toEntity },
    })
  }
}