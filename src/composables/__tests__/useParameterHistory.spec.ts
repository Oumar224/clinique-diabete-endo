// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchParameterHistory } from '../useParameterHistory'
import { formatValue } from '@/utils/parameter-history'
import { calcIMC } from '@/utils/medical-calculations'

// ─── Mock IPC ──────────────────────────────────────────────────────

const mockIpcInvoke = vi.hoisted(() => vi.fn())

vi.mock('@/utils/ipc', () => ({
  ipcInvoke: mockIpcInvoke,
}))

// ─── Test fixtures ─────────────────────────────────────────────────

const DOC_TYPE_CODES = ['CRH_DIABETE']

/**
 * Builds a raw document DTO as returned by `clinical-documents:list-by-patient`.
 * Defaults to the nested `documentType` shape; individual tests may override
 * with the flat backend shape (`documentTypeCode` / `documentTypeLabel`).
 */
function rawDoc(overrides: Record<string, any> = {}): Record<string, any> {
  return {
    id: 'doc-1',
    documentType: { code: 'CRH_DIABETE', label: 'CRH Diabète' },
    title: 'CRH',
    status: 'draft',
    formData: JSON.stringify({}),
    createdAt: '2025-01-01T10:00:00.000Z',
    updatedAt: '2025-01-02T10:00:00.000Z',
    ...overrides,
  }
}

function poidsFormData(poids: unknown): string {
  return JSON.stringify({ bilanInitial: { examenPhysique: { poids } } })
}

// ─── Test suite ────────────────────────────────────────────────────

