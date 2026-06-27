export interface GlasgowValues {
  yeux: number
  verbale: number
  motrice: number
}

export interface AutonomieValues {
  alimentation: 'A' | 'B' | 'C'
  hygiene: 'A' | 'B' | 'C'
  habillage: 'A' | 'B' | 'C'
  deplacement: 'A' | 'B' | 'C'
  continence: 'A' | 'B' | 'C'
}

/**
 * Calcule le score de Glasgow (somme des 3 sous-scores).
 * Score minimal = 3, maximal = 15.
 */
export function calculateGlasgow(values: GlasgowValues): number {
  return values.yeux + values.verbale + values.motrice
}

/**
 * Retourne la sévérité du traumatisme crânien à partir du score Glasgow.
 *   ≥ 13 → léger (success)
 *   9-12 → modéré (warning)
 *   ≤ 8  → sévère (danger)
 */
export function getGlasgowSeverity(
  score: number,
): { label: string; type: 'success' | 'warning' | 'danger' } {
  if (score >= 13) return { label: 'Traumatisme léger', type: 'success' }
  if (score >= 9) return { label: 'Traumatisme modéré', type: 'warning' }
  return { label: 'Traumatisme sévère', type: 'danger' }
}

/**
 * Calcule le niveau d'autonomie (SL) selon la règle :
 *   - Un seul 'C' → Dépendant
 *   - Un seul 'B' (et aucun 'C') → Aide partielle
 *   - Que des 'A' → Autonome
 */
export function calculateAutonomieLevel(values: AutonomieValues): string {
  const vals = Object.values(values)
  if (vals.includes('C')) return 'C - Dépendant'
  if (vals.includes('B')) return 'B - Aide partielle'
  return 'A - Autonome'
}
