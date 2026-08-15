import { inject, singleton } from 'tsyringe'
import type { Kysely } from 'kysely'
import { AppDatabaseDatasource } from '../sqlite-data-source'
import type { DB } from '../entities/database'
import { ConservateurStockageEntity } from '../entities/conservateur-stockage.entity'
import { ConservateurChampLocalisationEntity } from '../entities/conservateur-champ-localisation.entity'
import { validateForeignKeys } from './utils/fk-validator'

@singleton()
export class ConservateurService {
  public db: Kysely<DB>

  constructor(@inject(AppDatabaseDatasource) datasource: AppDatabaseDatasource) {
    this.db = datasource.getInstance()
  }

  // ─── List all stockages ──────────────────────────────────────
  async listStockages(activeOnly?: boolean): Promise<ConservateurStockageEntity[]> {
    let query = this.db
      .selectFrom('conservateurs_stockage')
      .leftJoin('conservateurs_champs_localisation', 'conservateurs_champs_localisation.stockage_id', 'conservateurs_stockage.id')
      .selectAll('conservateurs_stockage')
      .select(this.db.fn.count<number>('conservateurs_champs_localisation.id').as('champs_count'))
      .groupBy('conservateurs_stockage.id')
      .orderBy('conservateurs_stockage.sort_order', 'asc')
      .orderBy('conservateurs_stockage.name', 'asc')

    if (activeOnly) {
      query = query.where('conservateurs_stockage.is_active', '=', 1)
    }

    try {
      const rows = await query.execute()
      return rows as unknown as ConservateurStockageEntity[]
    } catch (err: any) {
      if (err?.message?.includes('no such table') || err?.message?.includes('no such column')) {
        throw new Error(
          'La base de données n\'est pas initialisée correctement. Contactez l\'administrateur.',
        )
      }
      throw err
    }
  }

  // ─── Get single stockage ─────────────────────────────────────
  async getStockageById(id: number): Promise<ConservateurStockageEntity | null> {
    try {
      const row = await this.db
        .selectFrom('conservateurs_stockage')
        .selectAll()
        .where('id', '=', id)
        .executeTakeFirst()

      return row ? (row as unknown as ConservateurStockageEntity) : null
    } catch (err: any) {
      if (err?.message?.includes('no such table') || err?.message?.includes('no such column')) {
        throw new Error(
          'La base de données n\'est pas initialisée correctement. Contactez l\'administrateur.',
        )
      }
      throw err
    }
  }

  // ─── Get stockage with champs ────────────────────────────────
  async getStockageWithChamps(id: number): Promise<{
    stockage: ConservateurStockageEntity | null
    champs: ConservateurChampLocalisationEntity[]
  }> {
    const stockage = await this.getStockageById(id)
    if (!stockage) return { stockage: null, champs: [] }

    const champs = await this.listChampsByStockage(id)
    return { stockage, champs }
  }

  // ─── Create a new stockage ────────────────────────────────────
  async createStockage(entity: ConservateurStockageEntity): Promise<ConservateurStockageEntity> {
    this.validateName(entity.name ?? '')
    this.validateCode(entity.code ?? '')

    // Check uniqueness of code
    await this.checkCodeUnique(entity.code ?? '')

    let maxOrder
    try {
      maxOrder = await this.db
        .selectFrom('conservateurs_stockage')
        .select(this.db.fn.max<number>('sort_order').as('max_order'))
        .executeTakeFirst()
    } catch (err: any) {
      if (err?.message?.includes('no such table') || err?.message?.includes('no such column')) {
        throw new Error(
          'La base de données n\'est pas initialisée correctement. Contactez l\'administrateur.',
        )
      }
      throw err
    }

    const nextOrder = ((maxOrder as any)?.max_order ?? -1) + 1

    let result
    try {
      result = await this.db
        .insertInto('conservateurs_stockage')
        .values({
          code: (entity.code ?? '').trim(),
          name: (entity.name ?? '').trim(),
          description: entity.description ?? undefined,
          sort_order: nextOrder,
          is_active: entity.is_active ?? 1,
        })
        .returningAll()
        .executeTakeFirst()
    } catch (err: any) {
      if (err?.message?.includes('no such table') || err?.message?.includes('no such column')) {
        throw new Error(
          'La base de données n\'est pas initialisée correctement. Contactez l\'administrateur.',
        )
      }
      throw err
    }

    if (!result) throw new Error('Échec de la création du stockage')
    return result as unknown as ConservateurStockageEntity
  }

