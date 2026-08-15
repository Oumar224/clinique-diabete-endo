import { inject, singleton } from 'tsyringe'
import type { Kysely } from 'kysely'
import { AppDatabaseDatasource } from '../sqlite-data-source'
import type { DB } from '../entities/database'
import type { ConfigTarifEntity } from '../entities/config-tarif.entity'
import type { TarifCreateDto, TarifBulkUpdateDto } from '../dto/settings.dto'

@singleton()
export class ConfigTarifService {
  public db: Kysely<DB>

  constructor(@inject(AppDatabaseDatasource) datasource: AppDatabaseDatasource) {
    this.db = datasource.getInstance()
  }

  // ─── List all tariffs, optionally filtered ───────────────────
  async list(acteId?: number, codeTarif?: string): Promise<ConfigTarifEntity[]> {
    try {
      let query = this.db
        .selectFrom('config_tarifs')
        .innerJoin('medical_acts', 'config_tarifs.acte_id', 'medical_acts.id')
        .innerJoin('services', 'medical_acts.service_id', 'services.id')
        .selectAll('config_tarifs')
        .select([
          'medical_acts.code as acte_code',
          'medical_acts.label as acte_label',
          'services.name as service_name',
        ])
        .orderBy('config_tarifs.date_application', 'desc')
        .orderBy('config_tarifs.id', 'desc')

      if (acteId != null) {
        query = query.where('config_tarifs.acte_id', '=', acteId)
      }
      if (codeTarif != null) {
        query = query.where('config_tarifs.code_tarif', '=', codeTarif)
      }

      const rows = await query.execute()
      return rows as unknown as ConfigTarifEntity[]
    } catch (err: any) {
      if (err?.message?.includes('no such table') || err?.message?.includes('no such column')) return []
      throw err
    }
  }

  // ─── Get the most recent tariff for an act by code ───────────
  async getActiveTarif(acteId: number, codeTarif: string = 'TARIF.STANDARD'): Promise<ConfigTarifEntity | null> {
    try {
      const row = await this.db
        .selectFrom('config_tarifs')
        .innerJoin('medical_acts', 'config_tarifs.acte_id', 'medical_acts.id')
        .innerJoin('services', 'medical_acts.service_id', 'services.id')
        .selectAll('config_tarifs')
        .select([
          'medical_acts.code as acte_code',
          'medical_acts.label as acte_label',
          'services.name as service_name',
        ])
        .where('config_tarifs.acte_id', '=', acteId)
        .where('config_tarifs.code_tarif', '=', codeTarif)
        .orderBy('config_tarifs.date_application', 'desc')
        .orderBy('config_tarifs.id', 'desc')
        .limit(1)
        .executeTakeFirst()

      return row ? (row as unknown as ConfigTarifEntity) : null
    } catch (err: any) {
      if (err?.message?.includes('no such table') || err?.message?.includes('no such column')) return null
      throw err
    }
  }

  // ─── Create a new tariff entry ────────────────────────────────
  async create(dto: TarifCreateDto): Promise<ConfigTarifEntity> {
    this.validatePrixUnitaire(dto.prix_unitaire!)

    try {
      const acte = await this.db
        .selectFrom('medical_acts')
        .select('id')
        .where('id', '=', dto.acte_id)
        .executeTakeFirst()

      if (!acte) throw new Error('Acte médical introuvable')

      const dateApp = dto.date_application ?? new Date().toISOString().slice(0, 10)
      const codeTarif = dto.code_tarif ?? 'TARIF.STANDARD'

      const result = await this.db
        .insertInto('config_tarifs')
        .values({
          acte_id: dto.acte_id,
          code_tarif: codeTarif,
          prix_unitaire: dto.prix_unitaire,
          date_application: dateApp,
        })
        .returningAll()
        .executeTakeFirst()

      if (!result) throw new Error("Échec de la création du tarif")

      const created = await this.getActiveTarif((result as any).acte_id, (result as any).code_tarif)
      return created!
    } catch (err: any) {
      if (err?.message?.includes('no such table') || err?.message?.includes('no such column')) {
        throw new Error('La base de données n\'est pas initialisée correctement. Contactez l\'administrateur.')
      }
      throw err
    }
  }

