import { inject, singleton } from 'tsyringe'
import type { Kysely, Transaction } from 'kysely'
import { sql } from 'kysely'
import { AppDatabaseDatasource } from '../sqlite-data-source'
import type { DB } from '../entities/database'
import { StayEntity, StayMovementEntity } from '../entities/stay.entity'
import type { StayCreateDto, StayDto, StayMovementDto } from '../dto/stay.dto'
import { entityEventBus } from '../automerge/event-bus'

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

  async create(dto: StayCreateDto): Promise<StayDto> {
    const result = await this.db.transaction().execute(async (trx: Transaction<DB>) => {
      const stay = await trx
        .insertInto('stays')
        .values({
          patient_id: dto.patient_id,
          admission_date: dto.admission_date,
          mode_admission: dto.mode_admission,
          service_id: dto.service_id,
          medecin_id: dto.medecin_id ?? undefined,
          chambre: dto.chambre ?? undefined,
          lit: dto.lit ?? undefined,
          notes: dto.notes ?? undefined,
          status: 'en_cours',
          created_by: dto.created_by ?? undefined,
        })
        .returningAll()
        .executeTakeFirst()

      if (!stay) throw new Error("Échec de la création du séjour")

      await trx
        .insertInto('stay_movements')
        .values({
          stay_id: (stay as any).id,
          movement_type: 'admission',
          to_service_id: dto.service_id,
          moved_at: dto.admission_date,
          notes: dto.notes ?? undefined,
        })
        .execute()

      return stay
    })

    const stayDto = StayEntity.toDto(result as any)
    entityEventBus.emitEntityChange({ entityType: 'stay', action: 'created', id: (result as any).id, entity: stayDto, source: 'local', timestamp: Date.now() })
    return stayDto
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

    if (rows.rows.length === 0) {
      const stay = await this.db
        .selectFrom('stays')
        .select(['admission_date', 'service_id'])
        .where('id', '=', stayId)
        .executeTakeFirst()

      if (stay) {
        const synthetic: StayMovementEntity & { to_service_name?: string } = {
          stay_id: stayId,
          movement_type: 'admission',
          to_service_id: stay.service_id,
          moved_at: stay.admission_date,
        }
        return [StayMovementEntity.toDto(synthetic as any)]
      }
    }

    return StayMovementEntity.toDtos(rows.rows as any)
  }
}
