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

/**
 * Fetches the stored history of a single parameter across every matching
 * clinical document of the patient.
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
    if (value == null || value === '') continue

    entries.push({
      date: raw.createdAt ?? raw.updatedAt ?? '',
      documentId: raw.id,
      documentLabel: raw.documentTypeLabel ?? raw.documentType?.label ?? raw.title ?? 'Document',
      status: raw.status === 'signed' ? 'signed' : 'draft',
      value,
    })
  }

  return entries.sort((a, b) => b.date.localeCompare(a.date))
}
