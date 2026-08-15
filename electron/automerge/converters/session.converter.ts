import { EntityConverter } from './entity-converter'
import type { AutomergeDocument } from '../utils/entity-types'
import { SessionEntity } from '../../entities/session.entity'

export class SessionConverter {
  static toDocument(entity: SessionEntity): AutomergeDocument<SessionEntity> {
    return EntityConverter.toDocument(entity as any) as any
  }
  static toEntity(doc: AutomergeDocument<SessionEntity>): SessionEntity {
    return EntityConverter.toEntity(doc as any, SessionEntity as any) as any
  }
}
