/**
 * Field-level change tracking helpers for the CRH forms.
 *
 * `changedLeafPaths` diffs two snapshots of the form data and returns the
 * dotted paths of every leaf that changed. Array values are compared by
 * JSON serialization and reported as a single path (their parent key), so a
 * dynamic list (allergies, antecedents, journal, ...) shares one timestamp.
 */

/**
 * Returns the dotted paths of all leaf values that differ between `prev` and
 * `curr`. Plain objects are recursed into; arrays and scalars are compared
 * with `JSON.stringify`.
 *
 * @param prev - Previous snapshot (plain object without the `meta` key).
 * @param curr - Current snapshot (plain object without the `meta` key).
 * @param base - Dotted path prefix used internally during recursion.
 * @returns Array of dotted paths, e.g. `['admission.dateEntree', 'modeVieAtcd.allergies']`.
 */
export function changedLeafPaths(
  prev: Record<string, unknown>,
  curr: Record<string, unknown>,
  base = '',
): string[] {
  const paths: string[] = []
  const keys = new Set([...Object.keys(prev ?? {}), ...Object.keys(curr ?? {})])
  for (const key of keys) {
    const path = base ? `${base}.${key}` : key
    const pv = prev?.[key]
    const cv = curr?.[key]
    const bothPlainObjects =
      pv != null && cv != null &&
      typeof pv === 'object' && typeof cv === 'object' &&
      !Array.isArray(pv) && !Array.isArray(cv)
    if (bothPlainObjects) {
      paths.push(...changedLeafPaths(pv as Record<string, unknown>, cv as Record<string, unknown>, path))
    } else if (JSON.stringify(pv) !== JSON.stringify(cv)) {
      paths.push(path)
    }
  }
  return paths
}

/**
 * Formats an ISO timestamp as a French locale "DD/MM/YYYY HH:mm" string.
 * Falls back to the raw input when the date cannot be parsed.
 *
 * @param iso - ISO 8601 timestamp, e.g. `2026-08-08T14:30:00.000Z`.
 * @returns Formatted date, e.g. `08/08/2026 14:30` (or `iso` if unparseable).
 */
export function formatUpdatedAt(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}
