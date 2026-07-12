import { inject, singleton } from 'tsyringe'
import type { Kysely } from 'kysely'
import { sql } from 'kysely'
import { AppDatabaseDatasource } from '../sqlite-data-source'
import type { DB } from '../entities/database'
import { StayEntity, StayMovementEntity } from '../entities/stay.entity'
import type { StayDto, StayMovementDto } from '../dto/stay.dto'

@singleton()
export class StayService {
  public db: Kysely<DB>

  constructor(@inject(AppDatabaseDatasource) datasource: AppDatabaseDatasource) {
    this.db = datasource.getInstance()
  }

  async getActiveByPatient(patientId: number): Promise<StayDto | null> {
    const row = await this.db
      .selectFrom('stays')
      .leftJoin('services', 'services.id', 'stays.service_id')
      .leftJoin('user', 'user.id', 'stays.medecin_id')
      .select([
        'stays.id',
        'stays.patient_id',
        'stays.admission_date',
        'stays.mode_admission',
        'stays.service_id',
        'stays.chambre',
        'stays.lit',
        'stays.medecin_id',
        'stays.notes',
        'stays.status',
        'stays.sortie_date',
        'stays.created_by',
        'stays.created_at',
        'stays.updated_at',
        'services.name as service_name',
      ])
      .select(sql<string>`TRIM(COALESCE(user.nom, '') || ' ' || COALESCE(user.prenom, ''))`.as('medecin_name'))
      .where('stays.patient_id', '=', patientId)
      .where('stays.status', '=', 'en_cours')
      .executeTakeFirst()

    return row ? StayEntity.toDto(row as any) : null
  }

  async listByPatient(patientId: number): Promise<StayDto[]> {
    const rows = await this.db
      .selectFrom('stays')
      .leftJoin('services', 'services.id', 'stays.service_id')
      .leftJoin('user', 'user.id', 'stays.medecin_id')
      .select([
        'stays.id',
        'stays.patient_id',
        'stays.admission_date',
        'stays.mode_admission',
        'stays.service_id',
        'stays.chambre',
        'stays.lit',
        'stays.medecin_id',
        'stays.notes',
        'stays.status',
        'stays.sortie_date',
        'stays.created_by',
        'stays.created_at',
        'stays.updated_at',
        'services.name as service_name',
      ])
      .select(sql<string>`TRIM(COALESCE(user.nom, '') || ' ' || COALESCE(user.prenom, ''))`.as('medecin_name'))
      .where('stays.patient_id', '=', patientId)
      .orderBy('stays.admission_date', 'desc')
      .execute()

    return StayEntity.toDtos(rows as any)
  }

  async getMovements(stayId: number): Promise<StayMovementDto[]> {
    const rows = await sql<any>`
      SELECT sm.*, from_svc.name as from_service_name, to_svc.name as to_service_name
      FROM stay_movements sm
      LEFT JOIN services from_svc ON from_svc.id = sm.from_service_id
      LEFT JOIN services to_svc ON to_svc.id = sm.to_service_id
      WHERE sm.stay_id = ${stayId}
      ORDER BY sm.moved_at ASC
    `.execute(this.db)

    return StayMovementEntity.toDtos(rows.rows as any)
  }
}
