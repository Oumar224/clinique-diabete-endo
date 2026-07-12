export interface FrequenceOption {
  value: string
  label: string
}

/** Options for frequency type selection */
export const FREQUENCE_TYPE_OPTIONS = [
  { value: 'moments', label: 'Moments de la journée' },
  { value: 'fixed-times', label: 'Heures fixes' },
  { value: 'interval', label: 'Intervalle' },
]

/** Moments de la journée options (legacy frequency) */
export const MOMENTS_OPTIONS: FrequenceOption[] = [
  { value: 'Matin', label: 'Matin' },
  { value: 'Midi', label: 'Midi' },
  { value: 'Soir', label: 'Soir' },
  { value: 'Nuit', label: 'Nuit' },
]

/** Backward-compat alias */
export const FREQUENCE_OPTIONS: FrequenceOption[] = MOMENTS_OPTIONS

/** Fixed hour slots */
export const FIXED_TIMES_OPTIONS = [
  '06h00', '07h00', '08h00', '09h00', '10h00', '11h00',
  '12h00', '13h00', '14h00', '15h00', '16h00', '17h00',
  '18h00', '19h00', '20h00', '21h00', '22h00', '23h00',
]

/** Interval options (every N hours) */
export const INTERVAL_OPTIONS = [4, 6, 8, 12, 24]

export type FrequenceValue = 'Matin' | 'Midi' | 'Soir' | 'Nuit'

// ── Unified prescription type ────────────────────────────────────────────

export const PRESCRIPTION_TYPE_OPTIONS = [
  { value: 'medicament', label: 'Médicament' },
  { value: 'soins', label: 'Soin' },
] as const

// ── Medication-specific constants ────────────────────────────────────────

export const FORME_GALENIQUE_OPTIONS = [
  'Comprimé', 'Gélule', 'Sirop', 'Ampoule injectable',
  'Pommade', 'Collyre', 'Suppositoire', 'Autre',
] as const

export const MOMENT_PRISE_OPTIONS = [
  'Pendant le repas', 'À jeun', 'Avant le coucher',
  'Au réveil', 'Après le repas', 'Sans précaution',
] as const

export const CONSIGNES_PRISE_OPTIONS = [
  'Pendant le repas',
  'À jeun',
  'Avant le coucher',
  'Au réveil',
  'Après le repas',
  'Sans précaution',
  'Avec un verre d\'eau',
  'Ne pas croquer',
  'À prendre à heure fixe',
] as const

// ── Care (soins) specific constants ──────────────────────────────────────

export const CATEGORIE_SOIN_OPTIONS = [
  'Paramédical', 'Imagerie', 'Biologie', 'Soins infirmiers', 'Autre',
] as const

export const PROFESSIONNEL_OPTIONS = [
  'Kinésithérapeute', 'Infirmier', 'Radiologue', 'Médecin', 'Autre',
] as const
