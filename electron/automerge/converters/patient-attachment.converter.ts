import { EntityConverter } from './entity-converter'
import type { AutomergeDocument } from '../utils/entity-types'
import { PatientAttachmentEntity } from '../../entities/patient-attachment.entity'

export class PatientAttachmentConverter {
  static toDocument(entity: PatientAttachmentEntity): AutomergeDocument<PatientAttachmentEntity> {
    return EntityConverter.toDocument(entity)
  }
  static toEntity(doc: AutomergeDocument<PatientAttachmentEntity>): PatientAttachmentEntity {
    return EntityConverter.toEntity(doc, PatientAttachmentEntity)
  }
}
