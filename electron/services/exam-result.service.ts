import { inject, singleton } from 'tsyringe'
import { sql, type Kysely } from 'kysely'
import { AppDatabaseDatasource } from '../sqlite-data-source'
import type { DB } from '../entities/database'
import type { ExamResultEntity } from '../entities/exam-result.entity'
import { entityEventBus } from '../automerge/event-bus'

interface PatientResultFilters {
  typeId?: number
  examId?: number
  parameterId?: number
  examRequestId?: number
  dateFrom?: string
  dateTo?: string
}

@singleton()
export class ExamResultService {
  public db: Kysely<DB>

  constructor(@inject(AppDatabaseDatasource) datasource: AppDatabaseDatasource) {
    this.db = datasource.getInstance()
  }

  async listByRequest(examRequestId: number): Promise<ExamResultEntity[]> {
    try {
      const rows = await this.db
        .selectFrom('exam_results')
        .innerJoin('exam_parameters', 'exam_parameters.id', 'exam_results.parameter_id')
        .leftJoin('user', 'user.id', 'exam_results.filled_by')
        .selectAll('exam_results')
        .select([
          'exam_parameters.name as parameter_name',
          'exam_parameters.unit as parameter_unit',
          'exam_parameters.input_type as parameter_input_type',
          'exam_parameters.reference_values as parameter_reference_values',
          'user.prenom as filled_by_name',
        ])
        .where('exam_results.exam_request_id', '=', examRequestId)
        .execute()
      return rows as unknown as ExamResultEntity[]
    } catch (err: any) {
      if (err?.message?.includes('no such table')) return []
      throw err
    }
  }

  async listByPatient(patientId: number, filters: PatientResultFilters = {}): Promise<ExamResultEntity[]> {
    try {
      let query = this.db
        .selectFrom('exam_results')
        .innerJoin('exam_parameters', 'exam_parameters.id', 'exam_results.parameter_id')
        .innerJoin('exam_requests', 'exam_requests.id', 'exam_results.exam_request_id')
        .leftJoin('lab_exams', 'lab_exams.id', 'exam_parameters.exam_id')
        .selectAll('exam_results')
        .select([
          'exam_parameters.name as parameter_name',
          'exam_parameters.unit as parameter_unit',
          'exam_parameters.input_type as parameter_input_type',
          'exam_parameters.reference_values as parameter_reference_values',
          'lab_exams.name as exam_name',
          'exam_requests.planned_date as request_date',
          'exam_requests.statut as request_status',
          'exam_requests.validated_at as validated_at',
        ])
        .where('exam_requests.patient_id', '=', patientId)
        .orderBy('exam_requests.planned_date', 'desc')
        .orderBy('exam_parameters.sort_order', 'asc')

      if (filters.parameterId != null) {
        query = query.where('exam_parameters.id', '=', filters.parameterId)
      }
      if (filters.examRequestId != null) {
        query = query.where('exam_requests.id', '=', filters.examRequestId)
      }
      if (filters.dateFrom != null) {
        query = query.where('exam_requests.planned_date', '>=', filters.dateFrom)
      }
      if (filters.dateTo != null) {
        query = query.where('exam_requests.planned_date', '<=', filters.dateTo)
      }
      if (filters.examId != null) {
        // json_each.value is INTEGER for JSON numbers — CAST to TEXT so the parameter comparison
        // is exact and type-safe (SQLite affinity would reject '1' = 1), without substring false positives.
        query = query.where((eb) =>
          eb.exists(
            sql`(SELECT 1 FROM json_each(exam_requests.exam_ids) WHERE CAST(json_each.value AS TEXT) = ${String(filters.examId)})`,
          ),
        )
      }

      const rows = await query.execute()
      return rows as unknown as ExamResultEntity[]
    } catch (err: any) {
      if (err?.message?.includes('no such table')) return []
      throw err
    }
  }

  async validateExamRequest(
    examRequestId: number,
    results: Array<{ parameterId: number; value: string | undefined; isNormal: boolean | undefined }>,
    filledBy: number,
  ): Promise<void> {
    // Delete existing results for this request (re-save pattern)
    await this.db
      .deleteFrom('exam_results')
      .where('exam_request_id', '=', examRequestId)
      .execute()

    // Insert new results
    for (const r of results) {
      if (r.value === undefined || r.value === null) continue
      await this.db
        .insertInto('exam_results')
        .values({
          exam_request_id: examRequestId,
          parameter_id: r.parameterId,
          value: r.value,
          is_normal: r.isNormal != null ? (r.isNormal ? 1 : 0) : undefined,
          filled_by: filledBy,
          filled_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
        })
        .execute()
    }

    // Update exam request status
    await this.db
      .updateTable('exam_requests')
      .set({
        statut: 'realise',
        validated_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
        realized_at: new Date().toISOString(),
        updated_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
      })
      .where('id', '=', examRequestId)
      .execute()

    entityEventBus.emitEntityChange({ entityType: 'exam_result', action: 'created', id: examRequestId, entity: { examRequestId, count: results.length }, source: 'local', timestamp: Date.now() })
  }
}
