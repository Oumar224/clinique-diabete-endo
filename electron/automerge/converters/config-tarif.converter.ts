import { EntityConverter } from './entity-converter'
import type { AutomergeDocument } from '../utils/entity-types'
import { ConfigTarifEntity } from '../../entities/config-tarif.entity'

export class ConfigTarifConverter {
  static toDocument(entity: ConfigTarifEntity): AutomergeDocument<ConfigTarifEntity> {
    return EntityConverter.toDocument(entity)
  }
  static toEntity(doc: AutomergeDocument<ConfigTarifEntity>): ConfigTarifEntity {
    return EntityConverter.toEntity(doc, ConfigTarifEntity)
  }
}
