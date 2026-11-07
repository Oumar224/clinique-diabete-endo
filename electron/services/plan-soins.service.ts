import { inject, singleton, container } from 'tsyringe'
import { type Kysely } from 'kysely'
import { AppDatabaseDatasource } from '../sqlite-data-source'
import type { DB } from '../entities/database'
import { PlanSoinsEntity, type PlanSoinsItemEntity } from '../entities/plan-soins.entity'
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
      .where((eb) => eb.or([
        eb('prescription_id', 'is not', null),
        eb('statut', 'in', ['valide', 'suspendu']),
      ]))
      .orderBy('id', 'asc')
      .execute()

    const prescriptionIds = [...new Set(items.map(i => i.prescription_id).filter((id): id is number => id != null))]
    let typeMap = new Map<number, 'medicament' | 'soins'>()
    if (prescriptionIds.length > 0) {
      const prescriptions = await this.db
        .selectFrom('prescriptions')
        .select(['id', 'prescription_type'])
        .where('id', 'in', prescriptionIds)
        .execute()
      for (const p of prescriptions) {
        typeMap.set(p.id as number, (p.prescription_type as 'medicament' | 'soins') ?? 'medicament')
      }
    }

    const planDto = PlanSoinsEntity.toDto(plan)
    planDto.blocs = this.groupItemsByBloc(items, typeMap)
    return planDto
  }

  /**
   * Distinct dates (YYYY-MM-DD) having a plan_soins record for the patient,
   * most recent first. Used to build recorded-dates columns (cf. ResultatsBio).
   */
  async listDatesByPatient(patientId: number): Promise<string[]> {
    const rows = await this.db
      .selectFrom('plan_soins')
      .select('date')
      .distinct()
      .where('patient_id', '=', patientId)
      .orderBy('date', 'desc')
      .execute()
    return rows.map(r => r.date as string).filter((d): d is string => d != null && d !== '')
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
    const current = await this.db
      .selectFrom('plan_soins_items')
      .selectAll()
      .where('id', '=', soinId)
      .executeTakeFirst()
    if (!current) throw new Error(`Soin ${soinId} introuvable`)
    if (current.statut === 'valide') {
      return this.toSoinItem(current, await this.resolvePrescriptionType(current.prescription_id))
    }

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

    try {
      const { StockService } = await import('./stock.service')
      const administered = await container.resolve(StockService).administration({
        libelle: updated.medicament ?? '',
        planSoinsItemId: soinId,
        quantite: 1,
      })
      if (!administered) {
        console.warn('[pharmacie] administration ignorée (sans match catalogue ou stock insuffisant)', { planSoinsItemId: soinId, libelle: updated.medicament })
      }
    } catch (error) {
      console.warn('[pharmacie] hook administration ignoré', { planSoinsItemId: soinId, error: (error as Error)?.message })
    }

    return this.toSoinItem(updated, await this.resolvePrescriptionType(updated.prescription_id))
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

    return this.toSoinItem(updated, await this.resolvePrescriptionType(updated.prescription_id))
  }

  async reprendreSoin(soinId: number): Promise<SoinItem> {
    await this.db
      .updateTable('plan_soins_items')
      .set({
        statut: 'en_attente',
        motif_suspension: undefined,
        valide_par: undefined,
        valide_a: undefined,
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

    return this.toSoinItem(updated, await this.resolvePrescriptionType(updated.prescription_id))
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

    const type = await this.resolvePrescriptionType(prescriptionId)
    const updated = await this.db
      .selectFrom('plan_soins_items')
      .selectAll()
      .where('prescription_id', '=', prescriptionId)
      .execute()

    return updated.map(r => this.toSoinItem(r, type))
  }

  async reprendrePrescription(prescriptionId: number): Promise<SoinItem[]> {
    await this.db
      .updateTable('plan_soins_items')
      .set({
        statut: 'en_attente',
        motif_suspension: undefined,
        valide_par: undefined,
        valide_a: undefined,
        updated_at: new Date().toISOString(),
      })
      .where('prescription_id', '=', prescriptionId)
      .execute()

    const type = await this.resolvePrescriptionType(prescriptionId)
    const updated = await this.db
      .selectFrom('plan_soins_items')
      .selectAll()
      .where('prescription_id', '=', prescriptionId)
      .execute()

    return updated.map(r => this.toSoinItem(r, type))
  }

  // ── helpers ────────────────────────────────────────────────────────
  private groupItemsByBloc(items: PlanSoinsItemEntity[], typeMap: Map<number, 'medicament' | 'soins'> = new Map()): BlocHoraireDto[] {
    const map = new Map<string, SoinItem[]>()
    for (const item of items) {
      const existing = map.get(item.bloc_heure!) ?? []
      existing.push(this.toSoinItem(item, item.prescription_id != null ? typeMap.get(item.prescription_id) : undefined))
      map.set(item.bloc_heure!, existing)
    }
    return Array.from(map.entries()).map(([heure, soins]) => ({ heure, soins }))
  }

  private toSoinItem(row: PlanSoinsItemEntity, prescriptionType?: 'medicament' | 'soins'): SoinItem {
    return {
      id: row.id!,
      planSoinsId: row.plan_soins_id!,
      medicament: row.medicament!,
      dosage: row.dosage!,
      voie: row.voie! as SoinItem['voie'],
      statut: row.statut! as SoinItem['statut'],
      validePar: row.valide_par ?? null,
      valideA: row.valide_a ?? null,
      motifSuspension: row.motif_suspension ?? null,
      prescriptionId: row.prescription_id ?? null,
      prescriptionType: prescriptionType ?? null,
      createdAt: row.created_at ?? null,
      updatedAt: row.updated_at ?? null,
    } as unknown as SoinItem
  }

  private async resolvePrescriptionType(prescriptionId: number | null | undefined): Promise<'medicament' | 'soins' | undefined> {
    if (prescriptionId == null) return undefined
    const p = await this.db
      .selectFrom('prescriptions')
      .select('prescription_type')
      .where('id', '=', prescriptionId)
      .executeTakeFirst()
    return (p?.prescription_type as 'medicament' | 'soins') ?? undefined
  }
}
