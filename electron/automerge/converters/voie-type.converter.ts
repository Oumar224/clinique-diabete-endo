import { EntityConverter } from './entity-converter'
import type { AutomergeDocument } from '../utils/entity-types'
import { VoieTypeEntity } from '../../entities/voie-type.entity'

export class VoieTypeConverter {
  static toDocument(entity: VoieTypeEntity): AutomergeDocument<VoieTypeEntity> {
    return EntityConverter.toDocument(entity)
  }
  static toEntity(doc: AutomergeDocument<VoieTypeEntity>): VoieTypeEntity {
    return EntityConverter.toEntity(doc, VoieTypeEntity)
  }
}
