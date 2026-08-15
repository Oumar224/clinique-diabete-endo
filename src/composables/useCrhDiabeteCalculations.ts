import { calcIMC } from '@/utils/medical-calculations'
import type { AutonomieSL } from '@/types/crh-diabete'

/**
 * New continence scale used by the Grille SL radio group (ModeVieAtcdTab).
 * These values mean the patient is continent/independent: no downgrade.
 */
const CONTINENCE_CONTINENT_VALUES: readonly string[] = [
  'Continence urinaire',
  'Continence fécale',
  'Tonus pelvien',
]

/**
 * Maps the continence dimension onto the 3-tier autonomy scale shared by the
 * other Grille SL fields. Legacy values ('Incontinence totale'/'partielle')
 * and any other non-continence value (blank/unknown persisted data) are
 * treated as incontinent/dependent so old records still downgrade the class.
 */
function normaliseContinence(value: string): string {
  if (CONTINENCE_CONTINENT_VALUES.includes(value)) return 'Autonome'
  if (value === 'Incontinence totale') return 'Dépendance totale'
  if (value === 'Incontinence partielle') return 'Aide partielle'
  // Unknown/blank persisted value: conservative partial downgrade.
  return 'Aide partielle'
}

export function useCrhDiabeteCalculations() {
  function calcAge(dateNaissance: string, dateEntree: string): number | null {
    if (!dateNaissance || !dateEntree) return null
    const birth = new Date(dateNaissance)
    const entry = new Date(dateEntree)
    if (isNaN(birth.getTime()) || isNaN(entry.getTime())) return null
    if (birth > entry) return null
    let age = entry.getFullYear() - birth.getFullYear()
    const m = entry.getMonth() - birth.getMonth()
    if (m < 0 || (m === 0 && entry.getDate() < birth.getDate())) age--
    return age
  }

  function calcDureeDiabete(dateDiagnostic: string, referenceDate?: string): string | null {
    if (!dateDiagnostic) return null
    const parts = dateDiagnostic.split('-')
    if (parts.length < 2) return null
    const diagYear = parseInt(parts[0], 10)
    const diagMonth = parseInt(parts[1], 10)
    if (isNaN(diagYear) || isNaN(diagMonth)) return null

    const ref = referenceDate ? new Date(referenceDate) : new Date()
    const currentYear = ref.getFullYear()
    const currentMonth = ref.getMonth() + 1

    let years = currentYear - diagYear
    let months = currentMonth - diagMonth
    if (months < 0) {
      years--
      months += 12
    }
    return `${years} ans ${months} mois`
  }

  function calcDFG(
    creatininemie: number | null,
    age: number | null,
    sexe: string | null,
  ): number | null {
    if (creatininemie == null || age == null || !sexe) return null
    if (creatininemie <= 0 || age <= 0) return null
    if (sexe !== 'M' && sexe !== 'F') return null

    const cr = creatininemie / 88.4
    const isFemale = sexe === 'F'
    const kappa = isFemale ? 0.7 : 0.9
    const alpha = isFemale ? -0.329 : -0.411

    const minRatio = Math.min(cr / kappa, 1)
    const maxRatio = Math.max(cr / kappa, 1)

    const dfg =
      141 *
      Math.pow(minRatio, alpha) *
      Math.pow(maxRatio, -1.209) *
      Math.pow(0.993, age) *
      (isFemale ? 1.018 : 1)

    return Math.round(dfg)
  }

  function calcStadeIR(dfg: number | null): string {
    if (dfg == null || dfg < 0) return '—'
    if (dfg >= 90) return 'Stade 1 (Normal)'
    if (dfg >= 60) return 'Stade 2 (Insuffisance rénale légère)'
    if (dfg >= 45) return 'Stade 3a (Insuffisance rénale modérée)'
    if (dfg >= 30) return 'Stade 3b (Insuffisance rénale modérée à sévère)'
    if (dfg >= 15) return 'Stade 4 (Insuffisance rénale sévère)'
    return 'Stade 5 (Insuffisance rénale terminale)'
  }

  function calcGlasgowScore(
    ouvertureYeux: number,
    reponseVerbale: number,
    reponseMotrice: number,
  ): number | null {
    // Par défaut, chaque composante non renseignée (0 / non évalué legacy)
    // est ramenée à son maximum -> score par défaut 15/15 (neurologie normale).
    const oy = ouvertureYeux || 4
    const rv = reponseVerbale || 5
    const rm = reponseMotrice || 6
    return oy + rv + rm
  }

  function glasgowInterpretation(score: number | null): { label: string; type: 'danger' | 'warning' | 'success' } {
    if (score == null) return { label: 'Non évalué', type: 'warning' }
    if (score <= 8) return { label: 'Coma - Alerte réanimation', type: 'danger' }
    if (score <= 12) return { label: 'Traumatisme modéré', type: 'warning' }
    if (score === 15) return { label: 'Traumatisme léger / Conscience normale', type: 'success' }
    return { label: 'Traumatisme léger', type: 'success' }
  }

  function calcAutonomieClass(sl: AutonomieSL): { classe: string; description: string } {
    const values = [
      sl.alimentation,
      sl.hygiene,
      sl.habillage,
      sl.deplacement,
      normaliseContinence(sl.continence),
    ]

    const hasDependanceTotale = values.some(v => v === 'Dépendance totale' || v === 'Incontinence totale')
    const hasAidePartielle = values.some(v => v === 'Aide partielle' || v === 'Incontinence partielle')

    if (hasDependanceTotale) return { classe: 'C', description: 'C - Dépendance totale' }
    if (hasAidePartielle) return { classe: 'B', description: 'B - Aide partielle' }
    return { classe: 'A', description: 'A - Autonome' }
  }

  function formatDateAge(dateStr: string): string {
    if (!dateStr) return '—'
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return '—'
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
  }

  return {
    calcAge,
    calcDureeDiabete,
    calcDFG,
    calcIMC,
    calcStadeIR,
    calcGlasgowScore,
    glasgowInterpretation,
    calcAutonomieClass,
    formatDateAge,
  }
}
