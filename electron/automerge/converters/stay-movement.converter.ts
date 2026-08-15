import { EntityConverter } from './entity-converter'
import type { AutomergeDocument } from '../utils/entity-types'
import { StayMovementEntity } from '../../entities/stay.entity'

export class StayMovementConverter {
  static toDocument(entity: StayMovementEntity): AutomergeDocument<StayMovementEntity> {
    return EntityConverter.toDocument(entity)
  }
  static toEntity(doc: AutomergeDocument<StayMovementEntity>): StayMovementEntity {
    return EntityConverter.toEntity(doc, StayMovementEntity)
  }
}
