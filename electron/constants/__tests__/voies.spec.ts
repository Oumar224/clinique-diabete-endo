import { describe, it, expect } from 'vitest'
import { normalizeVoieOrThrow, tryNormalizeVoie, isVoieCode, ALLOWED_VOIES } from '../voies'

/**
 * Option B — garde-fou CHECK `voie IN ('PO','SC','IV','IM','SL')`.
 * Ces tests verrouillent la normalisation backend sans toucher SQLite.
 */
describe('normalizeVoieOrThrow (backend)', () => {
  it('normalise les labels longs et la casse vers le code CHECK', () => {
    expect(normalizeVoieOrThrow('PO (Per Os)')).toBe('PO')
    expect(normalizeVoieOrThrow('po')).toBe('PO')
    expect(normalizeVoieOrThrow('  sc  ')).toBe('SC')
    expect(normalizeVoieOrThrow('SL (Sublinguale)')).toBe('SL')
  })

  it("mappe l'alias historique VO -> PO", () => {
    expect(normalizeVoieOrThrow('VO')).toBe('PO')
  })

  it('extrait le code en tête de variante libre ("IV lente" -> IV)', () => {
    expect(normalizeVoieOrThrow('IV lente')).toBe('IV')
  })

  it('throw sur valeur hors nomenclature (Inhalation)', () => {
    expect(() => normalizeVoieOrThrow('Inhalation')).toThrow(/Voie .* invalide/)
  })

  it('throw sur chaîne vide / blanche / non-string', () => {
    expect(() => normalizeVoieOrThrow('')).toThrow(/invalide/)
    expect(() => normalizeVoieOrThrow('   ')).toThrow(/invalide/)
    expect(() => normalizeVoieOrThrow(null)).toThrow(/invalide/)
    expect(() => normalizeVoieOrThrow(undefined)).toThrow(/invalide/)
  })

  it('tryNormalizeVoie retourne null au lieu de thrower', () => {
    expect(tryNormalizeVoie('Inhalation')).toBeNull()
    expect(tryNormalizeVoie('')).toBeNull()
    expect(tryNormalizeVoie('PO (Per Os)')).toBe('PO')
  })

  it('isVoieCode ne valide que les codes stricts', () => {
    expect(isVoieCode('PO')).toBe(true)
    expect(isVoieCode('VO')).toBe(false)
    expect(isVoieCode('PO (Per Os)')).toBe(false)
    expect(isVoieCode('')).toBe(false)
  })

  it('allowlist exacte du CHECK SQLite', () => {
    expect([...ALLOWED_VOIES].sort()).toEqual(['IM', 'IV', 'PO', 'SC', 'SL'])
  })
})
