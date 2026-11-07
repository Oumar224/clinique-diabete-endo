// Guinea date format: DD/MM/YYYY
export function formatDate(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return '—'
  // A bare 'YYYY-MM-DD' (or 'YYYY-MM') string is parsed by JS as UTC midnight,
  // which shifts the local getters one day back in negative-offset timezones.
  // Parse it as local midnight instead (same trick as the electron dateFmt
  // `T00:00:00`): 'YYYY-MM-DD' → 'T00:00:00', 'YYYY-MM' → '-01T00:00:00'.
  // Timestamps already carrying a 'T', a 'Z', an offset, or a space-separated
  // 'YYYY-MM-DD HH:mm:ss' form go through `new Date()` unchanged.
  const d = typeof dateStr === 'string'
    ? dateStr.length === 10
      ? new Date(`${dateStr}T00:00:00`)
      : dateStr.length === 7 && /^\d{4}-\d{2}$/.test(dateStr)
        ? new Date(`${dateStr}-01T00:00:00`)
        : new Date(dateStr)
    : dateStr
  if (isNaN(d.getTime())) return '—'
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}

/** Noms de mois français (minuscules) — capitalisés à l'affichage. */
const MOIS_FR = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
]

/**
 * Formate une période `YYYY-MM` « en mots et en chiffres » :
 * `"2026-10"` → `"Octobre 2026 (2026-10)"`.
 *
 * Découpage manuel de la chaîne (aucun `Date`, donc aucun décalage de fuseau).
 *
 * @param dateYm - Période au format `YYYY-MM`.
 * @returns Le libellé long, ou `—` si la période est absente ou invalide.
 */
export function formatPeriode(dateYm: string | null | undefined): string {
  if (!dateYm || !/^\d{4}-\d{2}$/.test(dateYm)) return '—'
  const [year, month] = dateYm.split('-')
  const monthIndex = Number(month) - 1
  if (monthIndex < 0 || monthIndex > 11) return '—'
  const nom = MOIS_FR[monthIndex]
  return `${nom.charAt(0).toUpperCase()}${nom.slice(1)} ${year} (${dateYm})`
}

/**
 * Formate une date « en mots et en chiffres » :
 * `"2026-10-24"` → `"24 octobre 2026 (24/10/2026)"`.
 *
 * Le jour numérique réutilise `formatDate` (même parse local, mêmes règles
 * d'invalidité) ; le mois est déduit de ce résultat pour rester déterministe.
 *
 * @param dateStr - Date `YYYY-MM-DD` (ou toute valeur acceptée par `formatDate`).
 * @returns Le libellé long, ou `—` si la date est absente ou invalide.
 */
export function formatDateLongue(dateStr: string | null | undefined): string {
  const numeric = formatDate(dateStr)
  if (numeric === '—') return '—'
  const [day, month, year] = numeric.split('/')
  const monthIndex = Number(month) - 1
  if (!day || !year || monthIndex < 0 || monthIndex > 11) return '—'
  return `${Number(day)} ${MOIS_FR[monthIndex]} ${year} (${numeric})`
}

/** Format an ISO timestamp or Date to "DD/MM/YYYY HH:mm" (French locale). */
export function formatDateTime(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return '—'
  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr
  if (isNaN(d.getTime())) return '—'
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${day}/${month}/${year} ${hours}:${minutes}`
}

/**
 * Parse a bare `YYYY-MM-DD` (or any timestamp already carrying a `T`/`Z`) as
 * LOCAL midnight, mirroring the electron `refExpo` normalisation
 * (`raw.includes('T') ? raw : raw + 'T00:00:00'`).
 *
 * A bare date string is otherwise parsed by `new Date()` as UTC midnight,
 * which shifts the local getters one day — and sometimes one MONTH — back in
 * negative-offset timezones (`'2026-06-01'` → May 31 local). Adding the
 * explicit `T00:00:00` keeps the month aligned with the user's local
 * calendar, exactly like `formatDate` and the CRH/CRC export block.
 */
export function localMidnightOf(dateStr: string): Date {
  const iso = dateStr.includes('T') || dateStr.includes('Z') ? dateStr : `${dateStr}T00:00:00`
  return new Date(iso)
}
