import { inject, singleton } from 'tsyringe'
import type { Kysely } from 'kysely'
import { AppDatabaseDatasource } from '../sqlite-data-source'
import type { DB } from '../entities/database'
import type { PatientEntity } from '../entities/patient.entity'

@singleton()
export class PatientService {
  public db: Kysely<DB>

  constructor(@inject(AppDatabaseDatasource) datasource: AppDatabaseDatasource) {
    this.db = datasource.getInstance()
  }

  async list(search?: string): Promise<PatientEntity[]> {
    let query = this.db.selectFrom('patient').selectAll().orderBy('nom', 'asc')
    if (search) {
      const q = `%${search}%`
      query = query.where((eb) =>
        eb('nom', 'like', q).or('prenom', 'like', q).or('nir', 'like', q)
      ) as typeof query
    }
    return await query.execute()
  }

  async getById(id: number): Promise<PatientEntity | null> {
    const row = await this.db
      .selectFrom('patient')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst()
    return row ?? null
  }

  async create(entity: PatientEntity): Promise<PatientEntity> {
    await this.db
      .insertInto('patient')
      .values({
        civilite: entity.civilite!,
        nom: entity.nom!,
        prenom: entity.prenom!,
        date_naissance: entity.date_naissance!,
        nir: entity.nir!,
        telephone: entity.telephone!,
        email: entity.email ?? undefined,
        adresse: entity.adresse ?? undefined,
        mutuelle: entity.mutuelle ?? undefined,
        medecin_traitant: entity.medecin_traitant ?? undefined,
        allergies: entity.allergies ?? '[]',
      })
      .execute()

    const result = await this.db
      .selectFrom('patient')
      .selectAll()
      .where('nir', '=', entity.nir!)
      .orderBy('id', 'desc')
      .limit(1)
      .executeTakeFirst()

    if (!result) throw new Error('Failed to retrieve inserted patient')
    return result
  }

  async update(entity: PatientEntity): Promise<PatientEntity> {
    const existing = await this.db
      .selectFrom('patient')
      .selectAll()
      .where('id', '=', entity.id!)
      .executeTakeFirst()
    if (!existing) throw new Error('Patient introuvable')

    await this.db
      .updateTable('patient')
      .set({
        civilite: entity.civilite ?? existing.civilite,
        nom: entity.nom ?? existing.nom,
        prenom: entity.prenom ?? existing.prenom,
        date_naissance: entity.date_naissance ?? existing.date_naissance,
        nir: entity.nir ?? existing.nir,
        telephone: entity.telephone ?? existing.telephone,
        email: entity.email ?? existing.email,
        adresse: entity.adresse ?? existing.adresse,
        mutuelle: entity.mutuelle ?? existing.mutuelle,
        medecin_traitant: entity.medecin_traitant ?? existing.medecin_traitant,
        allergies: entity.allergies ?? existing.allergies,
      })
      .where('id', '=', entity.id!)
      .execute()

    const result = await this.db
      .selectFrom('patient')
      .selectAll()
      .where('id', '=', entity.id!)
      .executeTakeFirst()

    if (!result) throw new Error('Patient not found after update')
    return result
  }

  async delete(id: number): Promise<PatientEntity> {
    const existing = await this.db
      .selectFrom('patient')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst()
    if (!existing) throw new Error('Patient introuvable')

    await this.db
      .deleteFrom('patient')
      .where('id', '=', id)
      .execute()
    return existing
  }
}
