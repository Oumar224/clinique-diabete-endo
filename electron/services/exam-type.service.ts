import { inject, singleton } from 'tsyringe'
import type { Kysely } from 'kysely'
import { AppDatabaseDatasource } from '../sqlite-data-source'
import type { DB } from '../entities/database'
import type { ExamCategoryEntity } from '../entities/exam-category.entity'
import type { ExamTypeEntity } from '../entities/exam-type.entity'
import { entityEventBus } from '../automerge/event-bus'

@singleton()
export class ExamTypeService {
  public db: Kysely<DB>

  constructor(@inject(AppDatabaseDatasource) datasource: AppDatabaseDatasource) {
    this.db = datasource.getInstance()
  }

  // ─── List all categories (hardcoded — fixed values) ───────────
  async listCategories(): Promise<ExamCategoryEntity[]> {
    const categories: ExamCategoryEntity[] = [
      { id: 1, code: 'imagerie', name: 'Imagerie', sort_order: 1 },
      { id: 2, code: 'laboratoire', name: 'Laboratoire', sort_order: 2 },
      { id: 3, code: 'avis', name: 'Avis spécialisé', sort_order: 3 },
    ]
    return categories
  }

  // ─── List type-level items for a category (parent_id IS NULL) ──
  async listByCategory(categoryCode: string): Promise<ExamTypeEntity[]> {
    try {
      const rows = await this.db
        .selectFrom('lab_exams')
        .innerJoin('lab_exam_categories', 'lab_exams.category_id', 'lab_exam_categories.id')
        .selectAll('lab_exams')
        .select('lab_exam_categories.name as category_name')
        .where('lab_exam_categories.code', '=', categoryCode)
        .where('lab_exams.parent_id', 'is', null)
        .orderBy('lab_exams.sort_order', 'asc')
        .execute()
      return rows as unknown as ExamTypeEntity[]
    } catch (err: any) {
      if (err?.message?.includes('no such table') || err?.message?.includes('no such column')) return []
      throw err
    }
  }

  // ─── List specific exams under a type ──────────────────────────
  async listByType(typeId: number): Promise<ExamTypeEntity[]> {
    try {
      const rows = await this.db
        .selectFrom('lab_exams')
        .leftJoin('lab_exam_categories', 'lab_exams.category_id', 'lab_exam_categories.id')
        .selectAll('lab_exams')
        .select('lab_exam_categories.name as category_name')
        .where('lab_exams.parent_id', '=', typeId)
        .orderBy('lab_exams.sort_order', 'asc')
        .execute()
      return rows as unknown as ExamTypeEntity[]
    } catch (err: any) {
      if (err?.message?.includes('no such table') || err?.message?.includes('no such column')) return []
      throw err
    }
  }

  // ─── List ALL items in a category (flat, type + exams) ─────────
  async listAllByCategory(categoryCode: string): Promise<ExamTypeEntity[]> {
    try {
      const rows = await this.db
        .selectFrom('lab_exams')
        .innerJoin('lab_exam_categories', 'lab_exams.category_id', 'lab_exam_categories.id')
        .selectAll('lab_exams')
        .select('lab_exam_categories.name as category_name')
        .where('lab_exam_categories.code', '=', categoryCode)
        .orderBy('lab_exams.sort_order', 'asc')
        .execute()
      return rows as unknown as ExamTypeEntity[]
    } catch (err: any) {
      if (err?.message?.includes('no such table') || err?.message?.includes('no such column')) return []
      throw err
    }
  }

