import { inject, singleton } from 'tsyringe'
import type { Kysely } from 'kysely'
import { AppDatabaseDatasource } from '../sqlite-data-source'
import type { DB } from '../entities/database'
import { ContactOriginEntity } from '../entities/contact-origin.entity'

@singleton()
export class ContactOriginService {
  public db: Kysely<DB>

  constructor(@inject(AppDatabaseDatasource) datasource: AppDatabaseDatasource) {
    this.db = datasource.getInstance()
  }

  async listAll(): Promise<ContactOriginEntity[]> {
    try {
      const rows = await this.db
        .selectFrom('contact_origins')
        .selectAll()
        .orderBy('sort_order', 'asc')
        .execute()
      return rows as unknown as ContactOriginEntity[]
    } catch (err: any) {
      if (err?.message?.includes('no such table') || err?.message?.includes('no such column')) {
        throw new Error(
          "La base de données n'est pas initialisée correctement. Contactez l'administrateur.",
        )
      }
      throw err
    }
  }

  async listActive(): Promise<ContactOriginEntity[]> {
    try {
      const rows = await this.db
        .selectFrom('contact_origins')
        .selectAll()
        .where('is_active', '=', 1)
        .orderBy('sort_order', 'asc')
        .execute()
      return rows as unknown as ContactOriginEntity[]
    } catch (err: any) {
      if (err?.message?.includes('no such table') || err?.message?.includes('no such column')) {
        throw new Error(
          "La base de données n'est pas initialisée correctement. Contactez l'administrateur.",
        )
      }
      throw err
    }
  }

  async create(data: { value: string; label: string; sort_order?: number }): Promise<ContactOriginEntity> {
    this.validateValue(data.value)
    this.validateLabel(data.label)

    await this.checkValueUnique(data.value)

    let maxOrder
    try {
      maxOrder = await this.db
        .selectFrom('contact_origins')
        .select(this.db.fn.max<number>('sort_order').as('max_order'))
        .executeTakeFirst()
    } catch (err: any) {
      if (err?.message?.includes('no such table') || err?.message?.includes('no such column')) {
        throw new Error(
          "La base de données n'est pas initialisée correctement. Contactez l'administrateur.",
        )
      }
      throw err
    }

    const nextOrder = data.sort_order ?? ((maxOrder as any)?.max_order ?? 0) + 1

    let result
    try {
      result = await this.db
        .insertInto('contact_origins')
        .values({
          value: data.value.trim(),
          label: data.label.trim(),
          sort_order: nextOrder,
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

    if (!result) throw new Error("Échec de la création du mécanisme de contact")
    return result as unknown as ContactOriginEntity
  }

  async update(id: number, data: { value?: string; label?: string; sort_order?: number; is_active?: boolean }): Promise<ContactOriginEntity> {
    let existing
    try {
      existing = await this.db
        .selectFrom('contact_origins')
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

    if (!existing) throw new Error('Mécanisme de contact introuvable')

    if (data.value !== undefined) {
      this.validateValue(data.value)
      await this.checkValueUnique(data.value, id)
    }
    if (data.label !== undefined) {
      this.validateLabel(data.label)
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
    }
    if (data.value !== undefined) updateData.value = data.value.trim()
    if (data.label !== undefined) updateData.label = data.label.trim()
    if (data.sort_order !== undefined) updateData.sort_order = data.sort_order
    if (data.is_active !== undefined) updateData.is_active = data.is_active ? 1 : 0

    try {
      await this.db
        .updateTable('contact_origins')
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
    if (!updated) throw new Error('Mécanisme de contact introuvable après mise à jour')
    return updated
  }

  async delete(id: number): Promise<void> {
    const existing = await this.getById(id)
    if (!existing) throw new Error('Mécanisme de contact introuvable')

    try {
      await this.db
        .updateTable('contact_origins')
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
  }

  private async getById(id: number): Promise<ContactOriginEntity | null> {
    try {
      const row = await this.db
        .selectFrom('contact_origins')
        .selectAll()
        .where('id', '=', id)
        .executeTakeFirst()
      return row ? (row as unknown as ContactOriginEntity) : null
    } catch (err: any) {
      if (err?.message?.includes('no such table') || err?.message?.includes('no such column')) {
        throw new Error(
          "La base de données n'est pas initialisée correctement. Contactez l'administrateur.",
        )
      }
      throw err
    }
  }

  private validateValue(value: string): void {
    if (!value || value.trim().length === 0) {
      throw new Error('La valeur du mécanisme de contact est requise')
    }
    if (value.trim().length > 100) {
      throw new Error('La valeur du mécanisme de contact ne peut pas dépasser 100 caractères')
    }
  }

  private validateLabel(label: string): void {
    if (!label || label.trim().length === 0) {
      throw new Error('Le label du mécanisme de contact est requis')
    }
    if (label.trim().length > 200) {
      throw new Error('Le label du mécanisme de contact ne peut pas dépasser 200 caractères')
    }
  }

  private async checkValueUnique(value: string, excludeId?: number): Promise<void> {
    let query = this.db
      .selectFrom('contact_origins')
      .selectAll()
      .where('value', '=', value.trim())

    if (excludeId !== undefined) {
      query = query.where('id', '!=', excludeId)
    }

    try {
      const existing = await query.executeTakeFirst()
      if (existing) {
        throw new Error(`Un mécanisme de contact avec la valeur "${value}" existe déjà`)
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
