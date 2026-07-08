import { inject, singleton } from 'tsyringe'
import { type Kysely } from 'kysely'
import { AppDatabaseDatasource } from '../sqlite-data-source'
import type { DB } from '../entities/database'
import type { PrescriptionDto } from '../dto/prescription.dto'

/**
 * Mapping from frequency labels to time blocks in the distribution calendar.
 */
const FREQUENCE_TO_BLOC: Record<string, string> = {
  Matin: '08h00',
  Midi: '12h00',
  Soir: '18h00',
  Nuit: '22h00',
}

@singleton()
export class PrescriptionService {
  public db: Kysely<DB>

  constructor(@inject(AppDatabaseDatasource) datasource: AppDatabaseDatasource) {
    this.db = datasource.getInstance()
  }

  /**
   * List all active prescriptions for a given patient.
   */
  async listByPatient(patientId: number): Promise<PrescriptionDto[]> {
    const rows = await this.db
      .selectFrom('prescriptions')
      .leftJoin('user', 'user.id', 'prescriptions.prescripteur_id')
      .select([
        'prescriptions.id',
        'prescriptions.patient_id',
        'prescriptions.medicament',
        'prescriptions.dosage',
        'prescriptions.voie',
        'prescriptions.duree',
        'prescriptions.frequence',
        'prescriptions.prn',
        'prescriptions.instructions',
        'prescriptions.date_prescription',
        'prescriptions.prescripteur_id',
        'prescriptions.statut',
        'prescriptions.created_at',
        'prescriptions.updated_at',
        'user.prenom',
        'user.nom',
        'user.role',
      ])
      .where('prescriptions.patient_id', '=', patientId)
      .orderBy('prescriptions.date_prescription', 'desc')
      .orderBy('prescriptions.id', 'desc')
      .execute()

    return rows.map(r => this.toDto(r))
  }

  /**
   * Get a single prescription by id.
   */
  async getById(id: number): Promise<PrescriptionDto | null> {
    const row = await this.db
      .selectFrom('prescriptions')
      .leftJoin('user', 'user.id', 'prescriptions.prescripteur_id')
      .select([
        'prescriptions.id',
        'prescriptions.patient_id',
        'prescriptions.medicament',
        'prescriptions.dosage',
        'prescriptions.voie',
        'prescriptions.duree',
        'prescriptions.frequence',
        'prescriptions.prn',
        'prescriptions.instructions',
        'prescriptions.date_prescription',
        'prescriptions.prescripteur_id',
        'prescriptions.statut',
        'prescriptions.created_at',
        'prescriptions.updated_at',
        'user.prenom',
        'user.nom',
        'user.role',
      ])
      .where('prescriptions.id', '=', id)
      .executeTakeFirst()

    return row ? this.toDto(row) : null
  }

  /**
   * Create a new prescription and generate corresponding plan_soins_items
   * in the distribution calendar for the entire duration.
   */
  async create(data: {
    patientId: number
    medicament: string
    dosage: string
    voie: string
    duree: number
    frequence: string[]       // ['Matin','Midi','Soir','Nuit']
    prn: boolean
    instructions: string | null
    prescripteurId: number
  }): Promise<{ prescription: PrescriptionDto; itemsGenerated: number }> {
    const now = new Date().toISOString()
    const today = this.formatLocalDate(new Date()) // local 'YYYY-MM-DD'

    // ── 1. Insert the prescription ────────────────────────────────
    const insertResult = await this.db
      .insertInto('prescriptions')
      .values({
        patient_id: data.patientId,
        medicament: data.medicament,
        dosage: data.dosage,
        voie: data.voie,
        duree: data.duree,
        frequence: data.frequence.join(','),
        prn: data.prn ? 1 : 0,
        instructions: data.instructions,
        date_prescription: today,
        prescripteur_id: data.prescripteurId,
        statut: 'active',
        created_at: now,
        updated_at: now,
      })
      .executeTakeFirst()

    const prescriptionId = Number(insertResult.insertId!)

    // ── 2. Generate plan_soins_items for each day × frequency ──────
    const itemsGenerated = await this.generatePlanItems({
      prescriptionId,
      patientId: data.patientId,
      startDate: today,
      duree: data.duree,
      frequence: data.frequence,
      prn: data.prn,
      medicament: data.medicament,
      dosage: data.dosage,
      voie: data.voie,
      createdBy: data.prescripteurId,
    })
    console.log(`[PrescriptionService.create] ✅ prescriptionId=${prescriptionId} itemsGenerated=${itemsGenerated} medicament="${data.medicament}" dosage="${data.dosage}" duree=${data.duree} frequence=[${data.frequence}]`)

    // ── 3. Return the created prescription ─────────────────────────
    const saved = await this.db
      .selectFrom('prescriptions')
      .leftJoin('user', 'user.id', 'prescriptions.prescripteur_id')
      .select([
        'prescriptions.id',
        'prescriptions.patient_id',
        'prescriptions.medicament',
        'prescriptions.dosage',
        'prescriptions.voie',
        'prescriptions.duree',
        'prescriptions.frequence',
        'prescriptions.prn',
        'prescriptions.instructions',
        'prescriptions.date_prescription',
        'prescriptions.prescripteur_id',
        'prescriptions.statut',
        'prescriptions.created_at',
        'prescriptions.updated_at',
        'user.prenom',
        'user.nom',
        'user.role',
      ])
      .where('prescriptions.id', '=', prescriptionId)
      .executeTakeFirst()

    return {
      prescription: this.toDto(saved!),
      itemsGenerated,
    }
  }

