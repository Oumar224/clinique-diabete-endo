import { inject, singleton } from 'tsyringe'
import { type Kysely } from 'kysely'
import { AppDatabaseDatasource } from '../sqlite-data-source'
import type { DB } from '../entities/database'
import type { VitalSignsDto } from '../dto/vital-signs.dto'

@singleton()
export class VitalSignsService {
  public db: Kysely<DB>

  constructor(@inject(AppDatabaseDatasource) datasource: AppDatabaseDatasource) {
    this.db = datasource.getInstance()
  }

  async listByPatientAndDateRange(patientId: number, startDate: string, endDate: string): Promise<VitalSignsDto[]> {
    const rows = await this.db
      .selectFrom('vital_signs')
      .selectAll()
      .where('patient_id', '=', patientId)
      .where('date', '>=', startDate)
      .where('date', '<=', endDate)
      .orderBy('date', 'asc')
      .orderBy('id', 'asc')
      .execute()

    return rows.map(r => this.toDto(r))
  }

  async getToday(patientId: number): Promise<VitalSignsDto | null> {
    const today = new Date().toISOString().slice(0, 10)
    const row = await this.db
      .selectFrom('vital_signs')
      .selectAll()
      .where('patient_id', '=', patientId)
      .where('date', '=', today)
      .executeTakeFirst()

    if (!row) return null

    return this.toDto(row)
  }

  async save(patientId: number, data: {
    date: string
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
  }): Promise<VitalSignsDto> {
    const existing = await this.db
      .selectFrom('vital_signs')
      .selectAll()
      .where('patient_id', '=', patientId)
      .where('date', '=', data.date)
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
        .updateTable('vital_signs')
        .set(setValues)
        .where('id', '=', existing.id!)
        .execute()
    } else {
      await this.db
        .insertInto('vital_signs')
        .values({
          patient_id: patientId,
          date: data.date,
          ...setValues,
          created_by: 1,
          created_at: now,
        })
        .execute()
    }

    const saved = await this.db
      .selectFrom('vital_signs')
      .selectAll()
      .where('patient_id', '=', patientId)
      .where('date', '=', data.date)
      .executeTakeFirst()

    return this.toDto(saved!)
  }

  private toDto(row: Record<string, unknown>): VitalSignsDto {
    return {
      id: row.id as number,
      patientId: row.patient_id as number,
      date: row.date as string,
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
