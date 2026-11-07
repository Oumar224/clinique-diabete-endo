// SYNC : dupliqué dans electron/export-templates.ts (bioNormParamName/matchers/latestBioOf + bioDisplayRowOf). Maintenir les deux copies identiques.

/**
 * Helpers for selecting the LATEST biological result of a key metabolic
 * parameter (HbA1c, LDL-c, HDL-c, Triglycérides) from the patient's
 * `examensComplementaires.bilanBio.results` array.
 *
 * Used by `FicheDiabeteTab.vue` (read-only « Dernier Examen métabolique »
 * card); the electron bundle cannot import renderer modules, hence the
 * duplicated copy in `electron/export-templates.ts` (see the SYNC header).
 */

import type { BilanBioResult } from '@/types/crh-diabete'

/**
 * Normalises a parameter name for case/accent-insensitive matching:
 * trims, lowercases and strips diacritics (NFD + combining marks removed).
 *
 * @param s - Raw parameter name from a bio result (may be `undefined`).
 * @returns Normalised string, e.g. `'Hémoglobine Glyquée'` →
 *   `'hemoglobine glyquee'`.
 * @example
 * normParamName('  Hémoglobine Glyquée  ') // => 'hemoglobine glyquee'
 */
export function normParamName(s: string): string {
  return String(s ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

/**
 * Matches any parameter name denoting HbA1c : `hba1c` (any case) or
 * « hémoglobine glyquée » (accents optional).
 *
 * @param name - Raw parameter name from a bio result.
 * @returns `true` when the name denotes HbA1c.
 * @example
 * isHbA1c('HbA1c') // => true
 * isHbA1c('Hémoglobine glyquée (HbA1c)') // => true
 * isHbA1c('Glycémie') // => false
 */
export function isHbA1c(name: string): boolean {
  const n = normParamName(name).replace(/[\s_]+/g, '')
  return /^hba1c$/.test(n) || n.includes('hba1c') || n.includes('hemoglobineglyquee')
}

/**
 * Matches any parameter name denoting LDL-cholestérol : `ldl`, `ldl-c` or
 * « lipoprotéines de basse densité » (case/accents insensitive).
 *
 * @param name - Raw parameter name from a bio result.
 * @returns `true` when the name denotes LDL-c.
 * @example
 * isLdl('LDL') // => true
 * isLdl('LDL-c') // => true
 * isLdl('Lipoprotéines de basse densité') // => true
 * isLdl('HDL') // => false
 */
export function isLdl(name: string): boolean {
  const n = normParamName(name).replace(/[\s_-]+/g, '')
  return /^ldl$/.test(n) || /^ldlc$/.test(n) || n.includes('ldl') || /lipoproteines?.*basse.*densite/.test(normParamName(name))
}

/**
 * Matches any parameter name denoting HDL-cholestérol : `hdl`, `hdl-c` or
 * « lipoprotéines de haute densité » (the « haute densité » fragment alone
 * does not match — the « lipoprotéine(s) ... haute ... densité » regex keep
 * the family symmetric with `isLdl`). Case/accents insensitive.
 *
 * @param name - Raw parameter name from a bio result.
 * @returns `true` when the name denotes HDL-c.
 * @example
 * isHdl('HDL') // => true
 * isHdl('HDL-c') // => true
 * isHdl('Lipoprotéines de haute densité') // => true
 * isHdl('Haute densité') // => false (no lipoprotéine[s] prefix)
 * isHdl('LDL-c') // => false
 */
export function isHdl(name: string): boolean {
  const n = normParamName(name).replace(/[\s_-]+/g, '')
  if (/^hdl$/.test(n) || /^hdlc$/.test(n) || n.includes('hdl')) return true
  const base = normParamName(name)
  return /lipoproteines?.*haute.*densite/.test(base)
}

/**
 * Matches any parameter name denoting Triglycérides (any name starting with
 * `trigly`, case/accents insensitive).
 *
 * @param name - Raw parameter name from a bio result.
 * @returns `true` when the name denotes Triglycérides.
 * @example
 * isTriglycerides('Triglycérides') // => true
 * isTriglycerides('TRIGLYCÉRIDES') // => true
 * isTriglycerides('Cholestérol total') // => false
 */
export function isTriglycerides(name: string): boolean {
  return /^trigly/.test(normParamName(name))
}

/**
 * Sortable timestamp for a bio result. Date sources, in order: `requestDate`
 * (YYYY-MM-DD), then `filledAt` (YYYY-MM-DD HH:mm:ss, UTC without suffix),
 * then `createdAt` (same format). Also accepts `YYYY-MM`. Returns 0 when no
 * parsable date is available (such results sort last).
 *
 * @param r - Bio result entry.
 * @returns A numeric timestamp (epoch ms, local-time interpretation of the
 *   date parts) usable for relative ordering; 0 when undated.
 * @example
 * bioDateKey({ requestDate: '2026-01-10' }) // > bioDateKey({ filledAt: '2025-01-01 08:00:00' })
 */
export function bioDateKey(r: BilanBioResult): number {
  const raw = r?.requestDate || r?.filledAt || r?.createdAt
  if (!raw) return 0
  const s = String(raw).trim()
  if (!s) return 0
  // 'YYYY-MM-DD' or 'YYYY-MM-DD HH:mm:ss' (or 'T' separator)
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const iso = s.replace(' ', 'T')
    const d = new Date(iso.length > 10 ? iso : `${iso}T00:00:00`)
    if (!isNaN(d.getTime())) return d.getTime()
    return 0
  }
  // 'YYYY-MM' (month only)
  const ym = s.match(/^(\d{4})-(\d{2})$/)
  if (ym) return Date.UTC(Number(ym[1]), Number(ym[2]) - 1, 1)
  // Last resort: let Date.parse decide
  const fallback = new Date(s)
  return isNaN(fallback.getTime()) ? 0 : fallback.getTime()
}

/**
 * All results of a parameter (matched by `matcher` over `parameterName`),
 * sorted from the most recent to the oldest by `bioDateKey`. Results without
 * a parsable date sort last. On equal dates, the LATER entry in the input
 * array wins (mirrors the "most recent write wins" semantics used by
 * `useExamResults.buildMatrix`).
 *
 * @param results - Patient's bio results (`bilanBio.results`).
 * @param matcher - Predicate over the raw `parameterName` (`isHbA1c`,
 *   `isLdl`, `isHdl`, `isTriglycerides`, …).
 * @returns The matched results, newest first. Empty when nothing matches or
 *   every matched result lacks a `parameterName` or a non-empty `value`.
 * @example
 * latestBioSeries(rs, isHbA1c)[0] // most recent HbA1c result
 */
export function latestBioSeries(results: BilanBioResult[], matcher: (name: string) => boolean): BilanBioResult[] {
  return results
    .filter(
      (r) =>
        !!r?.parameterName &&
        r?.value != null &&
        String(r.value).trim() !== '' &&
        matcher(String(r.parameterName)),
    )
    .map((r, i) => ({ r, key: bioDateKey(r), i }))
    .sort((a, b) => b.key - a.key || b.i - a.i)
    .map((x) => x.r)
}

/**
 * The single most recent result of a parameter — i.e. the first element of
 * `latestBioSeries`. Returns `undefined` when the patient has no (usable)
 * result for that parameter.
 *
 * @param results - Patient's bio results (`bilanBio.results`).
 * @param matcher - Predicate over the raw `parameterName`.
 * @returns The latest matching result, or `undefined`.
 * @throws {TypeError} If `results` is not an array.
 * @example
 * latestBioValue(results, isHbA1c)?.value // '7.2'
 */
export function latestBioValue(results: BilanBioResult[], matcher: (name: string) => boolean): BilanBioResult | undefined {
  if (!Array.isArray(results)) throw new TypeError('bio-results: `results` must be an array')
  return latestBioSeries(results, matcher)[0]
}