  /**
   * Update an existing prescription and regenerate en_attente plan_soins_items.
   * Items with statut different from 'en_attente' (valide/suspendu) are kept
   * to preserve clinical history.
   */
  async update(
    id: number,
    data: {
      medicament?: string
      dosage?: string
      voie?: string
      duree?: number
      frequence?: string[]
      prn?: boolean
      instructions?: string | null
    },
  ): Promise<{ prescription: PrescriptionDto; itemsGenerated: number }> {
    const existing = await this.db
      .selectFrom('prescriptions')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst()

    if (!existing) {
      throw new Error('Prescription introuvable')
    }

    const updatedData = {
      medicament: data.medicament ?? existing.medicament,
      dosage: data.dosage ?? existing.dosage,
      voie: data.voie ?? existing.voie,
      duree: data.duree ?? existing.duree,
      frequence: (data.frequence ?? existing.frequence.split(',')).join(','),
      prn: data.prn !== undefined ? (data.prn ? 1 : 0) : existing.prn,
      instructions: data.instructions !== undefined ? data.instructions : existing.instructions,
      updated_at: new Date().toISOString(),
    }

    // Update the prescription record
    await this.db
      .updateTable('prescriptions')
      .set(updatedData)
      .where('id', '=', id)
      .execute()

    // Delete all en_attente items generated from this prescription
    // to be regenerated with the new data
    await this.db
      .deleteFrom('plan_soins_items')
      .where('prescription_id', '=', id)
      .where('statut', '=', 'en_attente')
      .execute()

    // Regenerate items based on merged data
    const mergedFrequence = data.frequence ?? existing.frequence.split(',')
    const mergedPrn = data.prn !== undefined ? data.prn : existing.prn === 1
    const mergedDuree = data.duree ?? existing.duree
    const mergedMedicament = data.medicament ?? existing.medicament
    const mergedDosage = data.dosage ?? existing.dosage
    const mergedVoie = data.voie ?? existing.voie

    const itemsGenerated = await this.generatePlanItems({
      prescriptionId: id,
      patientId: existing.patient_id,
      startDate: existing.date_prescription,
      duree: mergedDuree,
      frequence: mergedFrequence,
      prn: mergedPrn,
      medicament: mergedMedicament,
      dosage: mergedDosage,
      voie: mergedVoie,
      createdBy: existing.prescripteur_id,
    })

    const updated = await this.db
      .selectFrom('prescriptions')
      .leftJoin('user', 'user.id', 'prescriptions.prescripteur_id')
      .select([
        'prescriptions.id',
        'prescriptions.patient_id',
        'prescriptions.medicament',
        'prescriptions.dosage',
        'prescriptions.voie',
        'prescriptions.duree',
        'prescriptions.frequence',
        'prescriptions.prn',
        'prescriptions.instructions',
        'prescriptions.date_prescription',
        'prescriptions.prescripteur_id',
        'prescriptions.statut',
        'prescriptions.created_at',
        'prescriptions.updated_at',
        'user.prenom',
        'user.nom',
        'user.role',
      ])
      .where('prescriptions.id', '=', id)
      .executeTakeFirst()

    return {
      prescription: this.toDto(updated!),
      itemsGenerated,
    }
  }

