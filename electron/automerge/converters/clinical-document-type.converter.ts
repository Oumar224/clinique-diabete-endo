import { EntityConverter } from './entity-converter'
import type { AutomergeDocument } from '../utils/entity-types'
import { ClinicalDocumentTypeEntity } from '../../entities/clinical-document-type.entity'

export class ClinicalDocumentTypeConverter {
  static toDocument(entity: ClinicalDocumentTypeEntity): AutomergeDocument<ClinicalDocumentTypeEntity> {
    return EntityConverter.toDocument(entity)
  }
  static toEntity(doc: AutomergeDocument<ClinicalDocumentTypeEntity>): ClinicalDocumentTypeEntity {
    return EntityConverter.toEntity(doc, ClinicalDocumentTypeEntity)
  }
}
