import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { ipcInvoke } from '@/utils/ipc'
import type { ExamParameterReferenceValues } from './useExamParameters'

/**
 * Nom d'examen de repli utilisé lorsqu'un résultat n'a pas d'`examName`
 * renseigné par le backend. Il sert à la fois de clé de groupe et de
 * label affiché dans l'en-tête du groupe.
 */
export const FALLBACK_EXAM_NAME = '(Examen non précisé)'

/**
 * Créneaux horaires de la grille « Résultats Biologiques ». Source unique
 * pour le slotting des valeurs dans `buildMatrix` et pour la grille de la vue.
 */
export const EXAM_GRID_HOURS = [6, 8, 10, 12, 14, 16, 18, 20, 22]

/**
 * Clé de jour `YYYY-MM-DD` dans le fuseau LOCAL de l'utilisateur. Aligne les
 * `dateKey` de `buildMatrix` sur les colonnes de la vue (construites en heure
 * locale via `getFullYear()`/`getMonth()`/`getDate()`).
 */
function localDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export interface ExamResultDto {
  id?: number
  examRequestId?: number
  parameterId?: number
  value?: string
  isNormal?: boolean
  filledBy?: number
  filledAt?: string
  createdAt?: string
  parameterName?: string
  parameterUnit?: string
  parameterInputType?: 'numeric' | 'text' | 'select' | 'boolean'
  parameterReferenceValues?: ExamParameterReferenceValues
  filledByName?: string
  requestDate?: string
  requestStatus?: string
  /** Nom de l'examen (p. ex. « Bilan lipidique »), exposé par le backend en parallèle de chaque résultat. */
  examName?: string
  /** Date de réalisation de l'examen (ISO), `null` si l'examen n'est pas encore réalisé. */
  validatedAt?: string | null
}

export interface PatientResultFilters {
  typeId?: number
  examId?: number
  parameterId?: number
  examRequestId?: number
  dateFrom?: string
  dateTo?: string
}

/**
 * Entrée minimale acceptée par `buildMatrix` : un sous-ensemble structurel de
 * `ExamResultDto` compatible avec les DTO persistés côté formulaire
 * (`BilanBioResult`), dont `parameterReferenceValues` peut être
 * `Record<string, unknown> | null` et `parameterInputType` une simple string.
 */
export interface MatrixInputResult {
  id?: number
  examRequestId?: number
  parameterId?: number
  value?: string
  isNormal?: boolean
  filledAt?: string
  createdAt?: string
  parameterName?: string
  parameterUnit?: string
  parameterInputType?: string
  parameterReferenceValues?: Record<string, unknown> | null
  examName?: string
}

export interface MatrixDateColumn {
  key: string
  label: string
  status: string
  statusLabel: string
  isToday: boolean
}

export interface MatrixRow {
  parameterId: number
  parameterName: string
  parameterUnit: string
  parameterInputType: string
  referenceValues: ExamParameterReferenceValues
  /** Valeurs par créneau `dateKey|hourSlot` (`hourSlot` ∈ `EXAM_GRID_HOURS`). Grille SPARSE : seules les clés réellement renseignées pour ce paramètre. */
  dates: Record<string, { value: string; isNormal: boolean | undefined }>
}

export interface MatrixGroup {
  /** Nom de l'examen du groupe (nom réel ou `FALLBACK_EXAM_NAME` si inconnu). */
  examName: string
  rows: MatrixRow[]
}

