import { inject, singleton } from 'tsyringe'
import type { Kysely } from 'kysely'
import { AppDatabaseDatasource } from '../sqlite-data-source'
import type { DB } from '../entities/database'
import type { MedicalUnitDto, MedicalUnitCreateDto, MedicalUnitUpdateDto } from '../dto/medical-unit.dto'

@singleton()
export class MedicalUnitService {
  public db: Kysely<DB>

  constructor(@inject(AppDatabaseDatasource) datasource: AppDatabaseDatasource) {
    this.db = datasource.getInstance()
  }

  private toDto(row: Record<string, unknown>): MedicalUnitDto {
    return { ...row, is_active: !!row.is_active } as unknown as MedicalUnitDto
  }

  // ─── List medical units (optionally filter by active/category) ──
  async list(activeOnly = false, category?: 'mesure' | 'prescription'): Promise<MedicalUnitDto[]> {
    let query = this.db
      .selectFrom('medical_units')
      .selectAll()
      .orderBy('category', 'asc')
      .orderBy('name', 'asc')

    if (activeOnly) {
      query = query.where('is_active', '=', 1)
    }

    if (category) {
      query = query.where('category', '=', category)
    }

    const rows = await query.execute()
    return rows.map(r => this.toDto(r))
  }

  // ─── Get single medical unit ──────────────────────────────────
  async getById(id: number): Promise<MedicalUnitDto | null> {
    const row = await this.db
      .selectFrom('medical_units')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst()

    return row ? this.toDto(row) : null
  }

  // ─── Create a new medical unit ────────────────────────────────
  async create(dto: MedicalUnitCreateDto): Promise<MedicalUnitDto> {
    this.validateCode(dto.code)
    this.validateName(dto.name)
    this.validateCategory(dto.category)
    this.validateSymbol(dto.symbol)

    try {
      // Check uniqueness
      const existing = await this.db
        .selectFrom('medical_units')
        .selectAll()
        .where('code', '=', dto.code.trim().toUpperCase())
        .executeTakeFirst()

      if (existing) {
        throw new Error(`L'unité médicale "${dto.code.trim().toUpperCase()}" existe déjà`)
      }

      const result = await this.db
        .insertInto('medical_units')
        .values({
          code: dto.code.trim().toUpperCase(),
          name: dto.name.trim(),
          category: dto.category,
          symbol: dto.symbol.trim(),
          is_active: 1,
        })
        .returningAll()
        .executeTakeFirst()

      if (!result) throw new Error("Échec de la création de l'unité médicale")
      return this.toDto(result)
    } catch (err: any) {
      if (err?.message?.includes('no such table') || err?.message?.includes('no such column')) {
        throw new Error('La base de données n\'est pas initialisée correctement. Contactez l\'administrateur.')
      }
      throw err
    }
  }

  // ─── Update a medical unit ────────────────────────────────────
  async update(dto: MedicalUnitUpdateDto): Promise<MedicalUnitDto> {
    if (dto.id == null) {
      throw new Error("L'identifiant de l'unité médicale est requis")
    }

    const existing = await this.getById(dto.id)
    if (!existing) throw new Error('Unité médicale introuvable')

    if (dto.code !== undefined) this.validateCode(dto.code)
    if (dto.name !== undefined) this.validateName(dto.name)
    if (dto.category !== undefined) this.validateCategory(dto.category)
    if (dto.symbol !== undefined) this.validateSymbol(dto.symbol)

    try {
      // Check code uniqueness if changing
      if (dto.code !== undefined) {
        const newCode = dto.code.trim().toUpperCase()
        const conflict = await this.db
          .selectFrom('medical_units')
          .selectAll()
          .where('code', '=', newCode)
          .where('id', '!=', dto.id)
          .executeTakeFirst()

        if (conflict) {
          throw new Error(`Le code "${newCode}" est déjà utilisé par une autre unité médicale`)
        }
      }

      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
      }
      if (dto.code !== undefined) updateData.code = dto.code.trim().toUpperCase()
      if (dto.name !== undefined) updateData.name = dto.name.trim()
      if (dto.category !== undefined) updateData.category = dto.category
      if (dto.symbol !== undefined) updateData.symbol = dto.symbol.trim()
      if (dto.is_active !== undefined) updateData.is_active = dto.is_active ? 1 : 0

      await this.db
        .updateTable('medical_units')
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
    if (!updated) throw new Error('Unité médicale introuvable après mise à jour')
    return updated
  }

  // ─── Toggle active/inactive ──────────────────────────────────
  async toggle(id: number, isActive: boolean): Promise<MedicalUnitDto> {
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

  private validateCategory(category: string): void {
    if (category !== 'mesure' && category !== 'prescription') {
      throw new Error("La catégorie doit être 'mesure' ou 'prescription'")
    }
  }

  private validateSymbol(symbol: string): void {
    if (!symbol || symbol.trim().length === 0) {
      throw new Error("Le symbole de l'unité médicale est requis")
    }
    if (symbol.trim().length > 20) {
      throw new Error("Le symbole de l'unité médicale ne peut pas dépasser 20 caractères")
    }
  }
}
