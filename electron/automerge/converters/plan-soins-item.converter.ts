import { EntityConverter } from './entity-converter'
import type { AutomergeDocument } from '../utils/entity-types'
import { PlanSoinsItemEntity } from '../../entities/plan-soins.entity'

export class PlanSoinsItemConverter {
  static toDocument(entity: PlanSoinsItemEntity): AutomergeDocument<PlanSoinsItemEntity> {
    return EntityConverter.toDocument(entity)
  }
  static toEntity(doc: AutomergeDocument<PlanSoinsItemEntity>): PlanSoinsItemEntity {
    return EntityConverter.toEntity(doc, PlanSoinsItemEntity)
  }
}
