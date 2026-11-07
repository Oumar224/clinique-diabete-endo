import type { VoieAdministration } from '@/types/soins'

/**
 * Allowlist exacte du CHECK SQLite backend
 * (`voie IN ('PO','SC','IV','IM','SL')`).
 * Toute valeur envoyée à `prescription:create/update` doit en faire partie
 * après normalisation via {@link normalizeVoie}.
 */
export const ALLOWED_VOIES: readonly VoieAdministration[] = ['PO', 'SC', 'IV', 'IM', 'SL'] as const

/**
 * Options d'affichage pour les `el-select` de voie.
 * `code` est la valeur envoyée au backend, `label` le texte affiché.
 */
export const VOIE_OPTIONS: readonly { code: VoieAdministration; label: string }[] = [
  { code: 'PO', label: 'PO — Per Os (orale)' },
  { code: 'SC', label: 'SC — Sous-cutanée' },
  { code: 'IV', label: 'IV — Intraveineuse' },
  { code: 'IM', label: 'IM — Intramusculaire' },
  { code: 'SL', label: 'SL — Sublinguale' },
] as const

/** Message d'erreur lisible affiché quand la voie est rejetée côté client. */
export const VOIE_ERROR_MESSAGE =
  "Voie d'administration invalide — valeurs autorisées : PO, SC, IV, IM, SL."

/** Vrai si `value` fait partie de l'allowlist backend. */
export function isVoieAllowed(value: unknown): value is VoieAdministration {
  return (
    typeof value === 'string' &&
    (ALLOWED_VOIES as readonly string[]).includes(value.trim().toUpperCase())
  )
}

/**
 * Normalise une saisie libre vers un code backend valide.
 *
 * - trim + uppercase
 * - extraction du code si label long (`'PO (Per Os)'`, `'IV - Intraveineuse'`)
 * - alias legacy `VO` → `PO` (faute historique côté ordonnance de sortie)
 * - alias `PER OS` / `ORALE` → `PO`
 *
 * @param raw - Valeur brute du formulaire (référentiel `voie-types`, saisie libre…).
 * @returns Le code `VoieAdministration` normalisé, ou `null` si non autorisé
 *   (`IP`, `Rectale`, `Cutanée`, … sont volontairement rejetés : hors CHECK).
 */
export function normalizeVoie(raw: unknown): VoieAdministration | null {
  if (typeof raw !== 'string') return null
  const upper = raw.trim().toUpperCase()
  if (!upper) return null
  if ((ALLOWED_VOIES as readonly string[]).includes(upper)) {
    return upper as VoieAdministration
  }
  // Alias legacy : VO (faute pour PO) → PO.
  if (upper === 'VO') return 'PO'
  // Recherche d'un code connu dans un label long : 'PO (PER OS)', 'IV - …', …
  const codeMatch = upper.match(/\b(PO|SC|IV|IM|SL|VO)\b/)
  if (codeMatch) {
    const code = codeMatch[1]
    return code === 'VO' ? 'PO' : (code as VoieAdministration)
  }
  // Libellés sans code : 'PER OS', 'ORALE' → PO.
  if (upper.includes('PER OS') || upper === 'ORALE' || upper.includes('PEROS')) return 'PO'
  return null
}
