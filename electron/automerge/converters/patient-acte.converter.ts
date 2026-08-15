import { EntityConverter } from './entity-converter'
import type { AutomergeDocument } from '../utils/entity-types'
import { PatientActeEntity } from '../../entities/patient-acte.entity'

export class PatientActeConverter {
  static toDocument(entity: PatientActeEntity): AutomergeDocument<PatientActeEntity> {
    return EntityConverter.toDocument(entity)
  }
  static toEntity(doc: AutomergeDocument<PatientActeEntity>): PatientActeEntity {
    return EntityConverter.toEntity(doc, PatientActeEntity)
  }
}
