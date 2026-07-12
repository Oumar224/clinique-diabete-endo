import { inject, singleton } from 'tsyringe'
import { type Kysely } from 'kysely'
import { AppDatabaseDatasource } from '../sqlite-data-source'
import type { DB } from '../entities/database'
import { VitalSignEntity } from '../entities/vital-sign.entity'

@singleton()
export class VitalSignsService {
  public db: Kysely<DB>

  constructor(@inject(AppDatabaseDatasource) datasource: AppDatabaseDatasource) {
    this.db = datasource.getInstance()
  }

  async listByPatientAndDateRange(patientId: number, startDate: string, endDate: string): Promise<VitalSignEntity[]> {
    const rows = await this.db
      .selectFrom('vital_signs')
      .selectAll()
      .where('patient_id', '=', patientId)
      .where('date', '>=', startDate)
      .where('date', '<=', endDate)
      .orderBy('date', 'asc')
      .orderBy('id', 'asc')
      .execute()

    return rows as unknown as VitalSignEntity[]
  }

  async getToday(patientId: number): Promise<VitalSignEntity | null> {
    const today = new Date().toISOString().slice(0, 10)
    const row = await this.db
      .selectFrom('vital_signs')
      .selectAll()
      .where('patient_id', '=', patientId)
      .where('date', '=', today)
      .executeTakeFirst()

    if (!row) return null

    return row as unknown as VitalSignEntity
  }

  async save(entity: VitalSignEntity): Promise<VitalSignEntity> {
    const patientId = entity.patient_id!
    const date = entity.date!

    const existing = await this.db
      .selectFrom('vital_signs')
      .selectAll()
      .where('patient_id', '=', patientId)
      .where('date', '=', date)
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
        .updateTable('vital_signs')
        .set(setValues)
        .where('id', '=', existing.id!)
        .execute()
    } else {
      await this.db
        .insertInto('vital_signs')
        .values({
          patient_id: patientId,
          date,
          ...setValues,
          created_by: entity.created_by ?? 1,
          created_at: now,
        })
        .execute()
    }

    const saved = await this.db
      .selectFrom('vital_signs')
      .selectAll()
      .where('patient_id', '=', patientId)
      .where('date', '=', date)
      .executeTakeFirst()

    return saved as unknown as VitalSignEntity
  }
}
