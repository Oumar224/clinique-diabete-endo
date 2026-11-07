import { inject, singleton } from 'tsyringe'
import { type Kysely, sql } from 'kysely'
import { AppDatabaseDatasource } from '../sqlite-data-source'
import type { DB } from '../entities/database'
import type { PatientEntity } from '../entities/patient.entity'
import { validateForeignKeys } from './utils/fk-validator'
import { entityEventBus } from '../automerge/event-bus'

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
    // Validate foreign keys before insert
    await validateForeignKeys(this.db as any, [
      { table: 'sites', column: 'site_id', value: entity.site_id },
    ])

    if (entity.nip) {
      const existing = await this.db
        .selectFrom('patient')
        .select(['id', 'prenom', 'nom'])
        .where('nip', '=', entity.nip)
        .executeTakeFirst()

      if (existing) {
        throw new Error(`Un patient avec ce NIP existe déjà : ${existing.prenom} ${existing.nom}`)
      }
    }

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
          medecin_traitant: entity.medecin_traitant ?? undefined,
          allergies: entity.allergies ?? '[]',
          photo: entity.photo ?? undefined,
          nip: entity.nip ?? undefined,
          lieu_naissance: entity.lieu_naissance ?? undefined,
          residence_code: entity.residence_code ?? undefined,
          complement_adresse: entity.complement_adresse ?? undefined,
          region: entity.region ?? undefined,
          profession: entity.profession ?? undefined,
          site_id: entity.site_id ?? undefined,
          assurance_mutuelle: entity.assurance_mutuelle ?? undefined,
          consentement_etude: entity.consentement_etude ?? undefined,
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
    entityEventBus.emitEntityChange({ entityType: 'patient', action: 'created', id: result.id!, entity: result, source: 'local', timestamp: Date.now() })
    return result
  }

  async update(entity: PatientEntity): Promise<PatientEntity> {
    const existing = await this.db
      .selectFrom('patient')
      .selectAll()
      .where('id', '=', entity.id!)
      .executeTakeFirst()
    if (!existing) throw new Error('Patient introuvable')

    if (entity.nip) {
      const duplicate = await this.db
        .selectFrom('patient')
        .select(['id', 'prenom', 'nom'])
        .where('nip', '=', entity.nip)
        .where('id', '!=', entity.id!)
        .executeTakeFirst()

      if (duplicate) {
        throw new Error(`Un patient avec ce NIP existe déjà : ${duplicate.prenom} ${duplicate.nom}`)
      }
    }

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
          medecin_traitant: entity.medecin_traitant ?? existing.medecin_traitant,
          allergies: entity.allergies ?? existing.allergies,
          photo: entity.photo ?? existing.photo,
          nip: entity.nip ?? existing.nip,
          lieu_naissance: entity.lieu_naissance ?? existing.lieu_naissance,
          residence_code: entity.residence_code ?? existing.residence_code,
          complement_adresse: entity.complement_adresse ?? existing.complement_adresse,
          region: entity.region ?? existing.region,
          profession: entity.profession ?? existing.profession,
          site_id: entity.site_id ?? existing.site_id,
          assurance_mutuelle: entity.assurance_mutuelle ?? existing.assurance_mutuelle,
          consentement_etude: entity.consentement_etude ?? existing.consentement_etude,
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
    entityEventBus.emitEntityChange({ entityType: 'patient', action: 'updated', id: result.id!, entity: result, source: 'local', timestamp: Date.now() })
    return result
  }

  async delete(id: number): Promise<PatientEntity> {
    const existing = await this.db
      .selectFrom('patient')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst()
    if (!existing) throw new Error('Patient introuvable')

    // SQLite FK enforcement is ON at runtime. Several child trees reference
    // patient(id) / encounters(id) / stays(id) with NO ACTION (RESTRICT), so
    // they must be deleted explicitly in dependency order inside one
    // transaction. See migrations 050, 051, 053, 071 for the FK definitions.
    await this.db.transaction().execute(async (trx) => {
      const encounterIds = (
        await trx
          .selectFrom('encounters')
          .select('id')
          .where('patient_id', '=', id)
          .execute()
      ).map((r) => r.id)

      const stayIds = (
        await trx
          .selectFrom('stays')
          .select('id')
          .where('patient_id', '=', id)
          .execute()
      ).map((r) => r.id)

      // Clinical documents attached to the patient's encounters
      // (patient_clinical_documents.contact_id → encounters(id), NO ACTION, 053:24).
      const documentIds = encounterIds.length > 0
        ? (
            await trx
              .selectFrom('patient_clinical_documents')
              .select('id')
              .where('contact_id', 'in', encounterIds.map(String))
              .execute()
          ).map((r) => r.id)
        : []

      // clinical_document_signatures.document_id → patient_clinical_documents(id)
      // is NO ACTION (053:47) — must be removed before the documents themselves.
      if (documentIds.length > 0) {
        await trx
          .deleteFrom('clinical_document_signatures')
          .where('document_id', 'in', documentIds)
          .execute()
      }

      // document_attachments.document_id → patient_clinical_documents(id)
      // is ON DELETE CASCADE (090:7), removed automatically with the documents.
      if (documentIds.length > 0) {
        await trx
          .deleteFrom('patient_clinical_documents')
          .where('id', 'in', documentIds)
          .execute()
      }

      // encounter_movements.encounter_id → encounters(id), NO ACTION (050:40)
      if (encounterIds.length > 0) {
        await trx
          .deleteFrom('encounter_movements')
          .where('encounter_id', 'in', encounterIds)
          .execute()
      }

      // exam_requests.patient_id → patient(id) is NO ACTION (071:7) and
      // exam_requests.encounter_id → encounters(id) is NO ACTION (071:8), so
      // exam_requests must be deleted BEFORE encounters.
      // exam_results (081:7) and exam_request_attachments (094:7) cascade.
      await trx
        .deleteFrom('exam_requests')
        .where('patient_id', '=', id)
        .execute()

      // encounters.patient_id → patient(id), NO ACTION (050:10, rebuilt in
      // 057/059/061/066/085). patient_actes.encounter_id is ON DELETE SET NULL
      // (052:29), handled automatically.
      if (encounterIds.length > 0) {
        await trx
          .deleteFrom('encounters')
          .where('id', 'in', encounterIds)
          .execute()
      }

      // stay_movements.stay_id → stays(id), NO ACTION (051:31)
      if (stayIds.length > 0) {
        await trx
          .deleteFrom('stay_movements')
          .where('stay_id', 'in', stayIds)
          .execute()
      }

      // stays.patient_id → patient(id), NO ACTION (051:9)
      if (stayIds.length > 0) {
        await trx
          .deleteFrom('stays')
          .where('id', 'in', stayIds)
          .execute()
      }

      // form_drafts.patient_id has no FK (028) — orphan cleanup
      await trx
        .deleteFrom('form_drafts')
        .where('patient_id', '=', id)
        .execute()

      // Finally the patient row. All remaining children cascade:
      // appointment (001:56), invoice + invoice_items (004), patient_attachments
      // (015:7), trusted_persons (019:9), plan_soins + plan_soins_items (031),
      // vital_signs (031:43), dispositifs (031:63), prescriptions (033:11),
      // patient_actes (052:30), vital_signs_items (043:8).
      await trx
        .deleteFrom('patient')
        .where('id', '=', id)
        .execute()
    })
    entityEventBus.emitEntityChange({ entityType: 'patient', action: 'deleted', id: existing.id!, entity: existing, source: 'local', timestamp: Date.now() })
    return existing
  }

  async existByIds(ids: number[]): Promise<Record<number, boolean>> {
    if (ids.length === 0) return {}
    const rows = await this.db
      .selectFrom('patient')
      .select('id')
      .where('id', 'in', ids)
      .execute()
    const found = new Set(rows.map((r) => r.id))
    const result: Record<number, boolean> = {}
    for (const id of ids) {
      result[id] = found.has(id)
    }
    return result
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
