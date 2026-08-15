import { EntityConverter } from './entity-converter'
import type { AutomergeDocument } from '../utils/entity-types'
import { AppSettingsEntity } from '../../entities/app-settings.entity'

export class AppSettingsConverter {
  static toDocument(entity: AppSettingsEntity): AutomergeDocument<AppSettingsEntity> {
    return EntityConverter.toDocument(entity as any) as any
  }
  static toEntity(doc: AutomergeDocument<AppSettingsEntity>): AppSettingsEntity {
    return EntityConverter.toEntity(doc as any, AppSettingsEntity as any) as any
  }
}
