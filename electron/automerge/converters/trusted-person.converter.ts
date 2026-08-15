import { EntityConverter } from './entity-converter'
import type { AutomergeDocument } from '../utils/entity-types'
import { TrustedPersonEntity } from '../../entities/trusted-person.entity'

export class TrustedPersonConverter {
  static toDocument(entity: TrustedPersonEntity): AutomergeDocument<TrustedPersonEntity> {
    return EntityConverter.toDocument(entity)
  }
  static toEntity(doc: AutomergeDocument<TrustedPersonEntity>): TrustedPersonEntity {
    return EntityConverter.toEntity(doc, TrustedPersonEntity)
  }
}
