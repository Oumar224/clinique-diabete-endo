import { ipcInvoke } from '@/utils/ipc'
import { getFieldValue, getParameterMeta } from '@/utils/parameter-history'

export interface ParameterHistoryEntry {
  date: string
  documentId: string
  documentLabel: string
  status: 'draft' | 'signed'
  value: unknown
}

/**
 * Raw document shape returned by `clinical-documents:list-by-patient`.
 * The backend joins the document type label/code as flat fields
 * (`documentTypeCode` / `documentTypeLabel`), not a nested object.
 */
interface RawClinicalDocumentDTO {
  id: string
  documentTypeCode?: string | null
  documentTypeLabel?: string | null
  documentType?: { code?: string; label?: string } | null
  title?: string | null
  status?: 'draft' | 'signed'
  formData?: string | null
  createdAt?: string | null
  updatedAt?: string | null
}

function parseFormData(raw: string | null | undefined): Record<string, any> {
  if (!raw) return {}
  try {
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

function isSeriesArray(
  value: unknown,
): value is Array<{ date: string; value: unknown }> {
  return (
    Array.isArray(value) &&
    value.every(
      (v) =>
        v != null &&
        typeof v === 'object' &&
        'value' in (v as Record<string, unknown>) &&
        'date' in (v as Record<string, unknown>),
    )
  )
}

/**
 * Fetches the stored history of a single parameter across every matching
 * clinical document of the patient.
 *
 * When the parameter's `extract` function returns an array of
 * `{ date, value }` objects (a time-series), each element produces its own
 * history entry — this supports archived vitals, Glasgow, and pain-score
 * measurements that are stored as collections rather than scalar fields.
 *
 * @param patientId - Active patient id (no-op when null).
 * @param documentTypeCodes - Document type codes to consider (e.g. `['CRH_DIABETE']`).
 * @param path - Dot-separated formData path (e.g. `bilanInitial.examenPhysique.poids`).
 * @returns Entries sorted by document date (newest first). Empty values
 *          (null / undefined / '') are skipped; 0 and false are kept (they are
 *          meaningful states — e.g. "Non" for a checkbox).
 */
export async function fetchParameterHistory(
  patientId: number | null | undefined,
  documentTypeCodes: string[],
  path: string,
): Promise<ParameterHistoryEntry[]> {
  if (!patientId || documentTypeCodes.length === 0) return []
  if (!getParameterMeta(path)) return []

  const rawDocs = await ipcInvoke<RawClinicalDocumentDTO[]>('clinical-documents:list-by-patient', {
    patientId,
  })

  const entries: ParameterHistoryEntry[] = []
  for (const raw of rawDocs || []) {
    const code = raw.documentTypeCode ?? raw.documentType?.code ?? null
    if (!code || !documentTypeCodes.includes(code)) continue

    const formData = parseFormData(raw.formData)
    const meta = getParameterMeta(path)
    const value = meta?.extract ? meta.extract(formData) : getFieldValue(formData, path)

    if (isSeriesArray(value)) {
      for (const element of value) {
        if (element.value == null || element.value === '') continue
        entries.push({
          date: element.date || (raw.createdAt ?? raw.updatedAt ?? ''),
          documentId: raw.id,
          documentLabel: raw.documentTypeLabel ?? raw.documentType?.label ?? raw.title ?? 'Document',
          status: raw.status === 'signed' ? 'signed' : 'draft',
          value: element.value,
        })
      }
    } else {
      if (value == null || value === '') continue
      entries.push({
        date: raw.createdAt ?? raw.updatedAt ?? '',
        documentId: raw.id,
        documentLabel: raw.documentTypeLabel ?? raw.documentType?.label ?? raw.title ?? 'Document',
        status: raw.status === 'signed' ? 'signed' : 'draft',
        value,
      })
    }
  }

  return entries.sort((a, b) => b.date.localeCompare(a.date))
}

/**
 * Fetches the stored history of several parameters in a single
 * `clinical-documents:list-by-patient` round-trip, then fans out per path
 * with the same extraction rules as {@link fetchParameterHistory}
 * (`extract` when defined, otherwise verbatim field value; series arrays
 * expand to one entry per `{ date, value }` element; empty values skipped;
 * entries sorted newest-first per path).
 *
 * Unknown paths resolve to an empty array (guard, no throw) so a group can
 * safely mix tracked and untracked keys.
 *
 * @param patientId - Active patient id (no-op when null).
 * @param documentTypeCodes - Document type codes to consider (e.g. `['CRH_DIABETE']`).
 * @param paths - Dot-separated formData paths to resolve.
 * @returns A record keyed by path, each value sorted newest-first.
 */
export async function fetchParametersHistory(
  patientId: number | null | undefined,
  documentTypeCodes: string[],
  paths: string[],
): Promise<Record<string, ParameterHistoryEntry[]>> {
  const result: Record<string, ParameterHistoryEntry[]> = {}
  for (const path of paths) result[path] = []
  const knownPaths = paths.filter((path) => getParameterMeta(path))
  if (!patientId || documentTypeCodes.length === 0 || knownPaths.length === 0) return result

  const rawDocs = await ipcInvoke<RawClinicalDocumentDTO[]>('clinical-documents:list-by-patient', {
    patientId,
  })

  const relevantDocs = (rawDocs || []).filter((raw) => {
    const code = raw.documentTypeCode ?? raw.documentType?.code ?? null
    return !!code && documentTypeCodes.includes(code)
  })
  const parsedDocs = relevantDocs.map((raw) => ({
    raw,
    formData: parseFormData(raw.formData),
    documentLabel:
      raw.documentTypeLabel ?? raw.documentType?.label ?? raw.title ?? 'Document',
    status: (raw.status === 'signed' ? 'signed' : 'draft') as 'draft' | 'signed',
  }))

  for (const path of knownPaths) {
    const meta = getParameterMeta(path)
    const entries: ParameterHistoryEntry[] = []
    for (const { raw, formData, documentLabel, status } of parsedDocs) {
      const value = meta?.extract ? meta.extract(formData) : getFieldValue(formData, path)
      if (isSeriesArray(value)) {
        for (const element of value) {
          if (element.value == null || element.value === '') continue
          entries.push({
            date: element.date || (raw.createdAt ?? raw.updatedAt ?? ''),
            documentId: raw.id,
            documentLabel,
            status,
            value: element.value,
          })
        }
      } else {
        if (value == null || value === '') continue
        entries.push({
          date: raw.createdAt ?? raw.updatedAt ?? '',
          documentId: raw.id,
          documentLabel,
          status,
          value,
        })
      }
    }
    result[path] = entries.sort((a, b) => b.date.localeCompare(a.date))
  }

  return result
}
