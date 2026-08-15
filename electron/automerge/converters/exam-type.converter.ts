import { EntityConverter } from './entity-converter'
import type { AutomergeDocument } from '../utils/entity-types'
import { ExamTypeEntity } from '../../entities/exam-type.entity'

export class ExamTypeConverter {
  static toDocument(entity: ExamTypeEntity): AutomergeDocument<ExamTypeEntity> {
    return EntityConverter.toDocument(entity)
  }
  static toEntity(doc: AutomergeDocument<ExamTypeEntity>): ExamTypeEntity {
    return EntityConverter.toEntity(doc, ExamTypeEntity)
  }
}
