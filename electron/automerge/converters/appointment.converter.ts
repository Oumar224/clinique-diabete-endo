import { EntityConverter } from './entity-converter'
import type { AutomergeDocument } from '../utils/entity-types'
import { AppointmentEntity } from '../../entities/appointment.entity'

export class AppointmentConverter {
  static toDocument(appt: AppointmentEntity): AutomergeDocument<AppointmentEntity> {
    return EntityConverter.toDocument(appt)
  }
  static toEntity(doc: AutomergeDocument<AppointmentEntity>): AppointmentEntity {
    return EntityConverter.toEntity(doc, AppointmentEntity)
  }
}
