import { EntityConverter } from './entity-converter'
import type { AutomergeDocument } from '../utils/entity-types'
import { UserSiteEntity } from '../../entities/user-site.entity'

export class UserSiteConverter {
  static toDocument(entity: UserSiteEntity): AutomergeDocument<UserSiteEntity> {
    return EntityConverter.toDocument(entity as any) as any
  }
  static toEntity(doc: AutomergeDocument<UserSiteEntity>): UserSiteEntity {
    return EntityConverter.toEntity(doc as any, UserSiteEntity as any) as any
  }
}
