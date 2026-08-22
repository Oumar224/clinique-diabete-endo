import { inject, singleton } from 'tsyringe'
import { type Kysely } from 'kysely'
import { AppDatabaseDatasource } from '../sqlite-data-source'
import type { DB } from '../entities/database'
import { PrescriptionEntity } from '../entities/prescription.entity'
import { validateForeignKeys } from './utils/fk-validator'
import { entityEventBus } from '../automerge/event-bus'


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
  async listByPatient(patientId: number): Promise<PrescriptionEntity[]> {
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
        'prescriptions.duree_type',
        'prescriptions.frequence',
        'prescriptions.frequence_type as frequence_type',
        'prescriptions.prn',
        'prescriptions.instructions',
        'prescriptions.date_prescription',
        'prescriptions.prescripteur_id',
        'prescriptions.statut',
        'prescriptions.prescription_type',
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

    return rows as unknown as PrescriptionEntity[]
  }

  /**
   * Get a single prescription by id.
   */
  async getById(id: number): Promise<PrescriptionEntity | null> {
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
        'prescriptions.duree_type',
        'prescriptions.frequence',
        'prescriptions.frequence_type as frequence_type',
        'prescriptions.prn',
        'prescriptions.instructions',
        'prescriptions.date_prescription',
        'prescriptions.prescripteur_id',
        'prescriptions.statut',
        'prescriptions.prescription_type',
        'prescriptions.created_at',
        'prescriptions.updated_at',
        'user.prenom',
        'user.nom',
        'user.role',
      ])
      .where('prescriptions.id', '=', id)
      .executeTakeFirst()

    return row ? (row as unknown as PrescriptionEntity) : null
  }

  /**
   * Create a new prescription and generate corresponding plan_soins_items
   * in the distribution calendar for the entire duration.
   */
  async create(entity: PrescriptionEntity): Promise<{ prescription: PrescriptionEntity; itemsGenerated: number }> {
    // Validate foreign keys before insert
    await validateForeignKeys(this.db as any, [
      { table: 'patient', column: 'patient_id', value: entity.patient_id },
      { table: 'user', column: 'prescripteur_id', value: entity.prescripteur_id },
    ])

    const now = new Date().toISOString()
    const insertResult = await this.db
      .insertInto('prescriptions')
      .values({
        patient_id: entity.patient_id,
        medicament: entity.medicament,
        dosage: entity.dosage,
        voie: entity.voie,
        duree: entity.duree,
        duree_type: entity.duree_type ?? 'courte',
        frequence: entity.frequence,
        frequence_type: entity.frequence_type ?? 'moments',
        prn: entity.prn ?? 0,
        instructions: entity.instructions,
        date_prescription: entity.date_prescription ?? this.formatLocalDate(new Date()),
        prescripteur_id: entity.prescripteur_id,
        statut: entity.statut ?? 'active',
        prescription_type: entity.type ?? 'medicament',
        created_at: now,
        updated_at: now,
      })
      .executeTakeFirst()

    const prescriptionId = Number(insertResult.insertId!)

    // ── 2. Generate plan_soins_items for each day × frequency ──────
    const frequenceArr = (entity.frequence ?? '').split(',').filter(Boolean)
    const itemsGenerated = await this.generatePlanItems({
      prescriptionId,
      patientId: entity.patient_id!,
      startDate: entity.date_prescription ?? this.formatLocalDate(new Date()),
      duree: entity.duree ?? 0,
      frequence: frequenceArr,
      frequenceType: (entity.frequence_type ?? 'moments') as 'moments' | 'fixed-times' | 'interval',
      prn: entity.prn === 1,
      medicament: entity.medicament ?? '',
      dosage: entity.dosage ?? '',
      voie: entity.voie ?? '',
      createdBy: entity.prescripteur_id!,
    })
    console.log(`[PrescriptionService.create] ✅ prescriptionId=${prescriptionId} itemsGenerated=${itemsGenerated} medicament="${entity.medicament}" dosage="${entity.dosage}" duree=${entity.duree} frequence=["${entity.frequence}"]`)

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
        'prescriptions.duree_type',
        'prescriptions.frequence',
        'prescriptions.frequence_type as frequence_type',
        'prescriptions.prn',
        'prescriptions.instructions',
        'prescriptions.date_prescription',
        'prescriptions.prescripteur_id',
        'prescriptions.statut',
        'prescriptions.prescription_type',
        'prescriptions.created_at',
        'prescriptions.updated_at',
        'user.prenom',
        'user.nom',
        'user.role',
      ])
      .where('prescriptions.id', '=', prescriptionId)
      .executeTakeFirst()

    const prescriptionResult = { prescription: saved as unknown as PrescriptionEntity, itemsGenerated }
    entityEventBus.emitEntityChange({ entityType: 'prescription', action: 'created', id: prescriptionId, entity: prescriptionResult.prescription, source: 'local', timestamp: Date.now() })
    return prescriptionResult
  }

  /**
   * Update an existing prescription and regenerate en_attente plan_soins_items.
   * Items with statut different from 'en_attente' (valide/suspendu) are kept
   * to preserve clinical history.
   */
  async update(
    entity: PrescriptionEntity,
  ): Promise<{ prescription: PrescriptionEntity; itemsGenerated: number }> {
    const id = entity.id
    if (id == null) throw new Error('id requis pour la mise à jour')

    const existing = await this.db
      .selectFrom('prescriptions')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst()

    if (!existing) {
      throw new Error('Prescription introuvable')
    }

    const updatedData = {
      medicament: entity.medicament ?? existing.medicament,
      dosage: entity.dosage ?? existing.dosage,
      voie: entity.voie ?? existing.voie,
      duree: entity.duree ?? existing.duree,
      duree_type: entity.duree_type ?? existing.duree_type ?? 'courte',
      frequence: entity.frequence ?? existing.frequence,
      frequence_type: entity.frequence_type ?? existing.frequence_type,
      prn: entity.prn !== undefined ? entity.prn : existing.prn,
      instructions: entity.instructions !== undefined ? entity.instructions : existing.instructions,
      prescription_type: entity.type ?? existing.prescription_type ?? 'medicament',
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
    const mergedFrequence = entity.frequence ? entity.frequence.split(',').filter(Boolean) : existing.frequence!.split(',')
    const mergedFrequenceType = (entity.frequence_type ?? existing.frequence_type ?? 'moments') as 'moments' | 'fixed-times' | 'interval'
    const mergedPrn = entity.prn !== undefined ? entity.prn === 1 : existing.prn === 1
    const mergedDuree = entity.duree ?? existing.duree!
    const mergedMedicament = entity.medicament ?? existing.medicament!
    const mergedDosage = entity.dosage ?? existing.dosage!
    const mergedVoie = entity.voie ?? existing.voie!

    const itemsGenerated = await this.generatePlanItems({
      prescriptionId: id,
      patientId: existing.patient_id!,
      startDate: existing.date_prescription!,
      duree: mergedDuree,
      frequence: mergedFrequence,
      frequenceType: mergedFrequenceType,
      prn: mergedPrn,
      medicament: mergedMedicament,
      dosage: mergedDosage,
      voie: mergedVoie,
      createdBy: existing.prescripteur_id!,
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
        'prescriptions.duree_type',
        'prescriptions.frequence',
        'prescriptions.frequence_type as frequence_type',
        'prescriptions.prn',
        'prescriptions.instructions',
        'prescriptions.date_prescription',
        'prescriptions.prescripteur_id',
        'prescriptions.statut',
        'prescriptions.prescription_type',
        'prescriptions.created_at',
        'prescriptions.updated_at',
        'user.prenom',
        'user.nom',
        'user.role',
      ])
      .where('prescriptions.id', '=', id)
      .executeTakeFirst()

    const updatedResult = {
      prescription: updated as unknown as PrescriptionEntity,
      itemsGenerated,
    }
    entityEventBus.emitEntityChange({ entityType: 'prescription', action: 'updated', id: id!, entity: updatedResult.prescription, source: 'local', timestamp: Date.now() })
    return updatedResult
  }

  /**
   * Stop (deactivate) a prescription by setting statut to 'stopped'
   * and suspending all en_attente plan_soins_items (they remain visible
   * in the calendar as suspended, not actionable).
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

    // Suspend all en_attente items so they no longer appear actionable
    await this.db
      .updateTable('plan_soins_items')
      .set({
        statut: 'suspendu',
        motif_suspension: 'Prescription arrêtée',
        updated_at: new Date().toISOString(),
      })
      .where('prescription_id', '=', id)
      .where('statut', '=', 'en_attente')
      .execute()
  }

  /**
   * Hard-delete a prescription and remove/clean up related plan_soins_items.
   * - en_attente items are deleted (orphaned, no clinical value).
   * - valide/suspendu items are kept (prescription_id set to NULL) to preserve
   *   administration history.
   */
  async delete(id: number): Promise<void> {
    // Delete orphaned en_attente items (they have no clinical value)
    await this.db
      .deleteFrom('plan_soins_items')
      .where('prescription_id', '=', id)
      .where('statut', '=', 'en_attente')
      .execute()

    // Keep valide/suspendu items but disassociate them from the prescription
    await this.db
      .updateTable('plan_soins_items')
      .set({ prescription_id: undefined })
      .where('prescription_id', '=', id)
      .execute()

    // Delete the prescription record
    await this.db
      .deleteFrom('prescriptions')
      .where('id', '=', id)
      .execute()
    entityEventBus.emitEntityChange({ entityType: 'prescription', action: 'deleted', id, entity: null, source: 'local', timestamp: Date.now() })
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
   *
   * Frequency type handling:
   * - 'moments'    : values are moment labels (Matin, Midi, Soir, Nuit) mapped via FREQUENCE_TO_BLOC
   * - 'fixed-times': values are already time block strings (08h00, 12h00, etc.) used directly
   * - 'interval'   : single value "Toutes les Xh" generates blocks from 08h00 to 22h00 at X-hour intervals
   */
  private async generatePlanItems(params: {
    prescriptionId: number
    patientId: number
    startDate: string       // 'YYYY-MM-DD'
    duree: number
    frequence: string[]
    frequenceType: 'moments' | 'fixed-times' | 'interval'
    prn: boolean
    medicament: string
    dosage: string
    voie: string
    createdBy?: number      // used only when creating new plan_soins rows
  }): Promise<number> {
    if (params.prn) return 0

    // ── Resolve time blocks based on frequency type ──────────────
    let blocHeures: string[]

    if (params.frequenceType === 'fixed-times') {
      // Values are already time block strings like "08h00", "12h00", "18h00"
      blocHeures = params.frequence.filter(Boolean)
    } else if (params.frequenceType === 'interval') {
      // Value format: "Toutes les Xh" (e.g., "Toutes les 8h")
      // Generate blocks from 08h00 to 22h00 at X-hour intervals
      const match = params.frequence[0]?.match(/Toutes les (\d+)h/)
      blocHeures = []
      if (match) {
        const intervalHours = parseInt(match[1], 10)
        if (intervalHours > 0) {
          for (let h = 8; h <= 22; h += intervalHours) {
            blocHeures.push(`${String(h).padStart(2, '0')}h00`)
          }
        }
      }
    } else {
      // 'moments' — current behavior using FREQUENCE_TO_BLOC mapping
      blocHeures = params.frequence
        .map(freq => FREQUENCE_TO_BLOC[freq])
        .filter(Boolean)
    }

    if (blocHeures.length === 0) return 0

    // ── Generate items for each day ──────────────────────────────
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

      for (const blocHeure of blocHeures) {
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

}
