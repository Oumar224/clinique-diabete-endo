import { inject, singleton } from 'tsyringe'
import { sql, type Kysely } from 'kysely'
import { randomUUID } from 'node:crypto'
import { AppDatabaseDatasource } from '../sqlite-data-source'
import type { DB } from '../entities/database'
import {
  ACTIVITY_KEYS,
  METRIC_KEYS,
  isDerivedMetric,
  type ActivityKey,
  type IndicateursAnnuelsDto,
  type IndicateursExportRow,
  type IndicateursMensuelLigne,
  type IndicateursMensuelsDto,
  type IndicateursParams,
  type IndicateursTotaux,
  type IndicateursYearRow,
  type MetricKey,
  type MetricSource,
} from '../dto/indicateurs.dto'

const SERVICE_NAMES = ['Diabétologie', 'Endocrinologie'] as const

/** Bornes de la période autorisée : ni avant 1900, ni au-delà de l'an prochain. */
const MIN_YEAR = 1900
const MAX_SPAN_YEARS = 60

/**
 * Indicateurs annuels d'activité de la clinique.
 *
 * Deux sources se combinent :
 *  - les agrégats CALCULÉS depuis les données opérationnelles (dossiers,
 *    demandes d'examen, séjours) ;
 *  - les valeurs SAISIES par le gestionnaire dans `annual_indicator`, qui
 *    priment métrique par métrique.
 *
 * Toute année de la période demandée produit une ligne, même sans aucune
 * donnée : les métriques sont alors `null` et leur source `indisponible`.
 */
@singleton()
export class IndicateursService {
  public db: Kysely<DB>

  constructor(@inject(AppDatabaseDatasource) datasource: AppDatabaseDatasource) {
    this.db = datasource.getInstance()
  }

  async getAnnualStats(params?: IndicateursParams): Promise<IndicateursAnnuelsDto> {
    const { fromYear, toYear } = this.normalizeRange(params)
    const years = Array.from({ length: toYear - fromYear + 1 }, (_, i) => fromYear + i)

    const [computed, manualByYear] = await Promise.all([
      this.loadComputed(fromYear, toYear),
      this.loadManual(fromYear, toYear),
    ])

    const lignes = years.map((annee) =>
      this.buildYearRow(annee, computed.get(annee) ?? {}, manualByYear.get(annee)),
    )

    return { lignes, totaux: this.buildTotaux(lignes) }
  }

  /**
   * Détail mensuel d'une année, CALCULÉ uniquement.
   *
   * Les prédicats SQL sont exactement ceux des agrégats annuels ; seule la
   * dimension de regroupement change (`strftime('%m', date)`). Le cumul des
   * douze mois d'une ligne est donc égal à la valeur annuelle de la métrique.
   */
  async getMonthlyStats(params: { annee: number }): Promise<IndicateursMensuelsDto> {
    this.assertYear(params?.annee)
    const annee = params.annee
    const year = String(annee)

    const [
      diabete,
      thyroide,
      autres,
      venus,
      labo,
      soins,
      ecg,
      jours,
      joursCount,
      completes,
    ] = await Promise.all([
      this.queryEncounterCases('diabete', year, year),
      this.queryEncounterCases('thyroide_endocrino', year, year),
      this.queryEncounterCases('autre', year, year),
      this.queryNouveauxVenus(year, year),
      this.queryBilanLabo(year, year),
      this.querySoinsAmbulatoires(year, year),
      this.queryEcgForRange(year, year),
      this.queryHospitalisationJours(year, year),
      this.queryStaysCount('jour', year, year),
      this.queryStaysCount('complete', year, year),
    ])

    const rowsByMetric: Record<ActivityKey, PeriodValue[]> = {
      soins_ambulatoires: soins,
      nouveaux_cas_diabete: diabete,
      nouveaux_cas_thyroide_endocrino: thyroide,
      nouveaux_venus_diabete: venus,
      bilan_labo: labo,
      hospitalisation_jour: jours,
      hospitalisation_complete: completes,
      autres_nouveaux_cas: autres,
      ecg,
      hopital_de_jour: joursCount,
    }

    const lignes: IndicateursMensuelLigne[] = ACTIVITY_KEYS.map((metric) => {
      const mois: Array<number | null> = Array.from({ length: 12 }, () => null)
      for (const row of rowsByMetric[metric]) {
        if (Number(row.annee) !== annee || row.value == null) continue
        const value = Number(row.value)
        if (!Number.isFinite(value)) continue
        const month = Number(row.mois)
        if (!Number.isInteger(month) || month < 1 || month > 12) continue
        mois[month - 1] = (mois[month - 1] ?? 0) + Math.round(value)
      }
      const present = mois.filter((value): value is number => value != null)
      return {
        metric,
        mois,
        total: present.length > 0 ? present.reduce((sum, value) => sum + value, 0) : null,
      }
    })

    const totauxMois: Array<number | null> = Array.from({ length: 12 }, (_, index) => {
      const values = lignes
        .map((ligne) => ligne.mois[index])
        .filter((value): value is number => value != null)
      return values.length > 0 ? values.reduce((sum, value) => sum + value, 0) : null
    })

    const lineTotals = lignes
      .map((ligne) => ligne.total)
      .filter((value): value is number => value != null)

    return {
      annee,
      lignes,
      totaux_mois: totauxMois,
      total: lineTotals.length > 0
        ? lineTotals.reduce((sum, value) => sum + value, 0)
        : null,
    }
  }

