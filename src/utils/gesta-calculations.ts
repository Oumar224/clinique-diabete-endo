import { calcIMC } from './medical-calculations'

/**
 * IMC prégestationnel (poids en kg, taille en cm).
 * Null si poids/taille null ou taille <= 0.
 */
export function imcPregestationnel(poidsPregestationnel: number | null, taille: number | null): number | null {
  return calcIMC(poidsPregestationnel, taille)
}

/**
 * IMC actuel (poids en kg, taille en cm).
 * Null si poids/taille null ou taille <= 0.
 */
export function imcActuel(poids: number | null, taille: number | null): number | null {
  return calcIMC(poids, taille)
}

/**
 * Prise de poids (kg) = poids actuel − poids prégestationnel.
 * Null si l'un des deux est null.
 */
export function prisePoids(poidsActuel: number | null, poidsPregestationnel: number | null): number | null {
  if (poidsActuel == null || poidsPregestationnel == null) return null
  return Math.round((poidsActuel - poidsPregestationnel) * 10) / 10
}

/**
 * DPA estimée = DDR + 280 jours, au format YYYY-MM-DD.
 * Retourne '' si la DDR est vide ou invalide.
 */
export function dpaDepuisDdr(ddr: string): string {
  if (!ddr) return ''
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ddr)
  if (!m) return ''
  const year = Number(m[1])
  const month = Number(m[2])
  const day = Number(m[3])
  const date = new Date(Date.UTC(year, month - 1, day))
  if (Number.isNaN(date.getTime())) return ''
  // Rejet des dates inexistantes qui débordent (ex. 2026-02-30).
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return ''
  }
  date.setUTCDate(date.getUTCDate() + 280)
  return date.toISOString().slice(0, 10)
}

/**
 * Terme total en jours = semaines * 7 + jours (jours = 0 par défaut).
 * Null si termeSa est null.
 */
export function termeTotalJours(termeSa: number | null, termeJours: number | null): number | null {
  if (termeSa == null) return null
  return termeSa * 7 + (termeJours ?? 0)
}
