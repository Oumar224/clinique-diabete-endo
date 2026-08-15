import { EntityConverter } from './entity-converter'
import type { AutomergeDocument } from '../utils/entity-types'
import { EncounterEntity } from '../../entities/encounter.entity'

export class EncounterConverter {
  static toDocument(entity: EncounterEntity): AutomergeDocument<EncounterEntity> {
    return EntityConverter.toDocument(entity)
  }
  static toEntity(doc: AutomergeDocument<EncounterEntity>): EncounterEntity {
    return EntityConverter.toEntity(doc, EncounterEntity)
  }
}
