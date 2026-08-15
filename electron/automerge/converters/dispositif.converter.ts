import { EntityConverter } from './entity-converter'
import type { AutomergeDocument } from '../utils/entity-types'
import { DispositifEntity } from '../../entities/dispositif.entity'

export class DispositifConverter {
  static toDocument(entity: DispositifEntity): AutomergeDocument<DispositifEntity> {
    return EntityConverter.toDocument(entity)
  }
  static toEntity(doc: AutomergeDocument<DispositifEntity>): DispositifEntity {
    return EntityConverter.toEntity(doc, DispositifEntity)
  }
}
