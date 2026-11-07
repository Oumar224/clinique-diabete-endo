import { describe, it, expect } from 'vitest'
import { normalizeVoie, isVoieAllowed, ALLOWED_VOIES } from '../voies'

/**
 * Option B — garde-fou frontend du CHECK `voie IN ('PO','SC','IV','IM','SL')`.
 * `normalizeVoie` est non-throwante (null si rejeté) : le formulaire bloque
 * l'envoi avant IPC au lieu de laisser SQLite lever le CHECK.
 */
describe('normalizeVoie (frontend)', () => {
  it('normalise les labels longs et la casse vers le code CHECK', () => {
    expect(normalizeVoie('PO (Per Os)')).toBe('PO')
    expect(normalizeVoie('po')).toBe('PO')
    expect(normalizeVoie('SC (Sous-cutanee)')).toBe('SC')
  })

  it("mappe l'alias historique VO -> PO", () => {
    expect(normalizeVoie('VO')).toBe('PO')
  })

  it('extrait le code en tête de variante libre ("IV lente" -> IV)', () => {
    expect(normalizeVoie('IV lente')).toBe('IV')
  })

  it('rejette les voies hors nomenclature (Inhalation -> null)', () => {
    expect(normalizeVoie('Inhalation')).toBeNull()
  })

  it('rejette vide / blanche / non-string (null)', () => {
    expect(normalizeVoie('')).toBeNull()
    expect(normalizeVoie('   ')).toBeNull()
    expect(normalizeVoie(null)).toBeNull()
    expect(normalizeVoie(undefined)).toBeNull()
    expect(normalizeVoie(123)).toBeNull()
  })

  it('isVoieAllowed ne valide que les codes stricts (insensible à la casse/espaces)', () => {
    expect(isVoieAllowed('PO')).toBe(true)
    expect(isVoieAllowed(' po ')).toBe(true)
    expect(isVoieAllowed('VO')).toBe(false)
    expect(isVoieAllowed('PO (Per Os)')).toBe(false)
    expect(isVoieAllowed('Inhalation')).toBe(false)
  })

  it('allowlist exacte du CHECK SQLite', () => {
    expect([...ALLOWED_VOIES].sort()).toEqual(['IM', 'IV', 'PO', 'SC', 'SL'])
  })
})
