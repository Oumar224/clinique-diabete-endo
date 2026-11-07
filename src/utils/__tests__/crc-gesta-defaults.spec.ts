import { describe, it, expect } from 'vitest'
import { createDefaultFormData } from '@/types/crc-gesta'

describe('crc-gesta createDefaultFormData', () => {
  it('returns distinct references on two calls (deep)', () => {
    const a = createDefaultFormData()
    const b = createDefaultFormData()
    expect(a).toEqual(b)
    expect(a).not.toBe(b)
    expect(a.admission).not.toBe(b.admission)
    expect(a.informationsComplementaires).not.toBe(b.informationsComplementaires)
    expect(a.motifConsultation).not.toBe(b.motifConsultation)
    expect(a.donneesMaternelles).not.toBe(b.donneesMaternelles)
    expect(a.donneesMaternelles.pregestationnels).not.toBe(b.donneesMaternelles.pregestationnels)
    expect(a.donneesMaternelles.facteursRisque).not.toBe(b.donneesMaternelles.facteursRisque)
    expect(a.bilanInitial).not.toBe(b.bilanInitial)
    expect(a.bilanInitial.examenPhysique).not.toBe(b.bilanInitial.examenPhysique)
    expect(a.bilanInitial.vitalSignsHistory).not.toBe(b.bilanInitial.vitalSignsHistory)
    expect(a.diagnosticDiabete).not.toBe(b.diagnosticDiabete)
    expect(a.diagnosticDiabete.modeDiagnostic).not.toBe(b.diagnosticDiabete.modeDiagnostic)
    expect(a.equilibreGlycemique).not.toBe(b.equilibreGlycemique)
    expect(a.equilibreGlycemique.lignes).not.toBe(b.equilibreGlycemique.lignes)
    expect(a.equilibreGlycemique.lignes.gaj).not.toBe(b.equilibreGlycemique.lignes.gaj)
    expect(a.equilibreGlycemique.lignes.pp1h).not.toBe(b.equilibreGlycemique.lignes.pp1h)
    expect(a.equilibreGlycemique.lignes.pp2h).not.toBe(b.equilibreGlycemique.lignes.pp2h)
    expect(a.echoObstetricale).not.toBe(b.echoObstetricale)
    expect(a.complications).not.toBe(b.complications)
    expect(a.priseEnCharge).not.toBe(b.priseEnCharge)
    expect(a.priseEnCharge.traitements).not.toBe(b.priseEnCharge.traitements)
    expect(a.priseEnCharge.insulines).not.toBe(b.priseEnCharge.insulines)
    expect(a.priseEnCharge.protocole).not.toBe(b.priseEnCharge.protocole)
    expect(a.conclusion).not.toBe(b.conclusion)
    expect(a.conclusion.suiviPrevu).not.toBe(b.conclusion.suiviPrevu)
    expect(a.examensComplementaires).not.toBe(b.examensComplementaires)
    expect(a.ordonnanceSortie).not.toBe(b.ordonnanceSortie)
  })

  it('mutating one result does not affect the other', () => {
    const a = createDefaultFormData()
    const b = createDefaultFormData()
    a.equilibreGlycemique.lignes.gaj.resultat = 1.1
    a.priseEnCharge.insulines.push({ _key: 'x', insuline: 'A', dose: 4, horaire: 'matin' })
    expect(b.equilibreGlycemique.lignes.gaj.resultat).toBeNull()
    expect(b.priseEnCharge.insulines).toEqual([])
  })

  it('includes all root keys', () => {
    const data = createDefaultFormData()
    expect(Object.keys(data).sort()).toEqual(
      [
        'admission',
        'informationsComplementaires',
        'motifConsultation',
        'donneesMaternelles',
        'bilanInitial',
        'diagnosticDiabete',
        'equilibreGlycemique',
        'echoObstetricale',
        'complications',
        'priseEnCharge',
        'examenCliniqueTexte',
        'conclusion',
        'examensComplementaires',
        'ordonnanceSortie',
      ].sort(),
    )
  })

  it('initializes empty arrays, nulls, false and lignes equilibre', () => {
    const data = createDefaultFormData()
    expect(data.admission.dateEntree).toBe('')
    expect(data.informationsComplementaires.mecanismeContact).toEqual([])
    expect(data.motifConsultation.typeConsultation).toBe('')
    expect(data.motifConsultation.plaintes).toBe('')
    expect(data.donneesMaternelles.facteursRisque).toEqual([])
    expect(data.donneesMaternelles.pregestationnels.poidsPregestationnel).toBeNull()
    expect(data.donneesMaternelles.pregestationnels.ddr).toBe('')
    expect(data.bilanInitial.examenPhysique.termeSa).toBeNull()
    expect(data.bilanInitial.vitalSignsHistory).toEqual([])
    expect(data.diagnosticDiabete.modeDiagnostic).toEqual([])
    expect(data.diagnosticDiabete.diagnosticRetenu).toBe('')
    expect(data.equilibreGlycemique.autosurveillance).toBe(false)
    expect(data.equilibreGlycemique.lignes.gaj).toEqual({ resultat: null, tendance: '' })
    expect(data.equilibreGlycemique.lignes.pp1h).toEqual({ resultat: null, tendance: '' })
    expect(data.equilibreGlycemique.lignes.pp2h).toEqual({ resultat: null, tendance: '' })
    expect(data.equilibreGlycemique.hypoglycemies).toBe(false)
    expect(data.equilibreGlycemique.hyperglycemies).toBe(false)
    expect(data.equilibreGlycemique.equilibre).toBe('')
    expect(data.complications.signes).toEqual([])
    expect(data.priseEnCharge.traitements).toEqual([])
    expect(data.priseEnCharge.insulines).toEqual([])
    expect(data.priseEnCharge.protocole).toEqual({
      variante: '',
      insulatardMatin: null,
      insulatardSoir: null,
      lenteSoir: null,
      dateRemise: '',
      commentaires: '',
    })
    expect(data.conclusion.suiviPrevu).toEqual([])
    expect(data.examensComplementaires.imagerieTests).toEqual([])
    expect(data.ordonnanceSortie).toEqual([])
  })
})
