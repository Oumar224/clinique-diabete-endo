import { EntityConverter } from './entity-converter'
import type { AutomergeDocument } from '../utils/entity-types'
import { AutomergeDocumentEntity } from '../../entities/automerge-document.entity'

export class AutomergeDocumentConverter {
  static toDocument(entity: AutomergeDocumentEntity): AutomergeDocument<AutomergeDocumentEntity> {
    return EntityConverter.toDocument(entity as any) as any
  }
  static toEntity(doc: AutomergeDocument<AutomergeDocumentEntity>): AutomergeDocumentEntity {
    return EntityConverter.toEntity(doc as any, AutomergeDocumentEntity as any) as any
  }
}
