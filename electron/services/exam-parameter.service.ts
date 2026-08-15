import { inject, singleton } from 'tsyringe'
import type { Kysely } from 'kysely'
import { AppDatabaseDatasource } from '../sqlite-data-source'
import type { DB } from '../entities/database'
import type { ExamParameterEntity } from '../entities/exam-parameter.entity'
import { entityEventBus } from '../automerge/event-bus'

@singleton()
export class ExamParameterService {
  public db: Kysely<DB>

  constructor(@inject(AppDatabaseDatasource) datasource: AppDatabaseDatasource) {
    this.db = datasource.getInstance()
  }

  async listByExam(examId: number): Promise<ExamParameterEntity[]> {
    try {
      const rows = await this.db
        .selectFrom('exam_parameters')
        .leftJoin('lab_exams', 'lab_exams.id', 'exam_parameters.exam_id')
        .selectAll('exam_parameters')
        .select('lab_exams.name as exam_name')
        .where('exam_parameters.exam_id', '=', examId)
        .orderBy('exam_parameters.sort_order', 'asc')
        .execute()
      return rows as unknown as ExamParameterEntity[]
    } catch (err: any) {
      if (err?.message?.includes('no such table')) return []
      throw err
    }
  }

  async listByType(typeId: number): Promise<ExamParameterEntity[]> {
    try {
      // Get parameters directly on the type AND on all child exams
      const childIds = await this.db
        .selectFrom('lab_exams')
        .select('id')
        .where('parent_id', '=', typeId)
        .execute()
      
      const allExamIds = [typeId, ...childIds.map(c => c.id)]
      
      const rows = await this.db
        .selectFrom('exam_parameters')
        .leftJoin('lab_exams', 'lab_exams.id', 'exam_parameters.exam_id')
        .selectAll('exam_parameters')
        .select('lab_exams.name as exam_name')
        .where('exam_parameters.exam_id', 'in', allExamIds)
        .orderBy('exam_parameters.sort_order', 'asc')
        .execute()
      return rows as unknown as ExamParameterEntity[]
    } catch (err: any) {
      if (err?.message?.includes('no such table')) return []
      throw err
    }
  }

  async listByExamIds(examIds: number[]): Promise<ExamParameterEntity[]> {
    if (examIds.length === 0) return []
    try {
      const rows = await this.db
        .selectFrom('exam_parameters')
        .leftJoin('lab_exams', 'lab_exams.id', 'exam_parameters.exam_id')
        .selectAll('exam_parameters')
        .select('lab_exams.name as exam_name')
        .where('exam_parameters.exam_id', 'in', examIds)
        .where('exam_parameters.is_active', '=', 1)
        .orderBy('exam_parameters.sort_order', 'asc')
        .execute()
      return rows as unknown as ExamParameterEntity[]
    } catch (err: any) {
      if (err?.message?.includes('no such table')) return []
      throw err
    }
  }

  async getById(id: number): Promise<ExamParameterEntity | undefined> {
    const row = await this.db
      .selectFrom('exam_parameters')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst()
    return row as unknown as ExamParameterEntity | undefined
  }

  async countByExam(examId: number): Promise<number> {
    const result = await this.db
      .selectFrom('exam_parameters')
      .select(({ fn }) => fn.count<number>('id').as('count'))
      .where('exam_id', '=', examId)
      .executeTakeFirst()
    return Number(result?.count ?? 0)
  }

  async create(entity: ExamParameterEntity): Promise<ExamParameterEntity> {
    if (!entity.name || entity.name.trim().length === 0) {
      throw new Error('Le nom du paramètre est requis')
    }
    if (entity.exam_id == null) {
      throw new Error("L'identifiant de l'examen est requis")
    }
    if (!entity.input_type || !['numeric', 'text', 'select', 'boolean'].includes(entity.input_type)) {
      throw new Error("Le type de saisie est invalide")
    }

    const result = await this.db
      .insertInto('exam_parameters')
      .values({
        exam_id: entity.exam_id,
        name: entity.name.trim(),
        unit: entity.unit ?? undefined,
        input_type: entity.input_type,
        reference_values: entity.reference_values ?? '{}',
        sort_order: entity.sort_order ?? 0,
        is_active: entity.is_active ?? 1,
      })
      .returningAll()
      .executeTakeFirst()

    if (!result) throw new Error('Échec de la création du paramètre')
    entityEventBus.emitEntityChange({ entityType: 'exam_parameter', action: 'created', id: result.id!, entity: result, source: 'local', timestamp: Date.now() })
    return result as unknown as ExamParameterEntity
  }

  async update(entity: ExamParameterEntity): Promise<ExamParameterEntity> {
    if (entity.id == null) throw new Error('Identifiant du paramètre requis')

    const existing = await this.db
      .selectFrom('exam_parameters')
      .select('id')
      .where('id', '=', entity.id)
      .executeTakeFirst()
    if (!existing) throw new Error('Paramètre introuvable')

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
    }
    if (entity.name !== undefined) updateData.name = entity.name.trim()
    if (entity.unit !== undefined) updateData.unit = entity.unit
    if (entity.input_type !== undefined) updateData.input_type = entity.input_type
    if (entity.reference_values !== undefined) updateData.reference_values = entity.reference_values
    if (entity.sort_order !== undefined) updateData.sort_order = entity.sort_order
    if (entity.is_active !== undefined) updateData.is_active = entity.is_active ? 1 : 0

    await this.db
      .updateTable('exam_parameters')
      .set(updateData)
      .where('id', '=', entity.id)
      .execute()

    const updated = await this.db
      .selectFrom('exam_parameters')
      .selectAll()
      .where('id', '=', entity.id)
      .executeTakeFirst()

    if (!updated) throw new Error('Paramètre introuvable après mise à jour')
    entityEventBus.emitEntityChange({ entityType: 'exam_parameter', action: 'updated', id: entity.id!, entity: updated, source: 'local', timestamp: Date.now() })
    return updated as unknown as ExamParameterEntity
  }

  async reorder(items: Array<{ id: number; sort_order: number }>): Promise<void> {
    for (const item of items) {
      await this.db
        .updateTable('exam_parameters')
        .set({ sort_order: item.sort_order, updated_at: new Date().toISOString().slice(0, 19).replace('T', ' ') })
        .where('id', '=', item.id)
        .execute()
    }
  }

  async delete(id: number): Promise<void> {
    if (id == null) throw new Error('Identifiant du paramètre requis')
    const existing = await this.db
      .selectFrom('exam_parameters')
      .select('id')
      .where('id', '=', id)
      .executeTakeFirst()
    if (!existing) throw new Error('Paramètre introuvable')

    await this.db
      .deleteFrom('exam_parameters')
      .where('id', '=', id)
      .execute()
    entityEventBus.emitEntityChange({ entityType: 'exam_parameter', action: 'deleted', id, entity: existing, source: 'local', timestamp: Date.now() })
  }
}
