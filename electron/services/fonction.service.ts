import { inject, singleton } from 'tsyringe'
import type { Kysely } from 'kysely'
import { AppDatabaseDatasource } from '../sqlite-data-source'
import type { DB } from '../entities/database'
import type { FonctionDto, FonctionCreateDto, FonctionUpdateDto } from '../dto/settings.dto'

@singleton()
export class FonctionService {
  public db: Kysely<DB>

  constructor(@inject(AppDatabaseDatasource) datasource: AppDatabaseDatasource) {
    this.db = datasource.getInstance()
  }

  private toDto(row: Record<string, unknown>): FonctionDto {
    return { ...row, is_active: !!row.is_active } as unknown as FonctionDto
  }

  // ─── List fonctions (optionally only active) ──────────────────
  async list(activeOnly = false): Promise<FonctionDto[]> {
    let query = this.db
      .selectFrom('fonctions')
      .selectAll()
      .orderBy('name', 'asc')

    if (activeOnly) {
      query = query.where('is_active', '=', 1)
    }

    const rows = await query.execute()
    return rows.map(r => this.toDto(r))
  }

  // ─── Get single fonction ──────────────────────────────────────
  async getById(id: number): Promise<FonctionDto | null> {
    const row = await this.db
      .selectFrom('fonctions')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst()

    return row ? this.toDto(row) : null
  }

  // ─── Create a new fonction ────────────────────────────────────
  async create(dto: FonctionCreateDto): Promise<FonctionDto> {
    this.validateName(dto.name)

    try {
      // Check name uniqueness
      const existing = await this.db
        .selectFrom('fonctions')
        .selectAll()
        .where('name', '=', dto.name.trim())
        .executeTakeFirst()

      if (existing) {
        throw new Error(`La fonction "${dto.name.trim()}" existe déjà`)
      }

      const result = await this.db
        .insertInto('fonctions')
        .values({
          name: dto.name.trim(),
          is_active: 1,
        })
        .returningAll()
        .executeTakeFirst()

      if (!result) throw new Error('Échec de la création de la fonction')
      return this.toDto(result)
    } catch (err: any) {
      if (err?.message?.includes('no such table') || err?.message?.includes('no such column')) {
        throw new Error('La base de données n\'est pas initialisée correctement. Contactez l\'administrateur.')
      }
      throw err
    }
  }

  // ─── Update a fonction ────────────────────────────────────────
  async update(id: number, dto: FonctionUpdateDto): Promise<FonctionDto> {
    if (id == null) {
      throw new Error('L\'identifiant de la fonction est requis')
    }

    const existing = await this.getById(id)
    if (!existing) throw new Error('Fonction introuvable')

    if (dto.name !== undefined) this.validateName(dto.name)

    try {
      // Check name uniqueness if changing
      if (dto.name !== undefined) {
        const conflict = await this.db
          .selectFrom('fonctions')
          .selectAll()
          .where('name', '=', dto.name.trim())
          .where('id', '!=', id)
          .executeTakeFirst()

        if (conflict) {
          throw new Error(`Le nom "${dto.name.trim()}" est déjà utilisé par une autre fonction`)
        }
      }

      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
      }
      if (dto.name !== undefined) updateData.name = dto.name.trim()
      if (dto.is_active !== undefined) updateData.is_active = dto.is_active ? 1 : 0

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
  async toggle(id: number): Promise<FonctionDto> {
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
