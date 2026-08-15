import { EntityConverter } from './entity-converter'
import type { AutomergeDocument } from '../utils/entity-types'
import { UserMedicalUnitEntity } from '../../entities/user-medical-unit.entity'

export class UserMedicalUnitConverter {
  static toDocument(entity: UserMedicalUnitEntity): AutomergeDocument<UserMedicalUnitEntity> {
    return EntityConverter.toDocument(entity as any) as any
  }
  static toEntity(doc: AutomergeDocument<UserMedicalUnitEntity>): UserMedicalUnitEntity {
    return EntityConverter.toEntity(doc as any, UserMedicalUnitEntity as any) as any
  }
}
