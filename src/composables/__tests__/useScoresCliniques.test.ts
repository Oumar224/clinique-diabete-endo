import { describe, it, expect } from 'vitest'
import {
  calculateGlasgow,
  getGlasgowSeverity,
  calculateAutonomieLevel,
} from '../useScoresCliniques'
import type { GlasgowValues, AutonomieValues } from '../useScoresCliniques'

// ---------------------------------------------------------------------------
// calculateGlasgow
// ---------------------------------------------------------------------------
describe('calculateGlasgow', () => {
  it('returns 15 for fully responsive patient (yeux=4, verbale=5, motrice=6)', () => {
    expect(calculateGlasgow({ yeux: 4, verbale: 5, motrice: 6 })).toBe(15)
  })

  it('returns 3 for completely unresponsive patient (all minimum 1)', () => {
    expect(calculateGlasgow({ yeux: 1, verbale: 1, motrice: 1 })).toBe(3)
  })

  it('returns 9 for moderate impairment (yeux=2, verbale=3, motrice=4)', () => {
    expect(calculateGlasgow({ yeux: 2, verbale: 3, motrice: 4 })).toBe(9)
  })

  it('sums values correctly for various mid-range combinations', () => {
    const cases: { input: GlasgowValues; expected: number }[] = [
      { input: { yeux: 4, verbale: 4, motrice: 5 }, expected: 13 },
      { input: { yeux: 3, verbale: 3, motrice: 3 }, expected: 9 },
      { input: { yeux: 2, verbale: 2, motrice: 2 }, expected: 6 },
      { input: { yeux: 4, verbale: 2, motrice: 6 }, expected: 12 },
      { input: { yeux: 1, verbale: 5, motrice: 1 }, expected: 7 },
      { input: { yeux: 4, verbale: 5, motrice: 1 }, expected: 10 },
      { input: { yeux: 1, verbale: 5, motrice: 6 }, expected: 12 },
    ]
    for (const { input, expected } of cases) {
      expect(calculateGlasgow(input)).toBe(expected)
    }
  })

  it('handles zero values gracefully (sums to 0)', () => {
    expect(calculateGlasgow({ yeux: 0, verbale: 0, motrice: 0 })).toBe(0)
  })

  it('handles negative values (sums to negative)', () => {
    expect(calculateGlasgow({ yeux: -1, verbale: -2, motrice: -3 })).toBe(-6)
  })
})

// ---------------------------------------------------------------------------
// getGlasgowSeverity
// ---------------------------------------------------------------------------
describe('getGlasgowSeverity', () => {
  it('returns "léger" / success for score 15 (normal)', () => {
    const r = getGlasgowSeverity(15)
    expect(r.label).toBe('Traumatisme léger')
    expect(r.type).toBe('success')
  })

  it('returns "léger" / success at boundary score 13', () => {
    const r = getGlasgowSeverity(13)
    expect(r.label).toBe('Traumatisme léger')
    expect(r.type).toBe('success')
  })

  it('returns "modéré" / warning for score 12', () => {
    const r = getGlasgowSeverity(12)
    expect(r.label).toBe('Traumatisme modéré')
    expect(r.type).toBe('warning')
  })

  it('returns "modéré" / warning for score 11', () => {
    const r = getGlasgowSeverity(11)
    expect(r.label).toBe('Traumatisme modéré')
    expect(r.type).toBe('warning')
  })

  it('returns "modéré" / warning at boundary score 9', () => {
    const r = getGlasgowSeverity(9)
    expect(r.label).toBe('Traumatisme modéré')
    expect(r.type).toBe('warning')
  })

  it('returns "sévère" / danger for score 8 (below threshold)', () => {
    const r = getGlasgowSeverity(8)
    expect(r.label).toBe('Traumatisme sévère')
    expect(r.type).toBe('danger')
  })

  it('returns "sévère" / danger for minimum score 3', () => {
    const r = getGlasgowSeverity(3)
    expect(r.label).toBe('Traumatisme sévère')
    expect(r.type).toBe('danger')
  })

  it('returns "sévère" / danger for score 0', () => {
    const r = getGlasgowSeverity(0)
    expect(r.label).toBe('Traumatisme sévère')
    expect(r.type).toBe('danger')
  })

  it('returns "sévère" / danger for negative scores', () => {
    const r = getGlasgowSeverity(-5)
    expect(r.label).toBe('Traumatisme sévère')
    expect(r.type).toBe('danger')
  })
})

// ---------------------------------------------------------------------------
// calculateAutonomieLevel
// ---------------------------------------------------------------------------
describe('calculateAutonomieLevel', () => {
  const allA: AutonomieValues = {
    alimentation: 'A',
    hygiene: 'A',
    habillage: 'A',
    deplacement: 'A',
    continence: 'A',
  }

  it('returns "A - Autonome" when all five categories are "A"', () => {
    expect(calculateAutonomieLevel(allA)).toBe('A - Autonome')
  })

  it('returns "B - Aide partielle" when mix of A and B but no C', () => {
    expect(
      calculateAutonomieLevel({
        alimentation: 'B',
        hygiene: 'A',
        habillage: 'B',
        deplacement: 'A',
        continence: 'B',
      }),
    ).toBe('B - Aide partielle')
  })

  it('returns "B - Aide partielle" when only a single "B" among all "A"', () => {
    expect(
      calculateAutonomieLevel({
        ...allA,
        habillage: 'B',
      }),
    ).toBe('B - Aide partielle')
  })

  it('returns "C - Dépendant" when all five categories are "C"', () => {
    expect(
      calculateAutonomieLevel({
        alimentation: 'C',
        hygiene: 'C',
        habillage: 'C',
        deplacement: 'C',
        continence: 'C',
      }),
    ).toBe('C - Dépendant')
  })

  it('returns "C - Dépendant" when a single category is "C" (rest "A")', () => {
    expect(
      calculateAutonomieLevel({
        ...allA,
        alimentation: 'C',
      }),
    ).toBe('C - Dépendant')
  })

  it('returns "C - Dépendant" when "C" appears alongside "B" values', () => {
    expect(
      calculateAutonomieLevel({
        alimentation: 'C',
        hygiene: 'B',
        habillage: 'A',
        deplacement: 'B',
        continence: 'A',
      }),
    ).toBe('C - Dépendant')
  })

  it('returns "C - Dépendant" when "C" appears in multiple categories', () => {
    expect(
      calculateAutonomieLevel({
        alimentation: 'C',
        hygiene: 'B',
        habillage: 'C',
        deplacement: 'B',
        continence: 'A',
      }),
    ).toBe('C - Dépendant')
  })

  it('prioritises "C" over "B" (C wins even when B is present)', () => {
    // "C - Dépendant" is the highest dependency level
    const values: AutonomieValues = {
      alimentation: 'A',
      hygiene: 'B',
      habillage: 'A',
      deplacement: 'A',
      continence: 'C',
    }
    expect(calculateAutonomieLevel(values)).toBe('C - Dépendant')
  })
})