  // ─── Update a stockage ───────────────────────────────────────
  async updateStockage(entity: ConservateurStockageEntity): Promise<ConservateurStockageEntity> {
    if (entity.id == null) {
      throw new Error('L\'identifiant du stockage est requis')
    }

    let existing
    try {
      existing = await this.db
        .selectFrom('conservateurs_stockage')
        .selectAll()
        .where('id', '=', entity.id)
        .executeTakeFirst()
    } catch (err: any) {
      if (err?.message?.includes('no such table') || err?.message?.includes('no such column')) {
        throw new Error(
          'La base de données n\'est pas initialisée correctement. Contactez l\'administrateur.',
        )
      }
      throw err
    }

    if (!existing) throw new Error('Stockage introuvable')

    if (entity.name !== undefined) {
      this.validateName(entity.name ?? '')
    }
    if (entity.code !== undefined) {
      this.validateCode(entity.code ?? '')
      await this.checkCodeUnique(entity.code ?? '', entity.id)
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
    }
    if (entity.code !== undefined) updateData.code = (entity.code ?? '').trim()
    if (entity.name !== undefined) updateData.name = (entity.name ?? '').trim()
    if (entity.description !== undefined) updateData.description = entity.description
    if (entity.is_active !== undefined) updateData.is_active = entity.is_active ? 1 : 0

    try {
      await this.db
        .updateTable('conservateurs_stockage')
        .set(updateData)
        .where('id', '=', entity.id)
        .execute()
    } catch (err: any) {
      if (err?.message?.includes('no such table') || err?.message?.includes('no such column')) {
        throw new Error(
          'La base de données n\'est pas initialisée correctement. Contactez l\'administrateur.',
        )
      }
      throw err
    }

    const updated = await this.getStockageById(entity.id)
    if (!updated) throw new Error('Stockage introuvable après mise à jour')
    return updated
  }

  // ─── Toggle stockage active/inactive ─────────────────────────
  async toggleStockage(id: number, isActive: boolean): Promise<ConservateurStockageEntity> {
    if (id == null) throw new Error('L\'identifiant du stockage est requis')
    const existing = await this.getStockageById(id)
    if (!existing) throw new Error('Stockage introuvable')

    try {
      await this.db
        .updateTable('conservateurs_stockage')
        .set({
          is_active: isActive ? 1 : 0,
          updated_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
        })
        .where('id', '=', id)
        .execute()
    } catch (err: any) {
      if (err?.message?.includes('no such table') || err?.message?.includes('no such column')) {
        throw new Error(
          'La base de données n\'est pas initialisée correctement. Contactez l\'administrateur.',
        )
      }
      throw err
    }

    const updated = await this.getStockageById(id)
    if (!updated) throw new Error('Stockage introuvable après mise à jour')
    return updated
  }

  // ─── Delete a stockage ───────────────────────────────────────
  async deleteStockage(id: number): Promise<void> {
    if (id == null) throw new Error('L\'identifiant du stockage est requis')
    const existing = await this.getStockageById(id)
    if (!existing) throw new Error('Stockage introuvable')

    // Vérifier les références avant suppression (champs liés)
    try {
      const refs = await this.db
        .selectFrom('conservateurs_champs_localisation')
        .select(this.db.fn.count<number>('id').as('count'))
        .where('stockage_id', '=', id)
        .executeTakeFirst()

      const count = (refs as any)?.count ?? 0
      if (count > 0) {
        throw new Error(
          `Impossible de supprimer ce stockage : ${count} champ(s) de localisation lui sont rattachés. Supprimez d'abord les champs.`,
        )
      }
    } catch (err: any) {
      if (err?.message?.includes('no such table') || err?.message?.includes('no such column')) {
        throw new Error(
          'La base de données n\'est pas initialisée correctement. Contactez l\'administrateur.',
        )
      }
      throw err
    }

    try {
      await this.db
        .deleteFrom('conservateurs_stockage')
        .where('id', '=', id)
        .execute()
    } catch (err: any) {
      if (err?.message?.includes('no such table') || err?.message?.includes('no such column')) {
        throw new Error(
          'La base de données n\'est pas initialisée correctement. Contactez l\'administrateur.',
        )
      }
      throw err
    }
  }

