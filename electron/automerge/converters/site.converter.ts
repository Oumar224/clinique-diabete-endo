import { EntityConverter } from './entity-converter'
import type { AutomergeDocument } from '../utils/entity-types'
import { SiteEntity } from '../../entities/site.entity'

export class SiteConverter {
  static toDocument(entity: SiteEntity): AutomergeDocument<SiteEntity> {
    return EntityConverter.toDocument(entity)
  }
  static toEntity(doc: AutomergeDocument<SiteEntity>): SiteEntity {
    return EntityConverter.toEntity(doc, SiteEntity)
  }
}
