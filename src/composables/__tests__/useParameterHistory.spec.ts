// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchParameterHistory, fetchParametersHistory } from '../useParameterHistory'
import { formatValue, PARAMETER_GROUPS } from '@/utils/parameter-history'
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

/**
 * Builds a single `vitalSignsHistory` record. The default `date` makes the
 * record usable in every series test; individual tests override it when the
 * ordering of entries by record date matters.
 */
function vitalsRecord(overrides: Record<string, any> = {}): Record<string, any> {
  return {
    _key: 'vs-1',
    date: '2025-01-15T10:00:00.000Z',
    poids: null,
    taille: null,
    ...overrides,
  }
}

/**
 * Builds a formData JSON string carrying a `vitalSignsHistory` collection.
 * This is the shape now read by the series extractors for
 * `bilanInitial.examenPhysique.*` (vitals), `bilanInitial.glasgow.*` and
 * `bilanInitial.scoreDouleur`.
 */
function vitalsFormData(records: Record<string, any>[]): string {
  return JSON.stringify({ bilanInitial: { vitalSignsHistory: records } })
}

/** Shortcut: formData with a single poids measurement. */
function singlePoidsFormData(poids: unknown): string {
  return vitalsFormData([vitalsRecord({ poids })])
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
      rawDoc({ id: 'kept', formData: singlePoidsFormData(75) }),
      rawDoc({
        id: 'excluded-different-code',
        documentType: { code: 'CRC_DIABETE', label: 'CRC Diabète' },
        formData: singlePoidsFormData(80),
      }),
      rawDoc({
        id: 'excluded-no-code',
        documentType: null,
        formData: singlePoidsFormData(82),
      }),
    ])

    const entries = await fetchParameterHistory(1, DOC_TYPE_CODES, 'bilanInitial.examenPhysique.poids')

    expect(entries).toHaveLength(1)
    expect(entries[0].documentId).toBe('kept')
  })

  it('parses formData JSON strings and extracts the value at the dot-path', async () => {
    mockIpcInvoke.mockResolvedValue([
      rawDoc({ formData: singlePoidsFormData(75) }),
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
        formData: vitalsFormData([vitalsRecord({ poids: 75, taille: 170, imc: 999 })]),
      }),
    ])

    const entries = await fetchParameterHistory(1, DOC_TYPE_CODES, 'bilanInitial.examenPhysique.imc')

    expect(entries).toHaveLength(1)
    expect(entries[0].value).toBe(calcIMC(75, 170))
    expect(entries[0].value).not.toBe(999)
  })

  it('produces no IMC entry when poids/taille are missing or non-positive', async () => {
    mockIpcInvoke.mockResolvedValue([
      // No vitalSignsHistory at all → extractor returns [] → no entry.
      rawDoc({ id: 'missing-poids-taille', formData: JSON.stringify({ bilanInitial: {} }) }),
      // poids: 0 → calcIMC rejects non-positive → no entry.
      rawDoc({
        id: 'poids-zero',
        formData: vitalsFormData([vitalsRecord({ poids: 0, taille: 170 })]),
      }),
      // taille: 0 → calcIMC rejects non-positive → no entry.
      rawDoc({
        id: 'taille-zero',
        formData: vitalsFormData([vitalsRecord({ poids: 75, taille: 0 })]),
      }),
      // Valid combo → single entry.
      rawDoc({
        id: 'valid',
        formData: vitalsFormData([vitalsRecord({ poids: 80, taille: 180 })]),
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
      // Record with an empty-string poids → seriesExtract drops it.
      rawDoc({ id: 'empty-string', formData: vitalsFormData([vitalsRecord({ poids: '' })]) }),
      // Record with a null poids → seriesExtract drops it.
      rawDoc({ id: 'null-value', formData: vitalsFormData([vitalsRecord({ poids: null })]) }),
      // No vitalSignsHistory at all → extractor returns [] → no entry.
      rawDoc({ id: 'missing-field', formData: JSON.stringify({ bilanInitial: {} }) }),
      rawDoc({ id: 'valid', formData: vitalsFormData([vitalsRecord({ poids: 70 })]) }),
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
    mockIpcInvoke.mockResolvedValue([rawDoc({ id: 'zero', formData: singlePoidsFormData(0) })])

    const entries = await fetchParameterHistory(1, DOC_TYPE_CODES, 'bilanInitial.examenPhysique.poids')

    expect(entries).toHaveLength(1)
    expect(entries[0].value).toBe(0)
  })

  it('sorts returned entries by record date descending (series paths use the per-measurement date)', async () => {
    // Series entries carry the measurement date of the vitalSignsHistory
    // record, so the ordering is driven by the record `date`, not by the
    // document createdAt. Each doc holds one record dated to set the order.
    mockIpcInvoke.mockResolvedValue([
      rawDoc({
        id: 'oldest',
        formData: vitalsFormData([vitalsRecord({ date: '2024-12-01T08:00:00.000Z', poids: 68 })]),
      }),
      rawDoc({
        id: 'newest',
        formData: vitalsFormData([vitalsRecord({ date: '2025-06-15T08:00:00.000Z', poids: 75 })]),
      }),
      rawDoc({
        id: 'middle',
        formData: vitalsFormData([vitalsRecord({ date: '2025-03-10T08:00:00.000Z', poids: 71 })]),
      }),
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
        formData: singlePoidsFormData(76),
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
        formData: singlePoidsFormData(72),
      }),
    ])

    const entries = await fetchParameterHistory(1, DOC_TYPE_CODES, 'bilanInitial.examenPhysique.poids')

    expect(entries[0].documentLabel).toBe('CRH Hospitalisation')
  })

  it('maps any non-"signed" status to draft', async () => {
    mockIpcInvoke.mockResolvedValue([
      rawDoc({ status: 'signed', formData: singlePoidsFormData(70) }),
      rawDoc({ id: 'draft-2', status: undefined, formData: singlePoidsFormData(71) }),
    ])

    const entries = await fetchParameterHistory(1, DOC_TYPE_CODES, 'bilanInitial.examenPhysique.poids')

    expect(entries[0].status).toBe('signed')
    expect(entries[1].status).toBe('draft')
  })

  it('uses updatedAt as the entry date when createdAt is missing', async () => {
    // Series entries take the measurement date from the record. Here the
    // record carries the same instant as the document updatedAt, so the
    // fallback instant is still surfaced when createdAt is absent.
    mockIpcInvoke.mockResolvedValue([
      rawDoc({
        createdAt: null,
        updatedAt: '2025-05-05T09:00:00.000Z',
        formData: vitalsFormData([vitalsRecord({ date: '2025-05-05T09:00:00.000Z', poids: 73 })]),
      }),
    ])

    const entries = await fetchParameterHistory(1, DOC_TYPE_CODES, 'bilanInitial.examenPhysique.poids')

    expect(entries[0].date).toBe('2025-05-05T09:00:00.000Z')
  })

  it('skips docs whose formData is not valid JSON', async () => {
    mockIpcInvoke.mockResolvedValue([
      rawDoc({ id: 'invalid-json', formData: 'not-json-{{{' }),
      rawDoc({ id: 'valid', formData: singlePoidsFormData(74) }),
    ])

    const entries = await fetchParameterHistory(1, DOC_TYPE_CODES, 'bilanInitial.examenPhysique.poids')

    expect(entries.map(e => e.documentId)).toEqual(['valid'])
  })

  // ─── Time-series extractors: fan-out & per-measurement semantics ──

  it('fans out one doc with two vitalSignsHistory records into two entries', async () => {
    mockIpcInvoke.mockResolvedValue([
      rawDoc({
        id: 'doc-series',
        formData: vitalsFormData([
          vitalsRecord({ _key: 'vs-1', date: '2025-01-10T08:00:00.000Z', poids: 70 }),
          vitalsRecord({ _key: 'vs-2', date: '2025-02-20T09:30:00.000Z', poids: 75 }),
        ]),
        createdAt: '2025-01-01T10:00:00.000Z',
      }),
    ])

    const entries = await fetchParameterHistory(1, DOC_TYPE_CODES, 'bilanInitial.examenPhysique.poids')

    expect(entries).toHaveLength(2)
    // Sorted by record date descending → the newer measurement first.
    expect(entries[0]).toMatchObject({ documentId: 'doc-series', value: 75, date: '2025-02-20T09:30:00.000Z' })
    expect(entries[1]).toMatchObject({ documentId: 'doc-series', value: 70, date: '2025-01-10T08:00:00.000Z' })
  })

  it('skips invalid measurements inside a series (null, "" and missing date) while keeping valid ones', async () => {
    mockIpcInvoke.mockResolvedValue([
      rawDoc({
        id: 'doc-mixed',
        formData: vitalsFormData([
          vitalsRecord({ _key: 'vs-1', date: '2025-01-10T08:00:00.000Z', poids: 70 }),
          vitalsRecord({ _key: 'vs-2', date: '2025-01-11T08:00:00.000Z', poids: null }),
          vitalsRecord({ _key: 'vs-3', date: '2025-01-12T08:00:00.000Z', poids: '' }),
          // Missing date → seriesExtract filters the record out entirely.
          vitalsRecord({ _key: 'vs-4', date: null, poids: 80 }),
        ]),
      }),
    ])

    const entries = await fetchParameterHistory(1, DOC_TYPE_CODES, 'bilanInitial.examenPhysique.poids')

    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({ documentId: 'doc-mixed', value: 70, date: '2025-01-10T08:00:00.000Z' })
  })

  it('extracts the Glasgow series (ouvertureYeux 4 / reponseMotrice 6) with the record date', async () => {
    mockIpcInvoke.mockResolvedValue([
      rawDoc({
        id: 'doc-glasgow',
        formData: JSON.stringify({
          bilanInitial: {
            glasgowHistory: [
              { _key: 'g-1', date: '2025-02-01T14:00:00.000Z', ouvertureYeux: 4, reponseVerbale: 5, reponseMotrice: 6 },
            ],
          },
        }),
      }),
    ])

    const yeux = await fetchParameterHistory(1, DOC_TYPE_CODES, 'bilanInitial.glasgow.ouvertureYeux')
    const motrice = await fetchParameterHistory(1, DOC_TYPE_CODES, 'bilanInitial.glasgow.reponseMotrice')

    expect(yeux).toHaveLength(1)
    expect(yeux[0]).toMatchObject({ documentId: 'doc-glasgow', value: 4, date: '2025-02-01T14:00:00.000Z' })

    expect(motrice).toHaveLength(1)
    expect(motrice[0]).toMatchObject({ documentId: 'doc-glasgow', value: 6, date: '2025-02-01T14:00:00.000Z' })
  })

  it('extracts the douleur series (score 6) from douleurHistory', async () => {
    mockIpcInvoke.mockResolvedValue([
      rawDoc({
        id: 'doc-douleur',
        formData: JSON.stringify({
          bilanInitial: {
            douleurHistory: [
              { _key: 'd-1', date: '2025-03-05T09:00:00.000Z', score: 6 },
            ],
          },
        }),
      }),
    ])

    const entries = await fetchParameterHistory(1, DOC_TYPE_CODES, 'bilanInitial.scoreDouleur')

    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({ documentId: 'doc-douleur', value: 6, date: '2025-03-05T09:00:00.000Z' })
  })

  it('computes one IMC entry per vitalSignsHistory measurement', async () => {
    mockIpcInvoke.mockResolvedValue([
      rawDoc({
        id: 'doc-imc-series',
        formData: vitalsFormData([
          vitalsRecord({ _key: 'vs-1', date: '2025-01-10T08:00:00.000Z', poids: 70, taille: 175 }),
          vitalsRecord({ _key: 'vs-2', date: '2025-02-20T09:30:00.000Z', poids: 75, taille: 180 }),
        ]),
      }),
    ])

    const entries = await fetchParameterHistory(1, DOC_TYPE_CODES, 'bilanInitial.examenPhysique.imc')

    expect(entries).toHaveLength(2)
    // Newest record first.
    expect(entries[0]).toMatchObject({ documentId: 'doc-imc-series', value: calcIMC(75, 180), date: '2025-02-20T09:30:00.000Z' })
    expect(entries[1]).toMatchObject({ documentId: 'doc-imc-series', value: calcIMC(70, 175), date: '2025-01-10T08:00:00.000Z' })
  })

  it('keeps a zero measurement inside a series as a meaningful entry', async () => {
    mockIpcInvoke.mockResolvedValue([
      rawDoc({
        id: 'doc-zero',
        formData: vitalsFormData([vitalsRecord({ date: '2025-04-01T08:00:00.000Z', poids: 0 })]),
      }),
    ])

    const entries = await fetchParameterHistory(1, DOC_TYPE_CODES, 'bilanInitial.examenPhysique.poids')

    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({ documentId: 'doc-zero', value: 0, date: '2025-04-01T08:00:00.000Z' })
  })

  // ─── Glasgow total score (bilanInitial.glasgow.score) ─────────────

  it('computes the Glasgow total score as the extract sum (4+5+6=15) with the record date', async () => {
    mockIpcInvoke.mockResolvedValue([
      rawDoc({
        id: 'doc-glasgow-score',
        formData: JSON.stringify({
          bilanInitial: {
            glasgowHistory: [
              { _key: 'g-1', date: '2025-02-01T14:00:00.000Z', ouvertureYeux: 4, reponseVerbale: 5, reponseMotrice: 6 },
            ],
          },
        }),
      }),
    ])

    const entries = await fetchParameterHistory(1, DOC_TYPE_CODES, 'bilanInitial.glasgow.score')

    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({ documentId: 'doc-glasgow-score', value: 15, date: '2025-02-01T14:00:00.000Z' })
  })

  it('falls back to component maxima for missing Glasgow parts (0/null → oy 4 / rv 5 / rm 6)', async () => {
    // Mirrors glasgowScoreSeriesExtract: oy||4 + rv||5 + rm||6.
    mockIpcInvoke.mockResolvedValue([
      rawDoc({
        id: 'doc-glasgow-partial',
        formData: JSON.stringify({
          bilanInitial: {
            glasgowHistory: [
              { _key: 'g-1', date: '2025-02-02T10:00:00.000Z', ouvertureYeux: 0, reponseVerbale: null, reponseMotrice: 3 },
            ],
          },
        }),
      }),
    ])

    const entries = await fetchParameterHistory(1, DOC_TYPE_CODES, 'bilanInitial.glasgow.score')

    expect(entries).toHaveLength(1)
    // 4 (fallback) + 5 (fallback) + 3 = 12.
    expect(entries[0].value).toBe(12)
  })

  it('skips Glasgow score records without a date', async () => {
    mockIpcInvoke.mockResolvedValue([
      rawDoc({
        id: 'doc-glasgow-nodate',
        formData: JSON.stringify({
          bilanInitial: {
            glasgowHistory: [
              { _key: 'g-1', date: null, ouvertureYeux: 4, reponseVerbale: 5, reponseMotrice: 6 },
              { _key: 'g-2', date: '2025-02-03T10:00:00.000Z', ouvertureYeux: 3, reponseVerbale: 4, reponseMotrice: 5 },
            ],
          },
        }),
      }),
    ])

    const entries = await fetchParameterHistory(1, DOC_TYPE_CODES, 'bilanInitial.glasgow.score')

    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({ value: 12, date: '2025-02-03T10:00:00.000Z' })
  })
})

