import { EntityConverter } from './entity-converter'
import type { AutomergeDocument } from '../utils/entity-types'
import { ExamResultEntity } from '../../entities/exam-result.entity'

export class ExamResultConverter {
  static toDocument(entity: ExamResultEntity): AutomergeDocument<ExamResultEntity> {
    return EntityConverter.toDocument(entity)
  }
  static toEntity(doc: AutomergeDocument<ExamResultEntity>): ExamResultEntity {
    return EntityConverter.toEntity(doc, ExamResultEntity)
  }
}
