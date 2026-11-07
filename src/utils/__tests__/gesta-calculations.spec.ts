import { describe, it, expect } from 'vitest'
import {
  imcPregestationnel,
  imcActuel,
  prisePoids,
  dpaDepuisDdr,
  termeTotalJours,
} from '../gesta-calculations'

describe('imcPregestationnel', () => {
  it('computes IMC from poids prégestationnel and taille (cm)', () => {
    expect(imcPregestationnel(70, 175)).toBe(22.9)
    expect(imcPregestationnel(80, 170)).toBe(27.7)
    expect(imcPregestationnel(60, 165)).toBe(22.0)
  })

  it('returns null when poids or taille is null', () => {
    expect(imcPregestationnel(null, 175)).toBeNull()
    expect(imcPregestationnel(70, null)).toBeNull()
    expect(imcPregestationnel(null, null)).toBeNull()
  })

  it('returns null when taille <= 0', () => {
    expect(imcPregestationnel(70, 0)).toBeNull()
    expect(imcPregestationnel(70, -10)).toBeNull()
  })
})

describe('imcActuel', () => {
  it('computes IMC from poids actuel and taille (cm)', () => {
    expect(imcActuel(75, 175)).toBe(24.5)
    expect(imcActuel(85, 170)).toBe(29.4)
  })

  it('returns null when poids or taille is null', () => {
    expect(imcActuel(null, 175)).toBeNull()
    expect(imcActuel(75, null)).toBeNull()
  })

  it('returns null when taille <= 0', () => {
    expect(imcActuel(75, 0)).toBeNull()
    expect(imcActuel(75, -5)).toBeNull()
  })
})

describe('prisePoids', () => {
  it('returns poids actuel minus poids prégestationnel', () => {
    expect(prisePoids(75, 70)).toBe(5)
    expect(prisePoids(68, 70)).toBe(-2)
    expect(prisePoids(62.5, 60)).toBe(2.5)
  })

  it('returns null when either weight is null', () => {
    expect(prisePoids(null, 70)).toBeNull()
    expect(prisePoids(75, null)).toBeNull()
    expect(prisePoids(null, null)).toBeNull()
  })
})

describe('dpaDepuisDdr', () => {
  it('adds 280 days to DDR (YYYY-MM-DD)', () => {
    // 2026-01-01 + 280 days = 2026-10-08
    expect(dpaDepuisDdr('2026-01-01')).toBe('2026-10-08')
    // 2025-06-15 + 280 days = 2026-03-22
    expect(dpaDepuisDdr('2025-06-15')).toBe('2026-03-22')
  })

  it('returns empty string when DDR is empty or invalid', () => {
    expect(dpaDepuisDdr('')).toBe('')
    expect(dpaDepuisDdr('2026-13-01')).toBe('')
    expect(dpaDepuisDdr('2026-02-30')).toBe('')
    expect(dpaDepuisDdr('not-a-date')).toBe('')
    expect(dpaDepuisDdr('01/01/2026')).toBe('')
  })
})

describe('termeTotalJours', () => {
  it('computes semaines * 7 + jours', () => {
    expect(termeTotalJours(24, 3)).toBe(171)
    expect(termeTotalJours(37, 0)).toBe(259)
    expect(termeTotalJours(12, 6)).toBe(90)
  })

  it('defaults jours to 0 when null', () => {
    expect(termeTotalJours(10, null)).toBe(70)
  })

  it('returns null when termeSa is null', () => {
    expect(termeTotalJours(null, 3)).toBeNull()
    expect(termeTotalJours(null, null)).toBeNull()
  })
})
