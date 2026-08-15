import { EntityConverter } from './entity-converter'
import type { AutomergeDocument } from '../utils/entity-types'
import { VitalSignEntity } from '../../entities/vital-sign.entity'

export class VitalSignConverter {
  static toDocument(entity: VitalSignEntity): AutomergeDocument<VitalSignEntity> {
    return EntityConverter.toDocument(entity)
  }
  static toEntity(doc: AutomergeDocument<VitalSignEntity>): VitalSignEntity {
    return EntityConverter.toEntity(doc, VitalSignEntity)
  }
}
