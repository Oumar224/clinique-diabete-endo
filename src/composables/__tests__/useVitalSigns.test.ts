// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, defineComponent, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { provideVitalSigns } from '../useVitalSigns'
import type { VitalSignsContext } from '../useVitalSigns'

// ---------------------------------------------------------------------------
// Hoisted – mock functions created before vi.mock runs
// ---------------------------------------------------------------------------
const { mockGetVitalSigns, mockSaveVitalSigns } = vi.hoisted(() => ({
  mockGetVitalSigns: vi.fn(),
  mockSaveVitalSigns: vi.fn(),
}))

// ---------------------------------------------------------------------------
// Mock the API layer
// ---------------------------------------------------------------------------
vi.mock('@/api/vitalSigns', () => ({
  getVitalSigns: mockGetVitalSigns,
  saveVitalSigns: mockSaveVitalSigns,
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
    // By default the API returns null (no vital signs recorded today)
    mockGetVitalSigns.mockResolvedValue(null)
    mockSaveVitalSigns.mockImplementation(async (_pid: number, data: any) =>
      makeRecord(data),
    )
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
      mockGetVitalSigns.mockResolvedValue(
        makeRecord({ date: '2020-01-01T00:00:00.000Z', glycemie: 1.2 }),
      )
      const { ctx } = mountVitalSignsContext(1)
      await nextTick()
      await new Promise(r => setTimeout(r, 0))

      expect(ctx.hasGlycemieToday.value).toBe(false)
    })

    it('returns false when glycemia is null', async () => {
      mockGetVitalSigns.mockResolvedValue(
        makeRecord({ date: new Date().toISOString(), glycemie: null }),
      )
      const { ctx } = mountVitalSignsContext(1)
      await nextTick()
      await new Promise(r => setTimeout(r, 0))

      expect(ctx.hasGlycemieToday.value).toBe(false)
    })

    it('returns false when glycemia is 0', async () => {
      mockGetVitalSigns.mockResolvedValue(
        makeRecord({ date: new Date().toISOString(), glycemie: 0 }),
      )
      const { ctx } = mountVitalSignsContext(1)
      await nextTick()
      await new Promise(r => setTimeout(r, 0))

      expect(ctx.hasGlycemieToday.value).toBe(false)
    })

    it('returns true when glycemia > 0 and date is today', async () => {
      mockGetVitalSigns.mockResolvedValue(
        makeRecord({ date: new Date().toISOString(), glycemie: 1.2 }),
      )
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
      mockGetVitalSigns.mockResolvedValue(null)
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
      }
      await ctx.saveVitalSigns(data)

      expect(mockSaveVitalSigns).toHaveBeenCalledOnce()
      expect(mockSaveVitalSigns).toHaveBeenCalledWith(1, data)
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
      })

      expect(mockSaveVitalSigns).not.toHaveBeenCalled()
      expect(ctx.vitalSigns.value).toBeNull()
    })
  })

  // -----------------------------------------------------------------------
  // fetchVitalSigns
  // -----------------------------------------------------------------------
  describe('fetchVitalSigns', () => {
    it('fetches vital signs from the API on mount (via immediate watch)', async () => {
      mockGetVitalSigns.mockResolvedValue(
        makeRecord({ taSystolique: 140, glycemie: 1.8 }),
      )
      const { ctx } = mountVitalSignsContext(1)
      await nextTick()
      await new Promise(r => setTimeout(r, 0))

      expect(mockGetVitalSigns).toHaveBeenCalledWith(1)
      expect(ctx.vitalSigns.value).not.toBeNull()
      expect(ctx.vitalSigns.value!.taSystolique).toBe(140)
    })

    it('sets vitalSigns to null when patientId is null', async () => {
      const { ctx } = mountVitalSignsContext(null)
      await nextTick()
      await new Promise(r => setTimeout(r, 0))

      expect(mockGetVitalSigns).not.toHaveBeenCalled()
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
      mockGetVitalSigns.mockRejectedValue(new Error('Network error'))
      const { ctx } = mountVitalSignsContext(1)

      // Wait for all promises to settle
      await new Promise(r => setTimeout(r, 0))
      await nextTick()
      await new Promise(r => setTimeout(r, 0))

      expect(ctx.error.value).toBe('Network error')
      expect(ctx.vitalSigns.value).toBeNull()
    })

    it('sets error when save fails', async () => {
      // Start with null data
      mockGetVitalSigns.mockResolvedValue(null)
      mockSaveVitalSigns.mockRejectedValue(new Error('DB timeout'))
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
      })

      expect(ctx.error.value).toBe('DB timeout')
      expect(ctx.vitalSigns.value).toBeNull() // not updated on failure
    })
  })
})
