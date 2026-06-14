import { inject, singleton } from 'tsyringe'
import type { Kysely } from 'kysely'
import { AppDatabaseDatasource } from '../sqlite-data-source'
import type { DB } from '../entities/database'
import type { SpecialtyDto, SpecialtyCreateDto, SpecialtyUpdateDto } from '../dto/specialty.dto'

@singleton()
export class SpecialtyService {
  public db: Kysely<DB>

  constructor(@inject(AppDatabaseDatasource) datasource: AppDatabaseDatasource) {
    this.db = datasource.getInstance()
  }

  private toDto(row: Record<string, unknown>): SpecialtyDto {
    return { ...row, is_active: !!row.is_active } as unknown as SpecialtyDto
  }

  // ─── List specialties (optionally only active) ────────────────
  async list(activeOnly = false): Promise<SpecialtyDto[]> {
    let query = this.db
      .selectFrom('specialties')
      .selectAll()
      .orderBy('name', 'asc')

    if (activeOnly) {
      query = query.where('is_active', '=', 1)
    }

    const rows = await query.execute()
    return rows.map(r => this.toDto(r))
  }

  // ─── Get single specialty ─────────────────────────────────────
  async getById(id: number): Promise<SpecialtyDto | null> {
    const row = await this.db
      .selectFrom('specialties')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst()

    return row ? this.toDto(row) : null
  }

  // ─── Create a new specialty ───────────────────────────────────
  async create(dto: SpecialtyCreateDto): Promise<SpecialtyDto> {
    this.validateName(dto.name)
    this.validateCode(dto.code)

    try {
      // Check name uniqueness
      const existingName = await this.db
        .selectFrom('specialties')
        .selectAll()
        .where('name', '=', dto.name.trim())
        .executeTakeFirst()

      if (existingName) {
        throw new Error(`La spécialité "${dto.name.trim()}" existe déjà`)
      }

      // Check code uniqueness
      const existingCode = await this.db
        .selectFrom('specialties')
        .selectAll()
        .where('code', '=', dto.code.trim().toUpperCase())
        .executeTakeFirst()

      if (existingCode) {
        throw new Error(`Le code "${dto.code.trim().toUpperCase()}" est déjà utilisé par une autre spécialité`)
      }

      const result = await this.db
        .insertInto('specialties')
        .values({
          name: dto.name.trim(),
          code: dto.code.trim().toUpperCase(),
          title_prefix: dto.title_prefix?.trim() || 'Dr',
          is_active: 1,
        })
        .returningAll()
        .executeTakeFirst()

      if (!result) throw new Error('Échec de la création de la spécialité')
      return this.toDto(result)
    } catch (err: any) {
      if (err?.message?.includes('no such table') || err?.message?.includes('no such column')) {
        throw new Error('La base de données n\'est pas initialisée correctement. Contactez l\'administrateur.')
      }
      throw err
    }
  }

  // ─── Update a specialty ───────────────────────────────────────
  async update(dto: SpecialtyUpdateDto): Promise<SpecialtyDto> {
    if (dto.id == null) {
      throw new Error("L'identifiant de la spécialité est requis")
    }

    const existing = await this.getById(dto.id)
    if (!existing) throw new Error('Spécialité introuvable')

    if (dto.name !== undefined) this.validateName(dto.name)
    if (dto.code !== undefined) this.validateCode(dto.code)

    try {
      // Check name uniqueness if changing
      if (dto.name !== undefined) {
        const conflict = await this.db
          .selectFrom('specialties')
          .selectAll()
          .where('name', '=', dto.name.trim())
          .where('id', '!=', dto.id)
          .executeTakeFirst()

        if (conflict) {
          throw new Error(`Le nom "${dto.name.trim()}" est déjà utilisé par une autre spécialité`)
        }
      }

      // Check code uniqueness if changing
      if (dto.code !== undefined) {
        const newCode = dto.code.trim().toUpperCase()
        const conflict = await this.db
          .selectFrom('specialties')
          .selectAll()
          .where('code', '=', newCode)
          .where('id', '!=', dto.id)
          .executeTakeFirst()

        if (conflict) {
          throw new Error(`Le code "${newCode}" est déjà utilisé par une autre spécialité`)
        }
      }

      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
      }
      if (dto.name !== undefined) updateData.name = dto.name.trim()
      if (dto.code !== undefined) updateData.code = dto.code.trim().toUpperCase()
      if (dto.title_prefix !== undefined) updateData.title_prefix = dto.title_prefix.trim()
      if (dto.is_active !== undefined) updateData.is_active = dto.is_active ? 1 : 0

      await this.db
        .updateTable('specialties')
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
    if (!updated) throw new Error('Spécialité introuvable après mise à jour')
    return updated
  }

  // ─── Toggle active/inactive ──────────────────────────────────
  async toggle(id: number, isActive: boolean): Promise<SpecialtyDto> {
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
