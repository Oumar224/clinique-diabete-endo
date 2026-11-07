/**
 * Indicateurs annuels d'activité — contrat partagé entre l'IPC et l'écran.
 *
 * Les clés sont identiques à celles du DTO backend
 * (`electron/dto/indicateurs.dto.ts`) : elles servent de colonnes de table,
 * de clés de réponse IPC et d'identifiants d'édition.
 *
 * Toutes les métriques sont des comptages entiers (« cas ») : le montant
 * CA/GNF a été retiré du contrat au profit du suivi diabète/endocrino et des
 * soins ambulatoires.
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

/**
 * Les activités sommées dans `total_activites`. Le suivi diabète/endocrino
 * est une cohorte de patients suivis, pas une activité : il n'entre pas dans
 * le total. Doit rester aligné sur `ACTIVITY_KEYS` du DTO backend.
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

/** Origine d'une valeur affichée. */
export type MetricSource = 'calcule' | 'saisi' | 'indisponible'

export type MetricGroup = 'suivi' | 'activite'

/** Toutes les métriques sont des comptages entiers de cas. */
export type MetricUnit = 'cas'

export interface MetricMeta {
  /** Clé stable utilisée par l'IPC et la base. */
  key: MetricKey
  /** Libellé français complet (infobulle / accessibilité). */
  label: string
  /** Libellé compact affiché dans l'en-tête de colonne. */
  shortLabel: string
  /** Groupe d'en-tête : cohorte suivie ou activité comptée. */
  group: MetricGroup
  /** Unité de la valeur. */
  unit: MetricUnit
  /** `true` pour les colonnes calculées par le backend (total, moyenne). */
  derived: boolean
}

/**
 * Métadonnées d'affichage des 13 indicateurs.
 *
 * `total_activites` et `moyenne_activites` sont marqués `derived` : ils ne
 * sont jamais édités directement dans la table, le backend les recalcule à
 * partir des activités unitaires.
 */
export const METRIC_META: Record<MetricKey, MetricMeta> = {
  suivi_diabete_endocrino: {
    key: 'suivi_diabete_endocrino',
    label: 'Suivi diabète / endocrino',
    shortLabel: 'Suivi diabète / endo.',
    group: 'suivi',
    unit: 'cas',
    derived: false,
  },
  soins_ambulatoires: {
    key: 'soins_ambulatoires',
    label: 'Soins ambulatoires',
    shortLabel: 'Soins ambul.',
    group: 'activite',
    unit: 'cas',
    derived: false,
  },
  nouveaux_cas_diabete: {
    key: 'nouveaux_cas_diabete',
    label: 'Nouveaux cas diabète',
    shortLabel: 'Nouveaux cas diabète',
    group: 'activite',
    unit: 'cas',
    derived: false,
  },
  nouveaux_cas_thyroide_endocrino: {
    key: 'nouveaux_cas_thyroide_endocrino',
    label: 'Nouveaux cas thyroïde / endocrino',
    shortLabel: 'Cas thyroïde / endo.',
    group: 'activite',
    unit: 'cas',
    derived: false,
  },
  nouveaux_venus_diabete: {
    key: 'nouveaux_venus_diabete',
    label: 'Nouveaux venus diabète',
    shortLabel: 'Nouveaux venus',
    group: 'activite',
    unit: 'cas',
    derived: false,
  },
  bilan_labo: {
    key: 'bilan_labo',
    label: 'Bilans labo',
    shortLabel: 'Bilans labo',
    group: 'activite',
    unit: 'cas',
    derived: false,
  },
  hospitalisation_jour: {
    key: 'hospitalisation_jour',
    label: 'Hospitalisation jour',
    shortLabel: 'Hospit. jour',
    group: 'activite',
    unit: 'cas',
    derived: false,
  },
  hospitalisation_complete: {
    key: 'hospitalisation_complete',
    label: 'Hospitalisation complète',
    shortLabel: 'Hosp. complète',
    group: 'activite',
    unit: 'cas',
    derived: false,
  },
  autres_nouveaux_cas: {
    key: 'autres_nouveaux_cas',
    label: 'Autres nouveaux cas',
    shortLabel: 'Autres cas',
    group: 'activite',
    unit: 'cas',
    derived: false,
  },
  ecg: {
    key: 'ecg',
    label: 'ECG',
    shortLabel: 'ECG',
    group: 'activite',
    unit: 'cas',
    derived: false,
  },
  hopital_de_jour: {
    key: 'hopital_de_jour',
    label: 'Hôpital de jour',
    shortLabel: 'Hôpital jour',
    group: 'activite',
    unit: 'cas',
    derived: false,
  },
  total_activites: {
    key: 'total_activites',
    label: 'Total activités',
    shortLabel: 'Total activités',
    group: 'activite',
    unit: 'cas',
    derived: true,
  },
  moyenne_activites: {
    key: 'moyenne_activites',
    label: 'Moyenne activités',
    shortLabel: 'Moyenne act.',
    group: 'activite',
    unit: 'cas',
    derived: true,
  },
}

/** Les 13 métriques dans l'ordre d'affichage. */
export const METRICS: readonly MetricMeta[] = METRIC_KEYS.map((key) => METRIC_META[key])

/** Colonnes du groupe « Suivi » (cohorte de patients). */
export const SUIVI_METRICS: readonly MetricMeta[] = METRICS.filter(
  (metric) => metric.group === 'suivi',
)

/** Colonnes du groupe « Activité ». */
export const ACTIVITE_METRICS: readonly MetricMeta[] = METRICS.filter(
  (metric) => metric.group === 'activite',
)

export function isDerivedMetric(metric: MetricKey): boolean {
  return METRIC_META[metric].derived
}

/** Libellés des douze mois, dans l'ordre du contrat `indicateurs:mensuels`. */
export const MONTH_LABELS = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
] as const

export interface IndicateursYearRow extends Record<MetricKey, number | null> {
  annee: number
  sources: Record<MetricKey, MetricSource>
}

/**
 * Totaux de la période. Chaque total est `null` quand aucune année de la
 * période ne porte de valeur : l'écran affiche alors « — » au lieu de `0`.
 * `0` reste une valeur valide dès qu'une année contient réellement zéro.
 */
export type IndicateursTotaux = { [K in MetricKey]: number | null } & {
  moyenne_par_an: Record<MetricKey, number | null>
}

export interface IndicateursAnnuelsDto {
  lignes: IndicateursYearRow[]
  totaux: IndicateursTotaux
}

/** Une activité déclinée sur les douze mois d'une année. */
export interface IndicateursMensuelLigne {
  metric: ActivityKey
  /** Valeurs janvier → décembre (12 entrées). `null` = non renseigné. */
  mois: Array<number | null>
  total: number | null
}

/**
 * Détail mensuel calculé d'une année (`indicateurs:mensuels`).
 * La réponse est en lecture seule : aucune saisie mensuelle n'est proposée.
 */
export interface IndicateursMensuelsDto {
  annee: number
  lignes: IndicateursMensuelLigne[]
  /** Totaux par mois, janvier → décembre (12 entrées). */
  totaux_mois: Array<number | null>
  total: number | null
}
