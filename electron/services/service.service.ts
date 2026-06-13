import { inject, singleton } from 'tsyringe'
import type { Kysely } from 'kysely'
import { AppDatabaseDatasource } from '../sqlite-data-source'
import type { DB } from '../entities/database'
import type { ServiceDto, ServiceCreateDto, ServiceUpdateDto } from '../dto/settings.dto'

@singleton()
export class ServiceService {
  public db: Kysely<DB>

  constructor(@inject(AppDatabaseDatasource) datasource: AppDatabaseDatasource) {
    this.db = datasource.getInstance()
  }

  private toDto(row: Record<string, unknown>): ServiceDto {
    return { ...row, is_active: !!row.is_active } as unknown as ServiceDto
  }

  // ─── List all services (optionally only active) ──────────────
  async list(activeOnly = false): Promise<ServiceDto[]> {
    let query = this.db
      .selectFrom('services')
      .selectAll()
      .orderBy('sort_order', 'asc')
      .orderBy('name', 'asc')

    if (activeOnly) {
      query = query.where('is_active', '=', 1)
    }

    const rows = await query.execute()
    return rows.map(r => this.toDto(r))
  }

  // ─── Get single service ──────────────────────────────────────
  async getById(id: number): Promise<ServiceDto | null> {
    const row = await this.db
      .selectFrom('services')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst()

    return row ? this.toDto(row) : null
  }

  // ─── Create a new service ────────────────────────────────────
  async create(dto: ServiceCreateDto): Promise<ServiceDto> {
    this.validateName(dto.name)

    const maxOrder = await this.db
      .selectFrom('services')
      .select(this.db.fn.max<number>('sort_order').as('max_order'))
      .executeTakeFirst()

    const nextOrder = ((maxOrder as any)?.max_order ?? -1) + 1

    const result = await this.db
      .insertInto('services')
      .values({
        name: dto.name.trim(),
        description: dto.description ?? null,
        duration: dto.duration ?? 30,
        color: dto.color ?? '#0E5C5B',
        sort_order: nextOrder,
        is_active: 1,
      })
      .returningAll()
      .executeTakeFirst()

    if (!result) throw new Error('Échec de la création du service')
    return this.toDto(result)
  }

  // ─── Update a service ────────────────────────────────────────
  async update(dto: ServiceUpdateDto): Promise<ServiceDto> {
    if (dto.id == null) {
      throw new Error("L'identifiant du service est requis")
    }

    const existing = await this.db
      .selectFrom('services')
      .selectAll()
      .where('id', '=', dto.id)
      .executeTakeFirst()

    if (!existing) throw new Error('Service introuvable')

    if (dto.name !== undefined) {
      this.validateName(dto.name)
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
    }
    if (dto.name !== undefined) updateData.name = dto.name.trim()
    if (dto.description !== undefined) updateData.description = dto.description
    if (dto.duration !== undefined) updateData.duration = dto.duration
    if (dto.color !== undefined) updateData.color = dto.color

    await this.db
      .updateTable('services')
      .set(updateData)
      .where('id', '=', dto.id)
      .execute()

    const updated = await this.getById(dto.id)
    if (!updated) throw new Error('Service introuvable après mise à jour')
    return updated
  }

  // ─── Toggle active/inactive ──────────────────────────────────
  async toggle(id: number, isActive: boolean): Promise<ServiceDto> {
    if (id == null) throw new Error("L'identifiant du service est requis")
    const existing = await this.getById(id)
    if (!existing) throw new Error('Service introuvable')

    await this.db
      .updateTable('services')
      .set({ is_active: isActive ? 1 : 0, updated_at: new Date().toISOString().slice(0, 19).replace('T', ' ') })
      .where('id', '=', id)
      .execute()

    const updated = await this.getById(id)
    if (!updated) throw new Error('Service introuvable après mise à jour')
    return updated
  }

  // ─── Delete a service (blocked if referenced by medical acts) ──
  async delete(id: number): Promise<void> {
    if (id == null) throw new Error("L'identifiant du service est requis")
    const existing = await this.getById(id)
    if (!existing) throw new Error('Service introuvable')

    // Check for referencing medical acts
    const refCount = await this.db
      .selectFrom('medical_acts')
      .select(this.db.fn.countAll<number>().as('count'))
      .where('service_id', '=', id)
      .executeTakeFirst()

    const count = (refCount as any)?.count ?? 0
    if (count > 0) {
      throw new Error(
        `Impossible de supprimer ce service : ${count} acte(s) médical(eaux) y sont rattaché(s). ` +
        'Désactivez le service ou supprimez d\'abord les actes associés.'
      )
    }

    await this.db
      .deleteFrom('services')
      .where('id', '=', id)
      .execute()
  }

  // ─── Reorder services ────────────────────────────────────────
  async reorder(ids: number[]): Promise<ServiceDto[]> {
    if (!ids.length) throw new Error('La liste des IDs est vide')

    // Verify all IDs exist
    const existing = await this.db
      .selectFrom('services')
      .select('id')
      .where('id', 'in', ids)
      .execute()

    const existingIds = new Set(existing.map(r => (r as any).id))
    const missing = ids.filter(id => !existingIds.has(id))
    if (missing.length > 0) {
      throw new Error(`Services introuvables : ${missing.join(', ')}`)
    }

    // Batch update sort_order using a transaction
    await this.db.transaction().execute(async (trx) => {
      for (let i = 0; i < ids.length; i++) {
        await trx
          .updateTable('services')
          .set({ sort_order: i, updated_at: new Date().toISOString().slice(0, 19).replace('T', ' ') })
          .where('id', '=', ids[i])
          .execute()
      }
    })

    return await this.list()
  }

  // ─── Validation ──────────────────────────────────────────────
  private validateName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new Error('Le nom du service est requis')
    }
    if (name.trim().length > 100) {
      throw new Error('Le nom du service ne peut pas dépasser 100 caractères')
    }
  }
}