  // ─── Update a tariff entry (only allows label/code_tarif changes on existing row) ──
  async update(id: number, dto: Partial<ConfigTarifEntity>): Promise<ConfigTarifEntity> {
    if (id == null) throw new Error("L'identifiant du tarif est requis")

    try {
      const existing = await this.db
        .selectFrom('config_tarifs')
        .selectAll()
        .where('id', '=', id)
        .executeTakeFirst()

      if (!existing) throw new Error('Tarif introuvable')

      if (dto.prix_unitaire !== undefined) {
        // Price changes must go through create() or bulkUpdate() to preserve history
        return this.create({
          acte_id: (existing as any).acte_id,
          code_tarif: dto.code_tarif ?? (existing as any).code_tarif,
          prix_unitaire: dto.prix_unitaire,
          date_application: new Date().toISOString().slice(0, 10),
        })
      }

      const updateData: Record<string, unknown> = { updated_at: new Date().toISOString().slice(0, 19).replace('T', ' ') }

      if (dto.code_tarif !== undefined) updateData.code_tarif = dto.code_tarif
      if (dto.date_application !== undefined) updateData.date_application = dto.date_application

      if (Object.keys(updateData).length > 1) {
        await this.db
          .updateTable('config_tarifs')
          .set(updateData)
          .where('id', '=', id)
          .execute()
      }

      const updated = await this.getActiveTarif(
        (existing as any).acte_id,
        (dto.code_tarif ?? (existing as any).code_tarif),
      )
      if (!updated) throw new Error('Tarif introuvable après mise à jour')
      return updated
    } catch (err: any) {
      if (err?.message?.includes('no such table') || err?.message?.includes('no such column')) {
        throw new Error('La base de données n\'est pas initialisée correctement. Contactez l\'administrateur.')
      }
      throw err
    }
  }

  // ─── Bulk update: create new tariff rows for each item ────────
  async bulkUpdate(dto: TarifBulkUpdateDto): Promise<ConfigTarifEntity[]> {
    if (!dto.items || dto.items.length === 0) {
      throw new Error('Aucun élément à mettre à jour')
    }

    const dateApp = dto.date_application ?? new Date().toISOString().slice(0, 10)

    const results: ConfigTarifEntity[] = []

    try {
      await this.db.transaction().execute(async (trx) => {
        for (const item of dto.items!) {
          this.validatePrixUnitaire(item.prix_unitaire!)

          const acte = await trx
            .selectFrom('medical_acts')
            .select('id')
            .where('id', '=', item.acte_id)
            .executeTakeFirst()

          if (!acte) throw new Error(`Acte médical ${item.acte_id} introuvable`)

          const inserted = await trx
            .insertInto('config_tarifs')
            .values({
              acte_id: item.acte_id,
              code_tarif: item.code_tarif,
              prix_unitaire: item.prix_unitaire,
              date_application: dateApp,
            })
            .returningAll()
            .executeTakeFirst()

          if (inserted) {
            results.push(inserted as unknown as ConfigTarifEntity)
          }
        }
      })

      return results
    } catch (err: any) {
      if (err?.message?.includes('no such table') || err?.message?.includes('no such column')) {
        throw new Error('La base de données n\'est pas initialisée correctement. Contactez l\'administrateur.')
      }
      throw err
    }
  }

  // ─── Delete a tariff entry ────────────────────────────────────
  async delete(id: number): Promise<void> {
    if (id == null) throw new Error("L'identifiant du tarif est requis")

    try {
      const existing = await this.db
        .selectFrom('config_tarifs')
        .select('id')
        .where('id', '=', id)
        .executeTakeFirst()

      if (!existing) throw new Error('Tarif introuvable')

      await this.db
        .deleteFrom('config_tarifs')
        .where('id', '=', id)
        .execute()
    } catch (err: any) {
      if (err?.message?.includes('no such table') || err?.message?.includes('no such column')) {
        throw new Error('La base de données n\'est pas initialisée correctement. Contactez l\'administrateur.')
      }
      throw err
    }
  }

  // ─── Get price history for an act from config_tarifs ──────────
  async getPriceHistory(acteId: number): Promise<ConfigTarifEntity[]> {
    if (acteId == null) throw new Error("L'identifiant de l'acte médical est requis")

    try {
      const acte = await this.db
        .selectFrom('medical_acts')
        .select('id')
        .where('id', '=', acteId)
        .executeTakeFirst()

      if (!acte) throw new Error('Acte médical introuvable')

      const rows = await this.db
        .selectFrom('config_tarifs')
        .innerJoin('medical_acts', 'config_tarifs.acte_id', 'medical_acts.id')
        .selectAll('config_tarifs')
        .select([
          'medical_acts.code as acte_code',
          'medical_acts.label as acte_label',
        ])
        .where('config_tarifs.acte_id', '=', acteId)
        .orderBy('config_tarifs.date_application', 'desc')
        .orderBy('config_tarifs.id', 'desc')
        .execute()

      return rows as unknown as ConfigTarifEntity[]
    } catch (err: any) {
      if (err?.message?.includes('no such table') || err?.message?.includes('no such column')) return []
      throw err
    }
  }

  // ─── Validation ──────────────────────────────────────────────
  private validatePrixUnitaire(prix: number): void {
    if (typeof prix !== 'number' || isNaN(prix)) {
      throw new Error('Le prix unitaire doit être un nombre valide')
    }
    if (prix < 0) {
      throw new Error('Le prix unitaire ne peut pas être négatif')
    }
    if (prix > 99_999_999_999) {
      throw new Error('Le prix unitaire est trop élevé')
    }
  }
}
