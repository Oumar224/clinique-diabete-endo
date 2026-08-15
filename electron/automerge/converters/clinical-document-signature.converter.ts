import { EntityConverter } from './entity-converter'
import type { AutomergeDocument } from '../utils/entity-types'
import { ClinicalDocumentSignatureEntity } from '../../entities/clinical-document-signature.entity'

export class ClinicalDocumentSignatureConverter {
  static toDocument(entity: ClinicalDocumentSignatureEntity): AutomergeDocument<ClinicalDocumentSignatureEntity> {
    return EntityConverter.toDocument(entity as any) as any
  }
  static toEntity(doc: AutomergeDocument<ClinicalDocumentSignatureEntity>): ClinicalDocumentSignatureEntity {
    return EntityConverter.toEntity(doc as any, ClinicalDocumentSignatureEntity as any) as any
  }
}
