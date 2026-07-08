import { inject, singleton } from 'tsyringe'
import { type Kysely } from 'kysely'
import { AppDatabaseDatasource } from '../sqlite-data-source'
import type { DB } from '../entities/database'
import type { DispositifDto } from '../dto/dispositif.dto'

@singleton()
export class DispositifsService {
  public db: Kysely<DB>

  constructor(@inject(AppDatabaseDatasource) datasource: AppDatabaseDatasource) {
    this.db = datasource.getInstance()
  }

  async list(patientId: number): Promise<DispositifDto[]> {
    const rows = await this.db
      .selectFrom('dispositifs')
      .selectAll()
      .where('patient_id', '=', patientId)
      .orderBy('id', 'desc')
      .execute()

    return rows.map(r => this.toDto(r))
  }

  async create(data: {
    patientId: number
    type: string
    datePose: string
    aspect: string
    volumeMl: number | null
  }): Promise<DispositifDto> {
    const now = new Date().toISOString()
    const result = await this.db
      .insertInto('dispositifs')
      .values({
        patient_id: data.patientId,
        type: data.type,
        date_pose: data.datePose,
        aspect: data.aspect,
        volume_ml: data.volumeMl,
        created_by: 1,
        created_at: now,
        updated_at: now,
      })
      .executeTakeFirst()

    const id = Number(result.insertId!)
    const saved = await this.db
      .selectFrom('dispositifs')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst()

    return this.toDto(saved!)
  }

  async delete(id: number): Promise<void> {
    await this.db
      .deleteFrom('dispositifs')
      .where('id', '=', id)
      .execute()
  }

  private toDto(row: Record<string, unknown>): DispositifDto {
    return {
      id: row.id as number,
      patientId: row.patient_id as number,
      type: row.type as string,
      datePose: row.date_pose as string,
      aspect: row.aspect as string,
      volumeMl: row.volume_ml as number | null,
      createdBy: row.created_by as number,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    }
  }
}
