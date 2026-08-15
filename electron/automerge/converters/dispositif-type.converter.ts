import { EntityConverter } from './entity-converter'
import type { AutomergeDocument } from '../utils/entity-types'
import { DispositifTypeEntity } from '../../entities/dispositif-type.entity'

export class DispositifTypeConverter {
  static toDocument(entity: DispositifTypeEntity): AutomergeDocument<DispositifTypeEntity> {
    return EntityConverter.toDocument(entity)
  }
  static toEntity(doc: AutomergeDocument<DispositifTypeEntity>): DispositifTypeEntity {
    return EntityConverter.toEntity(doc, DispositifTypeEntity)
  }
}
