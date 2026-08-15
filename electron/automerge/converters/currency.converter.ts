import { EntityConverter } from './entity-converter'
import type { AutomergeDocument } from '../utils/entity-types'
import { CurrencyEntity } from '../../entities/currency.entity'

export class CurrencyConverter {
  static toDocument(entity: CurrencyEntity): AutomergeDocument<CurrencyEntity> {
    return EntityConverter.toDocument(entity as any) as any
  }
  static toEntity(doc: AutomergeDocument<CurrencyEntity>): CurrencyEntity {
    return EntityConverter.toEntity(doc as any, CurrencyEntity as any) as any
  }
}
