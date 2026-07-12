import { inject, singleton } from 'tsyringe'
import type { Kysely } from 'kysely'
import { AppDatabaseDatasource } from '../sqlite-data-source'
import type { DB } from '../entities/database'
import type { MedicalActEntity } from '../entities/medical-act.entity'

@singleton()
export class MedicalActService {
  public db: Kysely<DB>

  constructor(@inject(AppDatabaseDatasource) datasource: AppDatabaseDatasource) {
    this.db = datasource.getInstance()
  }

  // ─── List all medical acts (with service name) ───────────────
  async list(activeOnly = false): Promise<MedicalActEntity[]> {
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
      return rows as unknown as MedicalActEntity[]
    } catch (err: any) {
      if (err?.message?.includes('no such table') || err?.message?.includes('no such column')) return []
      throw err
    }
  }

  // ─── Get single act by id ────────────────────────────────────
  async getById(id: number): Promise<MedicalActEntity | null> {
    try {
      const row = await this.db
        .selectFrom('medical_acts')
        .innerJoin('services', 'medical_acts.service_id', 'services.id')
        .selectAll('medical_acts')
        .select('services.name as service_name')
        .where('medical_acts.id', '=', id)
        .executeTakeFirst()

      return row ? (row as unknown as MedicalActEntity) : null
    } catch (err: any) {
      if (err?.message?.includes('no such table') || err?.message?.includes('no such column')) return null
      throw err
    }
  }

  // ─── Get acts by service ─────────────────────────────────────
  async getByService(serviceId: number): Promise<MedicalActEntity[]> {
    try {
      const rows = await this.db
        .selectFrom('medical_acts')
        .innerJoin('services', 'medical_acts.service_id', 'services.id')
        .selectAll('medical_acts')
        .select('services.name as service_name')
        .where('medical_acts.service_id', '=', serviceId)
        .orderBy('medical_acts.label', 'asc')
        .execute()

      return rows as unknown as MedicalActEntity[]
    } catch (err: any) {
      if (err?.message?.includes('no such table') || err?.message?.includes('no such column')) return []
      throw err
    }
  }

  // ─── Create a new medical act ────────────────────────────────
  async create(entity: MedicalActEntity): Promise<MedicalActEntity> {
    const code = (entity.code ?? '').trim().toUpperCase()
    this.validateActCode(code)
    this.validateActLabel(entity.label ?? '')

    try {
      // Check for duplicate code
      const existingCode = await this.db
        .selectFrom('medical_acts')
        .select('id')
        .where('code', '=', code)
        .executeTakeFirst()
      if (existingCode) {
        throw new Error(`Le code "${code}" est déjà utilisé`)
      }

      // Verify service exists
      if (entity.service_id == null) {
        throw new Error('Le service associé est requis')
      }
      const service = await this.db
        .selectFrom('services')
        .select('id')
        .where('id', '=', entity.service_id)
        .executeTakeFirst()

      if (!service) throw new Error('Service associé introuvable')

      const result = await this.db
        .insertInto('medical_acts')
        .values({
          code,
          label: (entity.label ?? '').trim(),
          service_id: entity.service_id,
          is_active: 1,
        })
        .returningAll()
        .executeTakeFirst()

      if (!result) throw new Error('Échec de la création de l\'acte médical')

      return (await this.getById((result as any).id))!
    } catch (err: any) {
      if (err?.message?.includes('no such table') || err?.message?.includes('no such column')) {
        throw new Error('La base de données n\'est pas initialisée correctement. Contactez l\'administrateur.')
      }
      throw err
    }
  }

  // ─── Update a medical act ────────────────────────────────────
  async update(entity: MedicalActEntity): Promise<MedicalActEntity> {
    if (entity.id == null) {
      throw new Error("L'identifiant de l'acte médical est requis")
    }

    try {
      const existing = await this.db
        .selectFrom('medical_acts')
        .selectAll()
        .where('id', '=', entity.id)
        .executeTakeFirst()

      if (!existing) throw new Error('Acte médical introuvable')

      if (entity.code !== undefined) this.validateActCode(entity.code)
      if (entity.label !== undefined) this.validateActLabel(entity.label)

      if (entity.service_id !== undefined) {
        const service = await this.db
          .selectFrom('services')
          .select('id')
          .where('id', '=', entity.service_id)
          .executeTakeFirst()
        if (!service) throw new Error('Service associé introuvable')
      }

      const updateData: Record<string, unknown> = { updated_at: new Date().toISOString().slice(0, 19).replace('T', ' ') }

      if (entity.code !== undefined) updateData.code = entity.code.trim().toUpperCase()
      if (entity.label !== undefined) updateData.label = entity.label.trim()
      if (entity.service_id !== undefined) updateData.service_id = entity.service_id
      if (entity.is_active !== undefined) updateData.is_active = entity.is_active ? 1 : 0

      await this.db
        .updateTable('medical_acts')
        .set(updateData)
        .where('id', '=', entity.id)
        .execute()

      const updated = await this.getById(entity.id)
      if (!updated) throw new Error('Acte médical introuvable après mise à jour')
      return updated
    } catch (err: any) {
      if (err?.message?.includes('no such table') || err?.message?.includes('no such column')) {
        throw new Error('La base de données n\'est pas initialisée correctement. Contactez l\'administrateur.')
      }
      throw err
    }
  }

  // ─── Delete a medical act ────────────────────────────────────
  async delete(id: number): Promise<void> {
    if (id == null) throw new Error("L'identifiant de l'acte médical est requis")

    try {
      const existing = await this.db
        .selectFrom('medical_acts')
        .select('id')
        .where('id', '=', id)
        .executeTakeFirst()

      if (!existing) throw new Error('Acte médical introuvable')

      await this.db
        .deleteFrom('medical_acts')
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

}
