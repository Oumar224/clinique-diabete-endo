/**
 * Voies d'administration autorisées par les CHECK constraints DB.
 *
 * Sources de vérité SQL :
 * - electron/migrations/033-prescriptions.ts:14
 *   `voie TEXT NOT NULL CHECK(voie IN ('PO','SC','IV','IM','SL'))`
 * - electron/migrations/031-patient-care.ts:22 (plan_soins_items)
 *
 * Toute valeur insérée dans `prescriptions.voie` ou `plan_soins_items.voie`
 * DOIT appartenir à ALLOWED_VOIES, sinon SQLite lève :
 *   "CHECK constraint failed: voie IN ('PO','SC','IV','IM','SL')"
 */

export const ALLOWED_VOIES = ['PO', 'SC', 'IV', 'IM', 'SL'] as const

export type VoieCode = (typeof ALLOWED_VOIES)[number]

export const VOIE_VALUES_LABEL = ALLOWED_VOIES.join(', ')

/**
 * Mapping label long (seed 073 + usages frontend) -> code normalisé.
 * Clés en MAJUSCULES trimées. Le fallback générique (regex ^[A-Z]{2,4})
 * couvre les variantes type 'PO (Per Os)'.
 */
export const VOIE_LABEL_TO_CODE_MAP: Record<string, VoieCode> = {
  'PO': 'PO',
  'PO (PER OS)': 'PO',
  'PER OS': 'PO',
  'VO': 'PO', // alias historique : Voie Orale -> PO
  'SC': 'SC',
  'SC (SOUS-CUTANÉE)': 'SC',
  'SC (SOUS-CUTANEE)': 'SC',
  'SOUS-CUTANÉE': 'SC',
  'SOUS-CUTANEE': 'SC',
  'IV': 'IV',
  'IV (INTRAVEINEUSE)': 'IV',
  'INTRAVEINEUSE': 'IV',
  'IM': 'IM',
  'IM (INTRAMUSCULAIRE)': 'IM',
  'INTRAMUSCULAIRE': 'IM',
  'SL': 'SL',
  'SL (SUBLINGUALE)': 'SL',
  'SUBLINGUALE': 'SL',
}

function expectedMessage(received: unknown): string {
  return `Voie ${String(received)} invalide. Valeurs attendues: ${VOIE_VALUES_LABEL}`
}

/**
 * Normalise une voie libre (label seed, saisie user, DTO frontend)
 * vers un code DB valide.
 *
 * - trim() + toUpperCase()
 * - lookup exact dans VOIE_LABEL_TO_CODE_MAP (couvre 'PO (Per Os)', alias VO->PO)
 * - fallback : extrait ^([A-Z]{2,4}) — 'PO (Per Os)' -> 'PO', 'IV (Intraveineuse)' -> 'IV'
 * - throw métier claire si vide ou hors allowlist
 */
export function normalizeVoieOrThrow(voie: unknown): VoieCode {
  if (voie == null || typeof voie !== 'string' || voie.trim().length === 0) {
    throw new Error(expectedMessage(voie ?? ''))
  }
  const cleaned = voie.trim().toUpperCase()

  const direct = VOIE_LABEL_TO_CODE_MAP[cleaned]
  if (direct) return direct

  const m = cleaned.match(/^([A-Z]{2,4})\b/)
  if (m) {
    const code = m[1]
    // Alias VO -> PO (voie orale historique)
    if (code === 'VO') return 'PO'
    if ((ALLOWED_VOIES as readonly string[]).includes(code)) {
      return code as VoieCode
    }
  }

  throw new Error(expectedMessage(voie))
}

/** Variante non-throwante pour les filtres/recherches. Retourne null si invalide. */
export function tryNormalizeVoie(voie: unknown): VoieCode | null {
  try {
    return normalizeVoieOrThrow(voie)
  } catch {
    return null
  }
}

export function isVoieCode(v: unknown): v is VoieCode {
  return typeof v === 'string' && (ALLOWED_VOIES as readonly string[]).includes(v)
}
