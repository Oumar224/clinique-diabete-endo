import { inject, singleton } from 'tsyringe'
import type { Kysely } from 'kysely'
import { AppDatabaseDatasource } from '../sqlite-data-source'
import type { DB } from '../entities/database'
import type { VoieTypeEntity } from '../entities/voie-type.entity'

@singleton()
export class VoieTypeService {
  public db: Kysely<DB>

  constructor(@inject(AppDatabaseDatasource) datasource: AppDatabaseDatasource) {
    this.db = datasource.getInstance()
  }

  async list(activeOnly = false): Promise<VoieTypeEntity[]> {
    let query = this.db
      .selectFrom('voie_types')
      .selectAll()
      .orderBy('label', 'asc')

    if (activeOnly) {
      query = query.where('is_active', '=', 1)
    }

    const rows = await query.execute()
    return rows as unknown as VoieTypeEntity[]
  }

  async getById(id: number): Promise<VoieTypeEntity | null> {
    const row = await this.db
      .selectFrom('voie_types')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst()

    return row ? (row as unknown as VoieTypeEntity) : null
  }

  async create(entity: VoieTypeEntity): Promise<VoieTypeEntity> {
    this.validateLabel(entity.label ?? '')

    try {
      const existing = await this.db
        .selectFrom('voie_types')
        .selectAll()
        .where('label', '=', (entity.label ?? '').trim())
        .executeTakeFirst()

      if (existing) {
        throw new Error(`La voie "${(entity.label ?? '').trim()}" existe déjà`)
      }

      const result = await this.db
        .insertInto('voie_types')
        .values({
          label: (entity.label ?? '').trim(),
          is_active: entity.is_active ?? 1,
        })
        .returningAll()
        .executeTakeFirst()

      if (!result) throw new Error('Échec de la création de la voie')
      return result as unknown as VoieTypeEntity
    } catch (err: any) {
      if (err?.message?.includes('no such table') || err?.message?.includes('no such column')) {
        throw new Error('La base de données n\'est pas initialisée correctement. Contactez l\'administrateur.')
      }
      throw err
    }
  }

  async delete(id: number): Promise<void> {
    if (id == null) throw new Error('L\'identifiant de la voie est requis')

    const existing = await this.getById(id)
    if (!existing) throw new Error('Voie introuvable')

    try {
      await this.db
        .deleteFrom('voie_types')
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
      throw new Error('Le libellé de la voie est requis')
    }
    if (label.trim().length > 100) {
      throw new Error('Le libellé ne peut pas dépasser 100 caractères')
    }
  }
}
