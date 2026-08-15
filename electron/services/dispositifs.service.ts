import { inject, singleton } from 'tsyringe'
import { type Kysely } from 'kysely'
import { AppDatabaseDatasource } from '../sqlite-data-source'
import type { DB } from '../entities/database'
import { DispositifEntity } from '../entities/dispositif.entity'
import { validateForeignKeys } from './utils/fk-validator'

@singleton()
export class DispositifsService {
  public db: Kysely<DB>

  constructor(@inject(AppDatabaseDatasource) datasource: AppDatabaseDatasource) {
    this.db = datasource.getInstance()
  }

  async list(patientId: number): Promise<DispositifEntity[]> {
    const rows = await this.db
      .selectFrom('dispositifs')
      .selectAll()
      .where('patient_id', '=', patientId)
      .orderBy('id', 'desc')
      .execute()

    return rows as unknown as DispositifEntity[]
  }

  async create(entity: DispositifEntity): Promise<DispositifEntity> {
    // Validate foreign keys before insert
    await validateForeignKeys(this.db as any, [
      { table: 'patient', column: 'patient_id', value: entity.patient_id },
      { table: 'user', column: 'created_by', value: entity.created_by },
    ])

    const now = new Date().toISOString()
    const result = await this.db
      .insertInto('dispositifs')
      .values({
        patient_id: entity.patient_id,
        type: entity.type,
        date_pose: entity.date_pose,
        aspect: entity.aspect,
        volume_ml: entity.volume_ml,
        created_by: entity.created_by ?? 1,
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

    return saved as unknown as DispositifEntity
  }

  async delete(id: number): Promise<void> {
    await this.db
      .deleteFrom('dispositifs')
      .where('id', '=', id)
      .execute()
  }
}
