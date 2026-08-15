import { EntityConverter } from './entity-converter'
import type { AutomergeDocument } from '../utils/entity-types'
import { ConservateurStockageEntity } from '../../entities/conservateur-stockage.entity'

export class ConservateurStockageConverter {
  static toDocument(entity: ConservateurStockageEntity): AutomergeDocument<ConservateurStockageEntity> {
    return EntityConverter.toDocument(entity)
  }
  static toEntity(doc: AutomergeDocument<ConservateurStockageEntity>): ConservateurStockageEntity {
    return EntityConverter.toEntity(doc, ConservateurStockageEntity)
  }
}
