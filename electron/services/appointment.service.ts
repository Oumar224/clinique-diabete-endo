import { inject, singleton } from 'tsyringe'
import type { Kysely } from 'kysely'
import { AppDatabaseDatasource } from '../sqlite-data-source'
import type { DB } from '../entities/database'
import type { AppointmentEntity } from '../entities/appointment.entity'

@singleton()
export class AppointmentService {
  public db: Kysely<DB>

  constructor(@inject(AppDatabaseDatasource) datasource: AppDatabaseDatasource) {
    this.db = datasource.getInstance()
  }

  async list(date?: string): Promise<AppointmentEntity[]> {
    let query = this.db.selectFrom('appointment').selectAll().orderBy('time', 'asc')
    if (date) {
      query = query.where('date', '=', date) as typeof query
    }
    return await query.execute()
  }

  async create(entity: AppointmentEntity): Promise<AppointmentEntity> {
    await this.db
      .insertInto('appointment')
      .values({
        patient_id: entity.patient_id!,
        date: entity.date!,
        time: entity.time!,
        motif: entity.motif ?? undefined,
        status: 'confirmed',
        medecin_id: entity.medecin_id ?? undefined,
        notes: entity.notes ?? undefined,
      })
      .execute()

    const result = await this.db
      .selectFrom('appointment')
      .selectAll()
      .orderBy('id', 'desc')
      .limit(1)
      .executeTakeFirst()

    if (!result) throw new Error('Failed to retrieve inserted appointment')
    return result
  }

  async updateStatus(id: number, status: AppointmentEntity['status']): Promise<void> {
    await this.db
      .updateTable('appointment')
      .set({ status })
      .where('id', '=', id)
      .execute()
  }
}