  /**
   * Enregistre une valeur manuelle (upsert par année). Les valeurs négatives
   * et non entières sont refusées : ce sont des comptages de cas.
   */
  async setManuel(
    annee: number,
    metric: MetricKey,
    value: number,
    actorId: number,
  ): Promise<void> {
    this.assertYear(annee)
    this.assertWritableMetric(metric)
    if (!Number.isInteger(value) || value < 0) {
      throw new Error('La valeur doit être un entier positif ou nul')
    }

    const now = new Date().toISOString()
    const values: Record<string, unknown> = {
      id: randomUUID(),
      annee,
      updated_by: String(actorId),
      updated_at: now,
      [metric]: value,
    }
    const updateSet: Record<string, unknown> = {
      [metric]: value,
      updated_by: String(actorId),
      updated_at: now,
    }

    await this.db
      .insertInto('annual_indicator')
      .values(values as never)
      .onConflict((oc) => oc.column('annee').doUpdateSet(updateSet as never))
      .execute()
  }

  /** Supprime la surcharge manuelle : la valeur calculée reprend la main. */
  async clearManuel(annee: number, metric: MetricKey): Promise<void> {
    this.assertYear(annee)
    this.assertWritableMetric(metric)

    await this.db
      .updateTable('annual_indicator')
      .set({ [metric]: null, updated_at: new Date().toISOString() } as never)
      .where('annee', '=', annee)
      .execute()
  }

  /** Lignes plates (une par année) pour le classeur Excel. */
  async getExportRows(params?: IndicateursParams): Promise<IndicateursExportRow[]> {
    const { lignes } = await this.getAnnualStats(params)
    return lignes.map((ligne) => {
      const row = { annee: ligne.annee } as IndicateursExportRow
      for (const metric of METRIC_KEYS) row[metric] = ligne[metric]
      return row
    })
  }

  // ─── Calculs ───────────────────────────────────────────────────────────

  private normalizeRange(params?: IndicateursParams): { fromYear: number; toYear: number } {
    const currentYear = new Date().getFullYear()
    const upperBound = currentYear + 1

    const parseYear = (raw: unknown, label: string): number => {
      if (raw == null) return currentYear
      if (typeof raw !== 'number' || !Number.isInteger(raw)) {
        throw new Error(`L'${label} doit être une année entière`)
      }
      return raw
    }

    let fromYear = parseYear(params?.fromYear, 'année de début')
    let toYear = parseYear(params?.toYear, 'année de fin')
    if (fromYear > toYear) [fromYear, toYear] = [toYear, fromYear]

    if (fromYear < MIN_YEAR || toYear > upperBound) {
      throw new Error(
        `La période doit être comprise entre ${MIN_YEAR} et ${upperBound}`,
      )
    }
    if (toYear - fromYear + 1 > MAX_SPAN_YEARS) {
      throw new Error(`La période ne peut pas dépasser ${MAX_SPAN_YEARS} ans`)
    }
    return { fromYear, toYear }
  }

