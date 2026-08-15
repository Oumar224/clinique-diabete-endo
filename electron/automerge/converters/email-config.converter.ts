import { EntityConverter } from './entity-converter'
import type { AutomergeDocument } from '../utils/entity-types'
import { EmailConfigEntity } from '../../entities/email-config.entity'

export class EmailConfigConverter {
  static toDocument(entity: EmailConfigEntity): AutomergeDocument<EmailConfigEntity> {
    return EntityConverter.toDocument(entity)
  }
  static toEntity(doc: AutomergeDocument<EmailConfigEntity>): EmailConfigEntity {
    return EntityConverter.toEntity(doc, EmailConfigEntity)
  }
}
