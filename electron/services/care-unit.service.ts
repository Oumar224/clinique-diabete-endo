import { inject, singleton } from 'tsyringe'
import type { Kysely } from 'kysely'
import { AppDatabaseDatasource } from '../sqlite-data-source'
import type { DB } from '../entities/database'
import type { CareUnitEntity } from '../entities/care-unit.entity'

export interface CareUnitWithService extends CareUnitEntity {
  service_name?: string
}

@singleton()
export class CareUnitService {
  public db: Kysely<DB>

  constructor(@inject(AppDatabaseDatasource) datasource: AppDatabaseDatasource) {
    this.db = datasource.getInstance()
  }

  // ─── List care units (optionally filter by service / active) ──
  async list(serviceId?: number, activeOnly = false): Promise<CareUnitWithService[]> {
    let query = this.db
      .selectFrom('care_units')
      .leftJoin('services', 'services.id', 'care_units.service_id')
      .selectAll('care_units')
      .select('services.name as service_name')
      .orderBy('care_units.sort_order', 'asc')
      .orderBy('care_units.name', 'asc')

    if (serviceId !== undefined) {
      query = query.where('care_units.service_id', '=', serviceId)
    }
    if (activeOnly) {
      query = query.where('care_units.is_active', '=', 1)
    }

    const rows = await query.execute()
    return rows as unknown as CareUnitWithService[]
  }

  // ─── List care units by service ────────────────────────────────
  async listByService(serviceId: number): Promise<CareUnitWithService[]> {
    return this.list(serviceId)
  }

  // ─── Get single care unit ─────────────────────────────────────
  async getById(id: number): Promise<CareUnitEntity | null> {
    const row = await this.db
      .selectFrom('care_units')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst()

    return row ? (row as unknown as CareUnitEntity) : null
  }

  // ─── Create a new care unit ────────────────────────────────────
  async create(entity: CareUnitEntity): Promise<CareUnitEntity> {
    this.validateName(entity.name ?? '')

    // Validate service exists
    if (entity.service_id != null) {
      const svc = await this.db.selectFrom('services').selectAll().where('id', '=', entity.service_id).executeTakeFirst()
      if (!svc) throw new Error('Service introuvable')
    }

    try {
      // Auto-compute sort_order if not specified
      if (entity.sort_order == null) {
        const maxOrder = await this.db
          .selectFrom('care_units')
          .select(this.db.fn.max('sort_order').as('max_order'))
          .where('service_id', '=', entity.service_id!)
          .executeTakeFirst()
        entity.sort_order = ((maxOrder as any)?.max_order ?? 0) + 1
      }

      const result = await this.db
        .insertInto('care_units')
        .values({
          service_id: entity.service_id!,
          name: (entity.name ?? '').trim(),
          code: entity.code?.trim().toUpperCase() || null,
          description: entity.description?.trim() || null,
          is_active: entity.is_active ?? 1,
          sort_order: entity.sort_order ?? 0,
        })
        .returningAll()
        .executeTakeFirst()

      if (!result) throw new Error("Échec de la création de l'unité de soins")
      return result as unknown as CareUnitEntity
    } catch (err: any) {
      if (err?.message?.includes('no such table') || err?.message?.includes('no such column')) {
        throw new Error('La base de données n\'est pas initialisée correctement. Contactez l\'administrateur.')
      }
      throw err
    }
  }

  // ─── Update a care unit ────────────────────────────────────────
  async update(entity: CareUnitEntity): Promise<CareUnitEntity> {
    if (entity.id == null) {
      throw new Error("L'identifiant de l'unité de soins est requis")
    }

    const existing = await this.getById(entity.id)
    if (!existing) throw new Error('Unité de soins introuvable')

    if (entity.name !== undefined) this.validateName(entity.name)

    // Validate service exists if changing
    if (entity.service_id != null) {
      const svc = await this.db.selectFrom('services').selectAll().where('id', '=', entity.service_id).executeTakeFirst()
      if (!svc) throw new Error('Service introuvable')
    }

    try {
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
      }
      if (entity.service_id !== undefined) updateData.service_id = entity.service_id
      if (entity.name !== undefined) updateData.name = entity.name.trim()
      if (entity.code !== undefined) updateData.code = entity.code?.trim().toUpperCase() || null
      if (entity.description !== undefined) updateData.description = entity.description?.trim() || null
      if (entity.is_active !== undefined) updateData.is_active = entity.is_active ? 1 : 0
      if (entity.sort_order !== undefined) updateData.sort_order = entity.sort_order

      await this.db
        .updateTable('care_units')
        .set(updateData)
        .where('id', '=', entity.id)
        .execute()
    } catch (err: any) {
      if (err?.message?.includes('no such table') || err?.message?.includes('no such column')) {
        throw new Error('La base de données n\'est pas initialisée correctement. Contactez l\'administrateur.')
      }
      throw err
    }

    const updated = await this.getById(entity.id)
    if (!updated) throw new Error('Unité de soins introuvable après mise à jour')
    return updated
  }

  // ─── Toggle active/inactive ────────────────────────────────────
  async toggle(id: number, isActive: boolean): Promise<CareUnitEntity> {
    if (id == null) throw new Error("L'identifiant de l'unité de soins est requis")
    const existing = await this.getById(id)
    if (!existing) throw new Error('Unité de soins introuvable')

    await this.db
      .updateTable('care_units')
      .set({ is_active: isActive ? 1 : 0, updated_at: new Date().toISOString().slice(0, 19).replace('T', ' ') })
      .where('id', '=', id)
      .execute()

    const updated = await this.getById(id)
    if (!updated) throw new Error('Unité de soins introuvable après mise à jour')
    return updated
  }

  // ─── Delete a care unit ────────────────────────────────────────
  async delete(id: number): Promise<void> {
    if (id == null) throw new Error("L'identifiant de l'unité de soins est requis")
    const existing = await this.getById(id)
    if (!existing) throw new Error('Unité de soins introuvable')

    try {
      await this.db
        .deleteFrom('care_units')
        .where('id', '=', id)
        .execute()
    } catch (err: any) {
      if (err?.message?.includes('no such table') || err?.message?.includes('no such column')) {
        throw new Error('La base de données n\'est pas initialisée correctement. Contactez l\'administrateur.')
      }
      throw err
    }
  }

  // ─── Validation ────────────────────────────────────────────────
  private validateName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new Error("Le nom de l'unité de soins est requis")
    }
    if (name.trim().length > 100) {
      throw new Error("Le nom de l'unité de soins ne peut pas dépasser 100 caractères")
    }
  }
}
