import { EntityConverter } from './entity-converter'
import type { AutomergeDocument } from '../utils/entity-types'
import { ClinicalDocumentEntity } from '../../entities/clinical-document.entity'

export class ClinicalDocumentConverter {
  static toDocument(entity: ClinicalDocumentEntity): AutomergeDocument<ClinicalDocumentEntity> {
    return EntityConverter.toDocument(entity as any) as any
  }
  static toEntity(doc: AutomergeDocument<ClinicalDocumentEntity>): ClinicalDocumentEntity {
    return EntityConverter.toEntity(doc as any, ClinicalDocumentEntity as any) as any
  }
}
