import { inject, singleton } from 'tsyringe'
import { type Kysely } from 'kysely'
import { AppDatabaseDatasource } from '../sqlite-data-source'
import type { DB } from '../entities/database'
import type { VitalSignsItemDto } from '../dto/vital-signs-item.dto'

@singleton()
export class VitalSignsItemService {
  public db: Kysely<DB>

  constructor(@inject(AppDatabaseDatasource) datasource: AppDatabaseDatasource) {
    this.db = datasource.getInstance()
  }

  async listByPatientAndDateRange(patientId: number, startDate: string, endDate: string): Promise<VitalSignsItemDto[]> {
    const rows = await this.db
      .selectFrom('vital_signs_items')
      .selectAll()
      .where('patient_id', '=', patientId)
      .where('date', '>=', startDate)
      .where('date', '<=', endDate)
      .orderBy('date', 'asc')
      .orderBy('hour', 'asc')
      .execute()

    return rows.map(r => this.toDto(r))
  }

  async save(patientId: number, data: {
    date: string
    hour: number
    taSystolique: number | null
    taDiastolique: number | null
    frequenceCardiaque: number | null
    temperature: number | null
    glycemie: number | null
    cetonemie: number | null
    glucosurie: string | null
    cetonurie: string | null
    saO2: number | null
    diurese: number | null
    poids: number | null
  }): Promise<VitalSignsItemDto> {
    const existing = await this.db
      .selectFrom('vital_signs_items')
      .selectAll()
      .where('patient_id', '=', patientId)
      .where('date', '=', data.date)
      .where('hour', '=', data.hour)
      .executeTakeFirst()

    const now = new Date().toISOString()
    const setValues = {
      ta_systolique: data.taSystolique,
      ta_diastolique: data.taDiastolique,
      frequence_cardiaque: data.frequenceCardiaque,
      temperature: data.temperature,
      glycemie: data.glycemie,
      cetonemie: data.cetonemie,
      glucosurie: data.glucosurie,
      cetonurie: data.cetonurie,
      sa_o2: data.saO2,
      diurese: data.diurese,
      poids: data.poids,
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
          date: data.date,
          hour: data.hour,
          ...setValues,
          created_by: 1,
          created_at: now,
        })
        .execute()
    }

    const saved = await this.db
      .selectFrom('vital_signs_items')
      .selectAll()
      .where('patient_id', '=', patientId)
      .where('date', '=', data.date)
      .where('hour', '=', data.hour)
      .executeTakeFirst()

    return this.toDto(saved!)
  }

  private toDto(row: Record<string, unknown>): VitalSignsItemDto {
    return {
      id: row.id as number,
      patientId: row.patient_id as number,
      date: row.date as string,
      hour: row.hour as number,
      taSystolique: row.ta_systolique as number | null,
      taDiastolique: row.ta_diastolique as number | null,
      frequenceCardiaque: row.frequence_cardiaque as number | null,
      temperature: row.temperature as number | null,
      glycemie: row.glycemie as number | null,
      cetonemie: row.cetonemie as number | null,
      glucosurie: row.glucosurie as string | null,
      cetonurie: row.cetonurie as string | null,
      saO2: row.sa_o2 as number | null,
      diurese: row.diurese as number | null,
      poids: row.poids as number | null,
      createdBy: row.created_by as number,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    }
  }
}
