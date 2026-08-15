import { EntityConverter } from './entity-converter'
import type { AutomergeDocument } from '../utils/entity-types'
import { MedicalUnitEntity } from '../../entities/medical-unit.entity'

export class MedicalUnitConverter {
  static toDocument(entity: MedicalUnitEntity): AutomergeDocument<MedicalUnitEntity> {
    return EntityConverter.toDocument(entity)
  }
  static toEntity(doc: AutomergeDocument<MedicalUnitEntity>): MedicalUnitEntity {
    return EntityConverter.toEntity(doc, MedicalUnitEntity)
  }
}
