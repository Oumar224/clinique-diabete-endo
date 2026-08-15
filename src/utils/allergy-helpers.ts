export interface AllergieDisplay {
  libelle: string
  type: string
}

/**
 * Normalize any allergy format (old string or new structured) into AllergieDisplay
 */
export function normalizeAllergy(a: string | AllergieDisplay): AllergieDisplay {
  if (typeof a === 'string') {
    return { libelle: a, type: 'Autre' }
  }
  return { libelle: a.libelle || '', type: a.type || 'Autre' }
}

/**
 * Normalize an array of allergies
 */
export function normalizeAllergies(list: any[] | undefined | null): AllergieDisplay[] {
  if (!Array.isArray(list)) return []
  return list.map(normalizeAllergy)
}

/**
 * Color map for allergy types
 */
export const ALLERGY_TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'Médicamenteuse': { bg: '#fef2f2', text: '#b91c1c', border: '#ef4444' },
  'Alimentaire': { bg: '#fffbeb', text: '#92400e', border: '#f59e0b' },
  'Latex': { bg: '#f0f9ff', text: '#0369a1', border: '#38bdf8' },
  'Piqûre': { bg: '#fef2f2', text: '#b91c1c', border: '#f87171' },
  'Autre': { bg: '#f9fafb', text: '#6b7280', border: '#d1d5db' },
}

/**
 * Color map for antecedent types
 */
export const ANTECEDENT_TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'Familiale': { bg: '#fffbeb', text: '#92400e', border: '#f59e0b' },
  'Personnelle': { bg: '#fef2f2', text: '#b91c1c', border: '#ef4444' },
}

/**
 * Allergy categories for "Personnelle" antecedent entries (free-text libellé)
 */
export const PERSONNELLE_CATEGORIES = [
  'Médicaux',
  'Chirurgical',
  'Gynéco-obstétricaux',
  'Autres',
] as const

export function allergyTypeColors(type: string) {
  return ALLERGY_TYPE_COLORS[type] || ALLERGY_TYPE_COLORS['Autre']
}

const ANTECEDENT_FALLBACK_COLORS = { bg: '#f9fafb', text: '#6b7280', border: '#d1d5db' }

export function antecedentTypeColors(type: string) {
  return ANTECEDENT_TYPE_COLORS[type] || ANTECEDENT_FALLBACK_COLORS
}
