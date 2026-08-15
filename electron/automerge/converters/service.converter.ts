import { EntityConverter } from './entity-converter'
import type { AutomergeDocument } from '../utils/entity-types'
import { ServiceEntity } from '../../entities/service.entity'

export class ServiceConverter {
  static toDocument(entity: ServiceEntity): AutomergeDocument<ServiceEntity> {
    return EntityConverter.toDocument(entity)
  }
  static toEntity(doc: AutomergeDocument<ServiceEntity>): ServiceEntity {
    return EntityConverter.toEntity(doc, ServiceEntity)
  }
}
