import { describe, it, expect } from 'vitest'
import { createDefaultFormData } from '@/types/crc-obesite'

describe('crc-obesite createDefaultFormData', () => {
  it('returns distinct references on two calls (deep)', () => {
    const a = createDefaultFormData()
    const b = createDefaultFormData()
    expect(a).toEqual(b)
    expect(a).not.toBe(b)
    expect(a.admission).not.toBe(b.admission)
    expect(a.informationsComplementaires).not.toBe(b.informationsComplementaires)
    expect(a.motifProfil).not.toBe(b.motifProfil)
    expect(a.motifProfil.tentatives).not.toBe(b.motifProfil.tentatives)
    expect(a.modeVieAtcd).not.toBe(b.modeVieAtcd)
    expect(a.bilanInitial).not.toBe(b.bilanInitial)
    expect(a.bilanInitial.examenPhysique).not.toBe(b.bilanInitial.examenPhysique)
    expect(a.bilanInitial.vitalSignsHistory).not.toBe(b.bilanInitial.vitalSignsHistory)
    expect(a.comportementAlimentaire).not.toBe(b.comportementAlimentaire)
    expect(a.comportementAlimentaire.apports).not.toBe(b.comportementAlimentaire.apports)
    expect(a.comportementAlimentaire.apports.lignes).not.toBe(b.comportementAlimentaire.apports.lignes)
    expect(a.psySocial).not.toBe(b.psySocial)
    expect(a.objectifsPonderaux).not.toBe(b.objectifsPonderaux)
    expect(a.conclusion).not.toBe(b.conclusion)
    expect(a.projetTherapeutique).not.toBe(b.projetTherapeutique)
    expect(a.projetTherapeutique.niveaux).not.toBe(b.projetTherapeutique.niveaux)
    expect(a.projetTherapeutique.niveaux['1']).not.toBe(b.projetTherapeutique.niveaux['1'])
    expect(a.suivi).not.toBe(b.suivi)
    expect(a.suivi.parametres).not.toBe(b.suivi.parametres)
    expect(a.suivi.apports).not.toBe(b.suivi.apports)
    expect(a.evolutionPonderale).not.toBe(b.evolutionPonderale)
    expect(a.examensComplementaires).not.toBe(b.examensComplementaires)
    expect(a.ordonnanceSortie).not.toBe(b.ordonnanceSortie)
  })

  it('mutating one result does not affect the other', () => {
    const a = createDefaultFormData()
    const b = createDefaultFormData()
    a.motifProfil.tentatives.push({ _key: 'x', methode: 'm', resultatKg: null })
    a.projetTherapeutique.niveaux['1'].etapes.push('bilan')
    expect(b.motifProfil.tentatives).toEqual([])
    expect(b.projetTherapeutique.niveaux['1'].etapes).toEqual([])
  })

  it('includes all root keys', () => {
    const data = createDefaultFormData()
    expect(Object.keys(data).sort()).toEqual(
      [
        'admission',
        'informationsComplementaires',
        'motifProfil',
        'modeVieAtcd',
        'bilanInitial',
        'comportementAlimentaire',
        'psySocial',
        'objectifsPonderaux',
        'conclusion',
        'projetTherapeutique',
        'suivi',
        'evolutionPonderale',
        'examensComplementaires',
        'ordonnanceSortie',
      ].sort(),
    )
  })

  it('initializes empty arrays and nulls per conventions', () => {
    const data = createDefaultFormData()
    expect(data.admission.dateEntree).toBe('')
    expect(data.informationsComplementaires.mecanismeContact).toEqual([])
    expect(data.motifProfil.tentatives).toEqual([])
    expect(data.motifProfil.prisePoidsMois).toBeNull()
    expect(data.modeVieAtcd.allergies).toEqual([])
    expect(data.modeVieAtcd.antecedents).toEqual([])
    expect(data.modeVieAtcd.alcool).toBe(false)
    expect(data.bilanInitial.examenPhysique.poids).toBeNull()
    expect(data.bilanInitial.vitalSignsHistory).toEqual([])
    expect(data.comportementAlimentaire.apports.lignes).toEqual([])
    expect(data.comportementAlimentaire.apports.objectifJourKcal).toBeNull()
    expect(data.psySocial.consultations).toEqual([])
    expect(data.projetTherapeutique.niveau).toBeNull()
    expect(data.projetTherapeutique.niveaux['1']).toEqual({ etapes: [], commentaire: '' })
    expect(data.projetTherapeutique.niveaux['2']).toEqual({ etapes: [], commentaire: '' })
    expect(data.projetTherapeutique.niveaux['3']).toEqual({ etapes: [], commentaire: '' })
    expect(data.suivi.rappelEducatif).toEqual([])
    expect(data.evolutionPonderale.lignes).toEqual([])
    expect(data.examensComplementaires.imagerieTests).toEqual([])
    expect(data.ordonnanceSortie).toEqual([])
  })
})
