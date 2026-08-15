/**
 * Shared clinical calculations.
 *
 * IMC must stay consistent between the form, the parameter-history popup and
 * the PDF export. NOTE: electron/export-templates.ts cannot import this module
 * (separate bundle) — it keeps a private copy of calcIMC; keep both in sync.
 */

/**
 * Body Mass Index from weight (kg) and height (cm), rounded to 1 decimal.
 * Returns null when either input is missing or not strictly positive.
 */
export function calcIMC(poids: number | null, taille: number | null): number | null {
  if (poids == null || taille == null) return null
  if (poids <= 0 || taille <= 0) return null
  const tailleM = taille / 100
  return Math.round((poids / (tailleM * tailleM)) * 10) / 10
}
