import { EntityConverter } from './entity-converter'
import type { AutomergeDocument } from '../utils/entity-types'
import { FonctionEntity } from '../../entities/fonction.entity'

export class FonctionConverter {
  static toDocument(entity: FonctionEntity): AutomergeDocument<FonctionEntity> {
    return EntityConverter.toDocument(entity)
  }
  static toEntity(doc: AutomergeDocument<FonctionEntity>): FonctionEntity {
    return EntityConverter.toEntity(doc, FonctionEntity)
  }
}