  // ════════════════════════════════════════════════════════════════
  // CHAMPS DE LOCALISATION
  // ════════════════════════════════════════════════════════════════

  // ─── List champs by stockage ──────────────────────────────────
  async listChampsByStockage(stockageId: number): Promise<ConservateurChampLocalisationEntity[]> {
    try {
      const rows = await this.db
        .selectFrom('conservateurs_champs_localisation')
        .selectAll()
        .where('stockage_id', '=', stockageId)
        .orderBy('sort_order', 'asc')
        .orderBy('label', 'asc')
        .execute()

      return rows as unknown as ConservateurChampLocalisationEntity[]
    } catch (err: any) {
      if (err?.message?.includes('no such table') || err?.message?.includes('no such column')) {
        throw new Error(
          'La base de données n\'est pas initialisée correctement. Contactez l\'administrateur.',
        )
      }
      throw err
    }
  }

  // ─── Create a new champ ──────────────────────────────────────
  async createChamp(entity: ConservateurChampLocalisationEntity): Promise<ConservateurChampLocalisationEntity> {
    this.validateCle(entity.cle ?? '')
    this.validateLabel(entity.label ?? '')

    // Validate foreign key before insert
    await validateForeignKeys(this.db as any, [
      { table: 'conservateurs_stockage', column: 'stockage_id', value: entity.stockage_id },
    ])

    let maxOrder
    try {
      maxOrder = await this.db
        .selectFrom('conservateurs_champs_localisation')
        .select(this.db.fn.max<number>('sort_order').as('max_order'))
        .where('stockage_id', '=', entity.stockage_id)
        .executeTakeFirst()
    } catch (err: any) {
      if (err?.message?.includes('no such table') || err?.message?.includes('no such column')) {
        throw new Error(
          'La base de données n\'est pas initialisée correctement. Contactez l\'administrateur.',
        )
      }
      throw err
    }

    const nextOrder = ((maxOrder as any)?.max_order ?? -1) + 1

    let result
    try {
      result = await this.db
        .insertInto('conservateurs_champs_localisation')
        .values({
          stockage_id: entity.stockage_id,
          cle: (entity.cle ?? '').trim(),
          label: (entity.label ?? '').trim(),
          type: entity.type ?? 'texte',
          sort_order: nextOrder,
        })
        .returningAll()
        .executeTakeFirst()
    } catch (err: any) {
      if (err?.message?.includes('no such table') || err?.message?.includes('no such column')) {
        throw new Error(
          'La base de données n\'est pas initialisée correctement. Contactez l\'administrateur.',
        )
      }
      throw err
    }

    if (!result) throw new Error('Échec de la création du champ de localisation')
    return result as unknown as ConservateurChampLocalisationEntity
  }

