import { EntityConverter } from './entity-converter'
import type { AutomergeDocument } from '../utils/entity-types'
import { ExamRequestAttachmentEntity } from '../../entities/exam-request-attachment.entity'

export class ExamRequestAttachmentConverter {
  static toDocument(entity: ExamRequestAttachmentEntity): AutomergeDocument<ExamRequestAttachmentEntity> {
    return EntityConverter.toDocument(entity)
  }
  static toEntity(doc: AutomergeDocument<ExamRequestAttachmentEntity>): ExamRequestAttachmentEntity {
    return EntityConverter.toEntity(doc, ExamRequestAttachmentEntity)
  }
}
