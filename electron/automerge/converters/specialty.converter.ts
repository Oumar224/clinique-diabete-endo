import { EntityConverter } from './entity-converter'
import type { AutomergeDocument } from '../utils/entity-types'
import { SpecialtyEntity } from '../../entities/specialty.entity'

export class SpecialtyConverter {
  static toDocument(entity: SpecialtyEntity): AutomergeDocument<SpecialtyEntity> {
    return EntityConverter.toDocument(entity)
  }
  static toEntity(doc: AutomergeDocument<SpecialtyEntity>): SpecialtyEntity {
    return EntityConverter.toEntity(doc, SpecialtyEntity)
  }
}