export function useExamResults() {
  const results = ref<ExamResultDto[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchByRequest(examRequestId: number): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const result = await ipcInvoke<ExamResultDto[]>('exam-results:list-by-request', { examRequestId })
      results.value = Array.isArray(result) ? result : []
    } catch (e) {
      error.value = (e as Error).message
      results.value = []
    } finally {
      loading.value = false
    }
  }

  async function fetchByPatient(patientId: number, filters: PatientResultFilters = {}): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const result = await ipcInvoke<ExamResultDto[]>('exam-results:list-by-patient', { patientId, ...filters })
      results.value = Array.isArray(result) ? result : []
    } catch (e) {
      error.value = (e as Error).message
      results.value = []
    } finally {
      loading.value = false
    }
  }

  async function validateExam(
    examRequestId: number,
    resultData: Array<{ parameterId: number; value?: string; isNormal?: boolean }>,
    filledBy: number,
  ): Promise<boolean> {
    try {
      await ipcInvoke('exam-results:validate', { examRequestId, results: resultData, filledBy })
      ElMessage.success('Résultats enregistrés')
      return true
    } catch (e) {
      ElMessage.error(`Erreur: ${(e as Error).message}`)
      return false
    }
  }

  /**
   * Construit la matrice d'affichage (colonnes jour-heure × lignes de paramètres).
   *
   * Les groupes sont construits par EXAMEN (`examName`), et non plus par
   * demande : un même examen présent sur plusieurs demandes fusionne ses
   * paramètres dans un seul groupe.
   *
   * Fuseau : `filledAt`/`createdAt` sont des horodatages UTC sans suffixe
   * (`'YYYY-MM-DD HH:mm:ss'`). Ils sont parsés en UTC (`+ 'Z'`) puis lus via
   * les getters LOCAUX, pour que `dateKey` et `hourSlot` désignent la même
   * journée-heure que les colonnes de la vue (construites en heure locale).
   *
   * Déterminisme : les résultats sont triés par horodatage croissant avant le
   * build ; le dernier `valueMap.set` d'un créneau `parameterId|dateKey|hourSlot`
   * est donc la valeur la PLUS RÉCENTE, quel que soit l'ordre du backend.
   *
   * `rows.dates` est sparse : il ne contient que les créneaux réellement
   * renseignés pour le paramètre (la vue affiche « — » pour les clés absentes).
   *
   * `dateColumns` (clés `YYYY-MM-DD` locales, triées décroissantes) n'est pas
   * consommé par la vue : conservé pour garder le contrat de retour stable.
   */
  function buildMatrix(rawResults: MatrixInputResult[]): { dateColumns: MatrixDateColumn[]; matrixGroups: MatrixGroup[] } {
    const dateMap = new Map<string, { status: string; statusLabel: string }>()
    const paramMap = new Map<number, { name: string; unit: string; inputType: string; refValues: ExamParameterReferenceValues }>()
    const valueMap = new Map<string, { value: string; isNormal: boolean | undefined }>()

    // Tri croissant par horodatage réel : le dernier `valueMap.set` d'un créneau
    // garde la valeur la plus récente, indépendamment de l'ordre du backend.
    const ordered = rawResults
      .map((r) => {
        const ts = r.filledAt ?? r.createdAt
        const d = ts ? new Date(ts.replace(' ', 'T') + 'Z') : null
        return { r, d }
      })
      .sort((a, b) => {
        const ta = a.d ? a.d.getTime() : -Infinity
        const tb = b.d ? b.d.getTime() : -Infinity
        return ta - tb
      })

    for (const { r, d } of ordered) {
      // `ts` est en UTC sans suffixe : on force `Z` au parse puis on lit via
      // les getters LOCAUX → `dateKey`/`hourSlot` = journée-heure vue par l'utilisateur.
      const dateKey = d ? localDateKey(d) : 'unknown'
      const hourRaw = d ? d.getHours() : NaN
      const hourSlot = [...EXAM_GRID_HOURS].reverse().find((h) => h <= hourRaw) ?? EXAM_GRID_HOURS[0]
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, { status: r.isNormal === false ? 'abnormal' : 'normal', statusLabel: '' })
      }
      if (r.parameterId != null && !paramMap.has(r.parameterId)) {
        paramMap.set(r.parameterId, {
          name: r.parameterName ?? '',
          unit: r.parameterUnit ?? '',
          inputType: r.parameterInputType ?? 'text',
          refValues: r.parameterReferenceValues ?? {},
        })
      }
      if (r.parameterId != null) {
        valueMap.set(`${r.parameterId}|${dateKey}|${hourSlot}`, {
          value: r.value ?? '',
          isNormal: r.isNormal,
        })
      }
    }

    const today = localDateKey(new Date())
    const dateColumns: MatrixDateColumn[] = Array.from(dateMap.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, meta]) => ({
        key,
        label: formatDateLabel(key),
        status: meta.status,
        statusLabel: meta.statusLabel,
        isToday: key === today,
      }))

    // Regroupement par EXAMEN : clé = examName (ou fallback), les paramètres
    // d'un même examen sur plusieurs demandes sont fusionnés dans un Set.
    const examMap = new Map<string, { paramIds: Set<number> }>()
    for (const r of rawResults) {
      if (r.parameterId == null) continue
      const name = (r.examName ?? '').trim() || FALLBACK_EXAM_NAME
      if (!examMap.has(name)) {
        examMap.set(name, { paramIds: new Set() })
      }
      examMap.get(name)!.paramIds.add(r.parameterId)
    }

    // Index sparse des valeurs par paramètre : `slotKey` (`dateKey|hourSlot`) → valeur.
    const paramDates = new Map<number, Record<string, { value: string; isNormal: boolean | undefined }>>()
    for (const [key, value] of valueMap.entries()) {
      const sep = key.indexOf('|')
      const paramId = Number(key.slice(0, sep))
      const slotKey = key.slice(sep + 1)
      if (!paramDates.has(paramId)) paramDates.set(paramId, {})
      paramDates.get(paramId)![slotKey] = value
    }

    const matrixGroups: MatrixGroup[] = Array.from(examMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0], 'fr', { sensitivity: 'base' }))
      .map(([examName, meta]) => ({
        examName,
        rows: Array.from(meta.paramIds)
          .map((paramId) => {
            const pMeta = paramMap.get(paramId)
            if (!pMeta) return null
            return {
              parameterId: paramId,
              parameterName: pMeta.name,
              parameterUnit: pMeta.unit,
              parameterInputType: pMeta.inputType,
              referenceValues: pMeta.refValues,
              dates: paramDates.get(paramId) ?? {},
            } as MatrixRow
          })
          .filter((r): r is MatrixRow => r != null)
          .sort((a, b) => a.parameterName.localeCompare(b.parameterName)),
      }))

    return { dateColumns, matrixGroups }
  }

  function formatDateLabel(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' })
  }

  return {
    results,
    loading,
    error,
    fetchByRequest,
    fetchByPatient,
    validateExam,
    buildMatrix,
  }
}
