import { inject, singleton } from 'tsyringe'
import type { Kysely } from 'kysely'
import { AppDatabaseDatasource } from '../sqlite-data-source'
import type { DB } from '../entities/database'
import type { CurrencyDto, CurrencyCreateDto, CurrencyUpdateDto } from '../dto/settings.dto'

@singleton()
export class CurrencyService {
  public db: Kysely<DB>

  constructor(@inject(AppDatabaseDatasource) datasource: AppDatabaseDatasource) {
    this.db = datasource.getInstance()
  }

  private toDto(row: Record<string, unknown>): CurrencyDto {
    return { ...row, is_active: !!row.is_active } as unknown as CurrencyDto
  }

  // ─── List all currencies (optionally only active) ────────────
  async list(activeOnly = false): Promise<CurrencyDto[]> {
    try {
      let query = this.db
        .selectFrom('currency')
        .selectAll()
        .orderBy('code', 'asc')

      if (activeOnly) {
        query = query.where('is_active', '=', 1)
      }

      const rows = await query.execute()
      return rows.map(r => this.toDto(r))
    } catch (err: any) {
      if (err?.message?.includes('no such table')) return []
      throw err
    }
  }

  // ─── Get single currency by code ─────────────────────────────
  async getByCode(code: string): Promise<CurrencyDto | null> {
    try {
      const row = await this.db
        .selectFrom('currency')
        .selectAll()
        .where('code', '=', code)
        .executeTakeFirst()

      return row ? this.toDto(row) : null
    } catch (err: any) {
      if (err?.message?.includes('no such table')) return null
      throw err
    }
  }

  // ─── Create a new currency ───────────────────────────────────
  async create(dto: CurrencyCreateDto): Promise<CurrencyDto> {
    this.validateCode(dto.code)
    this.validateName(dto.name)
    this.validateSymbol(dto.symbol)

    const code = dto.code.trim().toUpperCase()

    const existing = await this.getByCode(code)
    if (existing) {
      throw new Error(`La devise "${code}" existe déjà`)
    }

    const result = await this.db
      .insertInto('currency')
      .values({
        code,
        name: dto.name.trim(),
        symbol: dto.symbol.trim(),
        decimals: dto.decimals ?? 0,
        is_active: 1,
      })
      .returningAll()
      .executeTakeFirst()

    if (!result) throw new Error("Échec de la création de la devise")
    return this.toDto(result)
  }

  // ─── Update a currency ───────────────────────────────────────
  async update(code: string, dto: CurrencyUpdateDto): Promise<CurrencyDto> {
    const existing = await this.getByCode(code)
    if (!existing) throw new Error('Devise introuvable')

    if (dto.name !== undefined) this.validateName(dto.name)
    if (dto.symbol !== undefined) this.validateSymbol(dto.symbol)

    const updateData: Record<string, unknown> = {}
    if (dto.name !== undefined) updateData.name = dto.name.trim()
    if (dto.symbol !== undefined) updateData.symbol = dto.symbol.trim()
    if (dto.decimals !== undefined) updateData.decimals = dto.decimals
    if (dto.is_active !== undefined) updateData.is_active = dto.is_active ? 1 : 0

    if (Object.keys(updateData).length === 0) {
      return this.toDto(existing as unknown as Record<string, unknown>)
    }

    await this.db
      .updateTable('currency')
      .set(updateData)
      .where('code', '=', code)
      .execute()

    const updated = await this.getByCode(code)
    if (!updated) throw new Error('Devise introuvable après mise à jour')
    return updated
  }

  // ─── Delete a currency ───────────────────────────────────────
  async delete(code: string): Promise<void> {
    const existing = await this.getByCode(code)
    if (!existing) throw new Error('Devise introuvable')

    // Block deletion of GNF (default fallback currency)
    if (code === 'GNF') {
      throw new Error('Impossible de supprimer la devise par défaut (GNF)')
    }

    // Check if it is the current default currency in app_settings
    const defaultSetting = await this.db
      .selectFrom('app_settings')
      .selectAll()
      .where('key', '=', 'currency')
      .executeTakeFirst()

    const defaultCode = (defaultSetting as any)?.value ?? 'GNF'
    if (code === defaultCode) {
      throw new Error(
        `Impossible de supprimer cette devise : elle est définie comme devise par défaut. ` +
        'Veuillez d\'abord changer la devise par défaut.'
      )
    }

    // Check if medical acts reference this currency
    const refCount = await this.db
      .selectFrom('medical_acts')
      .select(this.db.fn.countAll<number>().as('count'))
      .where('currency_code', '=', code)
      .executeTakeFirst()

    const count = (refCount as any)?.count ?? 0
    if (count > 0) {
      throw new Error(
        `Impossible de supprimer cette devise : ${count} acte(s) médical(eaux) l'utilisent. ` +
        'Modifiez d\'abord la devise des actes concernés.'
      )
    }

    await this.db
      .deleteFrom('currency')
      .where('code', '=', code)
      .execute()
  }

  // ─── Get default currency code from app_settings ─────────────
  async getDefault(): Promise<string> {
    try {
      const result = await this.db
        .selectFrom('app_settings')
        .selectAll()
        .where('key', '=', 'currency')
        .executeTakeFirst()

      return ((result as any)?.value as string) ?? 'GNF'
    } catch (err: any) {
      if (err?.message?.includes('no such table')) return 'GNF'
      throw err
    }
  }

  // ─── Set default currency code in app_settings ───────────────
  async setDefault(code: string): Promise<void> {
    const currency = await this.getByCode(code)
    if (!currency) {
      throw new Error(`Devise "${code}" non prise en charge`)
    }

    await this.db
      .insertInto('app_settings')
      .values({ key: 'currency', value: code })
      .onConflict((oc) =>
        oc.column('key').doUpdateSet({ value: code })
      )
      .execute()
  }

  // ─── Validation ──────────────────────────────────────────────
  private validateCode(code: string): void {
    if (!code || code.trim().length === 0) {
      throw new Error('Le code de la devise est requis')
    }
    if (code.trim().length > 10) {
      throw new Error('Le code de la devise ne peut pas dépasser 10 caractères')
    }
    if (!/^[A-Za-z0-9]{2,10}$/.test(code.trim())) {
      throw new Error('Le code de la devise doit contenir 2 à 10 lettres ou chiffres')
    }
  }

  private validateName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new Error('Le nom de la devise est requis')
    }
    if (name.trim().length > 100) {
      throw new Error('Le nom de la devise ne peut pas dépasser 100 caractères')
    }
  }

  private validateSymbol(symbol: string): void {
    if (!symbol || symbol.trim().length === 0) {
      throw new Error('Le symbole de la devise est requis')
    }
    if (symbol.trim().length > 10) {
      throw new Error('Le symbole de la devise ne peut pas dépasser 10 caractères')
    }
  }
}