describe('fetchParametersHistory (batch)', () => {
  beforeEach(() => {
    mockIpcInvoke.mockReset()
  })

  function batchDoc(overrides: Record<string, any> = {}): Record<string, any> {
    return rawDoc({
      id: 'doc-batch',
      formData: JSON.stringify({
        bilanInitial: {
          vitalSignsHistory: [
            { _key: 'vs-1', date: '2025-03-15T10:00:00.000Z', poids: 75, taille: 170 },
          ],
          glasgowHistory: [
            { _key: 'g-1', date: '2025-03-15T11:00:00.000Z', ouvertureYeux: 4, reponseVerbale: 5, reponseMotrice: 6 },
          ],
          douleurHistory: [
            { _key: 'd-1', date: '2025-03-15T12:00:00.000Z', score: 6 },
          ],
        },
      }),
      createdAt: '2025-03-15T10:00:00.000Z',
      ...overrides,
    })
  }

  it('exposes the expected PARAMETER_GROUPS cardinalities (vitals 13, glasgow 4, douleur 1)', () => {
    expect(PARAMETER_GROUPS.vitals).toHaveLength(13)
    expect(PARAMETER_GROUPS.glasgow).toHaveLength(4)
    expect(PARAMETER_GROUPS.douleur).toHaveLength(1)
    expect(PARAMETER_GROUPS.glasgow).toContain('bilanInitial.glasgow.score')
  })

  it('issues a single IPC round-trip and fans out per path (poids + glasgow.score + douleur)', async () => {
    mockIpcInvoke.mockResolvedValue([batchDoc()])

    const byPath = await fetchParametersHistory(1, DOC_TYPE_CODES, [
      'bilanInitial.examenPhysique.poids',
      'bilanInitial.glasgow.score',
      'bilanInitial.scoreDouleur',
    ])

    expect(mockIpcInvoke).toHaveBeenCalledTimes(1)
    expect(mockIpcInvoke).toHaveBeenCalledWith('clinical-documents:list-by-patient', { patientId: 1 })
    expect(byPath['bilanInitial.examenPhysique.poids']).toMatchObject([{ value: 75 }])
    expect(byPath['bilanInitial.glasgow.score']).toMatchObject([{ value: 15 }])
    expect(byPath['bilanInitial.scoreDouleur']).toMatchObject([{ value: 6 }])
  })

  it('resolves unknown paths to [] without throwing and still fetches known paths', async () => {
    mockIpcInvoke.mockResolvedValue([batchDoc()])

    const byPath = await fetchParametersHistory(1, DOC_TYPE_CODES, [
      'bilanInitial.examenPhysique.poids',
      'path.inconnu.xyz',
    ])

    expect(byPath['path.inconnu.xyz']).toEqual([])
    expect(byPath['bilanInitial.examenPhysique.poids']).toHaveLength(1)
  })

  it('sorts entries newest-first independently per path', async () => {
    mockIpcInvoke.mockResolvedValue([
      batchDoc({
        id: 'doc-old',
        formData: JSON.stringify({
          bilanInitial: {
            vitalSignsHistory: [{ _key: 'vs-1', date: '2025-01-10T08:00:00.000Z', poids: 70 }],
            douleurHistory: [{ _key: 'd-1', date: '2025-06-01T08:00:00.000Z', score: 8 }],
          },
        }),
      }),
      batchDoc({
        id: 'doc-new',
        formData: JSON.stringify({
          bilanInitial: {
            vitalSignsHistory: [{ _key: 'vs-2', date: '2025-05-20T08:00:00.000Z', poids: 80 }],
            douleurHistory: [{ _key: 'd-2', date: '2025-02-01T08:00:00.000Z', score: 3 }],
          },
        }),
      }),
    ])

    const byPath = await fetchParametersHistory(1, DOC_TYPE_CODES, [
      'bilanInitial.examenPhysique.poids',
      'bilanInitial.scoreDouleur',
    ])

    // Poids: newest measurement first (doc-new 80, then doc-old 70).
    expect(byPath['bilanInitial.examenPhysique.poids'].map((e) => e.value)).toEqual([80, 70])
    // Douleur: opposite document order — sorting is per path, not global.
    expect(byPath['bilanInitial.scoreDouleur'].map((e) => e.value)).toEqual([8, 3])
  })

  it('returns empty arrays per path without calling IPC when patientId is null or codes/paths are empty', async () => {
    const paths = ['bilanInitial.examenPhysique.poids', 'bilanInitial.glasgow.score']

    expect(await fetchParametersHistory(null, DOC_TYPE_CODES, paths)).toEqual({
      'bilanInitial.examenPhysique.poids': [],
      'bilanInitial.glasgow.score': [],
    })
    expect(await fetchParametersHistory(1, [], paths)).toEqual({
      'bilanInitial.examenPhysique.poids': [],
      'bilanInitial.glasgow.score': [],
    })
    expect(await fetchParametersHistory(1, DOC_TYPE_CODES, [])).toEqual({})
    expect(mockIpcInvoke).not.toHaveBeenCalled()
  })

  it('keeps 0/false while skipping null/undefined/"" across the batch', async () => {
    mockIpcInvoke.mockResolvedValue([
      rawDoc({
        id: 'doc-mixed',
        formData: JSON.stringify({
          bilanInitial: { vitalSignsHistory: [{ _key: 'vs-1', date: '2025-04-01T08:00:00.000Z', poids: 0 }] },
          modeVieAtcd: { isolement: false },
        }),
      }),
    ])

    const byPath = await fetchParametersHistory(1, DOC_TYPE_CODES, [
      'bilanInitial.examenPhysique.poids',
      'modeVieAtcd.isolement',
    ])

    expect(byPath['bilanInitial.examenPhysique.poids']).toMatchObject([{ value: 0 }])
    expect(byPath['modeVieAtcd.isolement']).toMatchObject([{ value: false }])
  })
})