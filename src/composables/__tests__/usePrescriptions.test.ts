// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { nextTick, defineComponent } from 'vue'
import { mount } from '@vue/test-utils'

// ---------------------------------------------------------------------------
// Mock ipcInvoke
// ---------------------------------------------------------------------------
const mockIpcInvoke = vi.hoisted(() => vi.fn())

vi.mock('@/utils/ipc', () => ({
  ipcInvoke: mockIpcInvoke,
}))

// ---------------------------------------------------------------------------
// Import after mock
// ---------------------------------------------------------------------------
import { usePrescriptions } from '../usePrescriptions'
import type { PrescriptionRecord, PrescriptionInput, PrescriptionCreateResult } from '../usePrescriptions'

// ---------------------------------------------------------------------------
// Helper: mount the composable in a Vue lifecycle
// ---------------------------------------------------------------------------
function mountComposable() {
  let ctx!: ReturnType<typeof usePrescriptions>
  mount(
    defineComponent({
      setup() {
        ctx = usePrescriptions()
        return () => null
      },
    }),
  )
  return ctx
}

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------
function makePrescription(overrides: Partial<PrescriptionRecord> = {}): PrescriptionRecord {
  return {
    id: 1,
    patientId: 10,
    type: 'medicament',
    medicament: 'Metformine',
    dosage: '850mg',
    voie: 'PO',
    duree: 30,
    dureeType: 'courte',
    frequence: ['matin'],
    prn: false,
    instructions: null,
    datePrescription: '2025-01-15',
    prescripteurId: 1,
    statut: 'active',
    createdAt: '2025-01-15T10:00:00Z',
    updatedAt: '2025-01-15T10:00:00Z',
    ...overrides,
  }
}

