import { EntityConverter } from './entity-converter'
import type { AutomergeDocument } from '../utils/entity-types'
import { LocaliteEntity } from '../../entities/localite.entity'

export class LocaliteConverter {
  static toDocument(entity: LocaliteEntity): AutomergeDocument<LocaliteEntity> {
    return EntityConverter.toDocument(entity)
  }
  static toEntity(doc: AutomergeDocument<LocaliteEntity>): LocaliteEntity {
    return EntityConverter.toEntity(doc, LocaliteEntity)
  }
}
