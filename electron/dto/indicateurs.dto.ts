/**
 * Indicateurs annuels d'activité — contrat de lecture/écriture.
 *
 * Les clés sont volontairement stables : elles servent à la fois de colonnes
 * `annual_indicator`, de clés de réponse IPC et d'identifiants d'édition dans
 * l'interface du gestionnaire.
 */
export const METRIC_KEYS = [
  'suivi_diabete_endocrino',
  'soins_ambulatoires',
  'nouveaux_cas_diabete',
  'nouveaux_cas_thyroide_endocrino',
  'nouveaux_venus_diabete',
  'bilan_labo',
  'hospitalisation_jour',
  'hospitalisation_complete',
  'autres_nouveaux_cas',
  'ecg',
  'hopital_de_jour',
  'total_activites',
  'moyenne_activites',
] as const

export type MetricKey = (typeof METRIC_KEYS)[number]

/** Origine d'une valeur : calculée, saisie manuellement, ou indisponible. */
export type MetricSource = 'calcule' | 'saisi' | 'indisponible'

/**
 * Activités sommées dans `total_activites`, dans l'ordre de la feuille du
 * gestionnaire. `suivi_diabete_endocrino` est une COHORTE de patients suivis,
 * pas une activité : elle est affichée mais n'entre pas dans le total.
 * `total_activites` et `moyenne_activites` sont dérivés et ne s'additionnent
 * jamais. Doit rester aligné sur `src/types/indicateurs.ts`.
 */
export const ACTIVITY_KEYS = [
  'soins_ambulatoires',
  'nouveaux_cas_diabete',
  'nouveaux_cas_thyroide_endocrino',
  'nouveaux_venus_diabete',
  'bilan_labo',
  'hospitalisation_jour',
  'hospitalisation_complete',
  'autres_nouveaux_cas',
  'ecg',
  'hopital_de_jour',
] as const satisfies readonly MetricKey[]

export type ActivityKey = (typeof ACTIVITY_KEYS)[number]

/**
 * Indicateurs DÉRIVÉS : jamais saisissables ni effaçables manuellement.
 * Le service les recalcule toujours à partir des activités unitaires.
 */
export const DERIVED_KEYS = ['total_activites', 'moyenne_activites'] as const satisfies readonly MetricKey[]

export type DerivedKey = (typeof DERIVED_KEYS)[number]

export function isDerivedMetric(metric: MetricKey): metric is DerivedKey {
  return (DERIVED_KEYS as readonly string[]).includes(metric)
}

export interface IndicateursParams {
  fromYear?: number
  toYear?: number
}

export type IndicateursYearRow = {
  annee: number
  sources: Record<MetricKey, MetricSource>
} & Record<MetricKey, number | null>

/**
 * Cumuls sur la période. Chaque métrique vaut `null` quand AUCUNE année de la
 * période n'a de valeur (jamais `0`, qui serait un cumul inventé).
 */
export type IndicateursTotaux = Record<MetricKey, number | null> & {
  moyenne_par_an: Record<MetricKey, number | null>
  /** `true` si au moins une métrique possède un cumul non nul. */
  hasAny: boolean
}

export interface IndicateursAnnuelsDto {
  lignes: IndicateursYearRow[]
  totaux: IndicateursTotaux
}

/** Ligne « plate » destinée à l'export Excel (sans métadonnées de source). */
export type IndicateursExportRow = {
  annee: number
} & Record<MetricKey, number | null>

export interface IndicateursMensuelsParams {
  annee: number
}

export interface IndicateursMensuelLigne {
  metric: ActivityKey
  /** 12 valeurs, janvier → décembre. `null` = aucune donnée ce mois-là. */
  mois: Array<number | null>
  /** Cumul annuel de la ligne ; `null` si aucun mois n'est renseigné. */
  total: number | null
}

/**
 * Détail mensuel d'une année. Toujours CALCULÉ depuis les données
 * opérationnelles : aucune surcharge manuelle n'est appliquée.
 */
export interface IndicateursMensuelsDto {
  annee: number
  lignes: IndicateursMensuelLigne[]
  /** Somme des activités pour chaque mois (1..12), `null` si aucune. */
  totaux_mois: Array<number | null>
  /** Somme des lignes ; `null` si aucune activité n'est renseignée. */
  total: number | null
}

export interface SetIndicateurManuelParams {
  annee: number
  metric: MetricKey
  value: number
}

export interface ClearIndicateurManuelParams {
  annee: number
  metric: MetricKey
}
