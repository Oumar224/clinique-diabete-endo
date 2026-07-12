import { inject, singleton } from 'tsyringe'
import { type Kysely } from 'kysely'
import { AppDatabaseDatasource } from '../sqlite-data-source'
import type { DB } from '../entities/database'
import { TrustedPersonEntity } from '../entities/trusted-person.entity'

@singleton()
export class TrustedPersonService {
  public db: Kysely<DB>

  constructor(@inject(AppDatabaseDatasource) datasource: AppDatabaseDatasource) {
    this.db = datasource.getInstance()
  }

  async getByPatientId(patientId: number): Promise<TrustedPersonEntity | null> {
    const row = await this.db
      .selectFrom('trusted_persons')
      .selectAll()
      .where('patient_id', '=', patientId)
      .executeTakeFirst()

    return row ?? null
  }

  async upsert(entity: TrustedPersonEntity): Promise<TrustedPersonEntity> {
    const existing = await this.db
      .selectFrom('trusted_persons')
      .selectAll()
      .where('patient_id', '=', entity.patient_id)
      .executeTakeFirst()

    if (existing) {
      await this.db
        .updateTable('trusted_persons')
        .set({
          has_trusted: entity.has_trusted,
          nom: entity.nom ?? existing.nom,
          prenom: entity.prenom ?? existing.prenom,
          profession: entity.profession ?? existing.profession,
          residence: entity.residence ?? existing.residence,
          residence_code: entity.residence_code ?? existing.residence_code,
          telephone: entity.telephone ?? existing.telephone,
          email: entity.email ?? existing.email,
          complement_adresse: entity.complement_adresse ?? existing.complement_adresse,
          lien_parente: entity.lien_parente ?? existing.lien_parente,
          attachments: entity.attachments ?? existing.attachments,
          updated_at: new Date().toISOString(),
        })
        .where('patient_id', '=', entity.patient_id)
        .execute()
    } else {
      await this.db
        .insertInto('trusted_persons')
        .values({
          patient_id: entity.patient_id,
          has_trusted: entity.has_trusted,
          nom: entity.nom,
          prenom: entity.prenom,
          profession: entity.profession,
          residence: entity.residence,
          residence_code: entity.residence_code,
          telephone: entity.telephone,
          email: entity.email,
          complement_adresse: entity.complement_adresse,
          lien_parente: entity.lien_parente,
          attachments: entity.attachments ?? '[]',
        })
        .execute()
    }

    const row = await this.db
      .selectFrom('trusted_persons')
      .selectAll()
      .where('patient_id', '=', entity.patient_id)
      .executeTakeFirst()

    if (!row) throw new Error('Échec de la récupération de la personne de confiance')
    return row
  }

  async delete(patientId: number): Promise<void> {
    await this.db
      .deleteFrom('trusted_persons')
      .where('patient_id', '=', patientId)
      .execute()
  }
}
