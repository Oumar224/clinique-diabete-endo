import { EntityConverter } from './entity-converter'
import type { AutomergeDocument } from '../utils/entity-types'
import { MedicalActEntity } from '../../entities/medical-act.entity'

export class MedicalActConverter {
  static toDocument(entity: MedicalActEntity): AutomergeDocument<MedicalActEntity> {
    return EntityConverter.toDocument(entity)
  }
  static toEntity(doc: AutomergeDocument<MedicalActEntity>): MedicalActEntity {
    return EntityConverter.toEntity(doc, MedicalActEntity)
  }
}
