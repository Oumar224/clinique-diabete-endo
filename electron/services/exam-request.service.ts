import { inject, singleton } from 'tsyringe'
import type { Kysely } from 'kysely'
import { AppDatabaseDatasource } from '../sqlite-data-source'
import type { DB } from '../entities/database'
import { ExamRequestEntity } from '../entities/exam-request.entity'
import { validateForeignKeys } from './utils/fk-validator'
import { entityEventBus } from '../automerge/event-bus'

@singleton()
export class ExamRequestService {
  public db: Kysely<DB>

  constructor(@inject(AppDatabaseDatasource) datasource: AppDatabaseDatasource) {
    this.db = datasource.getInstance()
  }

  async listByPatient(patientId: number): Promise<ExamRequestEntity[]> {
    const rows = await this.db
      .selectFrom('exam_requests')
      .leftJoin('user', 'user.id', 'exam_requests.prescripteur_id')
      .leftJoin('lab_exams', 'lab_exams.id', 'exam_requests.examen_id')
      .leftJoin('specialties', 'specialties.id', 'exam_requests.specialty_id')
      .select([
        'exam_requests.id',
        'exam_requests.patient_id',
        'exam_requests.encounter_id',
        'exam_requests.type',
        'exam_requests.examen_id',
        'exam_requests.exam_ids',
        'exam_requests.specialite',
        'exam_requests.specialty_id',
        'exam_requests.planned_hour',
        'exam_requests.planned_date',
        'exam_requests.motif',
        'exam_requests.statut',
        'exam_requests.prescripteur_id',
        'exam_requests.created_by',
        'exam_requests.created_at',
        'exam_requests.updated_at',
      ])
      .select([
        'user.prenom as prescripteur_nom',
        'lab_exams.name as examen_label',
        'specialties.name as specialty_name',
      ])
      .where('exam_requests.patient_id', '=', patientId)
      .orderBy('exam_requests.created_at', 'desc')
      .execute()
    return rows as unknown as ExamRequestEntity[]
  }

  async listByDate(patientId: number, date: string): Promise<ExamRequestEntity[]> {
    const rows = await this.db
      .selectFrom('exam_requests')
      .leftJoin('user', 'user.id', 'exam_requests.prescripteur_id')
      .leftJoin('lab_exams', 'lab_exams.id', 'exam_requests.examen_id')
      .leftJoin('specialties', 'specialties.id', 'exam_requests.specialty_id')
      .select([
        'exam_requests.id',
        'exam_requests.patient_id',
        'exam_requests.encounter_id',
        'exam_requests.type',
        'exam_requests.examen_id',
        'exam_requests.exam_ids',
        'exam_requests.specialite',
        'exam_requests.specialty_id',
        'exam_requests.planned_hour',
        'exam_requests.planned_date',
        'exam_requests.motif',
        'exam_requests.statut',
        'exam_requests.prescripteur_id',
        'exam_requests.created_by',
        'exam_requests.created_at',
        'exam_requests.updated_at',
      ])
      .select([
        'user.prenom as prescripteur_nom',
        'lab_exams.name as examen_label',
        'specialties.name as specialty_name',
      ])
      .where('exam_requests.patient_id', '=', patientId)
      .where('exam_requests.planned_date', '=', date)
      .orderBy('exam_requests.planned_hour', 'asc')
      .execute()
    return rows as unknown as ExamRequestEntity[]
  }

  async getById(id: number): Promise<ExamRequestEntity | null> {
    const row = await this.db
      .selectFrom('exam_requests')
      .leftJoin('specialties', 'specialties.id', 'exam_requests.specialty_id')
      .selectAll('exam_requests')
      .select('specialties.name as specialty_name')
      .where('exam_requests.id', '=', id)
      .executeTakeFirst()
    return row ? (row as unknown as ExamRequestEntity) : null
  }

  async create(entity: ExamRequestEntity): Promise<ExamRequestEntity> {
    // Validate foreign keys before insert
    await validateForeignKeys(this.db as any, [
      { table: 'patient', column: 'patient_id', value: entity.patient_id },
      { table: 'encounters', column: 'encounter_id', value: entity.encounter_id },
      { table: 'user', column: 'prescripteur_id', value: entity.prescripteur_id },
      { table: 'specialties', column: 'specialty_id', value: entity.specialty_id },
      { table: 'user', column: 'created_by', value: entity.created_by },
    ])

    const result = await this.db
      .insertInto('exam_requests')
      .values({
        patient_id: entity.patient_id!,
        encounter_id: entity.encounter_id ?? undefined,
        type: entity.type!,
        examen_id: entity.examen_id ?? undefined,
        exam_ids: entity.exam_ids ?? undefined,
        specialite: entity.specialite ?? undefined,
        specialty_id: entity.specialty_id ?? undefined,
        planned_hour: entity.planned_hour ?? undefined,
        planned_date: entity.planned_date ?? undefined,
        motif: entity.motif ?? undefined,
        statut: entity.statut ?? 'en_attente',
        prescripteur_id: entity.prescripteur_id ?? undefined,
        created_by: entity.created_by ?? entity.prescripteur_id ?? undefined,
      })
      .returningAll()
      .executeTakeFirst()

    if (!result) throw new Error("Échec de la création de la demande d'examen")
    entityEventBus.emitEntityChange({ entityType: 'exam_request', action: 'created', id: result.id!, entity: result, source: 'local', timestamp: Date.now() })
    return result as unknown as ExamRequestEntity
  }

  async update(entity: ExamRequestEntity): Promise<ExamRequestEntity> {
    if (entity.id == null) throw new Error("L'identifiant est requis")

    const existing = await this.db
      .selectFrom('exam_requests')
      .select('id')
      .where('id', '=', entity.id)
      .executeTakeFirst()
    if (!existing) throw new Error('Demande introuvable')

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
    }
    if (entity.type !== undefined) updateData.type = entity.type
    if (entity.examen_id !== undefined) updateData.examen_id = entity.examen_id
    if (entity.exam_ids !== undefined) updateData.exam_ids = entity.exam_ids
    if (entity.specialite !== undefined) updateData.specialite = entity.specialite
    if (entity.specialty_id !== undefined) updateData.specialty_id = entity.specialty_id
    if (entity.planned_hour !== undefined) updateData.planned_hour = entity.planned_hour
    if (entity.planned_date !== undefined) updateData.planned_date = entity.planned_date
    if (entity.motif !== undefined) updateData.motif = entity.motif
    if (entity.statut !== undefined) updateData.statut = entity.statut
    if (entity.prescripteur_id !== undefined) updateData.prescripteur_id = entity.prescripteur_id

    await this.db
      .updateTable('exam_requests')
      .set(updateData)
      .where('id', '=', entity.id)
      .execute()

    const updated = await this.getById(entity.id)
    if (!updated) throw new Error('Échec de la mise à jour')
    entityEventBus.emitEntityChange({ entityType: 'exam_request', action: 'updated', id: entity.id!, entity: updated, source: 'local', timestamp: Date.now() })
    return updated
  }

  async delete(id: number): Promise<void> {
    const existing = await this.db
      .selectFrom('exam_requests')
      .select('id')
      .where('id', '=', id)
      .executeTakeFirst()
    if (!existing) throw new Error('Demande introuvable')

    await this.db
      .deleteFrom('exam_requests')
      .where('id', '=', id)
      .execute()
    entityEventBus.emitEntityChange({ entityType: 'exam_request', action: 'deleted', id, entity: existing, source: 'local', timestamp: Date.now() })
  }
}
