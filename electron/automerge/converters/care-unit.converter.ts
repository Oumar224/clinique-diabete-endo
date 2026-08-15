import { EntityConverter } from './entity-converter'
import type { AutomergeDocument } from '../utils/entity-types'
import { CareUnitEntity } from '../../entities/care-unit.entity'

export class CareUnitConverter {
  static toDocument(entity: CareUnitEntity): AutomergeDocument<CareUnitEntity> {
    return EntityConverter.toDocument(entity)
  }
  static toEntity(doc: AutomergeDocument<CareUnitEntity>): CareUnitEntity {
    return EntityConverter.toEntity(doc, CareUnitEntity)
  }
}
