import { EntityConverter } from './entity-converter'
import type { AutomergeDocument } from '../utils/entity-types'
import { UserServiceEntity } from '../../entities/user-service.entity'

export class UserServiceConverter {
  static toDocument(entity: UserServiceEntity): AutomergeDocument<UserServiceEntity> {
    return EntityConverter.toDocument(entity as any) as any
  }
  static toEntity(doc: AutomergeDocument<UserServiceEntity>): UserServiceEntity {
    return EntityConverter.toEntity(doc as any, UserServiceEntity as any) as any
  }
}