  private async loadComputed(
    fromYear: number,
    toYear: number,
  ): Promise<Map<number, Partial<Record<MetricKey, number>>>> {
    const from = String(fromYear)
    const to = String(toYear)

    const [
      suivi,
      diabete,
      thyroide,
      autres,
      venus,
      labo,
      soins,
      ecg,
      jours,
      joursCount,
      completes,
    ] = await Promise.all([
      this.querySuiviDiabeteEndocrino(from, to),
      this.queryEncounterCases('diabete', from, to),
      this.queryEncounterCases('thyroide_endocrino', from, to),
      this.queryEncounterCases('autre', from, to),
      this.queryNouveauxVenus(from, to),
      this.queryBilanLabo(from, to),
      this.querySoinsAmbulatoires(from, to),
      // La recherche de l'ECG est incluse dans le même lot parallèle : aucune
      // requête préparatoire sérialisée avant le `Promise.all`.
      this.queryEcgForRange(from, to),
      this.queryHospitalisationJours(from, to),
      this.queryStaysCount('jour', from, to),
      this.queryStaysCount('complete', from, to),
    ])

    const result = new Map<number, Partial<Record<MetricKey, number>>>()
    const put = (rows: PeriodValue[], metric: MetricKey): void => {
      for (const row of rows) {
        const annee = Number(row.annee)
        if (!Number.isFinite(annee) || annee < fromYear || annee > toYear) continue

        // Un agrégat SQL sans valeur numérique (`SUM` de colonnes NULL) reste
        // absent : la métrique sera `null`, jamais un 0 inventé.
        if (row.value == null) continue
        const value = Number(row.value)
        if (!Number.isFinite(value)) continue

        const bucket = result.get(annee) ?? {}
        bucket[metric] = (bucket[metric] ?? 0) + Math.round(value)
        result.set(annee, bucket)
      }
    }

    put(suivi, 'suivi_diabete_endocrino')
    put(diabete, 'nouveaux_cas_diabete')
    put(thyroide, 'nouveaux_cas_thyroide_endocrino')
    put(autres, 'autres_nouveaux_cas')
    put(venus, 'nouveaux_venus_diabete')
    put(labo, 'bilan_labo')
    put(soins, 'soins_ambulatoires')
    put(ecg, 'ecg')
    put(jours, 'hospitalisation_jour')
    put(joursCount, 'hopital_de_jour')
    put(completes, 'hospitalisation_complete')

    return result
  }

  /**
   * « Cs Suivi diabète/endocrino » : nombre de dossiers (encounters) des
   * services Diabétologie / Endocrinologie, quelle que soit leur modalité.
   */
  private async querySuiviDiabeteEndocrino(from: string, to: string): Promise<PeriodValue[]> {
    const rows = await sql<PeriodValue>`
      SELECT CAST(substr(e.start_date, 1, 4) AS INTEGER) AS annee,
             CAST(strftime('%m', e.start_date) AS INTEGER) AS mois,
             COUNT(*) AS value
      FROM encounters e
      INNER JOIN services s ON s.id = e.service_id
      WHERE e.start_date IS NOT NULL
        AND s.name IN (${sql.join(SERVICE_NAMES, sql`, `)})
        AND substr(e.start_date, 1, 4) BETWEEN ${from} AND ${to}
      GROUP BY annee, mois
    `.execute(this.db)
    return rows.rows
  }

  /**
   * « Soins ambulatoires » : dossiers de prise en charge NON hospitalière.
   *
   * `encounters` est la table autoritaire du parcours patient. Aucune table
   * `patient_soins` n'existe ; `plan_soins` est un plan thérapeutique
   * intra-hospitalier (pas un acte ambulatoire) et `patient_actes` compte des
   * lignes d'actes, pas des dossiers. On compte donc les encounters dont
   * `contact_type` n'est pas `hospitalisation` (consultations et anciens
   * contacts externes), une seule fois par dossier.
   */
  private async querySoinsAmbulatoires(from: string, to: string): Promise<PeriodValue[]> {
    const rows = await sql<PeriodValue>`
      SELECT CAST(substr(start_date, 1, 4) AS INTEGER) AS annee,
             CAST(strftime('%m', start_date) AS INTEGER) AS mois,
             COUNT(*) AS value
      FROM encounters
      WHERE start_date IS NOT NULL
        AND contact_type IS NOT 'hospitalisation'
        AND substr(start_date, 1, 4) BETWEEN ${from} AND ${to}
      GROUP BY annee, mois
    `.execute(this.db)
    return rows.rows
  }

  private async queryEncounterCases(
    caseType: string,
    from: string,
    to: string,
  ): Promise<PeriodValue[]> {
    const rows = await sql<PeriodValue>`
      SELECT CAST(substr(start_date, 1, 4) AS INTEGER) AS annee,
             CAST(strftime('%m', start_date) AS INTEGER) AS mois,
             COUNT(*) AS value
      FROM encounters
      WHERE case_type = ${caseType}
        AND is_new_case = 1
        AND start_date IS NOT NULL
        AND substr(start_date, 1, 4) BETWEEN ${from} AND ${to}
      GROUP BY annee, mois
    `.execute(this.db)
    return rows.rows
  }

