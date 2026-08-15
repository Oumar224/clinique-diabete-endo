import { inject, singleton } from 'tsyringe'
import { type Kysely } from 'kysely'
import { AppDatabaseDatasource } from '../sqlite-data-source'
import type { DB } from '../entities/database'
import { VitalSignsItemEntity } from '../entities/vital-signs-item.entity'

@singleton()
export class VitalSignsItemService {
  public db: Kysely<DB>

  constructor(@inject(AppDatabaseDatasource) datasource: AppDatabaseDatasource) {
    this.db = datasource.getInstance()
  }

  async listByPatientAndDateRange(patientId: number, startDate: string, endDate: string): Promise<VitalSignsItemEntity[]> {
    const rows = await this.db
      .selectFrom('vital_signs_items')
      .selectAll()
      .where('patient_id', '=', patientId)
      .where('date', '>=', startDate)
      .where('date', '<=', endDate)
      .orderBy('date', 'asc')
      .orderBy('hour', 'asc')
      .execute()

    return rows as unknown as VitalSignsItemEntity[]
  }

  async save(entity: VitalSignsItemEntity): Promise<VitalSignsItemEntity> {
    const patientId = entity.patient_id!
    const date = entity.date!
    const hour = entity.hour!

    const existing = await this.db
      .selectFrom('vital_signs_items')
      .selectAll()
      .where('patient_id', '=', patientId)
      .where('date', '=', date)
      .where('hour', '=', hour)
      .executeTakeFirst()

    const now = new Date().toISOString()
    const setValues = {
      ta_systolique: entity.ta_systolique,
      ta_diastolique: entity.ta_diastolique,
      frequence_cardiaque: entity.frequence_cardiaque,
      temperature: entity.temperature,
      glycemie: entity.glycemie,
      cetonemie: entity.cetonemie,
      glucosurie: entity.glucosurie,
      cetonurie: entity.cetonurie,
      sa_o2: entity.sa_o2,
      diurese: entity.diurese,
      poids: entity.poids,
      updated_at: now,
    }

    if (existing) {
      await this.db
        .updateTable('vital_signs_items')
        .set(setValues)
        .where('id', '=', existing.id!)
        .execute()
    } else {
      await this.db
        .insertInto('vital_signs_items')
        .values({
          patient_id: patientId,
          date,
          hour,
          ...setValues,
          created_by: entity.created_by ?? 1,
          created_at: now,
        })
        .execute()
    }

    const saved = await this.db
      .selectFrom('vital_signs_items')
      .selectAll()
      .where('patient_id', '=', patientId)
      .where('date', '=', date)
      .where('hour', '=', hour)
      .executeTakeFirst()

    return saved as unknown as VitalSignsItemEntity
  }

  async delete(id: number): Promise<void> {
    await this.db.deleteFrom('vital_signs_items').where('id', '=', id).execute()
  }
}
