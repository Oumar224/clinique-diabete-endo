import { inject, singleton } from 'tsyringe'
import type { Kysely } from 'kysely'
import { AppDatabaseDatasource } from '../sqlite-data-source'
import type { DB } from '../entities/database'
import type { SpecialtyEntity } from '../entities/specialty.entity'
import { entityEventBus } from '../automerge/event-bus'

@singleton()
export class SpecialtyService {
  public db: Kysely<DB>

  constructor(@inject(AppDatabaseDatasource) datasource: AppDatabaseDatasource) {
    this.db = datasource.getInstance()
  }

  // ─── List specialties (optionally only active) ────────────────
  async list(activeOnly = false): Promise<SpecialtyEntity[]> {
    let query = this.db
      .selectFrom('specialties')
      .selectAll()
      .orderBy('name', 'asc')

    if (activeOnly) {
      query = query.where('is_active', '=', 1)
    }

    const rows = await query.execute()
    return rows as unknown as SpecialtyEntity[]
  }

  // ─── Get single specialty ─────────────────────────────────────
  async getById(id: number): Promise<SpecialtyEntity | null> {
    const row = await this.db
      .selectFrom('specialties')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst()

    return row ? (row as unknown as SpecialtyEntity) : null
  }

  // ─── Create a new specialty ───────────────────────────────────
  async create(entity: SpecialtyEntity): Promise<SpecialtyEntity> {
    this.validateName(entity.name ?? '')
    this.validateCode(entity.code ?? '')

    try {
      // Check name uniqueness
      const existingName = await this.db
        .selectFrom('specialties')
        .selectAll()
        .where('name', '=', (entity.name ?? '').trim())
        .executeTakeFirst()

      if (existingName) {
        throw new Error(`La spécialité "${(entity.name ?? '').trim()}" existe déjà`)
      }

      // Check code uniqueness
      const existingCode = await this.db
        .selectFrom('specialties')
        .selectAll()
        .where('code', '=', (entity.code ?? '').trim().toUpperCase())
        .executeTakeFirst()

      if (existingCode) {
        throw new Error(`Le code "${(entity.code ?? '').trim().toUpperCase()}" est déjà utilisé par une autre spécialité`)
      }

      const result = await this.db
        .insertInto('specialties')
        .values({
          name: (entity.name ?? '').trim(),
          code: (entity.code ?? '').trim().toUpperCase(),
          title_prefix: entity.title_prefix?.trim() || 'Dr',
          is_active: entity.is_active ?? 1,
        })
        .returningAll()
        .executeTakeFirst()

      if (!result) throw new Error('Échec de la création de la spécialité')
      entityEventBus.emitEntityChange({ entityType: 'specialty', action: 'created', id: result.id!, entity: result, source: 'local', timestamp: Date.now() })
      return result as unknown as SpecialtyEntity
    } catch (err: any) {
      if (err?.message?.includes('no such table') || err?.message?.includes('no such column')) {
        throw new Error('La base de données n\'est pas initialisée correctement. Contactez l\'administrateur.')
      }
      throw err
    }
  }

  // ─── Update a specialty ───────────────────────────────────────
  async update(entity: SpecialtyEntity): Promise<SpecialtyEntity> {
    if (entity.id == null) {
      throw new Error("L'identifiant de la spécialité est requis")
    }

    const existing = await this.getById(entity.id)
    if (!existing) throw new Error('Spécialité introuvable')

    if (entity.name !== undefined) this.validateName(entity.name)
    if (entity.code !== undefined) this.validateCode(entity.code)

    try {
      // Check name uniqueness if changing
      if (entity.name !== undefined) {
        const conflict = await this.db
          .selectFrom('specialties')
          .selectAll()
          .where('name', '=', (entity.name ?? '').trim())
          .where('id', '!=', entity.id)
          .executeTakeFirst()

        if (conflict) {
          throw new Error(`Le nom "${(entity.name ?? '').trim()}" est déjà utilisé par une autre spécialité`)
        }
      }

      // Check code uniqueness if changing
      if (entity.code !== undefined) {
        const newCode = entity.code.trim().toUpperCase()
        const conflict = await this.db
          .selectFrom('specialties')
          .selectAll()
          .where('code', '=', newCode)
          .where('id', '!=', entity.id)
          .executeTakeFirst()

        if (conflict) {
          throw new Error(`Le code "${newCode}" est déjà utilisé par une autre spécialité`)
        }
      }

      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
      }
      if (entity.name !== undefined) updateData.name = (entity.name ?? '').trim()
      if (entity.code !== undefined) updateData.code = entity.code.trim().toUpperCase()
      if (entity.title_prefix !== undefined) updateData.title_prefix = entity.title_prefix.trim()
      if (entity.is_active !== undefined) updateData.is_active = entity.is_active ? 1 : 0

      await this.db
        .updateTable('specialties')
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
    if (!updated) throw new Error('Spécialité introuvable après mise à jour')
    entityEventBus.emitEntityChange({ entityType: 'specialty', action: 'updated', id: entity.id!, entity: updated, source: 'local', timestamp: Date.now() })
    return updated
  }

  // ─── Toggle active/inactive ──────────────────────────────────
  async toggle(id: number, isActive: boolean): Promise<SpecialtyEntity> {
    if (id == null) throw new Error("L'identifiant de la spécialité est requis")
    const existing = await this.getById(id)
    if (!existing) throw new Error('Spécialité introuvable')

    await this.db
      .updateTable('specialties')
      .set({ is_active: isActive ? 1 : 0, updated_at: new Date().toISOString().slice(0, 19).replace('T', ' ') })
      .where('id', '=', id)
      .execute()

    const updated = await this.getById(id)
    if (!updated) throw new Error('Spécialité introuvable après mise à jour')
    return updated
  }

  // ─── Delete a specialty ───────────────────────────────────────
  async delete(id: number): Promise<void> {
    if (id == null) throw new Error("L'identifiant de la spécialité est requis")
    const existing = await this.getById(id)
    if (!existing) throw new Error('Spécialité introuvable')

    try {
      // Check for assigned users
      const userCount = await this.db
        .selectFrom('user_specialties')
        .select(this.db.fn.countAll<number>().as('count'))
        .where('specialty_id', '=', id)
        .executeTakeFirst()

      const count = (userCount as any)?.count ?? 0
      if (count > 0) {
        throw new Error(
          `Impossible de supprimer cette spécialité : ${count} utilisateur(s) y sont rattaché(s). ` +
          'Désactivez la spécialité ou réaffectez d\'abord les utilisateurs.'
        )
      }

      await this.db
        .deleteFrom('specialties')
        .where('id', '=', id)
        .execute()
    } catch (err: any) {
      if (err?.message?.includes('no such table') || err?.message?.includes('no such column')) {
        throw new Error('La base de données n\'est pas initialisée correctement. Contactez l\'administrateur.')
      }
      throw err
    }
    entityEventBus.emitEntityChange({ entityType: 'specialty', action: 'deleted', id, entity: existing, source: 'local', timestamp: Date.now() })
  }

  // ─── Validation ──────────────────────────────────────────────
  private validateName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new Error('Le nom de la spécialité est requis')
    }
    if (name.trim().length > 100) {
      throw new Error('Le nom de la spécialité ne peut pas dépasser 100 caractères')
    }
  }

  private validateCode(code: string): void {
    if (!code || code.trim().length === 0) {
      throw new Error('Le code de la spécialité est requis')
    }
    if (code.trim().length > 20) {
      throw new Error('Le code de la spécialité ne peut pas dépasser 20 caractères')
    }
  }
}