describe('fetchParameterHistory', () => {
  beforeEach(() => {
    mockIpcInvoke.mockReset()
  })

  it('calls ipcInvoke with the clinical-documents channel and the patientId', async () => {
    mockIpcInvoke.mockResolvedValue([])
    await fetchParameterHistory(42, DOC_TYPE_CODES, 'bilanInitial.examenPhysique.poids')
    expect(mockIpcInvoke).toHaveBeenCalledWith('clinical-documents:list-by-patient', { patientId: 42 })
  })

  it('returns entries only for docs whose documentType.code is in docTypeCodes', async () => {
    mockIpcInvoke.mockResolvedValue([
      rawDoc({ id: 'kept', formData: poidsFormData(75) }),
      rawDoc({
        id: 'excluded-different-code',
        documentType: { code: 'CRC_DIABETE', label: 'CRC Diabète' },
        formData: poidsFormData(80),
      }),
      rawDoc({
        id: 'excluded-no-code',
        documentType: null,
        formData: poidsFormData(82),
      }),
    ])

    const entries = await fetchParameterHistory(1, DOC_TYPE_CODES, 'bilanInitial.examenPhysique.poids')

    expect(entries).toHaveLength(1)
    expect(entries[0].documentId).toBe('kept')
  })

  it('parses formData JSON strings and extracts the value at the dot-path', async () => {
    mockIpcInvoke.mockResolvedValue([
      rawDoc({ formData: poidsFormData(75) }),
    ])

    const entries = await fetchParameterHistory(1, DOC_TYPE_CODES, 'bilanInitial.examenPhysique.poids')

    expect(entries).toHaveLength(1)
    expect(entries[0].value).toBe(75)
    expect(entries[0]).toMatchObject({
      documentId: 'doc-1',
      documentLabel: 'CRH Diabète',
      status: 'draft',
    })
  })

  it('ignores the persisted imc field and recomputes IMC from poids/taille (stored imc: 999 is discarded → 26)', async () => {
    // The form persists a precomputed IMC, but history must recompute it from
    // the raw poids/taille: a stale sentinel stored as `imc: 999` must be
    // ignored, not displayed. calcIMC(75, 170) = 75 / 1.70² = 25.95… rounded
    // to 1 decimal → 26.
    mockIpcInvoke.mockResolvedValue([
      rawDoc({
        formData: JSON.stringify({
          bilanInitial: { examenPhysique: { poids: 75, taille: 170, imc: 999 } },
        }),
      }),
    ])

    const entries = await fetchParameterHistory(1, DOC_TYPE_CODES, 'bilanInitial.examenPhysique.imc')

    expect(entries).toHaveLength(1)
    expect(entries[0].value).toBe(calcIMC(75, 170))
    expect(entries[0].value).not.toBe(999)
  })

  it('produces no IMC entry when poids/taille are missing or non-positive', async () => {
    mockIpcInvoke.mockResolvedValue([
      rawDoc({ id: 'missing-poids-taille', formData: JSON.stringify({ bilanInitial: {} }) }),
      rawDoc({
        id: 'poids-zero',
        formData: JSON.stringify({ bilanInitial: { examenPhysique: { poids: 0, taille: 170 } } }),
      }),
      rawDoc({
        id: 'taille-zero',
        formData: JSON.stringify({ bilanInitial: { examenPhysique: { poids: 75, taille: 0 } } }),
      }),
      rawDoc({
        id: 'valid',
        formData: JSON.stringify({ bilanInitial: { examenPhysique: { poids: 80, taille: 180 } } }),
      }),
    ])

    const entries = await fetchParameterHistory(1, DOC_TYPE_CODES, 'bilanInitial.examenPhysique.imc')

    // calcIMC returns null for missing/non-positive inputs → no entry at all.
    expect(entries.map(e => e.documentId)).toEqual(['valid'])
    expect(entries[0].value).toBe(calcIMC(80, 180))
  })

  it('uses getFieldValue default extraction for a plain path like admission.serviceAccueil', async () => {
    mockIpcInvoke.mockResolvedValue([
      rawDoc({
        formData: JSON.stringify({ admission: { serviceAccueil: 'Cardiologie' } }),
      }),
    ])

    const entries = await fetchParameterHistory(1, DOC_TYPE_CODES, 'admission.serviceAccueil')

    expect(entries).toHaveLength(1)
    expect(entries[0].value).toBe('Cardiologie')
  })

  it('skips docs where the value is null, undefined or "" (empty string)', async () => {
    mockIpcInvoke.mockResolvedValue([
      rawDoc({ id: 'empty-string', formData: poidsFormData('') }),
      rawDoc({ id: 'null-value', formData: poidsFormData(null) }),
      rawDoc({ id: 'missing-field', formData: JSON.stringify({ bilanInitial: {} }) }),
      rawDoc({ id: 'valid', formData: poidsFormData(70) }),
    ])

    const entries = await fetchParameterHistory(1, DOC_TYPE_CODES, 'bilanInitial.examenPhysique.poids')

    expect(entries.map(e => e.documentId)).toEqual(['valid'])
  })

  it('keeps a stored false as a meaningful entry — rendered "Non" (only null/undefined/"" are filtered)', async () => {
    // `false` is a meaningful clinical state (e.g. "Isolement : Non") and must
    // NOT be filtered out like null/undefined/'' — regression: previously a
    // stored false was silently dropped from the history.
    mockIpcInvoke.mockResolvedValue([
      rawDoc({
        id: 'false-value',
        formData: JSON.stringify({ modeVieAtcd: { isolement: false } }),
      }),
    ])

    const entries = await fetchParameterHistory(1, DOC_TYPE_CODES, 'modeVieAtcd.isolement')

    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({ documentId: 'false-value', value: false })
    // The dialog renders a stored false as "Non" via the boolean formatter.
    expect(formatValue('modeVieAtcd.isolement', false)).toBe('Non')
  })

  it('keeps a numeric value of 0 (only null/undefined/"" are filtered)', async () => {
    mockIpcInvoke.mockResolvedValue([rawDoc({ id: 'zero', formData: poidsFormData(0) })])

    const entries = await fetchParameterHistory(1, DOC_TYPE_CODES, 'bilanInitial.examenPhysique.poids')

    expect(entries).toHaveLength(1)
    expect(entries[0].value).toBe(0)
  })

  it('sorts returned entries by createdAt descending', async () => {
    mockIpcInvoke.mockResolvedValue([
      rawDoc({ id: 'oldest', createdAt: '2024-12-01T08:00:00.000Z', formData: poidsFormData(68) }),
      rawDoc({ id: 'newest', createdAt: '2025-06-15T08:00:00.000Z', formData: poidsFormData(75) }),
      rawDoc({ id: 'middle', createdAt: '2025-03-10T08:00:00.000Z', formData: poidsFormData(71) }),
    ])

    const entries = await fetchParameterHistory(1, DOC_TYPE_CODES, 'bilanInitial.examenPhysique.poids')

    expect(entries.map(e => e.documentId)).toEqual(['newest', 'middle', 'oldest'])
  })

  it('returns [] when raw is empty', async () => {
    mockIpcInvoke.mockResolvedValue([])

    const entries = await fetchParameterHistory(1, DOC_TYPE_CODES, 'bilanInitial.examenPhysique.poids')

    expect(entries).toEqual([])
  })

  it('returns [] without calling IPC when patientId is null or undefined', async () => {
    expect(await fetchParameterHistory(null, DOC_TYPE_CODES, 'bilanInitial.examenPhysique.poids')).toEqual([])
    expect(await fetchParameterHistory(undefined, DOC_TYPE_CODES, 'bilanInitial.examenPhysique.poids')).toEqual([])
    expect(mockIpcInvoke).not.toHaveBeenCalled()
  })

  it('returns [] without calling IPC when docTypeCodes is empty', async () => {
    expect(await fetchParameterHistory(1, [], 'bilanInitial.examenPhysique.poids')).toEqual([])
    expect(mockIpcInvoke).not.toHaveBeenCalled()
  })

  it('returns [] without calling IPC when the path has no registered meta', async () => {
    expect(await fetchParameterHistory(1, DOC_TYPE_CODES, 'path.inconnu.xyz')).toEqual([])
    expect(mockIpcInvoke).not.toHaveBeenCalled()
  })

  it('supports the flat backend shape (documentTypeCode / documentTypeLabel) and signed status', async () => {
    mockIpcInvoke.mockResolvedValue([
      rawDoc({
        documentType: undefined,
        documentTypeCode: 'CRH_DIABETE',
        documentTypeLabel: 'CRH Diabète signé',
        status: 'signed',
        formData: poidsFormData(76),
      }),
    ])

    const entries = await fetchParameterHistory(1, DOC_TYPE_CODES, 'bilanInitial.examenPhysique.poids')

    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({
      documentId: 'doc-1',
      documentLabel: 'CRH Diabète signé',
      status: 'signed',
      value: 76,
    })
  })

  it('falls back to the doc title for the label when no type label is available', async () => {
    mockIpcInvoke.mockResolvedValue([
      rawDoc({
        documentType: undefined,
        documentTypeCode: 'CRH_DIABETE',
        title: 'CRH Hospitalisation',
        formData: poidsFormData(72),
      }),
    ])

    const entries = await fetchParameterHistory(1, DOC_TYPE_CODES, 'bilanInitial.examenPhysique.poids')

    expect(entries[0].documentLabel).toBe('CRH Hospitalisation')
  })

  it('maps any non-"signed" status to draft', async () => {
    mockIpcInvoke.mockResolvedValue([
      rawDoc({ status: 'signed', formData: poidsFormData(70) }),
      rawDoc({ id: 'draft-2', status: undefined, formData: poidsFormData(71) }),
    ])

    const entries = await fetchParameterHistory(1, DOC_TYPE_CODES, 'bilanInitial.examenPhysique.poids')

    expect(entries[0].status).toBe('signed')
    expect(entries[1].status).toBe('draft')
  })

  it('uses updatedAt as the entry date when createdAt is missing', async () => {
    mockIpcInvoke.mockResolvedValue([
      rawDoc({ createdAt: null, updatedAt: '2025-05-05T09:00:00.000Z', formData: poidsFormData(73) }),
    ])

    const entries = await fetchParameterHistory(1, DOC_TYPE_CODES, 'bilanInitial.examenPhysique.poids')

    expect(entries[0].date).toBe('2025-05-05T09:00:00.000Z')
  })

  it('skips docs whose formData is not valid JSON', async () => {
    mockIpcInvoke.mockResolvedValue([
      rawDoc({ id: 'invalid-json', formData: 'not-json-{{{' }),
      rawDoc({ id: 'valid', formData: poidsFormData(74) }),
    ])

    const entries = await fetchParameterHistory(1, DOC_TYPE_CODES, 'bilanInitial.examenPhysique.poids')

    expect(entries.map(e => e.documentId)).toEqual(['valid'])
  })
})
