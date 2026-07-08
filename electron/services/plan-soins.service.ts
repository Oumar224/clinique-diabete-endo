import { inject, singleton } from 'tsyringe'
import { type Kysely } from 'kysely'
import { AppDatabaseDatasource } from '../sqlite-data-source'
import type { DB } from '../entities/database'
import type { PlanSoinsItemEntity } from '../entities/plan-soins.entity'
import type { PlanSoinsDto, BlocHoraireDto } from '../dto/plan-soins.dto'
import type { SoinItem } from '../../src/types/soins'

@singleton()
export class PlanSoinsService {
  public db: Kysely<DB>

  constructor(@inject(AppDatabaseDatasource) datasource: AppDatabaseDatasource) {
    this.db = datasource.getInstance()
  }

  async getByPatientAndDate(patientId: number, date: string): Promise<PlanSoinsDto | null> {
    const plan = await this.db
      .selectFrom('plan_soins')
      .selectAll()
      .where('patient_id', '=', patientId)
      .where('date', '=', date)
      .executeTakeFirst()

    if (!plan) return null

    const items = await this.db
      .selectFrom('plan_soins_items')
      .selectAll()
      .where('plan_soins_id', '=', plan.id!)
      .orderBy('id', 'asc')
      .execute()

    const blocs = this.groupItemsByBloc(items)

    return {
      id: plan.id!,
      patientId: plan.patient_id,
      date: plan.date,
      blocs,
      createdBy: plan.created_by,
      createdAt: plan.created_at!,
      updatedAt: plan.updated_at!,
    }
  }

  async listValidesByPatientAndDateRange(patientId: number, startDate: string, endDate: string): Promise<{
    date: string
    heure: string
    medicament: string
    dosage: string
    voie: string
    validePar: string | null
    valideA: string | null
  }[]> {
    const rows = await this.db
      .selectFrom('plan_soins')
      .innerJoin('plan_soins_items', 'plan_soins_items.plan_soins_id', 'plan_soins.id')
      .select([
        'plan_soins.date',
        'plan_soins_items.bloc_heure',
        'plan_soins_items.medicament',
        'plan_soins_items.dosage',
        'plan_soins_items.voie',
        'plan_soins_items.valide_par',
        'plan_soins_items.valide_a',
      ])
      .where('plan_soins.patient_id', '=', patientId)
      .where('plan_soins.date', '>=', startDate)
      .where('plan_soins.date', '<=', endDate)
      .where('plan_soins_items.statut', '=', 'valide')
      .orderBy('plan_soins.date', 'asc')
      .orderBy('plan_soins_items.bloc_heure', 'asc')
      .execute()

    return rows.map(r => ({
      date: r.date as string,
      heure: r.bloc_heure as string,
      medicament: r.medicament as string,
      dosage: r.dosage as string,
      voie: r.voie as string,
      validePar: r.valide_par as string | null,
      valideA: r.valide_a as string | null,
    }))
  }

  async validerSoin(soinId: number, validePar: string): Promise<SoinItem> {
    const now = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

    await this.db
      .updateTable('plan_soins_items')
      .set({
        statut: 'valide',
        valide_par: validePar,
        valide_a: now,
        updated_at: new Date().toISOString(),
      })
      .where('id', '=', soinId)
      .execute()

    const updated = await this.db
      .selectFrom('plan_soins_items')
      .selectAll()
      .where('id', '=', soinId)
      .executeTakeFirst()

    if (!updated) throw new Error(`Soin ${soinId} introuvable`)

    return this.toSoinItem(updated)
  }

  async suspendreSoin(soinId: number, motif: string): Promise<SoinItem> {
    await this.db
      .updateTable('plan_soins_items')
      .set({
        statut: 'suspendu',
        motif_suspension: motif,
        updated_at: new Date().toISOString(),
      })
      .where('id', '=', soinId)
      .execute()

    const updated = await this.db
      .selectFrom('plan_soins_items')
      .selectAll()
      .where('id', '=', soinId)
      .executeTakeFirst()

    if (!updated) throw new Error(`Soin ${soinId} introuvable`)

    return this.toSoinItem(updated)
  }

  async reprendreSoin(soinId: number): Promise<SoinItem> {
    await this.db
      .updateTable('plan_soins_items')
      .set({
        statut: 'en_attente',
        motif_suspension: null,
        valide_par: null,
        valide_a: null,
        updated_at: new Date().toISOString(),
      })
      .where('id', '=', soinId)
      .execute()

    const updated = await this.db
      .selectFrom('plan_soins_items')
      .selectAll()
      .where('id', '=', soinId)
      .executeTakeFirst()

    if (!updated) throw new Error(`Soin ${soinId} introuvable`)

    return this.toSoinItem(updated)
  }

  async suspendrePrescription(prescriptionId: number, motif: string): Promise<SoinItem[]> {
    await this.db
      .updateTable('plan_soins_items')
      .set({
        statut: 'suspendu',
        motif_suspension: motif,
        updated_at: new Date().toISOString(),
      })
      .where('prescription_id', '=', prescriptionId)
      .execute()

    const updated = await this.db
      .selectFrom('plan_soins_items')
      .selectAll()
      .where('prescription_id', '=', prescriptionId)
      .execute()

    return updated.map(r => this.toSoinItem(r))
  }

  async reprendrePrescription(prescriptionId: number): Promise<SoinItem[]> {
    await this.db
      .updateTable('plan_soins_items')
      .set({
        statut: 'en_attente',
        motif_suspension: null,
        valide_par: null,
        valide_a: null,
        updated_at: new Date().toISOString(),
      })
      .where('prescription_id', '=', prescriptionId)
      .execute()

    const updated = await this.db
      .selectFrom('plan_soins_items')
      .selectAll()
      .where('prescription_id', '=', prescriptionId)
      .execute()

    return updated.map(r => this.toSoinItem(r))
  }

  // ── helpers ────────────────────────────────────────────────────────
  private groupItemsByBloc(items: PlanSoinsItemEntity[]): BlocHoraireDto[] {
    const map = new Map<string, SoinItem[]>()
    for (const item of items) {
      const existing = map.get(item.bloc_heure) ?? []
      existing.push(this.toSoinItem(item))
      map.set(item.bloc_heure, existing)
    }
    return Array.from(map.entries()).map(([heure, soins]) => ({ heure, soins }))
  }

  private toSoinItem(row: PlanSoinsItemEntity): SoinItem {
    return {
      id: row.id!,
      planSoinsId: row.plan_soins_id,
      medicament: row.medicament,
      dosage: row.dosage,
      voie: row.voie as SoinItem['voie'],
      statut: row.statut as SoinItem['statut'],
      validePar: row.valide_par ?? undefined,
      valideA: row.valide_a ?? undefined,
      motifSuspension: row.motif_suspension ?? undefined,
      prescriptionId: row.prescription_id ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }
}
