import { inject, singleton } from 'tsyringe'
import type { Kysely } from 'kysely'
import { AppDatabaseDatasource } from '../sqlite-data-source'
import type { DB } from '../entities/database'
import type { PatientActeEntity } from '../entities/patient-acte.entity'
import type { PatientActeCreateDto } from '../dto/patient-acte.dto'
import { validateForeignKeys } from './utils/fk-validator'

@singleton()
export class PatientActeService {
  public db: Kysely<DB>

  constructor(@inject(AppDatabaseDatasource) datasource: AppDatabaseDatasource) {
    this.db = datasource.getInstance()
  }

  // ─── List patient actes by patient ────────────────────────────
  async listByPatient(patientId: number): Promise<PatientActeEntity[]> {
    try {
      const rows = await this.db
        .selectFrom('patient_actes')
        .innerJoin('medical_acts', 'patient_actes.acte_id', 'medical_acts.id')
        .leftJoin('config_tarifs', 'patient_actes.tarif_id', 'config_tarifs.id')
        .selectAll('patient_actes')
        .select([
          'medical_acts.code as acte_code',
          'medical_acts.label as acte_label',
          'config_tarifs.prix_unitaire as prix_unitaire',
          'config_tarifs.code_tarif as code_tarif',
        ])
        .where('patient_actes.patient_id', '=', patientId)
        .orderBy('patient_actes.created_at', 'desc')
        .execute()

      return rows as unknown as PatientActeEntity[]
    } catch (err: any) {
      if (err?.message?.includes('no such table') || err?.message?.includes('no such column')) return []
      throw err
    }
  }

  // ─── List patient actes by encounter ──────────────────────────
  async listByEncounter(encounterId: number): Promise<PatientActeEntity[]> {
    try {
      const rows = await this.db
        .selectFrom('patient_actes')
        .innerJoin('medical_acts', 'patient_actes.acte_id', 'medical_acts.id')
        .leftJoin('config_tarifs', 'patient_actes.tarif_id', 'config_tarifs.id')
        .selectAll('patient_actes')
        .select([
          'medical_acts.code as acte_code',
          'medical_acts.label as acte_label',
          'config_tarifs.prix_unitaire as prix_unitaire',
          'config_tarifs.code_tarif as code_tarif',
        ])
        .where('patient_actes.encounter_id', '=', encounterId)
        .orderBy('patient_actes.created_at', 'desc')
        .execute()

      return rows as unknown as PatientActeEntity[]
    } catch (err: any) {
      if (err?.message?.includes('no such table') || err?.message?.includes('no such column')) return []
      throw err
    }
  }

  // ─── Create a patient acte ────────────────────────────────────
  async create(dto: PatientActeCreateDto): Promise<PatientActeEntity> {
    this.validateQuantite(dto.quantite ?? 1)

    // Validate foreign keys before insert
    await validateForeignKeys(this.db as any, [
      { table: 'patient', column: 'patient_id', value: dto.patient_id },
      { table: 'medical_acts', column: 'acte_id', value: dto.acte_id },
      { table: 'encounters', column: 'encounter_id', value: dto.encounter_id },
      { table: 'config_tarifs', column: 'tarif_id', value: dto.tarif_id },
    ])

    try {
      // If no tarif_id provided, look up active TARIF.STANDARD
      let tarifId = dto.tarif_id
      if (tarifId == null) {
        const activeTarif = await this.db
          .selectFrom('config_tarifs')
          .select('id')
          .where('acte_id', '=', dto.acte_id)
          .where('code_tarif', '=', 'TARIF.STANDARD')
          .orderBy('date_application', 'desc')
          .orderBy('id', 'desc')
          .limit(1)
          .executeTakeFirst()

        if (activeTarif) {
          tarifId = (activeTarif as any).id
        }
      }

      const result = await this.db
        .insertInto('patient_actes')
        .values({
          encounter_id: dto.encounter_id ?? undefined,
          patient_id: dto.patient_id,
          acte_id: dto.acte_id,
          tarif_id: tarifId ?? undefined,
          quantite: dto.quantite ?? 1,
          statut_paiement: 'A_PAYER',
        })
        .returningAll()
        .executeTakeFirst()

      if (!result) throw new Error("Échec de la création de l'acte patient")

      return (await this.getById((result as any).id))!
    } catch (err: any) {
      if (err?.message?.includes('no such table') || err?.message?.includes('no such column')) {
        throw new Error('La base de données n\'est pas initialisée correctement. Contactez l\'administrateur.')
      }
      throw err
    }
  }

  // ─── Update payment status ────────────────────────────────────
  async updateStatut(id: number, statut: 'A_PAYER' | 'PAYE'): Promise<PatientActeEntity> {
    if (id == null) throw new Error("L'identifiant de l'acte patient est requis")

    try {
      const existing = await this.db
        .selectFrom('patient_actes')
        .selectAll()
        .where('id', '=', id)
        .executeTakeFirst()

      if (!existing) throw new Error('Acte patient introuvable')

      await this.db
        .updateTable('patient_actes')
        .set({ statut_paiement: statut })
        .where('id', '=', id)
        .execute()

      const updated = await this.getById(id)
      if (!updated) throw new Error('Acte patient introuvable après mise à jour')
      return updated
    } catch (err: any) {
      if (err?.message?.includes('no such table') || err?.message?.includes('no such column')) {
        throw new Error('La base de données n\'est pas initialisée correctement. Contactez l\'administrateur.')
      }
      throw err
    }
  }

  // ─── Delete a patient acte ────────────────────────────────────
  async delete(id: number): Promise<void> {
    if (id == null) throw new Error("L'identifiant de l'acte patient est requis")

    try {
      const existing = await this.db
        .selectFrom('patient_actes')
        .select('id')
        .where('id', '=', id)
        .executeTakeFirst()

      if (!existing) throw new Error('Acte patient introuvable')

      await this.db
        .deleteFrom('patient_actes')
        .where('id', '=', id)
        .execute()
    } catch (err: any) {
      if (err?.message?.includes('no such table') || err?.message?.includes('no such column')) {
        throw new Error('La base de données n\'est pas initialisée correctement. Contactez l\'administrateur.')
      }
      throw err
    }
  }

  // ─── Get single patient acte by id ────────────────────────────
  private async getById(id: number): Promise<PatientActeEntity | null> {
    try {
      const row = await this.db
        .selectFrom('patient_actes')
        .innerJoin('medical_acts', 'patient_actes.acte_id', 'medical_acts.id')
        .leftJoin('config_tarifs', 'patient_actes.tarif_id', 'config_tarifs.id')
        .selectAll('patient_actes')
        .select([
          'medical_acts.code as acte_code',
          'medical_acts.label as acte_label',
          'config_tarifs.prix_unitaire as prix_unitaire',
          'config_tarifs.code_tarif as code_tarif',
        ])
        .where('patient_actes.id', '=', id)
        .executeTakeFirst()

      return row ? (row as unknown as PatientActeEntity) : null
    } catch (err: any) {
      if (err?.message?.includes('no such table') || err?.message?.includes('no such column')) return null
      throw err
    }
  }

  // ─── Validation ──────────────────────────────────────────────
  private validateQuantite(quantite: number): void {
    if (typeof quantite !== 'number' || isNaN(quantite) || quantite < 1) {
      throw new Error('La quantité doit être un nombre valide supérieur ou égal à 1')
    }
    if (quantite > 9999) {
      throw new Error('La quantité est trop élevée')
    }
  }
}
