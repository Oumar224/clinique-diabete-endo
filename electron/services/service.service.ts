import { inject, singleton } from 'tsyringe'
import type { Kysely } from 'kysely'
import { AppDatabaseDatasource } from '../sqlite-data-source'
import type { DB } from '../entities/database'
import { ServiceEntity } from '../entities/service.entity'

@singleton()
export class ServiceService {
  public db: Kysely<DB>

  constructor(@inject(AppDatabaseDatasource) datasource: AppDatabaseDatasource) {
    this.db = datasource.getInstance()
  }

  // ─── List all services (flat, optionally only active) ────────
  async list(activeOnly = false): Promise<ServiceEntity[]> {
    let query = this.db
      .selectFrom('services')
      .selectAll()
      .orderBy('sort_order', 'asc')
      .orderBy('name', 'asc')

    if (activeOnly) {
      query = query.where('is_active', '=', 1)
    }

    const rows = await query.execute()
    const services = rows as unknown as ServiceEntity[]

    for (const svc of services) {
      svc.site_ids = await this.getSiteIds(svc.id!)
    }

    return services
  }

  // ─── Get single service ──────────────────────────────────────
  async getById(id: number): Promise<ServiceEntity | null> {
    const row = await this.db
      .selectFrom('services')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst()

    if (!row) return null
    const svc = row as unknown as ServiceEntity
    svc.site_ids = await this.getSiteIds(id)
    return svc
  }

  // ─── List services for a given site ───────────────────────────
  async listBySite(siteId: number): Promise<ServiceEntity[]> {
    const rows = await this.db
      .selectFrom('services')
      .innerJoin('service_sites', 'service_sites.service_id', 'services.id')
      .selectAll('services')
      .where('service_sites.site_id', '=', siteId)
      .where('services.is_active', '=', 1)
      .orderBy('services.sort_order', 'asc')
      .orderBy('services.name', 'asc')
      .execute()

    const services = rows as unknown as ServiceEntity[]
    for (const svc of services) {
      svc.site_ids = await this.getSiteIds(svc.id!)
    }

    return services
  }

  // ─── Compute next sort_order ─────────────────────────────────
  private async nextSortOrder(): Promise<number> {
    let maxOrder: any
    try {
      maxOrder = await this.db
        .selectFrom('services')
        .select(this.db.fn.max<number>('sort_order').as('max_order'))
        .executeTakeFirst()
    } catch (err: any) {
      if (err?.message?.includes('no such table') || err?.message?.includes('no such column')) {
        throw new Error('La base de données n\'est pas initialisée correctement. Contactez l\'administrateur.')
      }
      throw err
    }

    return ((maxOrder as any)?.max_order ?? -1) + 1
  }

  // ─── Create a new service ────────────────────────────────────
  async create(entity: ServiceEntity): Promise<ServiceEntity> {
    this.validateName(entity.name ?? '')

    const nextOrder = await this.nextSortOrder()

    let result
    try {
      result = await this.db
        .insertInto('services')
        .values({
          name: (entity.name ?? '').trim(),
          description: entity.description ?? null,
          duration: entity.duration ?? 30,
          color: entity.color ?? '#0E5C5B',
          sort_order: nextOrder,
          is_active: entity.is_active ?? 1,
          category: entity.category ?? 'Consultation',
        })
        .returningAll()
        .executeTakeFirst()
    } catch (err: any) {
      if (err?.message?.includes('no such table') || err?.message?.includes('no such column')) {
        throw new Error('La base de données n\'est pas initialisée correctement. Contactez l\'administrateur.')
      }
      throw err
    }

    if (!result) throw new Error('Échec de la création du service')

    const created = result as unknown as ServiceEntity

    // Insert service_sites
    if (entity.site_ids?.length) {
      await this.setSites(created.id!, entity.site_ids)
    }

    created.site_ids = entity.site_ids ?? []
    return created
  }

