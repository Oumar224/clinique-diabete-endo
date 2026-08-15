import { EntityConverter } from './entity-converter'
import type { AutomergeDocument } from '../utils/entity-types'
import { AttachmentTypeEntity } from '../../entities/attachment-type.entity'

export class AttachmentTypeConverter {
  static toDocument(entity: AttachmentTypeEntity): AutomergeDocument<AttachmentTypeEntity> {
    return EntityConverter.toDocument(entity)
  }
  static toEntity(doc: AutomergeDocument<AttachmentTypeEntity>): AttachmentTypeEntity {
    return EntityConverter.toEntity(doc, AttachmentTypeEntity)
  }
}
