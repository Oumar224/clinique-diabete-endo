import { inject, singleton } from 'tsyringe'
import type { Kysely } from 'kysely'
import { AppDatabaseDatasource } from '../sqlite-data-source'
import { CurrencyService } from './currency.service'
import type { DB } from '../entities/database'
import type {
  MedicalActDto,
  MedicalActCreateDto,
  MedicalActUpdateDto,
  ActPriceHistoryDto,
} from '../dto/settings.dto'

@singleton()
export class MedicalActService {
  public db: Kysely<DB>
  private currencyService: CurrencyService

  constructor(
    @inject(AppDatabaseDatasource) datasource: AppDatabaseDatasource,
    @inject(CurrencyService) currencyService: CurrencyService,
  ) {
    this.db = datasource.getInstance()
    this.currencyService = currencyService
  }

  private toDto(row: Record<string, unknown>): MedicalActDto {
    return { ...row, is_active: !!row.is_active } as unknown as MedicalActDto
  }

  // ─── List all medical acts (with service name) ───────────────
  async list(activeOnly = false): Promise<MedicalActDto[]> {
    try {
      let query = this.db
        .selectFrom('medical_acts')
        .innerJoin('services', 'medical_acts.service_id', 'services.id')
        .selectAll('medical_acts')
        .select('services.name as service_name')
        .orderBy('medical_acts.label', 'asc')

      if (activeOnly) {
        query = query.where('medical_acts.is_active', '=', 1)
      }

      const rows = await query.execute()
      return rows.map(r => this.toDto(r))
    } catch (err: any) {
      if (err?.message?.includes('no such table') || err?.message?.includes('no such column')) return []
      throw err
    }
  }

  // ─── Get single act by id ────────────────────────────────────
  async getById(id: number): Promise<MedicalActDto | null> {
    try {
      const row = await this.db
        .selectFrom('medical_acts')
        .innerJoin('services', 'medical_acts.service_id', 'services.id')
        .selectAll('medical_acts')
        .select('services.name as service_name')
        .where('medical_acts.id', '=', id)
        .executeTakeFirst()

      return row ? this.toDto(row) : null
    } catch (err: any) {
      if (err?.message?.includes('no such table') || err?.message?.includes('no such column')) return null
      throw err
    }
  }

  // ─── Get acts by service ─────────────────────────────────────
  async getByService(serviceId: number): Promise<MedicalActDto[]> {
    try {
      const rows = await this.db
        .selectFrom('medical_acts')
        .innerJoin('services', 'medical_acts.service_id', 'services.id')
        .selectAll('medical_acts')
        .select('services.name as service_name')
        .where('medical_acts.service_id', '=', serviceId)
        .orderBy('medical_acts.label', 'asc')
        .execute()

      return rows.map(r => this.toDto(r))
    } catch (err: any) {
      if (err?.message?.includes('no such table') || err?.message?.includes('no such column')) return []
      throw err
    }
  }

  // ─── Create a new medical act ────────────────────────────────
  async create(dto: MedicalActCreateDto): Promise<MedicalActDto> {
    this.validateActCode(dto.code)
    this.validateActLabel(dto.label)
    this.validatePrice(dto.price)

    const actCode = dto.code.trim().toUpperCase()

    try {
      // Check for duplicate code
      const existingCode = await this.db
        .selectFrom('medical_acts')
        .select('id')
        .where('code', '=', actCode)
        .executeTakeFirst()
      if (existingCode) {
        throw new Error(`Le code "${actCode}" est déjà utilisé`)
      }

      // Verify service exists
      if (dto.service_id == null) {
        throw new Error('Le service associé est requis')
      }
      const service = await this.db
        .selectFrom('services')
        .select('id')
        .where('id', '=', dto.service_id)
        .executeTakeFirst()

      if (!service) throw new Error('Service associé introuvable')

      // Validate currency if provided, otherwise use default
      const currencyCode = dto.currency_code ?? await this.currencyService.getDefault()
      if (dto.currency_code) {
        const currency = await this.db
          .selectFrom('currency')
          .select('code')
          .where('code', '=', dto.currency_code)
          .executeTakeFirst()
        if (!currency) throw new Error(`Devise "${dto.currency_code}" introuvable`)
      }

      // Use a transaction to create act + first price history entry
      const result = await this.db.transaction().execute(async (trx) => {
        const inserted = await trx
          .insertInto('medical_acts')
          .values({
            code: actCode,
            label: dto.label.trim(),
            price: dto.price,
            currency_code: currencyCode,
            service_id: dto.service_id,
            is_active: 1,
          })
          .returningAll()
          .executeTakeFirst()

        if (!inserted) throw new Error('Échec de la création de l\'acte médical')

        // Record initial price in history
        await trx
          .insertInto('act_price_history')
          .values({
            act_id: (inserted as any).id,
            old_price: null,
            new_price: dto.price,
            change_reason: 'Prix initial',
          })
          .execute()

        return inserted
      })

      return (await this.getById((result as any).id))!
    } catch (err: any) {
      if (err?.message?.includes('no such table') || err?.message?.includes('no such column')) {
        throw new Error('La base de données n\'est pas initialisée correctement. Contactez l\'administrateur.')
      }
      throw err
    }
  }

