import { describe, it, expect } from 'vitest'
import {
  FACTEUR_KCAL,
  kcalLigne,
  ecartLigne,
  totauxApports,
  ecartJour,
  imcAuto,
  ratioTTTH,
} from '../apports-alimentaires'
import type { ApportLigne } from '@/types/crc-obesite'

function ligne(partial: Partial<ApportLigne>): ApportLigne {
  return {
    _key: 'k1',
    repas: 'matin',
    aliment: 'Test',
    categorie: 'glucides',
    quantite: null,
    unite: 'g',
    equivalentParGramme: null,
    kcalManuel: null,
    objectifKcal: null,
    ...partial,
  }
}

// ─── FACTEUR_KCAL ────────────────────────────────────────────────────

describe('FACTEUR_KCAL', () => {
  it('maps glucides/protides to 4, lipides to 9, autres to null', () => {
    expect(FACTEUR_KCAL.glucides).toBe(4)
    expect(FACTEUR_KCAL.protides).toBe(4)
    expect(FACTEUR_KCAL.lipides).toBe(9)
    expect(FACTEUR_KCAL.autres).toBeNull()
  })
})

// ─── kcalLigne ───────────────────────────────────────────────────────

describe('kcalLigne', () => {
  it('computes 4 kcal/g for glucides', () => {
    expect(kcalLigne(ligne({ categorie: 'glucides', quantite: 100, equivalentParGramme: 1 }))).toBe(400)
  })

  it('computes 4 kcal/g for protides', () => {
    expect(kcalLigne(ligne({ categorie: 'protides', quantite: 50, equivalentParGramme: 1 }))).toBe(200)
  })

  it('computes 9 kcal/g for lipides', () => {
    expect(kcalLigne(ligne({ categorie: 'lipides', quantite: 10, equivalentParGramme: 1 }))).toBe(90)
  })

  it('returns kcalManuel for autres regardless of quantite', () => {
    expect(kcalLigne(ligne({ categorie: 'autres', quantite: 100, equivalentParGramme: 5, kcalManuel: 123 }))).toBe(123)
    expect(kcalLigne(ligne({ categorie: 'autres', quantite: null, equivalentParGramme: null, kcalManuel: 50 }))).toBe(50)
  })

  it('returns null when quantite or equivalentParGramme is null', () => {
    expect(kcalLigne(ligne({ categorie: 'glucides', quantite: null, equivalentParGramme: 1 }))).toBeNull()
    expect(kcalLigne(ligne({ categorie: 'glucides', quantite: 100, equivalentParGramme: null }))).toBeNull()
    expect(kcalLigne(ligne({ categorie: 'autres', kcalManuel: null }))).toBeNull()
  })

  it('rounds the computed kcal to the nearest integer', () => {
    expect(kcalLigne(ligne({ categorie: 'lipides', quantite: 33, equivalentParGramme: 1 }))).toBe(297)
    // 10.5 * 1 * 4 = 42 exact; 10.4 * 1 * 9 = 93.6 -> 94
    expect(kcalLigne(ligne({ categorie: 'lipides', quantite: 10.4, equivalentParGramme: 1 }))).toBe(94)
    // 1.1 * 0.5 * 4 = 2.2 -> 2
    expect(kcalLigne(ligne({ categorie: 'glucides', quantite: 1.1, equivalentParGramme: 0.5 }))).toBe(2)
  })
})

// ─── ecartLigne ──────────────────────────────────────────────────────

describe('ecartLigne', () => {
  it('returns signed kcal - objectifKcal', () => {
    expect(ecartLigne(ligne({ categorie: 'glucides', quantite: 100, equivalentParGramme: 1, objectifKcal: 250 }))).toBe(150)
    expect(ecartLigne(ligne({ categorie: 'glucides', quantite: 50, equivalentParGramme: 1, objectifKcal: 250 }))).toBe(-50)
    expect(ecartLigne(ligne({ categorie: 'glucides', quantite: 62.5, equivalentParGramme: 1, objectifKcal: 250 }))).toBe(0)
  })

  it('returns null when kcal or objectif is null', () => {
    expect(ecartLigne(ligne({ categorie: 'glucides', quantite: null, equivalentParGramme: 1, objectifKcal: 250 }))).toBeNull()
    expect(ecartLigne(ligne({ categorie: 'glucides', quantite: 100, equivalentParGramme: 1, objectifKcal: null }))).toBeNull()
    expect(ecartLigne(ligne({ categorie: 'autres', kcalManuel: null, objectifKcal: 250 }))).toBeNull()
  })
})