  // ─── Update a champ ──────────────────────────────────────────
  async updateChamp(entity: ConservateurChampLocalisationEntity): Promise<ConservateurChampLocalisationEntity> {
    if (entity.id == null) {
      throw new Error('L\'identifiant du champ est requis')
    }

    let existing
    try {
      existing = await this.db
        .selectFrom('conservateurs_champs_localisation')
        .selectAll()
        .where('id', '=', entity.id)
        .executeTakeFirst()
    } catch (err: any) {
      if (err?.message?.includes('no such table') || err?.message?.includes('no such column')) {
        throw new Error(
          'La base de données n\'est pas initialisée correctement. Contactez l\'administrateur.',
        )
      }
      throw err
    }

    if (!existing) throw new Error('Champ de localisation introuvable')

    if (entity.cle !== undefined) this.validateCle(entity.cle ?? '')
    if (entity.label !== undefined) this.validateLabel(entity.label ?? '')

    const updateData: Record<string, unknown> = {}
    if (entity.cle !== undefined) updateData.cle = (entity.cle ?? '').trim()
    if (entity.label !== undefined) updateData.label = (entity.label ?? '').trim()
    if (entity.type !== undefined) updateData.type = entity.type

    try {
      await this.db
        .updateTable('conservateurs_champs_localisation')
        .set(updateData)
        .where('id', '=', entity.id)
        .execute()
    } catch (err: any) {
      if (err?.message?.includes('no such table') || err?.message?.includes('no such column')) {
        throw new Error(
          'La base de données n\'est pas initialisée correctement. Contactez l\'administrateur.',
        )
      }
      throw err
    }

    let updated
    try {
      updated = await this.db
        .selectFrom('conservateurs_champs_localisation')
        .selectAll()
        .where('id', '=', entity.id)
        .executeTakeFirst()
    } catch (err: any) {
      if (err?.message?.includes('no such table') || err?.message?.includes('no such column')) {
        throw new Error(
          'La base de données n\'est pas initialisée correctement. Contactez l\'administrateur.',
        )
      }
      throw err
    }

    if (!updated) throw new Error('Champ de localisation introuvable après mise à jour')
    return updated as unknown as ConservateurChampLocalisationEntity
  }

  // ─── Delete a champ ──────────────────────────────────────────
  async deleteChamp(id: number): Promise<void> {
    if (id == null) throw new Error('L\'identifiant du champ est requis')

    try {
      const existing = await this.db
        .selectFrom('conservateurs_champs_localisation')
        .selectAll()
        .where('id', '=', id)
        .executeTakeFirst()

      if (!existing) throw new Error('Champ de localisation introuvable')
    } catch (err: any) {
      if (err?.message?.includes('no such table') || err?.message?.includes('no such column')) {
        throw new Error(
          'La base de données n\'est pas initialisée correctement. Contactez l\'administrateur.',
        )
      }
      throw err
    }

    try {
      await this.db
        .deleteFrom('conservateurs_champs_localisation')
        .where('id', '=', id)
        .execute()
    } catch (err: any) {
      if (err?.message?.includes('no such table') || err?.message?.includes('no such column')) {
        throw new Error(
          'La base de données n\'est pas initialisée correctement. Contactez l\'administrateur.',
        )
      }
      throw err
    }
  }

  // ─── Validation ──────────────────────────────────────────────

  private validateName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new Error('Le nom du stockage est requis')
    }
    if (name.trim().length > 200) {
      throw new Error('Le nom du stockage ne peut pas dépasser 200 caractères')
    }
  }

  private validateCode(code: string): void {
    if (!code || code.trim().length === 0) {
      throw new Error('Le code du stockage est requis')
    }
    if (code.trim().length > 20) {
      throw new Error('Le code du stockage ne peut pas dépasser 20 caractères')
    }
  }

  private validateCle(cle: string): void {
    if (!cle || cle.trim().length === 0) {
      throw new Error('La clé du champ est requise')
    }
    if (cle.trim().length > 50) {
      throw new Error('La clé du champ ne peut pas dépasser 50 caractères')
    }
  }

  private validateLabel(label: string): void {
    if (!label || label.trim().length === 0) {
      throw new Error('Le label du champ est requis')
    }
    if (label.trim().length > 200) {
      throw new Error('Le label du champ ne peut pas dépasser 200 caractères')
    }
  }

  private async checkCodeUnique(code: string, excludeId?: number): Promise<void> {
    let query = this.db
      .selectFrom('conservateurs_stockage')
      .selectAll()
      .where('code', '=', code.trim())

    if (excludeId !== undefined) {
      query = query.where('id', '!=', excludeId)
    }

    try {
      const existing = await query.executeTakeFirst()
      if (existing) {
        throw new Error(`Un stockage avec le code "${code}" existe déjà`)
      }
    } catch (err: any) {
      if (err?.message?.includes('no such table') || err?.message?.includes('no such column')) {
        throw new Error(
          'La base de données n\'est pas initialisée correctement. Contactez l\'administrateur.',
        )
      }
      throw err
    }
  }
}
