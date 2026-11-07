/**
 * Utilitaires de fenêtre glissante « 7 jours » partagés par les grilles
 * matricielles des onglets de soins (Plan de distribution, Constantes
 * vitales). Reproduit la convention de `ResultatsBioView` :
 *
 * - la fenêtre se termine sur `windowEnd` (aujourd'hui par défaut) ;
 * - l'index 0 est le jour le plus récent (donc aujourd'hui en premier) ;
 * - la chronologie est strictement décroissante de gauche à droite ;
 * - `isToday` est calculé sur la date réelle, pas sur la position dans la
 *   fenêtre : seul le vrai jour courant est surligné.
 */

/** Nombre de jours affichés par la fenêtre glissante (identique à Bio). */
export const ROLLING_WINDOW_DAYS = 7

/** Indexé par `Date.getDay()` : 0 = dimanche. */
const WEEKDAY_NAMES = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'] as const

export interface RollingDay {
  /** Clé locale `YYYY-MM-DD`. */
  dateKey: string
  /** Date locale à minuit. */
  fullDate: Date
  /** Libellé court du jour de la semaine (`Sam`). */
  weekday: string
  /** Libellé court `dd/MM`. */
  dateLabel: string
  /** Vrai si ce jour est le jour courant réel. */
  isToday: boolean
}

/** Copie de `d` ramenée à minuit en heure locale. */
export function startOfLocalDay(d: Date): Date {
  const date = new Date(d)
  date.setHours(0, 0, 0, 0)
  return date
}

/** `d` décalé de `days` jours, à minuit en heure locale. */
export function addLocalDays(d: Date, days: number): Date {
  const date = new Date(d)
  date.setDate(date.getDate() + days)
  date.setHours(0, 0, 0, 0)
  return date
}

/** Clé locale `YYYY-MM-DD` (jamais UTC, pour ne pas décaler les colonnes). */
export function toLocalDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Libellé `dd/MM`. */
export function formatShortDate(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** Libellé court du jour de la semaine, capitalisé (`Sam`). */
export function formatWeekday(d: Date): string {
  return WEEKDAY_NAMES[d.getDay()]
}

/**
 * Construit les colonnes d'une fenêtre glissante de `length` jours se
 * terminant sur `windowEnd`, du plus récent (index 0) au plus ancien.
 *
 * @param windowEnd - Dernier jour (le plus récent) de la fenêtre.
 * @param length - Nombre de jours affichés. Défaut `ROLLING_WINDOW_DAYS`.
 * @param today - Jour courant réel, injectable pour les tests.
 * @returns Les jours triés du plus récent au plus ancien.
 */
export function buildRollingDays(
  windowEnd: Date,
  length: number = ROLLING_WINDOW_DAYS,
  today: Date = new Date(),
): RollingDay[] {
  const todayKey = toLocalDateKey(startOfLocalDay(today))
  return Array.from({ length }, (_, i) => {
    const fullDate = addLocalDays(windowEnd, -i)
    const dateKey = toLocalDateKey(fullDate)
    return {
      dateKey,
      fullDate,
      weekday: formatWeekday(fullDate),
      dateLabel: formatShortDate(fullDate),
      isToday: dateKey === todayKey,
    }
  })
}
