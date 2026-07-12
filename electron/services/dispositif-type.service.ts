import { inject, singleton } from 'tsyringe'
import type { Kysely } from 'kysely'
import { AppDatabaseDatasource } from '../sqlite-data-source'
import type { DB } from '../entities/database'
import type { DispositifTypeEntity } from '../entities/dispositif-type.entity'

@singleton()
export class DispositifTypeService {
  public db: Kysely<DB>

  constructor(@inject(AppDatabaseDatasource) datasource: AppDatabaseDatasource) {
    this.db = datasource.getInstance()
  }

  async list(activeOnly = false): Promise<DispositifTypeEntity[]> {
    let query = this.db
      .selectFrom('dispositif_types')
      .selectAll()
      .orderBy('label', 'asc')

    if (activeOnly) {
      query = query.where('is_active', '=', 1)
    }

    const rows = await query.execute()
    return rows as unknown as DispositifTypeEntity[]
  }

  async getById(id: number): Promise<DispositifTypeEntity | null> {
    const row = await this.db
      .selectFrom('dispositif_types')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst()

    return row ? (row as unknown as DispositifTypeEntity) : null
  }

  async create(entity: DispositifTypeEntity): Promise<DispositifTypeEntity> {
    this.validateLabel(entity.label ?? '')

    try {
      const existing = await this.db
        .selectFrom('dispositif_types')
        .selectAll()
        .where('label', '=', (entity.label ?? '').trim())
        .executeTakeFirst()

      if (existing) {
        throw new Error(`Le type "${(entity.label ?? '').trim()}" existe déjà`)
      }

      const result = await this.db
        .insertInto('dispositif_types')
        .values({
          label: (entity.label ?? '').trim(),
          is_active: entity.is_active ?? 1,
        })
        .returningAll()
        .executeTakeFirst()

      if (!result) throw new Error('Échec de la création du type')
      return result as unknown as DispositifTypeEntity
    } catch (err: any) {
      if (err?.message?.includes('no such table') || err?.message?.includes('no such column')) {
        throw new Error('La base de données n\'est pas initialisée correctement. Contactez l\'administrateur.')
      }
      throw err
    }
  }

  async delete(id: number): Promise<void> {
    if (id == null) throw new Error('L\'identifiant du type est requis')

    const existing = await this.getById(id)
    if (!existing) throw new Error('Type introuvable')

    try {
      await this.db
        .deleteFrom('dispositif_types')
        .where('id', '=', id)
        .execute()
    } catch (err: any) {
      if (err?.message?.includes('no such table') || err?.message?.includes('no such column')) {
        throw new Error('La base de données n\'est pas initialisée correctement. Contactez l\'administrateur.')
      }
      throw err
    }
  }

  private validateLabel(label: string): void {
    if (!label || label.trim().length === 0) {
      throw new Error('Le libellé du type est requis')
    }
    if (label.trim().length > 100) {
      throw new Error('Le libellé ne peut pas dépasser 100 caractères')
    }
  }
}
