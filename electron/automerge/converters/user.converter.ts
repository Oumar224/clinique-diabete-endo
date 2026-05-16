import { EntityConverter } from './entity-converter'
import type { AutomergeDocument } from '../utils/entity-types'
import { UserEntity } from '../../entities/user.entity'

export class UserConverter {
  static toDocument(user: UserEntity): AutomergeDocument<UserEntity> {
    return EntityConverter.toDocument(user)
  }
  static toEntity(doc: AutomergeDocument<UserEntity>): UserEntity {
    return EntityConverter.toEntity(doc, UserEntity)
  }
}
