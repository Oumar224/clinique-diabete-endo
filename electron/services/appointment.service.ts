import { inject, singleton } from 'tsyringe'
import type { Kysely } from 'kysely'
import { sql } from 'kysely'
import { AppDatabaseDatasource } from '../sqlite-data-source'
import type { DB } from '../entities/database'
import type { AppointmentEntity } from '../entities/appointment.entity'
import type { AppointmentDto } from '../dto/appointment.dto'

@singleton()
export class AppointmentService {
  public db: Kysely<DB>
  private hasNewColumns: boolean | null = null

  constructor(@inject(AppDatabaseDatasource) datasource: AppDatabaseDatasource) {
    this.db = datasource.getInstance()
  }

  private async checkHasNewColumns(): Promise<boolean> {
    if (this.hasNewColumns !== null) return this.hasNewColumns
    try {
      const result = await sql<{ name: string }[]>`
        SELECT name FROM pragma_table_info('appointment') WHERE name = 'service_id'
      `.execute(this.db)
      this.hasNewColumns = result.rows.length > 0
    } catch {
      this.hasNewColumns = false
    }
    return this.hasNewColumns
  }

  async listByPatient(patientId: number): Promise<AppointmentDto[]> {
    try {
      if (await this.checkHasNewColumns()) {
        return await this.listByPatientJoined(patientId)
      }
    } catch { /* fall through */ }
    return await this.listByPatientSimple(patientId)
  }

  private async listByPatientJoined(patientId: number): Promise<AppointmentDto[]> {
    const rows = await this.db
      .selectFrom('appointment')
      .leftJoin('user', 'user.id', 'appointment.medecin_id')
      .leftJoin('services', 'services.id', 'appointment.service_id')
      .leftJoin('care_units', 'care_units.id', 'appointment.care_unit_id')
      .select([
        'appointment.id',
        'appointment.patient_id',
        'appointment.date',
        'appointment.time',
        'appointment.motif',
        'appointment.status',
        'appointment.medecin_id',
        'appointment.service_id',
        'appointment.care_unit_id',
        'appointment.notes',
        'appointment.created_at',
        'appointment.updated_at',
        'services.name as service_name',
        'care_units.name as care_unit_name',
      ])
      .select(sql<string>`TRIM(COALESCE(user.nom, '') || ' ' || COALESCE(user.prenom, ''))`.as('medecin_name'))
      .where('appointment.patient_id', '=', patientId)
      .orderBy('appointment.date', 'desc')
      .orderBy('appointment.time', 'asc')
      .execute()

    return rows as any
  }

  private async listByPatientSimple(patientId: number): Promise<AppointmentDto[]> {
    const rows = await this.db
      .selectFrom('appointment')
      .leftJoin('user', 'user.id', 'appointment.medecin_id')
      .select([
        'appointment.id',
        'appointment.patient_id',
        'appointment.date',
        'appointment.time',
        'appointment.motif',
        'appointment.status',
        'appointment.medecin_id',
        'appointment.notes',
        'appointment.created_at',
        'appointment.updated_at',
      ])
      .select(sql<string>`TRIM(COALESCE(user.nom, '') || ' ' || COALESCE(user.prenom, ''))`.as('medecin_name'))
      .where('appointment.patient_id', '=', patientId)
      .orderBy('appointment.date', 'desc')
      .orderBy('appointment.time', 'asc')
      .execute()

    return rows as any
  }

  async getById(id: number): Promise<AppointmentDto | null> {
    try {
      if (await this.checkHasNewColumns()) {
        return await this.getByIdJoined(id)
      }
    } catch { /* fall through */ }
    return await this.getByIdSimple(id)
  }

