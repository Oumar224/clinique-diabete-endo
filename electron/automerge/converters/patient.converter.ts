import { EntityConverter } from './entity-converter'
import type { AutomergeDocument } from '../utils/entity-types'
import { PatientEntity } from '../../entities/patient.entity'

export class PatientConverter {
  static toDocument(patient: PatientEntity): AutomergeDocument<PatientEntity> {
    return EntityConverter.toDocument(patient)
  }
  static toEntity(doc: AutomergeDocument<PatientEntity>): PatientEntity {
    return EntityConverter.toEntity(doc, PatientEntity)
  }
}
