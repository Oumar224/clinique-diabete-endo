import { describe, it, expect } from 'vitest'
import { formatDate, formatDateLongue, formatDateTime, formatPeriode, localMidnightOf } from '../date'

describe('formatDate (DD/MM/YYYY)', () => {
  it('formats a bare YYYY-MM-DD as local midnight day (not UTC-shifted)', () => {
    expect(formatDate('2026-01-15')).toBe('15/01/2026')
    expect(formatDate('2026-12-31')).toBe('31/12/2026')
  })

  it('formats a bare YYYY-MM as the 1st of that month (M1 timezone regression)', () => {
    // Before M1, '2026-01' went through `new Date('2026-01')` (UTC midnight),
    // which displays the LAST day of the previous month in negative-offset
    // timezones (31/12/2025). Appending '-01T00:00:00' pins a local midnight.
    expect(formatDate('2026-01')).toBe('01/01/2026')
    expect(formatDate('2026-12')).toBe('01/12/2026')
  })

  it('keeps T-timestamps and space-separated datetimes untouched', () => {
    expect(formatDate('2026-01-15T08:30:00')).toBe('15/01/2026')
    expect(formatDate('2026-01-15 08:30:00')).toBe('15/01/2026')
  })

  it('returns — for empty, null, undefined and unparsable inputs', () => {
    expect(formatDate('')).toBe('—')
    expect(formatDate(null)).toBe('—')
    expect(formatDate(undefined)).toBe('—')
    expect(formatDate('not-a-date')).toBe('—')
  })

  it('accepts a Date instance', () => {
    expect(formatDate(new Date(2026, 0, 15))).toBe('15/01/2026')
  })
})

describe('formatPeriode (mois en mots + chiffres)', () => {
  it('formate une période YYYY-MM en mois capitalisé et garde la valeur brute', () => {
    expect(formatPeriode('2026-10')).toBe('Octobre 2026 (2026-10)')
    expect(formatPeriode('2026-01')).toBe('Janvier 2026 (2026-01)')
  })

  it('retourne — pour une période absente ou invalide', () => {
    expect(formatPeriode('')).toBe('—')
    expect(formatPeriode(undefined)).toBe('—')
    expect(formatPeriode('2026-13')).toBe('—')
    expect(formatPeriode('garbage')).toBe('—')
  })
})

describe('formatDateLongue (date en mots + chiffres)', () => {
  it('formate une date YYYY-MM-DD en jour littéral et rappelle le format numérique', () => {
    expect(formatDateLongue('2026-10-24')).toBe('24 octobre 2026 (24/10/2026)')
    // Jour sans zéro initial : le littéral reste « 5 », le numérique garde « 05 ».
    expect(formatDateLongue('2026-01-05')).toBe('5 janvier 2026 (05/01/2026)')
  })

  it('retourne — pour une date absente ou invalide', () => {
    expect(formatDateLongue('')).toBe('—')
    expect(formatDateLongue(undefined)).toBe('—')
    expect(formatDateLongue('not-a-date')).toBe('—')
  })
})

describe('formatDateTime (DD/MM/YYYY HH:mm)', () => {
  it('formats an ISO timestamp with T separator', () => {
    expect(formatDateTime('2026-01-15T08:30:00')).toBe('15/01/2026 08:30')
  })

  it('returns — for missing or invalid input', () => {
    expect(formatDateTime('')).toBe('—')
    expect(formatDateTime('not-a-date')).toBe('—')
  })
})

describe('localMidnightOf (minuit local — parité refExpo électron)', () => {
  it('parse un YYYY-MM-DD nu en minuit LOCAL : juin (2026-06-01) donne getMonth() 5', () => {
    // Cas OPPORTUNITÉ de M2 : `new Date('2026-06-01')` est parsé en UTC et peut
    // reculer au 31/05 local dans les fuseaux négatifs — le mois juin serait
    // alors lu en mai. `T00:00:00` force le minuit local et conserve juin,
    // quelle que soit la TZ d'exécution de vitest.
    const d = localMidnightOf('2026-06-01')
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(5) // juin
    expect(d.getDate()).toBe(1)
    // Sémantique « minuit local » = même mois/jour que le parse explicite :
    expect(d.getMonth()).toBe(new Date('2026-06-01T00:00:00').getMonth())
    expect(d.getDate()).toBe(new Date('2026-06-01T00:00:00').getDate())
  })

  it('laisse passer les timestamps avec T ou Z intacts (pas de re-ajout T00:00:00)', () => {
    expect(localMidnightOf('2026-06-01T12:30:00').getHours()).toBe(12)
    expect(isNaN(localMidnightOf('2026-06-01T12:30:00Z').getTime())).toBe(false)
  })

  // NOTE : aucun changement de `process.env.TZ` à l'exécution sous vitest —
  // Node lit la TZ au démarrage et `tzset` n'est pas appelé lorsque la variable
  // change en cours de processus (effet non fiable selon les plateformes).
  // La sémantique « minuit local » de la fonction est donc épinglée par
  // l'égalité de mois/jour avec `'...T00:00:00'` ci-dessus (vraie dans TOUTE
  // TZ), et le cas à -01h (mois qui recule) est couvert par le commentaire.
})