function makeCreateResult(overrides: Partial<PrescriptionCreateResult> = {}): PrescriptionCreateResult {
  return {
    prescription: makePrescription(),
    itemsGenerated: 5,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('usePrescriptions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // -----------------------------------------------------------------------
  // fetchPrescriptions
  // -----------------------------------------------------------------------
  describe('fetchPrescriptions', () => {
    it('loads prescriptions into the ref', async () => {
      const records = [makePrescription({ id: 1 }), makePrescription({ id: 2 })]
      mockIpcInvoke.mockResolvedValueOnce(records)

      const ctx = mountComposable()
      await ctx.fetchPrescriptions(10)

      expect(ctx.prescriptions.value).toHaveLength(2)
      expect(ctx.prescriptions.value[0].id).toBe(1)
    })

    it('sets loading to true during fetch and false after', async () => {
      let resolvePromise: (v: any) => void
      mockIpcInvoke.mockReturnValueOnce(new Promise((r) => { resolvePromise = r }))

      const ctx = mountComposable()
      const promise = ctx.fetchPrescriptions(10)
      expect(ctx.loading.value).toBe(true)

      resolvePromise!([])
      await promise
      expect(ctx.loading.value).toBe(false)
    })

    it('sets error on failure', async () => {
      mockIpcInvoke.mockRejectedValueOnce(new Error('Network error'))

      const ctx = mountComposable()
      await ctx.fetchPrescriptions(10)

      expect(ctx.error.value).toBe('Network error')
      expect(ctx.prescriptions.value).toEqual([])
    })

    it('clears previous error before fetch', async () => {
      mockIpcInvoke.mockRejectedValueOnce(new Error('fail 1'))
      const ctx = mountComposable()
      await ctx.fetchPrescriptions(10)
      expect(ctx.error.value).toBe('fail 1')

      mockIpcInvoke.mockResolvedValueOnce([])
      await ctx.fetchPrescriptions(10)
      expect(ctx.error.value).toBeNull()
    })

    it('handles null result as empty array', async () => {
      mockIpcInvoke.mockResolvedValueOnce(null)

      const ctx = mountComposable()
      await ctx.fetchPrescriptions(10)
      expect(ctx.prescriptions.value).toEqual([])
    })

    it('calls ipcInvoke with correct channel and params', async () => {
      mockIpcInvoke.mockResolvedValueOnce([])
      const ctx = mountComposable()
      await ctx.fetchPrescriptions(42)
      expect(mockIpcInvoke).toHaveBeenCalledWith('prescription:list', { patientId: 42 })
    })
  })

  // -----------------------------------------------------------------------
  // getPrescription
  // -----------------------------------------------------------------------
  describe('getPrescription', () => {
    it('returns a prescription by id', async () => {
      const record = makePrescription({ id: 5 })
      mockIpcInvoke.mockResolvedValueOnce(record)

      const ctx = mountComposable()
      const result = await ctx.getPrescription(5)
      expect(result).toEqual(record)
    })

    it('returns null when not found', async () => {
      mockIpcInvoke.mockResolvedValueOnce(null)

      const ctx = mountComposable()
      const result = await ctx.getPrescription(999)
      expect(result).toBeNull()
    })

    it('sets error on failure', async () => {
      mockIpcInvoke.mockRejectedValueOnce(new Error('Not found'))

      const ctx = mountComposable()
      const result = await ctx.getPrescription(999)
      expect(result).toBeNull()
      expect(ctx.error.value).toBe('Not found')
    })

    it('calls ipcInvoke with correct channel', async () => {
      mockIpcInvoke.mockResolvedValueOnce(null)
      const ctx = mountComposable()
      await ctx.getPrescription(7)
      expect(mockIpcInvoke).toHaveBeenCalledWith('prescription:get', { id: 7 })
    })

    it('manages loading state', async () => {
      mockIpcInvoke.mockResolvedValueOnce(null)
      const ctx = mountComposable()
      expect(ctx.loading.value).toBe(false)
      await ctx.getPrescription(1)
      expect(ctx.loading.value).toBe(false)
    })
  })

  // -----------------------------------------------------------------------
  // createPrescription
  // -----------------------------------------------------------------------
  describe('createPrescription', () => {
    it('creates a prescription and returns result', async () => {
      const createResult = makeCreateResult()
      mockIpcInvoke.mockResolvedValueOnce(createResult)

      const ctx = mountComposable()
      const result = await ctx.createPrescription(10, {
        type: 'medicament',
        medicament: 'Doliprane',
        dosage: '1g',
        voie: 'PO',
        duree: 7,
        dureeType: 'longue',
        frequence: ['matin', 'soir'],
        prn: false,
        instructions: null,
        prescripteurId: 1,
      })

      expect(result).toEqual(createResult)
      expect(mockIpcInvoke).toHaveBeenCalledWith('prescription:create', expect.objectContaining({
        patientId: 10,
        medicament: 'Doliprane',
        dureeType: 'longue',
        prescripteurId: 1,
      }))
    })

    it('returns null on failure', async () => {
      mockIpcInvoke.mockRejectedValueOnce(new Error('Create failed'))

      const ctx = mountComposable()
      const result = await ctx.createPrescription(10, {
        type: 'medicament',
        medicament: 'Doliprane',
        dosage: '1g',
        voie: 'PO',
        duree: 7,
        frequence: ['matin'],
        prn: false,
        instructions: null,
        prescripteurId: 1,
      })

      expect(result).toBeNull()
      expect(ctx.error.value).toBe('Create failed')
    })

    it('manages loading state', async () => {
      mockIpcInvoke.mockResolvedValueOnce(makeCreateResult())
      const ctx = mountComposable()
      const promise = ctx.createPrescription(10, {
        type: 'medicament',
        medicament: 'Doliprane',
        dosage: '1g',
        voie: 'PO',
        duree: 7,
        frequence: ['matin'],
        prn: false,
        instructions: null,
        prescripteurId: 1,
      })
      expect(ctx.loading.value).toBe(true)
      await promise
      expect(ctx.loading.value).toBe(false)
    })
  })

  // -----------------------------------------------------------------------
  // updatePrescription
  // -----------------------------------------------------------------------
  describe('updatePrescription', () => {
    it('updates a prescription and returns result', async () => {
      const updateResult = { prescription: makePrescription({ id: 3 }), itemsGenerated: 2 }
      mockIpcInvoke.mockResolvedValueOnce(updateResult)

      const ctx = mountComposable()
      const result = await ctx.updatePrescription(3, { dosage: '500mg', dureeType: 'longue' })

      expect(result).toEqual(updateResult)
      expect(mockIpcInvoke).toHaveBeenCalledWith('prescription:update', { id: 3, dosage: '500mg', dureeType: 'longue' })
    })

    it('returns null on failure', async () => {
      mockIpcInvoke.mockRejectedValueOnce(new Error('Update failed'))

      const ctx = mountComposable()
      const result = await ctx.updatePrescription(3, { dosage: '500mg' })

      expect(result).toBeNull()
      expect(ctx.error.value).toBe('Update failed')
    })

    it('manages loading state', async () => {
      mockIpcInvoke.mockResolvedValueOnce({ prescription: makePrescription(), itemsGenerated: 0 })
      const ctx = mountComposable()
      const promise = ctx.updatePrescription(3, {})
      expect(ctx.loading.value).toBe(true)
      await promise
      expect(ctx.loading.value).toBe(false)
    })
  })

  // -----------------------------------------------------------------------
  // stopPrescription
  // -----------------------------------------------------------------------
  describe('stopPrescription', () => {
    it('calls ipcInvoke with correct channel', async () => {
      mockIpcInvoke.mockResolvedValueOnce(undefined)

      const ctx = mountComposable()
      await ctx.stopPrescription(4)
      expect(mockIpcInvoke).toHaveBeenCalledWith('prescription:stop', { id: 4 })
    })

    it('sets error on failure', async () => {
      mockIpcInvoke.mockRejectedValueOnce(new Error('Stop failed'))

      const ctx = mountComposable()
      await ctx.stopPrescription(4)
      expect(ctx.error.value).toBe('Stop failed')
    })

    it('manages loading state', async () => {
      mockIpcInvoke.mockResolvedValueOnce(undefined)
      const ctx = mountComposable()
      const promise = ctx.stopPrescription(4)
      expect(ctx.loading.value).toBe(true)
      await promise
      expect(ctx.loading.value).toBe(false)
    })
  })

  // -----------------------------------------------------------------------
  // deletePrescription
  // -----------------------------------------------------------------------
  describe('deletePrescription', () => {
    it('calls ipcInvoke with correct channel', async () => {
      mockIpcInvoke.mockResolvedValueOnce(undefined)

      const ctx = mountComposable()
      await ctx.deletePrescription(6)
      expect(mockIpcInvoke).toHaveBeenCalledWith('prescription:delete', { id: 6 })
    })

    it('sets error on failure', async () => {
      mockIpcInvoke.mockRejectedValueOnce(new Error('Delete failed'))

      const ctx = mountComposable()
      await ctx.deletePrescription(6)
      expect(ctx.error.value).toBe('Delete failed')
    })

    it('manages loading state', async () => {
      mockIpcInvoke.mockResolvedValueOnce(undefined)
      const ctx = mountComposable()
      const promise = ctx.deletePrescription(6)
      expect(ctx.loading.value).toBe(true)
      await promise
      expect(ctx.loading.value).toBe(false)
    })
  })
})