  private async queryNouveauxVenus(from: string, to: string): Promise<PeriodValue[]> {
    // Le filtre `case_type = 'diabete'` s'applique AVANT le ROW_NUMBER : on
    // cherche le premier contact DIABÈTE du patient, pas son premier contact
    // tous types confondus. Un premier dossier NULL/autre ne le disqualifie
    // donc pas.
    const rows = await sql<PeriodValue>`
      SELECT CAST(annee AS INTEGER) AS annee,
             CAST(mois AS INTEGER) AS mois,
             COUNT(*) AS value
      FROM (
        SELECT patient_id,
               substr(start_date, 1, 4) AS annee,
               strftime('%m', start_date) AS mois,
               ROW_NUMBER() OVER (
                 PARTITION BY patient_id
                 ORDER BY start_date ASC, id ASC
               ) AS rn
        FROM encounters
        WHERE start_date IS NOT NULL
          AND case_type = 'diabete'
      )
      WHERE rn = 1
        AND annee BETWEEN ${from} AND ${to}
      GROUP BY annee, mois
    `.execute(this.db)
    return rows.rows
  }

  private async queryBilanLabo(from: string, to: string): Promise<PeriodValue[]> {
    const rows = await sql<PeriodValue>`
      SELECT CAST(substr(COALESCE(realized_at, created_at), 1, 4) AS INTEGER) AS annee,
             CAST(strftime('%m', COALESCE(realized_at, created_at)) AS INTEGER) AS mois,
             COUNT(*) AS value
      FROM exam_requests
      WHERE type = 'laboratoire'
        AND statut <> 'annule'
        AND COALESCE(realized_at, created_at) IS NOT NULL
        AND substr(COALESCE(realized_at, created_at), 1, 4) BETWEEN ${from} AND ${to}
      GROUP BY annee, mois
    `.execute(this.db)
    return rows.rows
  }

  private async findEcgId(): Promise<number | null> {
    const row = await sql<{ id: number }>`
      SELECT id FROM lab_exams WHERE code = 'ECG' ORDER BY id ASC LIMIT 1
    `.execute(this.db)
    return row.rows[0]?.id ?? null
  }

  private async queryEcgForRange(from: string, to: string): Promise<PeriodValue[]> {
    const ecgId = await this.findEcgId()
    return ecgId == null ? [] : this.queryEcg(from, to, ecgId)
  }

  private async queryEcg(from: string, to: string, ecgId: number): Promise<PeriodValue[]> {
    const rows = await sql<PeriodValue>`
      SELECT CAST(substr(COALESCE(er.realized_at, er.created_at), 1, 4) AS INTEGER) AS annee,
             CAST(strftime('%m', COALESCE(er.realized_at, er.created_at)) AS INTEGER) AS mois,
             COUNT(*) AS value
      FROM exam_requests er
      WHERE er.statut <> 'annule'
        AND er.exam_ids IS NOT NULL
        AND json_valid(er.exam_ids) = 1
        AND COALESCE(er.realized_at, er.created_at) IS NOT NULL
        AND substr(COALESCE(er.realized_at, er.created_at), 1, 4) BETWEEN ${from} AND ${to}
        AND EXISTS (
          SELECT 1
          FROM json_each(er.exam_ids) je
          WHERE CAST(je.value AS INTEGER) = ${ecgId}
        )
      GROUP BY annee, mois
    `.execute(this.db)
    return rows.rows
  }

  private async queryHospitalisationJours(from: string, to: string): Promise<PeriodValue[]> {
    // Séjour en cours (sortie vide) : on compte jusqu'à AUJOURD'HUI, et non
    // « 1 jour » par défaut. `MAX(1, …)` couvre une admission du jour même.
    const rows = await sql<PeriodValue>`
      SELECT CAST(substr(admission_date, 1, 4) AS INTEGER) AS annee,
             CAST(strftime('%m', admission_date) AS INTEGER) AS mois,
             SUM(
               MAX(
                 1,
                 julianday(COALESCE(NULLIF(sortie_date, ''), date('now')))
                   - julianday(admission_date)
               )
             ) AS value
      FROM stays
      WHERE type = 'jour'
        AND admission_date IS NOT NULL
        AND substr(admission_date, 1, 4) BETWEEN ${from} AND ${to}
      GROUP BY annee, mois
    `.execute(this.db)
    return rows.rows
  }

  private async queryStaysCount(type: 'jour' | 'complete', from: string, to: string): Promise<PeriodValue[]> {
    const rows = await sql<PeriodValue>`
      SELECT CAST(substr(admission_date, 1, 4) AS INTEGER) AS annee,
             CAST(strftime('%m', admission_date) AS INTEGER) AS mois,
             COUNT(*) AS value
      FROM stays
      WHERE type = ${type}
        AND admission_date IS NOT NULL
        AND substr(admission_date, 1, 4) BETWEEN ${from} AND ${to}
      GROUP BY annee, mois
    `.execute(this.db)
    return rows.rows
  }

