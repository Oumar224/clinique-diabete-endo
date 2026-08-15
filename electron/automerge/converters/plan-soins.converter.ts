import { EntityConverter } from './entity-converter'
import type { AutomergeDocument } from '../utils/entity-types'
import { PlanSoinsEntity } from '../../entities/plan-soins.entity'

export class PlanSoinsConverter {
  static toDocument(entity: PlanSoinsEntity): AutomergeDocument<PlanSoinsEntity> {
    return EntityConverter.toDocument(entity)
  }
  static toEntity(doc: AutomergeDocument<PlanSoinsEntity>): PlanSoinsEntity {
    return EntityConverter.toEntity(doc, PlanSoinsEntity)
  }
}
