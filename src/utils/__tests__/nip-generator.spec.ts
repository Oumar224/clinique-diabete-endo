import { describe, it, expect } from 'vitest'
import { generateNip } from '../nip-generator'

describe('generateNip', () => {
  const FULL_SHAPE = /^[12]\d{2}[A-Z0-9]{2}[A-Z]{5}$/

  it('returns an empty string when the lieu de naissance is empty', () => {
    expect(generateNip('M', '1990-05-15', '')).toBe('')
  })

  it('keeps the {genre}{year}{2-char}{5 letters} shape with a stable length', () => {
    const nip = generateNip('M', '1990-05-15', 'Conakry')
    expect(nip).toHaveLength(10)
    expect(nip).toMatch(FULL_SHAPE)
  })

  it('maps the genre to 1 (M) or 2 (Mme/Mlle)', () => {
    expect(generateNip('M', '1990-01-01', 'Conakry')[0]).toBe('1')
    expect(generateNip('Mme', '1990-01-01', 'Conakry')[0]).toBe('2')
    expect(generateNip('Mlle', '1990-01-01', 'Conakry')[0]).toBe('2')
  })

  describe('lieu de naissance sanitization', () => {
    // NIP layout: {genre(1)}{year(2)}{code(2)}{random(5)} → code at indices 3-4
    function lieuCode(genre: 'M' | 'Mme' | 'Mlle', date: string, lieu: string): string {
      return generateNip(genre, date, lieu).substring(3, 5)
    }

    it('strips diacritics from the lieu code (Écouché → EC)', () => {
      expect(lieuCode('M', '1990-05-15', 'Écouché')).toBe('EC')
    })

    it("strips apostrophes and diacritics (N'Zérékoré → NZ)", () => {
      expect(lieuCode('M', '1990-05-15', "N'Zérékoré")).toBe('NZ')
    })

    it('removes spaces and hyphens (Saint-Jean → SA)', () => {
      expect(lieuCode('M', '1990-05-15', 'Saint-Jean')).toBe('SA')
    })

    it('uppercases lowercase input (conakry → CO)', () => {
      expect(lieuCode('M', '1990-05-15', 'conakry')).toBe('CO')
    })

    it('pads a single remaining character with X (É → EX)', () => {
      expect(lieuCode('M', '1990-05-15', 'É')).toBe('EX')
    })

    it('pads a fully stripped lieu with XX while keeping the shape', () => {
      const nip = generateNip('M', '1990-05-15', "'- --")
      expect(nip.substring(3, 5)).toBe('XX')
      expect(nip).toHaveLength(10)
      expect(nip).toMatch(FULL_SHAPE)
    })

    it('never emits non-ASCII characters', () => {
      for (const lieu of ['Écouché', "N'Zérékoré", 'Île-de-France', 'Saint-Jean', 'Boké', 'ñandú']) {
        const nip = generateNip('Mme', '1985-03-20', lieu)
        expect(nip).toMatch(FULL_SHAPE)
        expect(nip).not.toMatch(/[^ -~]/)
      }
    })
  })
})