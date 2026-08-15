import { EntityConverter } from './entity-converter'
import type { AutomergeDocument } from '../utils/entity-types'
import { ExamCategoryEntity } from '../../entities/exam-category.entity'

export class ExamCategoryConverter {
  static toDocument(entity: ExamCategoryEntity): AutomergeDocument<ExamCategoryEntity> {
    return EntityConverter.toDocument(entity)
  }
  static toEntity(doc: AutomergeDocument<ExamCategoryEntity>): ExamCategoryEntity {
    return EntityConverter.toEntity(doc, ExamCategoryEntity)
  }
}
