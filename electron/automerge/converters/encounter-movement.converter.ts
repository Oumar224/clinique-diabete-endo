import { EntityConverter } from './entity-converter'
import type { AutomergeDocument } from '../utils/entity-types'
import { EncounterMovementEntity } from '../../entities/encounter.entity'

export class EncounterMovementConverter {
  static toDocument(entity: EncounterMovementEntity): AutomergeDocument<EncounterMovementEntity> {
    return EntityConverter.toDocument(entity)
  }
  static toEntity(doc: AutomergeDocument<EncounterMovementEntity>): EncounterMovementEntity {
    return EntityConverter.toEntity(doc, EncounterMovementEntity)
  }
}
