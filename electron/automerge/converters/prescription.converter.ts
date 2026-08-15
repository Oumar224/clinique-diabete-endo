import { EntityConverter } from './entity-converter'
import type { AutomergeDocument } from '../utils/entity-types'
import { PrescriptionEntity } from '../../entities/prescription.entity'

export class PrescriptionConverter {
  static toDocument(entity: PrescriptionEntity): AutomergeDocument<PrescriptionEntity> {
    return EntityConverter.toDocument(entity)
  }
  static toEntity(doc: AutomergeDocument<PrescriptionEntity>): PrescriptionEntity {
    return EntityConverter.toEntity(doc, PrescriptionEntity)
  }
}
