import { inject, singleton } from 'tsyringe'
import type { Kysely } from 'kysely'
import { AppDatabaseDatasource } from '../sqlite-data-source'
import type { DB } from '../entities/database'
import type { SiteDto, SiteCreateDto, SiteUpdateDto } from '../dto/site.dto'

@singleton()
export class SiteService {
  public db: Kysely<DB>

  constructor(@inject(AppDatabaseDatasource) datasource: AppDatabaseDatasource) {
    this.db = datasource.getInstance()
  }

  private toDto(row: Record<string, unknown>): SiteDto {
    return {
      ...row,
      is_default: !!row.is_default,
      is_active: !!row.is_active,
    } as unknown as SiteDto
  }

  // ─── List sites (optionally only active) ──────────────────────
  async list(activeOnly = false): Promise<SiteDto[]> {
    let query = this.db
      .selectFrom('sites')
      .selectAll()
      .orderBy('is_default', 'desc')
      .orderBy('name', 'asc')

    if (activeOnly) {
      query = query.where('is_active', '=', 1)
    }

    const rows = await query.execute()
    return rows.map(r => this.toDto(r))
  }

  // ─── Get single site ──────────────────────────────────────────
  async getById(id: number): Promise<SiteDto | null> {
    const row = await this.db
      .selectFrom('sites')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst()

    return row ? this.toDto(row) : null
  }

  // ─── Get default site ─────────────────────────────────────────
  async getDefault(): Promise<SiteDto | null> {
    const row = await this.db
      .selectFrom('sites')
      .selectAll()
      .where('is_default', '=', 1)
      .executeTakeFirst()

    return row ? this.toDto(row) : null
  }

  // ─── Create a new site ────────────────────────────────────────
  async create(dto: SiteCreateDto): Promise<SiteDto> {
    this.validateName(dto.name)

    try {
      // Check uniqueness
      const existing = await this.db
        .selectFrom('sites')
        .selectAll()
        .where('name', '=', dto.name.trim())
        .executeTakeFirst()

      if (existing) {
        throw new Error(`Le site "${dto.name.trim()}" existe déjà`)
      }

      // Check if any site exists — if not, this one becomes default
      const countResult = await this.db
        .selectFrom('sites')
        .select(this.db.fn.countAll<number>().as('count'))
        .executeTakeFirst()

      const count = (countResult as any)?.count ?? 0
      const isDefault = count === 0 ? 1 : 0

      const result = await this.db
        .insertInto('sites')
        .values({
          name: dto.name.trim(),
          address: dto.address ?? null,
          phone: dto.phone ?? null,
          email: dto.email ?? null,
          is_default: isDefault,
          is_active: 1,
        })
        .returningAll()
        .executeTakeFirst()

      if (!result) throw new Error('Échec de la création du site')
      return this.toDto(result)
    } catch (err: any) {
      if (err?.message?.includes('no such table') || err?.message?.includes('no such column')) {
        throw new Error('La base de données n\'est pas initialisée correctement. Contactez l\'administrateur.')
      }
      throw err
    }
  }

  // ─── Update a site ────────────────────────────────────────────
  async update(dto: SiteUpdateDto): Promise<SiteDto> {
    if (dto.id == null) {
      throw new Error("L'identifiant du site est requis")
    }

    const existing = await this.getById(dto.id)
    if (!existing) throw new Error('Site introuvable')

    // If is_default is in the update payload, delegate to setDefault
    if (dto.is_default !== undefined) {
      if (dto.is_default) {
        return await this.setDefault(dto.id)
      }
      // If setting is_default to false, we need at least one default site
      // Just ignore setting to false — the frontend should use setDefault for another site instead
    }

    if (dto.name !== undefined) this.validateName(dto.name)

    try {
      // Check name uniqueness if changing
      if (dto.name !== undefined) {
        const conflict = await this.db
          .selectFrom('sites')
          .selectAll()
          .where('name', '=', dto.name.trim())
          .where('id', '!=', dto.id)
          .executeTakeFirst()

        if (conflict) {
          throw new Error(`Le nom "${dto.name.trim()}" est déjà utilisé par un autre site`)
        }
      }

      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
      }
      if (dto.name !== undefined) updateData.name = dto.name.trim()
      if (dto.address !== undefined) updateData.address = dto.address
      if (dto.phone !== undefined) updateData.phone = dto.phone
      if (dto.email !== undefined) updateData.email = dto.email
      if (dto.is_active !== undefined) updateData.is_active = dto.is_active ? 1 : 0

      await this.db
        .updateTable('sites')
        .set(updateData)
        .where('id', '=', dto.id)
        .execute()
    } catch (err: any) {
      if (err?.message?.includes('no such table') || err?.message?.includes('no such column')) {
        throw new Error('La base de données n\'est pas initialisée correctement. Contactez l\'administrateur.')
      }
      throw err
    }

    const updated = await this.getById(dto.id)
    if (!updated) throw new Error('Site introuvable après mise à jour')
    return updated
  }

  // ─── Toggle active/inactive ──────────────────────────────────
  async toggle(id: number, isActive: boolean): Promise<SiteDto> {
    if (id == null) throw new Error("L'identifiant du site est requis")
    const existing = await this.getById(id)
    if (!existing) throw new Error('Site introuvable')

    await this.db
      .updateTable('sites')
      .set({ is_active: isActive ? 1 : 0, updated_at: new Date().toISOString().slice(0, 19).replace('T', ' ') })
      .where('id', '=', id)
      .execute()

    const updated = await this.getById(id)
    if (!updated) throw new Error('Site introuvable après mise à jour')
    return updated
  }

  // ─── Set default site ─────────────────────────────────────────
  async setDefault(id: number): Promise<SiteDto> {
    if (id == null) throw new Error("L'identifiant du site est requis")
    const existing = await this.getById(id)
    if (!existing) throw new Error('Site introuvable')

    // Unset current default, set new default in a transaction
    await this.db.transaction().execute(async (trx) => {
      await trx
        .updateTable('sites')
        .set({ is_default: 0, updated_at: new Date().toISOString().slice(0, 19).replace('T', ' ') })
        .execute()

      await trx
        .updateTable('sites')
        .set({ is_default: 1, updated_at: new Date().toISOString().slice(0, 19).replace('T', ' ') })
        .where('id', '=', id)
        .execute()
    })

    const updated = await this.getById(id)
    if (!updated) throw new Error('Site introuvable après mise à jour')
    return updated
  }

  // ─── Delete a site ────────────────────────────────────────────
  async delete(id: number): Promise<void> {
    if (id == null) throw new Error("L'identifiant du site est requis")
    const existing = await this.getById(id)
    if (!existing) throw new Error('Site introuvable')

    // Block deletion of default site
    if (existing.is_default) {
      throw new Error(
        'Impossible de supprimer le site par défaut. ' +
        'Veuillez d\'abord définir un autre site comme site par défaut.'
      )
    }

    try {
      // Check for assigned users
      const userCount = await this.db
        .selectFrom('user_sites')
        .select(this.db.fn.countAll<number>().as('count'))
        .where('site_id', '=', id)
        .executeTakeFirst()

      const count = (userCount as any)?.count ?? 0
      if (count > 0) {
        throw new Error(
          `Impossible de supprimer ce site : ${count} utilisateur(s) y sont rattaché(s). ` +
          'Désactivez le site ou réaffectez d\'abord les utilisateurs.'
        )
      }

      await this.db
        .deleteFrom('sites')
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
      throw new Error('Le nom du site est requis')
    }
    if (name.trim().length > 100) {
      throw new Error('Le nom du site ne peut pas dépasser 100 caractères')
    }
  }
}
