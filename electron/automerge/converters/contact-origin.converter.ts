import { EntityConverter } from './entity-converter'
import type { AutomergeDocument } from '../utils/entity-types'
import { ContactOriginEntity } from '../../entities/contact-origin.entity'

export class ContactOriginConverter {
  static toDocument(entity: ContactOriginEntity): AutomergeDocument<ContactOriginEntity> {
    return EntityConverter.toDocument(entity)
  }
  static toEntity(doc: AutomergeDocument<ContactOriginEntity>): ContactOriginEntity {
    return EntityConverter.toEntity(doc, ContactOriginEntity)
  }
}
