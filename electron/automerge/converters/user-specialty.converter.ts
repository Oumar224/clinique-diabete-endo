import { EntityConverter } from './entity-converter'
import type { AutomergeDocument } from '../utils/entity-types'
import { UserSpecialtyEntity } from '../../entities/user-specialty.entity'

export class UserSpecialtyConverter {
  static toDocument(entity: UserSpecialtyEntity): AutomergeDocument<UserSpecialtyEntity> {
    return EntityConverter.toDocument(entity as any) as any
  }
  static toEntity(doc: AutomergeDocument<UserSpecialtyEntity>): UserSpecialtyEntity {
    return EntityConverter.toEntity(doc as any, UserSpecialtyEntity as any) as any
  }
}
