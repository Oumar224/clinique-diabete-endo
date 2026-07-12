import { inject, singleton } from 'tsyringe'
import type { Kysely } from 'kysely'
import { AppDatabaseDatasource } from '../sqlite-data-source'
import type { DB } from '../entities/database'
import type { MedicalUnitEntity } from '../entities/medical-unit.entity'

@singleton()
export class MedicalUnitService {
  public db: Kysely<DB>

  constructor(@inject(AppDatabaseDatasource) datasource: AppDatabaseDatasource) {
    this.db = datasource.getInstance()
  }

  // ─── List medical units (optionally filter by active) ──
  async list(activeOnly = false): Promise<MedicalUnitEntity[]> {
    let query = this.db
      .selectFrom('medical_units')
      .selectAll()
      .orderBy('name', 'asc')

    if (activeOnly) {
      query = query.where('is_active', '=', 1)
    }

    const rows = await query.execute()
    return rows as unknown as MedicalUnitEntity[]
  }

  // ─── Get single medical unit ──────────────────────────────────
  async getById(id: number): Promise<MedicalUnitEntity | null> {
    const row = await this.db
      .selectFrom('medical_units')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst()

    return row ? (row as unknown as MedicalUnitEntity) : null
  }

  // ─── Create a new medical unit ────────────────────────────────
  async create(entity: MedicalUnitEntity): Promise<MedicalUnitEntity> {
    this.validateCode(entity.code ?? '')
    this.validateName(entity.name ?? '')

    try {
      // Check uniqueness
      const existing = await this.db
        .selectFrom('medical_units')
        .selectAll()
        .where('code', '=', (entity.code ?? '').trim().toUpperCase())
        .executeTakeFirst()

      if (existing) {
        throw new Error(`L'unité médicale "${(entity.code ?? '').trim().toUpperCase()}" existe déjà`)
      }

      const result = await this.db
        .insertInto('medical_units')
        .values({
          code: (entity.code ?? '').trim().toUpperCase(),
          name: (entity.name ?? '').trim(),
          is_active: entity.is_active ?? 1,
        })
        .returningAll()
        .executeTakeFirst()

      if (!result) throw new Error("Échec de la création de l'unité médicale")
      return result as unknown as MedicalUnitEntity
    } catch (err: any) {
      if (err?.message?.includes('no such table') || err?.message?.includes('no such column')) {
        throw new Error('La base de données n\'est pas initialisée correctement. Contactez l\'administrateur.')
      }
      throw err
    }
  }

  // ─── Update a medical unit ────────────────────────────────────
  async update(entity: MedicalUnitEntity): Promise<MedicalUnitEntity> {
    if (entity.id == null) {
      throw new Error("L'identifiant de l'unité médicale est requis")
    }

    const existing = await this.getById(entity.id)
    if (!existing) throw new Error('Unité médicale introuvable')

    if (entity.code !== undefined) this.validateCode(entity.code)
    if (entity.name !== undefined) this.validateName(entity.name)

    try {
      // Check code uniqueness if changing
      if (entity.code !== undefined) {
        const newCode = entity.code.trim().toUpperCase()
        const conflict = await this.db
          .selectFrom('medical_units')
          .selectAll()
          .where('code', '=', newCode)
          .where('id', '!=', entity.id)
          .executeTakeFirst()

        if (conflict) {
          throw new Error(`Le code "${newCode}" est déjà utilisé par une autre unité médicale`)
        }
      }

      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
      }
      if (entity.code !== undefined) updateData.code = entity.code.trim().toUpperCase()
      if (entity.name !== undefined) updateData.name = entity.name.trim()
      if (entity.is_active !== undefined) updateData.is_active = entity.is_active ? 1 : 0

      await this.db
        .updateTable('medical_units')
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
    if (!updated) throw new Error('Unité médicale introuvable après mise à jour')
    return updated
  }

  // ─── Toggle active/inactive ──────────────────────────────────
  async toggle(id: number, isActive: boolean): Promise<MedicalUnitEntity> {
    if (id == null) throw new Error("L'identifiant de l'unité médicale est requis")
    const existing = await this.getById(id)
    if (!existing) throw new Error('Unité médicale introuvable')

    await this.db
      .updateTable('medical_units')
      .set({ is_active: isActive ? 1 : 0, updated_at: new Date().toISOString().slice(0, 19).replace('T', ' ') })
      .where('id', '=', id)
      .execute()

    const updated = await this.getById(id)
    if (!updated) throw new Error('Unité médicale introuvable après mise à jour')
    return updated
  }

  // ─── Delete a medical unit ────────────────────────────────────
  async delete(id: number): Promise<void> {
    if (id == null) throw new Error("L'identifiant de l'unité médicale est requis")
    const existing = await this.getById(id)
    if (!existing) throw new Error('Unité médicale introuvable')

    try {
      await this.db
        .deleteFrom('medical_units')
        .where('id', '=', id)
        .execute()
    } catch (err: any) {
      if (err?.message?.includes('no such table') || err?.message?.includes('no such column')) {
        throw new Error('La base de données n\'est pas initialisée correctement. Contactez l\'administrateur.')
      }
      throw err
    }
  }

  // ─── Validation ──────────────────────────────────────────────
  private validateCode(code: string): void {
    if (!code || code.trim().length === 0) {
      throw new Error("Le code de l'unité médicale est requis")
    }
    if (code.trim().length < 2 || code.trim().length > 20) {
      throw new Error("Le code de l'unité médicale doit contenir entre 2 et 20 caractères")
    }
  }

  private validateName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new Error("Le nom de l'unité médicale est requis")
    }
    if (name.trim().length > 100) {
      throw new Error("Le nom de l'unité médicale ne peut pas dépasser 100 caractères")
    }
  }


}