  private async getByIdJoined(id: number): Promise<AppointmentDto | null> {
    const row = await this.db
      .selectFrom('appointment')
      .leftJoin('user', 'user.id', 'appointment.medecin_id')
      .leftJoin('services', 'services.id', 'appointment.service_id')
      .leftJoin('care_units', 'care_units.id', 'appointment.care_unit_id')
      .select([
        'appointment.id',
        'appointment.patient_id',
        'appointment.date',
        'appointment.time',
        'appointment.motif',
        'appointment.status',
        'appointment.medecin_id',
        'appointment.service_id',
        'appointment.care_unit_id',
        'appointment.notes',
        'appointment.created_at',
        'appointment.updated_at',
        'services.name as service_name',
        'care_units.name as care_unit_name',
      ])
      .select(sql<string>`TRIM(COALESCE(user.nom, '') || ' ' || COALESCE(user.prenom, ''))`.as('medecin_name'))
      .where('appointment.id', '=', id)
      .executeTakeFirst()

    return row as any ?? null
  }

  private async getByIdSimple(id: number): Promise<AppointmentDto | null> {
    const row = await this.db
      .selectFrom('appointment')
      .leftJoin('user', 'user.id', 'appointment.medecin_id')
      .select([
        'appointment.id',
        'appointment.patient_id',
        'appointment.date',
        'appointment.time',
        'appointment.motif',
        'appointment.status',
        'appointment.medecin_id',
        'appointment.notes',
        'appointment.created_at',
        'appointment.updated_at',
      ])
      .select(sql<string>`TRIM(COALESCE(user.nom, '') || ' ' || COALESCE(user.prenom, ''))`.as('medecin_name'))
      .where('appointment.id', '=', id)
      .executeTakeFirst()

    return row as any ?? null
  }

  async create(entity: AppointmentEntity): Promise<AppointmentDto> {
    const values: Record<string, any> = {
      patient_id: entity.patient_id!,
      date: entity.date!,
      time: entity.time!,
      motif: entity.motif ?? undefined,
      status: entity.status ?? 'confirmed',
      medecin_id: entity.medecin_id ?? undefined,
      notes: entity.notes ?? undefined,
    }

    if (await this.checkHasNewColumns()) {
      values.service_id = entity.service_id ?? undefined
      values.care_unit_id = entity.care_unit_id ?? undefined
    }

    const result = await this.db
      .insertInto('appointment')
      .values(values)
      .returningAll()
      .executeTakeFirst()

    if (!result || !result.id) throw new Error('Failed to create appointment')
    const dto = await this.getById(result.id)
    if (!dto) throw new Error('Failed to retrieve created appointment')
    return dto
  }

  async update(id: number, entity: Partial<AppointmentEntity>): Promise<AppointmentDto> {
    const updateData: Record<string, any> = {}
    if (entity.date !== undefined) updateData.date = entity.date
    if (entity.time !== undefined) updateData.time = entity.time
    if (entity.motif !== undefined) updateData.motif = entity.motif
    if (entity.status !== undefined) updateData.status = entity.status
    if (entity.medecin_id !== undefined) updateData.medecin_id = entity.medecin_id ?? undefined
    if (entity.notes !== undefined) updateData.notes = entity.notes ?? undefined

    if (await this.checkHasNewColumns()) {
      if (entity.service_id !== undefined) updateData.service_id = entity.service_id ?? undefined
      if (entity.care_unit_id !== undefined) updateData.care_unit_id = entity.care_unit_id ?? undefined
    }

    await this.db
      .updateTable('appointment')
      .set(updateData)
      .where('id', '=', id)
      .execute()

    const dto = await this.getById(id)
    if (!dto) throw new Error('Appointment not found after update')
    return dto
  }

  async delete(id: number): Promise<void> {
    await this.db
      .deleteFrom('appointment')
      .where('id', '=', id)
      .execute()
  }

  async updateStatus(id: number, status: AppointmentEntity['status']): Promise<void> {
    await this.db
      .updateTable('appointment')
      .set({ status })
      .where('id', '=', id)
      .execute()
  }
}