  // ─── Assemblage / surcharges ───────────────────────────────────────────

  private async loadManual(
    fromYear: number,
    toYear: number,
  ): Promise<Map<number, Record<string, unknown>>> {
    const rows = await this.db
      .selectFrom('annual_indicator')
      .selectAll()
      .where('annee', '>=', fromYear)
      .where('annee', '<=', toYear)
      .execute()

    const map = new Map<number, Record<string, unknown>>()
    for (const row of rows) {
      if (row.annee != null) map.set(Number(row.annee), row as unknown as Record<string, unknown>)
    }
    return map
  }

  private buildYearRow(
    annee: number,
    computed: Partial<Record<MetricKey, number>>,
    manual?: Record<string, unknown>,
  ): IndicateursYearRow {
    const values = {} as Record<MetricKey, number | null>
    const sources = {} as Record<MetricKey, MetricSource>

    for (const metric of METRIC_KEYS) {
      if (metric === 'total_activites' || metric === 'moyenne_activites') continue

      const manualValue = this.manualNumber(manual, metric)
      if (manualValue != null) {
        values[metric] = manualValue
        sources[metric] = 'saisi'
      } else if (computed[metric] != null) {
        values[metric] = computed[metric]!
        sources[metric] = 'calcule'
      } else {
        values[metric] = null
        sources[metric] = 'indisponible'
      }
    }

    // Les indicateurs dérivés ne sont jamais lus depuis `annual_indicator` :
    // ils sont TOUJOURS recalculés. `total_activites` est la somme des
    // activités de `ACTIVITY_KEYS` (aucune redéfinition silencieuse).
    const activityValues = ACTIVITY_KEYS.map((key) => values[key]).filter(
      (value): value is number => value != null,
    )

    if (activityValues.length > 0) {
      values.total_activites = activityValues.reduce((sum, value) => sum + value, 0)
      sources.total_activites = 'calcule'
    } else {
      values.total_activites = null
      sources.total_activites = 'indisponible'
    }

    if (values.total_activites != null && activityValues.length > 0) {
      values.moyenne_activites = Math.round(values.total_activites / activityValues.length)
      sources.moyenne_activites = 'calcule'
    } else {
      values.moyenne_activites = null
      sources.moyenne_activites = 'indisponible'
    }

    return { annee, ...values, sources }
  }

  private manualNumber(manual: Record<string, unknown> | undefined, metric: MetricKey): number | null {
    if (!manual) return null
    const raw = manual[metric]
    if (raw == null) return null
    const value = Number(raw)
    return Number.isFinite(value) ? Math.round(value) : null
  }

  private buildTotaux(lignes: IndicateursYearRow[]): IndicateursTotaux {
    const totaux = {} as Record<MetricKey, number | null>
    const moyenneParAn = {} as Record<MetricKey, number | null>
    let hasAny = false

    for (const metric of METRIC_KEYS) {
      const values = lignes
        .map((ligne) => ligne[metric])
        .filter((value): value is number => value != null)
      if (values.length === 0) {
        // Aucune année renseignée → cumul inconnu, pas 0.
        totaux[metric] = null
        moyenneParAn[metric] = null
        continue
      }
      const sum = values.reduce((acc, value) => acc + value, 0)
      totaux[metric] = Math.round(sum)
      moyenneParAn[metric] = Math.round(sum / values.length)
      hasAny = true
    }

    return { ...totaux, moyenne_par_an: moyenneParAn, hasAny }
  }

  // ─── Validation ────────────────────────────────────────────────────────

  private assertYear(annee: number): void {
    const upperBound = new Date().getFullYear() + 1
    if (!Number.isInteger(annee) || annee < MIN_YEAR || annee > upperBound) {
      throw new Error(`L'année doit être un entier compris entre ${MIN_YEAR} et ${upperBound}`)
    }
  }

  private assertMetric(metric: MetricKey): void {
    if (!METRIC_KEYS.includes(metric)) {
      throw new Error(`Indicateur inconnu : ${String(metric)}`)
    }
  }

  /** Refuse l'écriture d'un indicateur dérivé (calculé par le backend). */
  private assertWritableMetric(metric: MetricKey): void {
    this.assertMetric(metric)
    if (isDerivedMetric(metric)) {
      throw new Error(
        `L'indicateur « ${metric} » est calculé automatiquement et ne peut pas être modifié manuellement`,
      )
    }
  }
}

interface PeriodValue {
  annee: number | string
  mois?: number | string | null
  value: number | string | null
}
