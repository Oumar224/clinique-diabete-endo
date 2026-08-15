import { EntityConverter } from './entity-converter'
import type { AutomergeDocument } from '../utils/entity-types'
import { ConservateurChampLocalisationEntity } from '../../entities/conservateur-champ-localisation.entity'

export class ConservateurChampLocalisationConverter {
  static toDocument(entity: ConservateurChampLocalisationEntity): AutomergeDocument<ConservateurChampLocalisationEntity> {
    return EntityConverter.toDocument(entity)
  }
  static toEntity(doc: AutomergeDocument<ConservateurChampLocalisationEntity>): ConservateurChampLocalisationEntity {
    return EntityConverter.toEntity(doc, ConservateurChampLocalisationEntity)
  }
}
