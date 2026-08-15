import { EntityConverter } from './entity-converter'
import type { AutomergeDocument } from '../utils/entity-types'
import { ExamParameterEntity } from '../../entities/exam-parameter.entity'

export class ExamParameterConverter {
  static toDocument(entity: ExamParameterEntity): AutomergeDocument<ExamParameterEntity> {
    return EntityConverter.toDocument(entity)
  }
  static toEntity(doc: AutomergeDocument<ExamParameterEntity>): ExamParameterEntity {
    return EntityConverter.toEntity(doc, ExamParameterEntity)
  }
}
