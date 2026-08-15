import { describe, it, expect } from 'vitest'
import { changedLeafPaths, formatUpdatedAt } from '../field-meta'

// ─── changedLeafPaths ─────────────────────────────────────────────

describe('changedLeafPaths', () => {
  it('returns the dotted path of a changed scalar', () => {
    expect(changedLeafPaths({ a: 1 }, { a: 2 })).toEqual(['a'])
  })

  it('recurses into plain objects and returns the leaf path', () => {
    expect(
      changedLeafPaths(
        { a: { b: 1, c: 1 } },
        { a: { b: 2, c: 1 } },
      ),
    ).toEqual(['a.b'])
  })

  it('reports a dynamic array as a single path (its parent key)', () => {
    expect(
      changedLeafPaths(
        { allergies: [{ libelle: 'Pénicilline' }] },
        { allergies: [{ libelle: 'Arachide' }] },
      ),
    ).toEqual(['allergies'])
  })

  it('reports an array change nested inside an object with the full dotted path', () => {
    expect(
      changedLeafPaths(
        { modeVieAtcd: { allergies: [] } },
        { modeVieAtcd: { allergies: [{ libelle: 'Pénicilline' }] } },
      ),
    ).toEqual(['modeVieAtcd.allergies'])
  })

  it('returns an empty list when nothing changed', () => {
    expect(changedLeafPaths({ a: 1, b: { c: 'x' } }, { a: 1, b: { c: 'x' } })).toEqual([])
  })

  it('reports newly added and removed keys', () => {
    expect(changedLeafPaths({}, { a: 1 })).toEqual(['a'])
    expect(changedLeafPaths({ a: 1 }, {})).toEqual(['a'])
  })

  it('only reports the paths that actually changed', () => {
    expect(
      changedLeafPaths(
        { a: 1, b: { c: 1, d: 1 } },
        { a: 1, b: { c: 2, d: 1 } },
      ),
    ).toEqual(['b.c'])
  })

  it('honors a base path prefix', () => {
    expect(changedLeafPaths({ a: 1 }, { a: 2 }, 'admission')).toEqual(['admission.a'])
  })
})

// ─── formatUpdatedAt ───────────────────────────────────────────────

describe('formatUpdatedAt', () => {
  it('formats a valid ISO timestamp as "DD/MM/YYYY HH:mm"', () => {
    const out = formatUpdatedAt('2026-06-15T10:30:00.000Z')
    expect(out).toMatch(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/)
  })

  it('returns the raw input when the date cannot be parsed', () => {
    expect(formatUpdatedAt('pas-une-date')).toBe('pas-une-date')
    expect(formatUpdatedAt('')).toBe('')
  })
})