  // ─── Update a service ────────────────────────────────────────
  async update(entity: ServiceEntity): Promise<ServiceEntity> {
    if (entity.id == null) {
      throw new Error("L'identifiant du service est requis")
    }

    let existing
    try {
      existing = await this.db
        .selectFrom('services')
        .selectAll()
        .where('id', '=', entity.id)
        .executeTakeFirst()
    } catch (err: any) {
      if (err?.message?.includes('no such table') || err?.message?.includes('no such column')) {
        throw new Error('La base de données n\'est pas initialisée correctement. Contactez l\'administrateur.')
      }
      throw err
    }

    if (!existing) throw new Error('Service introuvable')

    if (entity.name !== undefined) {
      this.validateName(entity.name ?? '')
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
    }
    if (entity.name !== undefined) updateData.name = (entity.name ?? '').trim()
    if (entity.description !== undefined) updateData.description = entity.description
    if (entity.duration !== undefined) updateData.duration = entity.duration
    if (entity.color !== undefined) updateData.color = entity.color
    if (entity.category !== undefined) updateData.category = entity.category

    try {
      await this.db
        .updateTable('services')
        .set(updateData)
        .where('id', '=', entity.id)
        .execute()
    } catch (err: any) {
      if (err?.message?.includes('no such table') || err?.message?.includes('no such column')) {
        throw new Error('La base de données n\'est pas initialisée correctement. Contactez l\'administrateur.')
      }
      throw err
    }

    // Update service_sites if provided
    if (entity.site_ids !== undefined) {
      await this.setSites(entity.id, entity.site_ids)
    }

    const updated = await this.getById(entity.id)
    if (!updated) throw new Error('Service introuvable après mise à jour')
    return updated
  }

  // ─── Toggle active/inactive ──────────────────────────────────
  async toggle(id: number, isActive: boolean): Promise<ServiceEntity> {
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

    let refCount
    try {
      refCount = await this.db
        .selectFrom('medical_acts')
        .select(this.db.fn.countAll<number>().as('count'))
        .where('service_id', '=', id)
        .executeTakeFirst()
    } catch (err: any) {
      if (err?.message?.includes('no such table') || err?.message?.includes('no such column')) {
        throw new Error('La base de données n\'est pas initialisée correctement. Contactez l\'administrateur.')
      }
      throw err
    }

    const count = (refCount as any)?.count ?? 0
    if (count > 0) {
      throw new Error(
        `Impossible de supprimer ce service : ${count} acte(s) médical(eaux) y sont rattaché(s). ` +
        'Désactivez le service ou supprimez d\'abord les actes associés.'
      )
    }

    try {
      await this.db
        .deleteFrom('services')
        .where('id', '=', id)
        .execute()
    } catch (err: any) {
      if (err?.message?.includes('no such table') || err?.message?.includes('no such column')) {
        throw new Error('La base de données n\'est pas initialisée correctement. Contactez l\'administrateur.')
      }
      throw err
    }
  }

  // ─── Reorder services ────────────────────────────────────────
  async reorder(ids: number[]): Promise<ServiceEntity[]> {
    if (!ids.length) throw new Error('La liste des IDs est vide')

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

  // ════════════════════════════════════════════════════════════════
  // SERVICE-SITE helpers
  // ════════════════════════════════════════════════════════════════

  private async getSiteIds(serviceId: number): Promise<number[]> {
    const rows = await this.db
      .selectFrom('service_sites')
      .select('site_id')
      .where('service_id', '=', serviceId)
      .execute()

    return rows.map(r => r.site_id)
  }

  private async setSites(serviceId: number, siteIds: number[]): Promise<void> {
    await this.db
      .deleteFrom('service_sites')
      .where('service_id', '=', serviceId)
      .execute()

    if (siteIds.length > 0) {
      await this.db
        .insertInto('service_sites')
        .values(siteIds.map(siteId => ({ service_id: serviceId, site_id: siteId })))
        .execute()
    }
  }

  async getSites(serviceId: number): Promise<number[]> {
    return this.getSiteIds(serviceId)
  }

  // ════════════════════════════════════════════════════════════════
  // FAVORITES
  // ════════════════════════════════════════════════════════════════

  async getFavorites(userId: number): Promise<ServiceEntity[]> {
    const rows = await this.db
      .selectFrom('user_favorite_services')
      .innerJoin('services', 'services.id', 'user_favorite_services.service_id')
      .selectAll('services')
      .where('user_favorite_services.user_id', '=', userId)
      .orderBy('services.sort_order', 'asc')
      .orderBy('services.name', 'asc')
      .execute()

    return rows as unknown as ServiceEntity[]
  }

  async addFavorite(userId: number, serviceId: number): Promise<void> {
    try {
      await this.db
        .insertInto('user_favorite_services')
        .values({ user_id: userId, service_id: serviceId })
        .execute()
    } catch (err: any) {
      if (err?.message?.includes('UNIQUE constraint failed')) {
        return
      }
      if (err?.message?.includes('FOREIGN KEY constraint failed')) {
        throw new Error('Utilisateur ou service introuvable')
      }
      throw err
    }
  }

  async removeFavorite(userId: number, serviceId: number): Promise<void> {
    await this.db
      .deleteFrom('user_favorite_services')
      .where('user_id', '=', userId)
      .where('service_id', '=', serviceId)
      .execute()
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
