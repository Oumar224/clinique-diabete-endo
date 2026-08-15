// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, defineComponent, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { provideVitalSigns, deleteVitalSignsItem } from '../useVitalSigns'
import type { VitalSignsContext } from '../useVitalSigns'

// ---------------------------------------------------------------------------
// Hoisted – mock functions created before vi.mock runs
// ---------------------------------------------------------------------------
const mockIpcInvoke = vi.hoisted(() => vi.fn())

// ---------------------------------------------------------------------------
// Mock the IPC layer
// ---------------------------------------------------------------------------
vi.mock('@/utils/ipc', () => ({
  ipcInvoke: mockIpcInvoke,
}))

// ---------------------------------------------------------------------------
// Helper: mount a minimal wrapper that calls provideVitalSigns and exposes
// its context so tests can inspect it.
// ---------------------------------------------------------------------------
function mountVitalSignsContext(patientIdValue: number | null) {
  const patientId = ref<number | null>(patientIdValue)
  let ctx!: VitalSignsContext

  mount(
    defineComponent({
      setup() {
        ctx = provideVitalSigns(patientId)
        return () => null
      },
      template: '<div />',
    }),
    { global: { stubs: { 'el-*': true } } },
  )

  return { ctx, patientId }
}

// ---------------------------------------------------------------------------
// Factory for mock API records
// ---------------------------------------------------------------------------
function makeRecord(overrides: Partial<{
  id: number
  patientId: number
  date: string
  taSystolique: number | null
  taDiastolique: number | null
  frequenceCardiaque: number | null
  temperature: number | null
  glycemie: number | null
  cetonemie: number | null
  glucosurie: string | null
  cetonurie: string | null
  saO2: number | null
  diurese: number | null
  poids: number | null
  createdBy: number
  createdAt: string
  updatedAt: string
}> = {}) {
  return {
    id: 1,
    patientId: 1,
    date: new Date().toISOString(),
    taSystolique: 120,
    taDiastolique: 80,
    frequenceCardiaque: 72,
    temperature: 37.0,
    glycemie: null,
    cetonemie: null,
    glucosurie: null,
    cetonurie: null,
    saO2: null,
    diurese: null,
    poids: null,
    createdBy: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// provideVitalSigns
// ---------------------------------------------------------------------------
describe('provideVitalSigns', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: get returns null (no vital signs today), save returns a record
    mockIpcInvoke.mockImplementation(async (channel: string, params?: any) => {
      if (channel === 'vital-signs:get-today') return null
      if (channel === 'vital-signs:save') return makeRecord(params)
      return null
    })
  })

  // -----------------------------------------------------------------------
  // hasGlycemieToday
  // -----------------------------------------------------------------------
  describe('hasGlycemieToday', () => {
    it('returns false when no vital signs exist (API returns null)', async () => {
      const { ctx } = mountVitalSignsContext(1)
      // Wait for the immediate watch → fetchVitalSigns → API → settles
      await nextTick()
      await new Promise(r => setTimeout(r, 0))

      expect(ctx.hasGlycemieToday.value).toBe(false)
    })

    it('returns false when vital signs exist but date is not today', async () => {
      mockIpcInvoke.mockImplementation(async (channel: string, params?: any) => {
        if (channel === 'vital-signs:get-today') return makeRecord({ date: '2020-01-01T00:00:00.000Z', glycemie: 1.2 })
        if (channel === 'vital-signs:save') return makeRecord(params)
        return null
      })
      const { ctx } = mountVitalSignsContext(1)
      await nextTick()
      await new Promise(r => setTimeout(r, 0))

      expect(ctx.hasGlycemieToday.value).toBe(false)
    })

    it('returns false when glycemia is null', async () => {
      mockIpcInvoke.mockImplementation(async (channel: string, params?: any) => {
        if (channel === 'vital-signs:get-today') return makeRecord({ date: new Date().toISOString(), glycemie: null })
        if (channel === 'vital-signs:save') return makeRecord(params)
        return null
      })
      const { ctx } = mountVitalSignsContext(1)
      await nextTick()
      await new Promise(r => setTimeout(r, 0))

      expect(ctx.hasGlycemieToday.value).toBe(false)
    })

    it('returns false when glycemia is 0', async () => {
      mockIpcInvoke.mockImplementation(async (channel: string, params?: any) => {
        if (channel === 'vital-signs:get-today') return makeRecord({ date: new Date().toISOString(), glycemie: 0 })
        if (channel === 'vital-signs:save') return makeRecord(params)
        return null
      })
      const { ctx } = mountVitalSignsContext(1)
      await nextTick()
      await new Promise(r => setTimeout(r, 0))

      expect(ctx.hasGlycemieToday.value).toBe(false)
    })

    it('returns true when glycemia > 0 and date is today', async () => {
      mockIpcInvoke.mockImplementation(async (channel: string, params?: any) => {
        if (channel === 'vital-signs:get-today') return makeRecord({ date: new Date().toISOString(), glycemie: 1.2 })
        if (channel === 'vital-signs:save') return makeRecord(params)
        return null
      })
      const { ctx } = mountVitalSignsContext(1)
      await nextTick()
      await new Promise(r => setTimeout(r, 0))

      expect(ctx.hasGlycemieToday.value).toBe(true)
    })
  })

  // -----------------------------------------------------------------------
  // saveVitalSigns
  // -----------------------------------------------------------------------
  describe('saveVitalSigns', () => {
    it('saves data and updates vitalSigns ref', async () => {
      const { ctx } = mountVitalSignsContext(1)
      await nextTick()
      await new Promise(r => setTimeout(r, 0))

      // Initially null
      expect(ctx.vitalSigns.value).toBeNull()

      // Save some data
      const data = {
        date: new Date().toISOString(),
        taSystolique: 130,
        taDiastolique: 85,
        frequenceCardiaque: 80,
        temperature: 37.5,
        glycemie: 1.5,
        cetonemie: null,
        glucosurie: null,
        cetonurie: null,
        saO2: null,
        diurese: null,
        poids: null,
      }
      await ctx.saveVitalSigns(data)

      // Check that ipcInvoke was called with 'vital-signs:save' channel
      const saveCalls = mockIpcInvoke.mock.calls.filter(([ch]: [string]) => ch === 'vital-signs:save')
      expect(saveCalls).toHaveLength(1)
      expect(saveCalls[0][1]).toEqual({ patientId: 1, ...data })
      expect(ctx.vitalSigns.value).not.toBeNull()
      expect(ctx.vitalSigns.value!.taSystolique).toBe(130)
    })

    it('makes hasGlycemieToday return true after saving with positive glycemia', async () => {
      const { ctx } = mountVitalSignsContext(1)
      await nextTick()
      await new Promise(r => setTimeout(r, 0))

      await ctx.saveVitalSigns({
        date: new Date().toISOString(),
        taSystolique: 120,
        taDiastolique: 80,
        frequenceCardiaque: 72,
        temperature: 37.0,
        glycemie: 1.2,
        cetonemie: null,
        glucosurie: null,
        cetonurie: null,
        saO2: null,
        diurese: null,
        poids: null,
      })

      expect(ctx.hasGlycemieToday.value).toBe(true)
    })

    it('does nothing when patientId is null', async () => {
      const { ctx } = mountVitalSignsContext(null)
      await nextTick()
      await new Promise(r => setTimeout(r, 0))

      await ctx.saveVitalSigns({
        date: new Date().toISOString(),
        taSystolique: 120,
        taDiastolique: 80,
        frequenceCardiaque: 72,
        temperature: 37.0,
        glycemie: 1.2,
        cetonemie: null,
        glucosurie: null,
        cetonurie: null,
        saO2: null,
        diurese: null,
        poids: null,
      })

      const saveCalls = mockIpcInvoke.mock.calls.filter(([ch]: [string]) => ch === 'vital-signs:save')
      expect(saveCalls).toHaveLength(0)
      expect(ctx.vitalSigns.value).toBeNull()
    })
  })

  // -----------------------------------------------------------------------
  // fetchVitalSigns
  // -----------------------------------------------------------------------
  describe('fetchVitalSigns', () => {
    it('fetches vital signs from the API on mount (via immediate watch)', async () => {
      mockIpcInvoke.mockImplementation(async (channel: string, params?: any) => {
        if (channel === 'vital-signs:get-today') return makeRecord({ taSystolique: 140, glycemie: 1.8 })
        if (channel === 'vital-signs:save') return makeRecord(params)
        return null
      })
      const { ctx } = mountVitalSignsContext(1)
      await nextTick()
      await new Promise(r => setTimeout(r, 0))

      expect(mockIpcInvoke).toHaveBeenCalledWith('vital-signs:get-today', { patientId: 1 })
      expect(ctx.vitalSigns.value).not.toBeNull()
      expect(ctx.vitalSigns.value!.taSystolique).toBe(140)
    })

    it('sets vitalSigns to null when patientId is null', async () => {
      const { ctx } = mountVitalSignsContext(null)
      await nextTick()
      await new Promise(r => setTimeout(r, 0))

      const getCalls = mockIpcInvoke.mock.calls.filter(([ch]: [string]) => ch === 'vital-signs:get-today')
      expect(getCalls).toHaveLength(0)
      expect(ctx.vitalSigns.value).toBeNull()
    })
  })

  // -----------------------------------------------------------------------
  // resetVitalSigns
  // -----------------------------------------------------------------------
  describe('resetVitalSigns', () => {
    it('clears vitalSigns and error', async () => {
      const { ctx } = mountVitalSignsContext(1)
      await nextTick()
      await new Promise(r => setTimeout(r, 0))

      // Save some data first
      await ctx.saveVitalSigns({
        date: new Date().toISOString(),
        taSystolique: 120,
        taDiastolique: 80,
        frequenceCardiaque: 72,
        temperature: 37.0,
        glycemie: 1.2,
        cetonemie: null,
        glucosurie: null,
        cetonurie: null,
        saO2: null,
        diurese: null,
        poids: null,
      })

      expect(ctx.vitalSigns.value).not.toBeNull()

      ctx.resetVitalSigns()
      expect(ctx.vitalSigns.value).toBeNull()
      expect(ctx.hasGlycemieToday.value).toBe(false)
    })

    it('is safe to call when already null', () => {
      const { ctx } = mountVitalSignsContext(null)
      expect(() => ctx.resetVitalSigns()).not.toThrow()
      expect(ctx.vitalSigns.value).toBeNull()
    })
  })

  // -----------------------------------------------------------------------
  // Error handling
  // -----------------------------------------------------------------------
  describe('error handling', () => {
    it('sets error when fetch fails', async () => {
      mockIpcInvoke.mockImplementation(async (channel: string) => {
        if (channel === 'vital-signs:get-today') throw new Error('Network error')
        return null
      })
      const { ctx } = mountVitalSignsContext(1)

      // Wait for all promises to settle
      await new Promise(r => setTimeout(r, 0))
      await nextTick()
      await new Promise(r => setTimeout(r, 0))

      expect(ctx.error.value).toBe('Network error')
      expect(ctx.vitalSigns.value).toBeNull()
    })

    it('sets error when save fails', async () => {
      mockIpcInvoke.mockImplementation(async (channel: string, params?: any) => {
        if (channel === 'vital-signs:get-today') return null
        if (channel === 'vital-signs:save') throw new Error('DB timeout')
        return null
      })
      const { ctx } = mountVitalSignsContext(1)
      await nextTick()
      await new Promise(r => setTimeout(r, 0))

      await ctx.saveVitalSigns({
        date: new Date().toISOString(),
        taSystolique: 120,
        taDiastolique: 80,
        frequenceCardiaque: 72,
        temperature: 37.0,
        glycemie: 1.2,
        cetonemie: null,
        glucosurie: null,
        cetonurie: null,
        saO2: null,
        diurese: null,
        poids: null,
      })

      expect(ctx.error.value).toBe('DB timeout')
      expect(ctx.vitalSigns.value).toBeNull() // not updated on failure
    })
  })
})

// ---------------------------------------------------------------------------
// deleteVitalSignsItem
// ---------------------------------------------------------------------------
describe('deleteVitalSignsItem', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIpcInvoke.mockResolvedValue({ success: true, data: null })
  })

  it('calls ipcInvoke with the vital-signs-items:delete channel and the id', async () => {
    await deleteVitalSignsItem(42)
    expect(mockIpcInvoke).toHaveBeenCalledWith('vital-signs-items:delete', { id: 42 })
  })

  it('propagates backend errors', async () => {
    mockIpcInvoke.mockRejectedValue(new Error('Delete failed'))
    await expect(deleteVitalSignsItem(7)).rejects.toThrow('Delete failed')
  })
})
