import { EntityConverter } from './entity-converter'
import type { AutomergeDocument } from '../utils/entity-types'
import { VitalSignsItemEntity } from '../../entities/vital-signs-item.entity'

export class VitalSignsItemConverter {
  static toDocument(entity: VitalSignsItemEntity): AutomergeDocument<VitalSignsItemEntity> {
    return EntityConverter.toDocument(entity)
  }
  static toEntity(doc: AutomergeDocument<VitalSignsItemEntity>): VitalSignsItemEntity {
    return EntityConverter.toEntity(doc, VitalSignsItemEntity)
  }
}
