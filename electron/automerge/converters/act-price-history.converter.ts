import { EntityConverter } from './entity-converter'
import type { AutomergeDocument } from '../utils/entity-types'
import { ActPriceHistoryEntity } from '../../entities/act-price-history.entity'

export class ActPriceHistoryConverter {
  static toDocument(entity: ActPriceHistoryEntity): AutomergeDocument<ActPriceHistoryEntity> {
    return EntityConverter.toDocument(entity)
  }
  static toEntity(doc: AutomergeDocument<ActPriceHistoryEntity>): ActPriceHistoryEntity {
    return EntityConverter.toEntity(doc, ActPriceHistoryEntity)
  }
}