  /**
   * Stop (deactivate) a prescription by setting statut to 'stopped'.
   */
  async stop(id: number): Promise<void> {
    await this.db
      .updateTable('prescriptions')
      .set({
        statut: 'stopped',
        updated_at: new Date().toISOString(),
      })
      .where('id', '=', id)
      .execute()
  }

  /**
   * Hard-delete a prescription and disassociate all related plan_soins_items.
   * Items are kept (prescription_id set to NULL) to preserve administration history.
   */
  async delete(id: number): Promise<void> {
    // Disassociate items first
    await this.db
      .updateTable('plan_soins_items')
      .set({ prescription_id: null })
      .where('prescription_id', '=', id)
      .execute()

    // Delete the prescription record
    await this.db
      .deleteFrom('prescriptions')
      .where('id', '=', id)
      .execute()
  }

  // ── private helpers ──────────────────────────────────────────────

  /**
   * Format a Date as a local 'YYYY-MM-DD' string.
   * This is critical: the frontend PlanDistributionTab queries plan_soins
   * using local-date strings, so we MUST store dates in local timezone
   * for the `date` column to match.
   */
  private formatLocalDate(d: Date): string {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  /**
   * Generate plan_soins_items for a prescription across its full duration.
   * Skips generation for PRN prescriptions (as-needed, no schedule).
   *
   * For the findOrCreatePlanSoins helper, `createdBy` is used when a new
   * plan_soins row must be created (e.g. for dates beyond the original range).
   */
  private async generatePlanItems(params: {
    prescriptionId: number
    patientId: number
    startDate: string       // 'YYYY-MM-DD'
    duree: number
    frequence: string[]
    prn: boolean
    medicament: string
    dosage: string
    voie: string
    createdBy?: number      // used only when creating new plan_soins rows
  }): Promise<number> {
    if (params.prn) return 0

    const now = new Date().toISOString()
    const startParts = params.startDate.split('-').map(Number)
    let count = 0

    for (let dayOffset = 0; dayOffset < params.duree; dayOffset++) {
      // Construct date using local timezone components so that plan_soins.date
      // matches the local date strings used by PlanDistributionTab queries
      const date = new Date(startParts[0], startParts[1] - 1, startParts[2] + dayOffset)
      const dateStr = this.formatLocalDate(date)

      const planSoinsId = await this.findOrCreatePlanSoins(
        params.patientId,
        dateStr,
        params.createdBy ?? 0,
      )

      for (const freq of params.frequence) {
        const blocHeure = FREQUENCE_TO_BLOC[freq]
        if (!blocHeure) continue

        await this.db
          .insertInto('plan_soins_items')
          .values({
            plan_soins_id: planSoinsId,
            bloc_heure: blocHeure,
            medicament: params.medicament,
            dosage: params.dosage,
            voie: params.voie,
            statut: 'en_attente',
            prescription_id: params.prescriptionId,
            created_at: now,
            updated_at: now,
          })
          .execute()

        count++
      }
    }

    return count
  }

  /**
   * Find an existing plan_soins record for a patient+date, or create one.
   * Returns the plan_soins.id.
   */
  private async findOrCreatePlanSoins(
    patientId: number,
    date: string,
    createdBy: number,
  ): Promise<number> {
    const existing = await this.db
      .selectFrom('plan_soins')
      .select('id')
      .where('patient_id', '=', patientId)
      .where('date', '=', date)
      .executeTakeFirst()

    if (existing) return existing.id!

    const result = await this.db
      .insertInto('plan_soins')
      .values({
        patient_id: patientId,
        date,
        created_by: createdBy,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .executeTakeFirst()

    return Number(result.insertId!)
  }

  private toDto(row: Record<string, unknown>): PrescriptionDto {
    return {
      id: row.id as number,
      patientId: row.patient_id as number,
      medicament: row.medicament as string,
      dosage: row.dosage as string,
      voie: row.voie as string,
      duree: row.duree as number,
      frequence: (row.frequence as string).split(',').map(f => f.trim()),
      prn: (row.prn as number) === 1,
      instructions: row.instructions as string | null,
      datePrescription: row.date_prescription as string,
      prescripteurId: row.prescripteur_id as number,
      prescripteurNom: row.prenom && row.nom ? `${row.prenom} ${row.nom}` : undefined,
      prescripteurRole: row.role as string | undefined,
      statut: row.statut as string,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    }
  }
}
