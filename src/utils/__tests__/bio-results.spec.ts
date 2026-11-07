import { describe, it, expect } from 'vitest'
import {
  normParamName,
  isHbA1c,
  isLdl,
  isHdl,
  isTriglycerides,
  bioDateKey,
  latestBioValue,
  latestBioSeries,
} from '../bio-results'
import type { BilanBioResult } from '@/types/crh-diabete'

describe('normParamName', () => {
  it('trims, lowercases and strips diacritics', () => {
    expect(normParamName('  Hémoglobine Glyquée  ')).toBe('hemoglobine glyquee')
    expect(normParamName('TRIGLYCÉRIDES')).toBe('triglycerides')
    expect(normParamName('LDL-c')).toBe('ldl-c')
    expect(normParamName('Lipoprotéines de basse densité')).toBe('lipoproteines de basse densite')
  })

  it('handles undefined / null input as empty string', () => {
    expect(normParamName(undefined as unknown as string)).toBe('')
    expect(normParamName(null as unknown as string)).toBe('')
  })
})

describe('matchers (case/accents insensitive)', () => {
  it('isHbA1c matches hba1c variants and hémoglobine glyquée', () => {
    expect(isHbA1c('HbA1c')).toBe(true)
    expect(isHbA1c('hba1c')).toBe(true)
    expect(isHbA1c('HBA1C (%)')).toBe(true)
    expect(isHbA1c('Hémoglobine glyquée')).toBe(true)
    expect(isHbA1c('hémoglobine glyquée (HbA1c)')).toBe(true)
    expect(isHbA1c('Glycémie')).toBe(false)
    expect(isHbA1c('Créatinine')).toBe(false)
  })

  it('isLdl matches ldl / ldl-c / lipoprotéines basse densité', () => {
    expect(isLdl('LDL')).toBe(true)
    expect(isLdl('LDL-c')).toBe(true)
    expect(isLdl('Lipoprotéines de basse densité')).toBe(true)
    expect(isLdl('LIPOPROTÉINES BASSE DENSITÉ')).toBe(true)
    expect(isLdl('HDL')).toBe(false)
    expect(isLdl('Cholestérol total')).toBe(false)
  })

  it('isHdl matches hdl / hdl-c / lipoprotéines de haute densité', () => {
    expect(isHdl('HDL')).toBe(true)
    expect(isHdl('HDL-c')).toBe(true)
    expect(isHdl('Lipoprotéines de haute densité')).toBe(true)
    expect(isHdl('lipoprotéine de haute densité')).toBe(true)
    expect(isHdl('LIPOPROTÉINES HAUTE DENSITÉ')).toBe(true)
    // m2: « haute densité » alone no longer matches (symétrique de isLdl)
    expect(isHdl('HAUTE DENSITÉ')).toBe(false)
    expect(isHdl('LDL')).toBe(false)
    expect(isHdl('Triglycérides')).toBe(false)
  })

  it('isTriglycerides matches any trigly* name', () => {
    expect(isTriglycerides('Triglycérides')).toBe(true)
    expect(isTriglycerides('TRIGLYCÉRIDES')).toBe(true)
    expect(isTriglycerides('triglycerides')).toBe(true)
    expect(isTriglycerides('Cholestérol total')).toBe(false)
    expect(isTriglycerides('HDL')).toBe(false)
  })
})