// ─── totauxApports ───────────────────────────────────────────────────

describe('totauxApports', () => {
  it('sums non-null kcal and objectifs', () => {
    const lignes = [
      ligne({ _key: 'a', categorie: 'glucides', quantite: 100, equivalentParGramme: 1, objectifKcal: 300 }),
      ligne({ _key: 'b', categorie: 'lipides', quantite: 10, equivalentParGramme: 1, objectifKcal: 100 }),
      ligne({ _key: 'c', categorie: 'autres', kcalManuel: 50, objectifKcal: null }),
    ]
    expect(totauxApports(lignes)).toEqual({ kcal: 540, objectif: 400, ecart: 140 })
  })

  it('returns ecart null when no objectif is renseigné', () => {
    const lignes = [
      ligne({ _key: 'a', categorie: 'glucides', quantite: 100, equivalentParGramme: 1, objectifKcal: null }),
    ]
    expect(totauxApports(lignes)).toEqual({ kcal: 400, objectif: 0, ecart: null })
  })

  it('returns zero kcal for empty or all-null lines', () => {
    expect(totauxApports([])).toEqual({ kcal: 0, objectif: 0, ecart: null })
    expect(
      totauxApports([ligne({ categorie: 'glucides', quantite: null, equivalentParGramme: null, objectifKcal: 200 })]),
    ).toEqual({ kcal: 0, objectif: 200, ecart: -200 })
  })
})

// ─── ecartJour ───────────────────────────────────────────────────────

describe('ecartJour', () => {
  it('returns totaux kcal minus objectifJourKcal', () => {
    expect(
      ecartJour({
        lignes: [ligne({ categorie: 'glucides', quantite: 100, equivalentParGramme: 1 })],
        objectifJourKcal: 250,
      }),
    ).toBe(150)
  })

  it('returns null when objectifJourKcal is null', () => {
    expect(
      ecartJour({
        lignes: [ligne({ categorie: 'glucides', quantite: 100, equivalentParGramme: 1 })],
        objectifJourKcal: null,
      }),
    ).toBeNull()
  })
})

// ─── imcAuto ─────────────────────────────────────────────────────────

describe('imcAuto', () => {
  it('computes IMC via calcIMC', () => {
    expect(imcAuto(70, 175)).toBe(22.9)
    expect(imcAuto(80, 170)).toBe(27.7)
  })

  it('returns null for null or non-positive inputs', () => {
    expect(imcAuto(null, 175)).toBeNull()
    expect(imcAuto(70, null)).toBeNull()
    expect(imcAuto(0, 175)).toBeNull()
    expect(imcAuto(70, 0)).toBeNull()
    expect(imcAuto(-5, 175)).toBeNull()
  })
})

// ─── ratioTTTH ───────────────────────────────────────────────────────

describe('ratioTTTH', () => {
  it('computes tourTaille / tourHanche rounded to 2 decimals', () => {
    expect(ratioTTTH(90, 100)).toBe(0.9)
    expect(ratioTTTH(95, 110)).toBe(0.86)
    expect(ratioTTTH(80, 90)).toBe(0.89)
  })

  it('returns null when tourHanche is null, zero or negative', () => {
    expect(ratioTTTH(90, null)).toBeNull()
    expect(ratioTTTH(90, 0)).toBeNull()
    expect(ratioTTTH(90, -100)).toBeNull()
  })

  it('returns null when tourTaille is null or inputs are NaN', () => {
    expect(ratioTTTH(null, 100)).toBeNull()
    expect(ratioTTTH(NaN, 100)).toBeNull()
    expect(ratioTTTH(90, NaN)).toBeNull()
    expect(ratioTTTH(null, null)).toBeNull()
  })
})
