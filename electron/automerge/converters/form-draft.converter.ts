import { EntityConverter } from './entity-converter'
import type { AutomergeDocument } from '../utils/entity-types'
import { FormDraftEntity } from '../../entities/form-draft.entity'

export class FormDraftConverter {
  static toDocument(entity: FormDraftEntity): AutomergeDocument<FormDraftEntity> {
    return EntityConverter.toDocument(entity)
  }
  static toEntity(doc: AutomergeDocument<FormDraftEntity>): FormDraftEntity {
    return EntityConverter.toEntity(doc, FormDraftEntity)
  }
}
