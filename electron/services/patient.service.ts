import { inject, singleton } from 'tsyringe'
import { type Kysely, sql } from 'kysely'
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
    try {
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
          photo: entity.photo ?? undefined,
          nip: entity.nip ?? undefined,
          lieu_naissance: entity.lieu_naissance ?? undefined,
          residence_code: entity.residence_code ?? undefined,
          complement_adresse: entity.complement_adresse ?? undefined,
          region: entity.region ?? undefined,
        })
        .execute()
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string }
      if (err?.code === 'SQLITE_CONSTRAINT' || err?.message?.includes('UNIQUE constraint failed')) {
        throw new Error('Ce NIP existe déjà')
      }
      throw error
    }

    const result = await this.db
      .selectFrom('patient')
      .selectAll()
      .where('nir', '=', entity.nir!)
      .orderBy('id', 'desc')
      .limit(1)
      .executeTakeFirst()

    if (!result) throw new Error('Échec de la récupération du patient inséré')
    return result
  }

  async update(entity: PatientEntity): Promise<PatientEntity> {
    const existing = await this.db
      .selectFrom('patient')
      .selectAll()
      .where('id', '=', entity.id!)
      .executeTakeFirst()
    if (!existing) throw new Error('Patient introuvable')

    try {
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
          photo: entity.photo ?? existing.photo,
          nip: entity.nip ?? existing.nip,
          lieu_naissance: entity.lieu_naissance ?? existing.lieu_naissance,
          residence_code: entity.residence_code ?? existing.residence_code,
          complement_adresse: entity.complement_adresse ?? existing.complement_adresse,
          region: entity.region ?? existing.region,
          updated_at: new Date().toISOString(),
        })
        .where('id', '=', entity.id!)
        .execute()
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string }
      if (err?.code === 'SQLITE_CONSTRAINT' || err?.message?.includes('UNIQUE constraint failed')) {
        throw new Error('Ce NIP existe déjà')
      }
      throw error
    }

    const result = await this.db
      .selectFrom('patient')
      .selectAll()
      .where('id', '=', entity.id!)
      .executeTakeFirst()

    if (!result) throw new Error('Patient introuvable après mise à jour')
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

  async backfillPatientRegions(): Promise<number> {
    const result = await this.db
      .updateTable('patient')
      .set({ region: sql`(
        WITH RECURSIVE ancestors AS (
          SELECT id, parent_id, name, type, 0 AS depth
          FROM localites WHERE code = patient.residence_code
          UNION ALL
          SELECT l.id, l.parent_id, l.name, l.type, a.depth + 1
          FROM localites l
          INNER JOIN ancestors a ON a.parent_id = l.id
          WHERE a.type != 'region' AND a.parent_id IS NOT NULL
        )
        SELECT name FROM ancestors WHERE type = 'region' LIMIT 1
      )` })
      .where('residence_code', 'is not', null)
      .where('region', 'is', null)
      .execute()

    return Number(result[0]?.numUpdatedRows ?? 0n)
  }
}
