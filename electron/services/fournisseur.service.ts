import { inject, singleton } from 'tsyringe'
import type { Kysely } from 'kysely'
import { AppDatabaseDatasource } from '../sqlite-data-source'
import type { DB } from '../entities/database'
import { FournisseurEntity } from '../entities/fournisseur.entity'
import { nowIso } from '../utils/date-utils'
import { entityEventBus } from '../automerge/event-bus'

export interface FournisseurCreateData {
  nom: string
  contact?: string
  telephone?: string
  email?: string
  adresse?: string
  actif?: boolean
  estPharmacieCentrale?: boolean
}

export interface FournisseurUpdateData {
  nom?: string
  contact?: string
  telephone?: string
  email?: string
  adresse?: string
  actif?: boolean
  estPharmacieCentrale?: boolean
}

@singleton()
export class FournisseurService {
  public db: Kysely<DB>

  constructor(@inject(AppDatabaseDatasource) datasource: AppDatabaseDatasource) {
    this.db = datasource.getInstance()
  }

  async list(filters?: { actif?: boolean; search?: string; estPharmacieCentrale?: boolean }): Promise<FournisseurEntity[]> {
    let query = this.db.selectFrom('fournisseurs').selectAll()
    if (filters?.actif != null) {
      query = query.where('actif', '=', filters.actif ? 1 : 0)
    }
    if (filters?.estPharmacieCentrale != null) {
      query = query.where('est_pharmacie_centrale', '=', filters.estPharmacieCentrale ? 1 : 0)
    }
    const search = filters?.search?.trim()
    if (search) {
      const pattern = `%${search}%`
      query = query.where((eb) => eb.or([eb('nom', 'like', pattern), eb('contact', 'like', pattern)]))
    }
    const rows = await query.orderBy('nom', 'asc').orderBy('id', 'asc').execute()
    return rows as unknown as FournisseurEntity[]
  }

  async getById(id: number): Promise<FournisseurEntity | null> {
    const row = await this.db
      .selectFrom('fournisseurs')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst()
    return row ? (row as unknown as FournisseurEntity) : null
  }

  async create(data: FournisseurCreateData): Promise<FournisseurEntity> {
    const nom = data.nom?.trim()
    if (!nom) throw new Error('Le nom du fournisseur est requis')
    let result
    try {
      result = await this.db.transaction().execute(async (trx) => {
        if (data.estPharmacieCentrale) {
          // Un seul fournisseur PCG : garantir l'unicité avant l'insert.
          await trx
            .updateTable('fournisseurs')
            .set({ est_pharmacie_centrale: 0 })
            .where('est_pharmacie_centrale', '=', 1)
            .execute()
        }
        return trx
          .insertInto('fournisseurs')
          .values({
            nom,
            contact: data.contact?.trim() || undefined,
            telephone: data.telephone?.trim() || undefined,
            email: data.email?.trim() || undefined,
            adresse: data.adresse?.trim() || undefined,
            actif: data.actif === undefined ? 1 : data.actif ? 1 : 0,
            est_pharmacie_centrale: data.estPharmacieCentrale ? 1 : 0,
          })
          .returningAll()
          .executeTakeFirst()
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.includes('est_pharmacie_centrale')) {
        throw new Error('Un fournisseur Pharmacie Centrale existe déjà')
      }
      if (msg.includes('UNIQUE')) throw new Error('Un fournisseur avec ce nom existe déjà')
      throw e
    }
    if (!result) throw new Error('Échec de la création du fournisseur')
    entityEventBus.emitEntityChange({ entityType: 'fournisseur', action: 'created', id: result.id!, entity: result, source: 'local', timestamp: Date.now() })
    return result as unknown as FournisseurEntity
  }

  async update(id: number, data: FournisseurUpdateData): Promise<FournisseurEntity> {
    const existing = await this.getById(id)
    if (!existing) throw new Error('Fournisseur introuvable')

    const hasField =
      data.nom !== undefined ||
      data.contact !== undefined ||
      data.telephone !== undefined ||
      data.email !== undefined ||
      data.adresse !== undefined ||
      data.actif !== undefined ||
      data.estPharmacieCentrale !== undefined
    if (!hasField) throw new Error('Rien à mettre à jour')

    if (data.nom !== undefined && !data.nom.trim()) throw new Error('Le nom du fournisseur est requis')

    const updateData: Record<string, unknown> = {
      updated_at: nowIso(),
    }
    if (data.nom !== undefined) updateData.nom = data.nom.trim()
    if (data.contact !== undefined) updateData.contact = data.contact?.trim() || null
    if (data.telephone !== undefined) updateData.telephone = data.telephone?.trim() || null
    if (data.email !== undefined) updateData.email = data.email?.trim() || null
    if (data.adresse !== undefined) updateData.adresse = data.adresse?.trim() || null
    if (data.actif !== undefined) updateData.actif = data.actif ? 1 : 0
    if (data.estPharmacieCentrale !== undefined) updateData.est_pharmacie_centrale = data.estPharmacieCentrale ? 1 : 0

    try {
      await this.db.transaction().execute(async (trx) => {
        if (data.estPharmacieCentrale) {
          await trx
            .updateTable('fournisseurs')
            .set({ est_pharmacie_centrale: 0 })
            .where('id', '!=', id)
            .where('est_pharmacie_centrale', '=', 1)
            .execute()
        }
        await trx
          .updateTable('fournisseurs')
          .set(updateData)
          .where('id', '=', id)
          .execute()
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.includes('est_pharmacie_centrale')) {
        throw new Error('Un fournisseur Pharmacie Centrale existe déjà')
      }
      if (msg.includes('UNIQUE')) throw new Error('Un fournisseur avec ce nom existe déjà')
      throw e
    }

    const updated = await this.getById(id)
    if (!updated) throw new Error('Fournisseur introuvable après mise à jour')
    entityEventBus.emitEntityChange({ entityType: 'fournisseur', action: 'updated', id, entity: updated, source: 'local', timestamp: Date.now() })
    return updated
  }

  async deactivate(id: number): Promise<FournisseurEntity> {
    const existing = await this.getById(id)
    if (!existing) throw new Error('Fournisseur introuvable')
    return this.update(id, { actif: false })
  }
}
