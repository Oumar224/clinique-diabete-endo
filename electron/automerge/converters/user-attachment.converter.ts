import { EntityConverter } from './entity-converter'
import type { AutomergeDocument } from '../utils/entity-types'
import { UserAttachmentEntity } from '../../entities/user-attachment.entity'

export class UserAttachmentConverter {
  static toDocument(entity: UserAttachmentEntity): AutomergeDocument<UserAttachmentEntity> {
    return EntityConverter.toDocument(entity)
  }
  static toEntity(doc: AutomergeDocument<UserAttachmentEntity>): UserAttachmentEntity {
    return EntityConverter.toEntity(doc, UserAttachmentEntity)
  }
}