describe('bioDateKey', () => {
  it('parses requestDate (YYYY-MM-DD) as local midnight', () => {
    expect(bioDateKey({ requestDate: '2026-01-10' })).toBe(new Date('2026-01-10T00:00:00').getTime())
  })

  it('parses filledAt / createdAt (YYYY-MM-DD HH:mm:ss, space separator)', () => {
    expect(bioDateKey({ filledAt: '2026-01-10 08:30:00' })).toBe(new Date('2026-01-10T08:30:00').getTime())
    expect(bioDateKey({ createdAt: '2026-01-10 08:30:00' })).toBe(new Date('2026-01-10T08:30:00').getTime())
  })

  it('prefers requestDate over filledAt over createdAt', () => {
    const r = { requestDate: '2026-01-10', filledAt: '2025-01-01 08:00:00', createdAt: '2024-01-01 08:00:00' }
    expect(bioDateKey(r)).toBe(new Date('2026-01-10T00:00:00').getTime())
  })

  it('supports YYYY-MM month-only values', () => {
    expect(bioDateKey({ requestDate: '2026-01' })).toBe(Date.UTC(2026, 0, 1))
    expect(bioDateKey({ requestDate: '2026-01' })).toBeLessThan(bioDateKey({ requestDate: '2026-02-01' }))
  })

  it('returns 0 when no date is present or the date is unparsable', () => {
    expect(bioDateKey({})).toBe(0)
    expect(bioDateKey({ requestDate: 'not-a-date' })).toBe(0)
    expect(bioDateKey({ filledAt: '' })).toBe(0)
  })

  it('sorts years correctly (handles "années" across the 2025/2026 boundary)', () => {
    expect(bioDateKey({ requestDate: '2026-01-02' })).toBeGreaterThan(bioDateKey({ requestDate: '2025-12-31' }))
  })
})

describe('latestBioSeries / latestBioValue', () => {
  const hba1cOlder: BilanBioResult = { parameterName: 'HbA1c', parameterUnit: '%', value: '8.1', requestDate: '2025-11-02' }
  const hba1cNewer: BilanBioResult = { parameterName: 'HbA1c', parameterUnit: '%', value: '7.2', requestDate: '2026-01-10' }

  it('returns the most recent matching result (latest date wins)', () => {
    const results = [hba1cOlder, hba1cNewer]
    expect(latestBioValue(results, isHbA1c)).toBe(hba1cNewer)
  })

  it('sorts the series newest-first', () => {
    const results = [hba1cNewer, { parameterName: 'HbA1c', value: '8.9', requestDate: '2025-06-01' }, hba1cOlder]
    const series = latestBioSeries(results, isHbA1c)
    expect(series.map(r => r.value)).toEqual(['7.2', '8.1', '8.9'])
  })

  it('uses filledAt when requestDate is missing (and createdAt as last resort)', () => {
    const noRequest = { parameterName: 'HbA1c', value: '6.9', filledAt: '2026-01-20 08:00:00' }
    const onlyCreated = { parameterName: 'HbA1c', value: '7.5', createdAt: '2026-01-15 08:00:00' }
    expect(latestBioValue([hba1cNewer, noRequest], isHbA1c)).toBe(noRequest)
    expect(latestBioValue([hba1cNewer, onlyCreated], isHbA1c)).toBe(onlyCreated)
  })

  it('ignores results without parameterName or with empty value', () => {
    const results: BilanBioResult[] = [
      { parameterName: 'HbA1c', value: '' },
      { parameterName: '', value: '7.2' },
      hba1cNewer,
    ]
    expect(latestBioValue(results, isHbA1c)).toBe(hba1cNewer)
  })

  it('keeps the LAST entry on equal dates (most recent write wins)', () => {
    const a = { parameterName: 'HbA1c', value: '7.1', requestDate: '2026-01-10' }
    const b = { parameterName: 'HbA1c', value: '7.2', requestDate: '2026-01-10' }
    expect(latestBioValue([a, b], isHbA1c)).toBe(b)
  })

  it('returns undefined when nothing matches (or no usable result)', () => {
    expect(latestBioValue([], isHbA1c)).toBeUndefined()
    expect(latestBioValue([{ parameterName: 'Glycémie', value: '1.1' }], isLdl)).toBeUndefined()
    expect(latestBioValue([{ parameterName: 'HbA1c', value: '' }], isHbA1c)).toBeUndefined()
  })

  it('throws when results is not an array', () => {
    expect(() => latestBioValue(undefined as unknown as BilanBioResult[], isHbA1c)).toThrow(TypeError)
  })
})