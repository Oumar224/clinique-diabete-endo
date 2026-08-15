import { EntityConverter } from './entity-converter'
import type { AutomergeDocument } from '../utils/entity-types'
import { UserFavoriteServiceEntity } from '../../entities/user-favorite-service.entity'

export class UserFavoriteServiceConverter {
  static toDocument(entity: UserFavoriteServiceEntity): AutomergeDocument<UserFavoriteServiceEntity> {
    return EntityConverter.toDocument(entity as any) as any
  }
  static toEntity(doc: AutomergeDocument<UserFavoriteServiceEntity>): UserFavoriteServiceEntity {
    return EntityConverter.toEntity(doc as any, UserFavoriteServiceEntity as any) as any
  }
}