  // ─── Update a medical act ────────────────────────────────────
  async update(dto: MedicalActUpdateDto): Promise<MedicalActDto> {
    if (dto.id == null) {
      throw new Error("L'identifiant de l'acte médical est requis")
    }

    try {
      const existing = await this.db
        .selectFrom('medical_acts')
        .selectAll()
        .where('id', '=', dto.id)
        .executeTakeFirst()

      if (!existing) throw new Error('Acte médical introuvable')

      if (dto.code !== undefined) this.validateActCode(dto.code)
      if (dto.label !== undefined) this.validateActLabel(dto.label)
      if (dto.price !== undefined) this.validatePrice(dto.price)

      if (dto.service_id !== undefined) {
        const service = await this.db
          .selectFrom('services')
          .select('id')
          .where('id', '=', dto.service_id)
          .executeTakeFirst()
        if (!service) throw new Error('Service associé introuvable')
      }

      // Validate currency if changing
      if (dto.currency_code !== undefined) {
        const currency = await this.db
          .selectFrom('currency')
          .select('code')
          .where('code', '=', dto.currency_code)
          .executeTakeFirst()
        if (!currency) throw new Error(`Devise "${dto.currency_code}" introuvable`)
      }

      const oldPrice = (existing as any).price

      await this.db.transaction().execute(async (trx) => {
        const updateData: Record<string, unknown> = { updated_at: new Date().toISOString().slice(0, 19).replace('T', ' ') }

        if (dto.code !== undefined) updateData.code = dto.code.trim().toUpperCase()
        if (dto.label !== undefined) updateData.label = dto.label.trim()
        if (dto.price !== undefined) updateData.price = dto.price
        if (dto.currency_code !== undefined) updateData.currency_code = dto.currency_code
        if (dto.service_id !== undefined) updateData.service_id = dto.service_id
        if (dto.is_active !== undefined) updateData.is_active = dto.is_active ? 1 : 0

        await trx
          .updateTable('medical_acts')
          .set(updateData)
          .where('id', '=', dto.id)
          .execute()

        // Track price change if price was updated
        if (dto.price !== undefined && dto.price !== oldPrice) {
          await trx
            .insertInto('act_price_history')
            .values({
              act_id: dto.id,
              old_price: oldPrice,
              new_price: dto.price,
              change_reason: 'Mise à jour du tarif',
            })
            .execute()
        }
      })

      const updated = await this.getById(dto.id)
      if (!updated) throw new Error('Acte médical introuvable après mise à jour')
      return updated
    } catch (err: any) {
      if (err?.message?.includes('no such table') || err?.message?.includes('no such column')) {
        throw new Error('La base de données n\'est pas initialisée correctement. Contactez l\'administrateur.')
      }
      throw err
    }
  }

  // ─── Get price history for an act ────────────────────────────
  async getPriceHistory(actId: number): Promise<ActPriceHistoryDto[]> {
    if (actId == null) throw new Error("L'identifiant de l'acte médical est requis")

    try {
      const act = await this.db
        .selectFrom('medical_acts')
        .select('id')
        .where('id', '=', actId)
        .executeTakeFirst()

      if (!act) throw new Error('Acte médical introuvable')

      const rows = await this.db
        .selectFrom('act_price_history')
        .selectAll()
        .where('act_id', '=', actId)
        .orderBy('changed_at', 'desc')
        .orderBy('id', 'desc')
        .execute()

      return rows as unknown as ActPriceHistoryDto[]
    } catch (err: any) {
      if (err?.message?.includes('no such table') || err?.message?.includes('no such column')) return []
      throw err
    }
  }

  // ─── Delete a medical act (cascades price history) ───────────
  async delete(id: number): Promise<void> {
    if (id == null) throw new Error("L'identifiant de l'acte médical est requis")

    try {
      const existing = await this.db
        .selectFrom('medical_acts')
        .select('id')
        .where('id', '=', id)
        .executeTakeFirst()

      if (!existing) throw new Error('Acte médical introuvable')

      await this.db.transaction().execute(async (trx) => {
        // Delete price history first (FK constraint)
        await trx
          .deleteFrom('act_price_history')
          .where('act_id', '=', id)
          .execute()

        await trx
          .deleteFrom('medical_acts')
          .where('id', '=', id)
          .execute()
      })
    } catch (err: any) {
      if (err?.message?.includes('no such table') || err?.message?.includes('no such column')) {
        throw new Error('La base de données n\'est pas initialisée correctement. Contactez l\'administrateur.')
      }
      throw err
    }
  }

  // ─── Validation ──────────────────────────────────────────────
  private validateActCode(code: string): void {
    if (!code || code.trim().length === 0) {
      throw new Error('Le code de l\'acte est requis')
    }
    if (code.trim().length > 50) {
      throw new Error('Le code de l\'acte ne peut pas dépasser 50 caractères')
    }
    if (!/^[A-Za-z0-9_-]+$/.test(code.trim())) {
      throw new Error('Le code de l\'acte ne doit contenir que des lettres, chiffres, tirets et underscores')
    }
  }

  private validateActLabel(label: string): void {
    if (!label || label.trim().length === 0) {
      throw new Error('Le libellé de l\'acte est requis')
    }
    if (label.trim().length > 200) {
      throw new Error('Le libellé de l\'acte ne peut pas dépasser 200 caractères')
    }
  }

  private validatePrice(price: number): void {
    if (typeof price !== 'number' || isNaN(price)) {
      throw new Error('Le prix doit être un nombre valide')
    }
    if (price < 0) {
      throw new Error('Le prix ne peut pas être négatif')
    }
    if (price > 99_999_999_999) {
      throw new Error('Le prix est trop élevé')
    }
  }
}
