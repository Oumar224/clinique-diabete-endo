import { inject, singleton } from 'tsyringe'
import type { Kysely } from 'kysely'
import { AppDatabaseDatasource } from '../sqlite-data-source'
import type { DB } from '../entities/database'
import { InsuranceEntity } from '../entities/insurance.entity'
import { entityEventBus } from '../automerge/event-bus'

@singleton()
export class InsuranceService {
  public db: Kysely<DB>

  constructor(@inject(AppDatabaseDatasource) datasource: AppDatabaseDatasource) {
    this.db = datasource.getInstance()
  }

  async listAll(): Promise<InsuranceEntity[]> {
    try {
      const rows = await this.db
        .selectFrom('insurances')
        .selectAll()
        .orderBy('name', 'asc')
        .execute()
      return rows as unknown as InsuranceEntity[]
    } catch (err: any) {
      if (err?.message?.includes('no such table') || err?.message?.includes('no such column')) {
        throw new Error(
          "La base de données n'est pas initialisée correctement. Contactez l'administrateur.",
        )
      }
      throw err
    }
  }

  async listActive(): Promise<InsuranceEntity[]> {
    try {
      const rows = await this.db
        .selectFrom('insurances')
        .selectAll()
        .where('is_active', '=', 1)
        .orderBy('name', 'asc')
        .execute()
      return rows as unknown as InsuranceEntity[]
    } catch (err: any) {
      if (err?.message?.includes('no such table') || err?.message?.includes('no such column')) {
        throw new Error(
          "La base de données n'est pas initialisée correctement. Contactez l'administrateur.",
        )
      }
      throw err
    }
  }

  async create(data: { name: string; code: string }): Promise<InsuranceEntity> {
    this.validateName(data.name)
    this.validateCode(data.code)

    await this.checkCodeUnique(data.code)

    let result
    try {
      result = await this.db
        .insertInto('insurances')
        .values({
          name: data.name.trim(),
          code: data.code.trim(),
          is_active: 1,
        })
        .returningAll()
        .executeTakeFirst()
    } catch (err: any) {
      if (err?.message?.includes('no such table') || err?.message?.includes('no such column')) {
        throw new Error(
          "La base de données n'est pas initialisée correctement. Contactez l'administrateur.",
        )
      }
      throw err
    }

    if (!result) throw new Error("Échec de la création de l'assurance")
    entityEventBus.emitEntityChange({ entityType: 'insurance', action: 'created', id: result.id!, entity: result, source: 'local', timestamp: Date.now() })
    return result as unknown as InsuranceEntity
  }

  async update(id: number, data: { name?: string; code?: string; is_active?: boolean }): Promise<InsuranceEntity> {
    let existing
    try {
      existing = await this.db
        .selectFrom('insurances')
        .selectAll()
        .where('id', '=', id)
        .executeTakeFirst()
    } catch (err: any) {
      if (err?.message?.includes('no such table') || err?.message?.includes('no such column')) {
        throw new Error(
          "La base de données n'est pas initialisée correctement. Contactez l'administrateur.",
        )
      }
      throw err
    }

    if (!existing) throw new Error('Assurance introuvable')

    if (data.name !== undefined) {
      this.validateName(data.name)
    }
    if (data.code !== undefined) {
      this.validateCode(data.code)
      await this.checkCodeUnique(data.code, id)
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
    }
    if (data.name !== undefined) updateData.name = data.name.trim()
    if (data.code !== undefined) updateData.code = data.code.trim()
    if (data.is_active !== undefined) updateData.is_active = data.is_active ? 1 : 0

    try {
      await this.db
        .updateTable('insurances')
        .set(updateData)
        .where('id', '=', id)
        .execute()
    } catch (err: any) {
      if (err?.message?.includes('no such table') || err?.message?.includes('no such column')) {
        throw new Error(
          "La base de données n'est pas initialisée correctement. Contactez l'administrateur.",
        )
      }
      throw err
    }

    const updated = await this.getById(id)
    if (!updated) throw new Error('Assurance introuvable après mise à jour')
    entityEventBus.emitEntityChange({ entityType: 'insurance', action: 'updated', id, entity: updated, source: 'local', timestamp: Date.now() })
    return updated
  }

  async delete(id: number): Promise<void> {
    const existing = await this.getById(id)
    if (!existing) throw new Error('Assurance introuvable')

    try {
      await this.db
        .updateTable('insurances')
        .set({
          is_active: 0,
          updated_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
        })
        .where('id', '=', id)
        .execute()
    } catch (err: any) {
      if (err?.message?.includes('no such table') || err?.message?.includes('no such column')) {
        throw new Error(
          "La base de données n'est pas initialisée correctement. Contactez l'administrateur.",
        )
      }
      throw err
    }
    entityEventBus.emitEntityChange({ entityType: 'insurance', action: 'deleted', id, entity: existing, source: 'local', timestamp: Date.now() })
  }

  private async getById(id: number): Promise<InsuranceEntity | null> {
    try {
      const row = await this.db
        .selectFrom('insurances')
        .selectAll()
        .where('id', '=', id)
        .executeTakeFirst()
      return row ? (row as unknown as InsuranceEntity) : null
    } catch (err: any) {
      if (err?.message?.includes('no such table') || err?.message?.includes('no such column')) {
        throw new Error(
          "La base de données n'est pas initialisée correctement. Contactez l'administrateur.",
        )
      }
      throw err
    }
  }

  private validateName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new Error("Le nom de l'assurance est requis")
    }
    if (name.trim().length > 200) {
      throw new Error("Le nom de l'assurance ne peut pas dépasser 200 caractères")
    }
  }

  private validateCode(code: string): void {
    if (!code || code.trim().length === 0) {
      throw new Error("Le code de l'assurance est requis")
    }
    if (code.trim().length > 50) {
      throw new Error("Le code de l'assurance ne peut pas dépasser 50 caractères")
    }
  }

  private async checkCodeUnique(code: string, excludeId?: number): Promise<void> {
    let query = this.db
      .selectFrom('insurances')
      .selectAll()
      .where('code', '=', code.trim())

    if (excludeId !== undefined) {
      query = query.where('id', '!=', excludeId)
    }

    try {
      const existing = await query.executeTakeFirst()
      if (existing) {
        throw new Error(`Une assurance avec le code "${code}" existe déjà`)
      }
    } catch (err: any) {
      if (err?.message?.includes('no such table') || err?.message?.includes('no such column')) {
        throw new Error(
          "La base de données n'est pas initialisée correctement. Contactez l'administrateur.",
        )
      }
      throw err
    }
  }
}