  private generateCode(label: string): string {
    const base = label
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]/g, ' ')
      .trim()
      .toUpperCase()
      .split(/\s+/)
      .map(w => w.slice(0, 4))
      .join('_')
      .slice(0, 20)
    return base || 'EXAM'
  }

  // ─── Create a new exam type ───────────────────────────────────
  async createType(entity: ExamTypeEntity): Promise<ExamTypeEntity> {
    this.validateLabel(entity.name ?? '')

    if (entity.category_id == null) {
      throw new Error('La catégorie est requise')
    }

    if (entity.parent_id != null) {
      const parent = await this.db
        .selectFrom('lab_exams')
        .select('id')
        .where('id', '=', entity.parent_id)
        .executeTakeFirst()
      if (!parent) throw new Error('Type parent introuvable')
    }

    const baseCode = entity.code ?? this.generateCode(entity.name ?? '')
    const existing = await this.db
      .selectFrom('lab_exams')
      .select('code')
      .where('code', '=', baseCode)
      .executeTakeFirst()
    const code = existing
      ? baseCode + '_' + String(Date.now()).slice(-4)
      : baseCode

    const result = await this.db
      .insertInto('lab_exams')
      .values({
        category_id: entity.category_id,
        parent_id: entity.parent_id ?? undefined,
        code,
        name: (entity.name ?? '').trim(),
        is_active: 1,
        prix: Math.max(0, Number(entity.prix ?? 0)),
      })
      .returningAll()
      .executeTakeFirst()

    if (!result) throw new Error("Échec de la création du type d'examen")
    entityEventBus.emitEntityChange({ entityType: 'exam_type', action: 'created', id: result.id!, entity: result, source: 'local', timestamp: Date.now() })
    return result as unknown as ExamTypeEntity
  }

  // ─── Update an exam type ──────────────────────────────────────
  async updateType(entity: ExamTypeEntity): Promise<ExamTypeEntity> {
    if (entity.id == null) {
      throw new Error("L'identifiant du type d'examen est requis")
    }

    const existing = await this.db
      .selectFrom('lab_exams')
      .selectAll()
      .where('id', '=', entity.id)
      .executeTakeFirst()

    if (!existing) throw new Error("Type d'examen introuvable")

    if (entity.name !== undefined) this.validateLabel(entity.name)

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString().slice(0, 19).replace('T', ' ') }

    if (entity.name !== undefined) updateData.name = entity.name.trim()
    if (entity.category_id !== undefined) updateData.category_id = entity.category_id
    if (entity.parent_id !== undefined) updateData.parent_id = entity.parent_id
    if (entity.is_active !== undefined) updateData.is_active = entity.is_active ? 1 : 0
    if (entity.prix !== undefined) updateData.prix = Math.max(0, Number(entity.prix))

    await this.db
      .updateTable('lab_exams')
      .set(updateData)
      .where('id', '=', entity.id)
      .execute()

    const updated = await this.db
      .selectFrom('lab_exams')
      .selectAll()
      .where('id', '=', entity.id)
      .executeTakeFirst()

    if (!updated) throw new Error("Type d'examen introuvable après mise à jour")
    entityEventBus.emitEntityChange({ entityType: 'exam_type', action: 'updated', id: entity.id!, entity: updated, source: 'local', timestamp: Date.now() })
    return updated as unknown as ExamTypeEntity
  }

  // ─── Delete an exam type ──────────────────────────────────────
  async deleteType(id: number): Promise<void> {
    if (id == null) throw new Error("L'identifiant du type d'examen est requis")

    const existing = await this.db
      .selectFrom('lab_exams')
      .select('id')
      .where('id', '=', id)
      .executeTakeFirst()

    if (!existing) throw new Error("Type d'examen introuvable")

    // Also delete children if this is a type-level item
    await this.db
      .deleteFrom('lab_exams')
      .where('parent_id', '=', id)
      .execute()

    await this.db
      .deleteFrom('lab_exams')
      .where('id', '=', id)
      .execute()
    entityEventBus.emitEntityChange({ entityType: 'exam_type', action: 'deleted', id, entity: existing, source: 'local', timestamp: Date.now() })
  }

  // ─── Validation ──────────────────────────────────────────────
  private validateLabel(label: string): void {
    if (!label || label.trim().length === 0) {
      throw new Error('Le libellé du type d\'examen est requis')
    }
    if (label.trim().length > 200) {
      throw new Error('Le libellé ne peut pas dépasser 200 caractères')
    }
  }
}
