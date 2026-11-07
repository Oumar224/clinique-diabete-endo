import { describe, expect, it } from 'vitest'
import { formatMontant, formatQuantite } from '../format'

/** Normalise les espaces fines insécables de `toLocaleString('fr-FR')`. */
function plain(value: string): string {
  return value.replace(/\s/g, ' ')
}

describe('format comptabilité', () => {
  it('formate les montants sans unité et arrondit les décimales', () => {
    expect(plain(formatMontant(12500))).toBe('12 500')
    expect(plain(formatMontant(12500.6))).toBe('12 501')
    expect(formatMontant(null)).toBe('—')
    expect(formatMontant(Number.NaN)).toBe('—')
  })

  it('formate les quantités sans unité monétaire', () => {
    expect(formatQuantite(0)).toBe('0')
    expect(plain(formatQuantite(1250))).toBe('1 250')
    expect(formatQuantite(undefined)).toBe('—')
    expect(formatQuantite(Number.POSITIVE_INFINITY)).toBe('—')
  })

  it('ne confond pas les deux formats', () => {
    expect(formatQuantite(12500)).not.toContain('GNF')
    expect(formatMontant(12500)).not.toContain('GNF')
  })
})
