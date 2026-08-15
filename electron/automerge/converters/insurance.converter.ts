import { EntityConverter } from './entity-converter'
import type { AutomergeDocument } from '../utils/entity-types'
import { InsuranceEntity } from '../../entities/insurance.entity'

export class InsuranceConverter {
  static toDocument(entity: InsuranceEntity): AutomergeDocument<InsuranceEntity> {
    return EntityConverter.toDocument(entity)
  }
  static toEntity(doc: AutomergeDocument<InsuranceEntity>): InsuranceEntity {
    return EntityConverter.toEntity(doc, InsuranceEntity)
  }
}
