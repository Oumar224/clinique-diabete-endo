import { EntityConverter } from './entity-converter'
import type { AutomergeDocument } from '../utils/entity-types'
import { ExamRequestEntity } from '../../entities/exam-request.entity'

export class ExamRequestConverter {
  static toDocument(entity: ExamRequestEntity): AutomergeDocument<ExamRequestEntity> {
    return EntityConverter.toDocument(entity)
  }
  static toEntity(doc: AutomergeDocument<ExamRequestEntity>): ExamRequestEntity {
    return EntityConverter.toEntity(doc, ExamRequestEntity)
  }
}
