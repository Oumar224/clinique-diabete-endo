import { EntityConverter } from './entity-converter'
import type { AutomergeDocument } from '../utils/entity-types'
import { StayEntity } from '../../entities/stay.entity'

export class StayConverter {
  static toDocument(entity: StayEntity): AutomergeDocument<StayEntity> {
    return EntityConverter.toDocument(entity)
  }
  static toEntity(doc: AutomergeDocument<StayEntity>): StayEntity {
    return EntityConverter.toEntity(doc, StayEntity)
  }
}
