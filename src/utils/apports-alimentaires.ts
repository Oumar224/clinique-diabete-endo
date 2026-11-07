import type { ApportLigne, ApportsTableData } from '@/types/crc-obesite'
import { calcIMC } from './medical-calculations'

export const FACTEUR_KCAL = { glucides: 4, protides: 4, lipides: 9, autres: null } as const

export function kcalLigne(l: ApportLigne): number | null {
  if (l.categorie === 'autres') {
    return l.kcalManuel
  }
  const facteur = FACTEUR_KCAL[l.categorie]
  if (facteur == null) return null
  if (l.quantite == null || l.equivalentParGramme == null) return null
  return Math.round(l.quantite * l.equivalentParGramme * facteur)
}

export function ecartLigne(l: ApportLigne): number | null {
  const kcal = kcalLigne(l)
  if (kcal == null || l.objectifKcal == null) return null
  return kcal - l.objectifKcal
}

export function totauxApports(lignes: ApportLigne[]): { kcal: number; objectif: number; ecart: number | null } {
  let kcal = 0
  let objectif = 0
  let hasObjectif = false
  for (const l of lignes) {
    const k = kcalLigne(l)
    if (k != null) kcal += k
    if (l.objectifKcal != null) {
      objectif += l.objectifKcal
      hasObjectif = true
    }
  }
  return { kcal, objectif, ecart: hasObjectif ? kcal - objectif : null }
}

export function ecartJour(apports: ApportsTableData): number | null {
  if (apports.objectifJourKcal == null) return null
  const { kcal } = totauxApports(apports.lignes)
  return kcal - apports.objectifJourKcal
}

export function imcAuto(poids: number | null, taille: number | null): number | null {
  return calcIMC(poids, taille)
}

export function ratioTTTH(tourTaille: number | null, tourHanche: number | null): number | null {
  if (tourTaille == null || tourHanche == null) return null
  if (Number.isNaN(tourTaille) || Number.isNaN(tourHanche)) return null
  if (tourHanche <= 0) return null
  return Math.round((tourTaille / tourHanche) * 100) / 100
}
