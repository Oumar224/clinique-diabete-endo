/**
 * Constantes du protocole d'insulinothérapie chez la femme enceinte
 * (source UI / PDF). Seuils exprimés en g/L.
 */

/** Cibles glycémiques de l'équilibre (seuils "<", en g/L). */
export const CIBLES_GLYCEMIQUES = { gaj: 0.95, pp1h: 1.4, pp2h: 1.2 } as const

export interface ProtocoleSeuil {
  label: string
  conseil?: string
}

export const PROTOCOLE_SEUILS: ProtocoleSeuil[] = [
  { label: 'Inférieure à 0,60 g/L', conseil: 'Résucrage et consulter' },
  { label: 'Entre 0,60 et 0,94 g/L' },
  { label: 'Entre 0,95 et 1,49 g/L' },
  { label: 'Entre 1,50 et 1,99 g/L' },
  { label: 'Entre 2,00 et 2,49 g/L' },
  { label: 'Entre 2,50 et 2,99 g/L' },
  { label: 'Entre 3,00 et 3,50 g/L' },
  { label: 'Supérieure à 3,50 g/L', conseil: "Boire beaucoup d'eau et consulter" },
]

/** Règles de la variante Insulatard (semi-lente matin et soir). */
export const PROTOCOLE_INSULATARD_REGLES: string[] = [
  'Concernant votre insuline rapide Actrapid (= Novorapid) : objectif glycémique avant repas entre 0,60 g/L et 1,20 g/L.',
  'Concernant votre insuline semi-lente Insulatard : dose prescrite le matin et le soir (en UI).',
  'Objectif à jeun entre 0,60 g/L et 0,94 g/L ; avant repas inférieure à 1,20 g/L.',
  "Si la glycémie à jeun est inférieure à 0,60 g/L ou en cas d'hypoglycémie la veille, diminuez votre dose du soir de 2 UI le même jour.",
  'Si la glycémie à jeun est supérieure à 0,95 g/L pendant 3 jours consécutifs, augmentez votre dose du soir de 2 UI.',
  'Si la glycémie avant dîner est supérieure à 1,20 g/L pendant 3 jours consécutifs, augmentez votre dose du lendemain matin de 2 UI.',
]

/** Règles de la variante Insuline lente (soir). */
export const PROTOCOLE_LENTE_REGLES: string[] = [
  'Concernant votre insuline rapide Actrapid (= Novorapid) : objectif glycémique avant repas entre 0,60 g/L et 1,20 g/L.',
  'Concernant votre insuline lente : dose prescrite le soir (en UI).',
  'Objectif à jeun entre 0,60 g/L et 0,94 g/L ; avant repas inférieure à 1,20 g/L.',
  'Si la glycémie à jeun est supérieure à 0,95 g/L pendant 2 jours consécutifs, augmentez votre dose du soir de 2 UI.',
  "Si la glycémie à jeun est inférieure à 0,60 g/L ou en cas d'hypoglycémie la veille, diminuez votre dose du soir de 2 UI le même jour.",
]
