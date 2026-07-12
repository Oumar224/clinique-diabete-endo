import { inject, singleton } from 'tsyringe'
import type { Kysely } from 'kysely'
import { AppDatabaseDatasource } from '../sqlite-data-source'
import type { DB } from '../entities/database'
import type { FonctionEntity } from '../entities/fonction.entity'

@singleton()
export class FonctionService {
  public db: Kysely<DB>

  constructor(@inject(AppDatabaseDatasource) datasource: AppDatabaseDatasource) {
    this.db = datasource.getInstance()
  }

  // ─── List fonctions (optionally only active) ──────────────────
  async list(activeOnly = false): Promise<FonctionEntity[]> {
    let query = this.db
      .selectFrom('fonctions')
      .selectAll()
      .orderBy('name', 'asc')

    if (activeOnly) {
      query = query.where('is_active', '=', 1)
    }

    const rows = await query.execute()
    return rows as unknown as FonctionEntity[]
  }

  // ─── Get single fonction ──────────────────────────────────────
  async getById(id: number): Promise<FonctionEntity | null> {
    const row = await this.db
      .selectFrom('fonctions')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst()

    return row ? (row as unknown as FonctionEntity) : null
  }

  // ─── Create a new fonction ────────────────────────────────────
  async create(entity: FonctionEntity): Promise<FonctionEntity> {
    this.validateName(entity.name ?? '')

    try {
      // Check name uniqueness
      const existing = await this.db
        .selectFrom('fonctions')
        .selectAll()
        .where('name', '=', (entity.name ?? '').trim())
        .executeTakeFirst()

      if (existing) {
        throw new Error(`La fonction "${(entity.name ?? '').trim()}" existe déjà`)
      }

      const result = await this.db
        .insertInto('fonctions')
        .values({
          name: (entity.name ?? '').trim(),
          is_active: entity.is_active ?? 1,
        })
        .returningAll()
        .executeTakeFirst()

      if (!result) throw new Error('Échec de la création de la fonction')
      return result as unknown as FonctionEntity
    } catch (err: any) {
      if (err?.message?.includes('no such table') || err?.message?.includes('no such column')) {
        throw new Error('La base de données n\'est pas initialisée correctement. Contactez l\'administrateur.')
      }
      throw err
    }
  }

  // ─── Update a fonction ────────────────────────────────────────
  async update(entity: FonctionEntity): Promise<FonctionEntity> {
    const id = entity.id
    if (id == null) {
      throw new Error('L\'identifiant de la fonction est requis')
    }

    const existing = await this.getById(id)
    if (!existing) throw new Error('Fonction introuvable')

    if (entity.name !== undefined) this.validateName(entity.name)

    try {
      // Check name uniqueness if changing
      if (entity.name !== undefined) {
        const conflict = await this.db
          .selectFrom('fonctions')
          .selectAll()
          .where('name', '=', (entity.name ?? '').trim())
          .where('id', '!=', id)
          .executeTakeFirst()

        if (conflict) {
          throw new Error(`Le nom "${(entity.name ?? '').trim()}" est déjà utilisé par une autre fonction`)
        }
      }

      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
      }
      if (entity.name !== undefined) updateData.name = (entity.name ?? '').trim()
      if (entity.is_active !== undefined) updateData.is_active = entity.is_active ? 1 : 0

      await this.db
        .updateTable('fonctions')
        .set(updateData)
        .where('id', '=', id)
        .execute()
    } catch (err: any) {
      if (err?.message?.includes('no such table') || err?.message?.includes('no such column')) {
        throw new Error('La base de données n\'est pas initialisée correctement. Contactez l\'administrateur.')
      }
      throw err
    }

    const updated = await this.getById(id)
    if (!updated) throw new Error('Fonction introuvable après mise à jour')
    return updated
  }

  // ─── Toggle active/inactive ───────────────────────────────────
  async toggle(id: number): Promise<FonctionEntity> {
    if (id == null) throw new Error('L\'identifiant de la fonction est requis')

    const existing = await this.getById(id)
    if (!existing) throw new Error('Fonction introuvable')

    await this.db
      .updateTable('fonctions')
      .set({ is_active: existing.is_active ? 0 : 1, updated_at: new Date().toISOString().slice(0, 19).replace('T', ' ') })
      .where('id', '=', id)
      .execute()

    const updated = await this.getById(id)
    if (!updated) throw new Error('Fonction introuvable après mise à jour')
    return updated
  }

  // ─── Delete a fonction ────────────────────────────────────────
  async delete(id: number): Promise<void> {
    if (id == null) throw new Error('L\'identifiant de la fonction est requis')

    const existing = await this.getById(id)
    if (!existing) throw new Error('Fonction introuvable')

    try {
      // Check for assigned users
      const userCount = await this.db
        .selectFrom('user')
        .select(this.db.fn.countAll<number>().as('count'))
        .where('fonction_id' as any, '=', id as any)
        .executeTakeFirst()

      const count = (userCount as any)?.count ?? 0
      if (count > 0) {
        throw new Error(
          `Impossible de supprimer cette fonction : ${count} utilisateur(s) y sont rattaché(s). ` +
          'Désactivez la fonction ou réaffectez d\'abord les utilisateurs.'
        )
      }

      await this.db
        .deleteFrom('fonctions')
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
  private validateName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new Error('Le nom de la fonction est requis')
    }
    if (name.trim().length > 100) {
      throw new Error('Le nom de la fonction ne peut pas dépasser 100 caractères')
    }
  }
}
