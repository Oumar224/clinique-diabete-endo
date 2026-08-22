import { EntityConverter } from './entity-converter'
import type { AutomergeDocument } from '../utils/entity-types'
import { DocumentAttachmentEntity } from '../../entities/document-attachment.entity'

export class DocumentAttachmentConverter {
  static toDocument(entity: DocumentAttachmentEntity): AutomergeDocument<DocumentAttachmentEntity> {
    return EntityConverter.toDocument(entity)
  }
  static toEntity(doc: AutomergeDocument<DocumentAttachmentEntity>): DocumentAttachmentEntity {
    return EntityConverter.toEntity(doc, DocumentAttachmentEntity)
  }
}
