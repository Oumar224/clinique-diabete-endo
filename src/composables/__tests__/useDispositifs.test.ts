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
import { useDispositifs } from '../useDispositifs'
import type { DispositifInput } from '../useDispositifs'
import type { Dispositif } from '@/types/soins'

// ---------------------------------------------------------------------------
// Helper: mount the composable in a Vue lifecycle
// ---------------------------------------------------------------------------
function mountComposable() {
  let ctx!: ReturnType<typeof useDispositifs>
  mount(
    defineComponent({
      setup() {
        ctx = useDispositifs()
        return () => null
      },
    }),
  )
  return ctx
}

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------
function makeDispositif(overrides: Partial<Dispositif> = {}): Dispositif {
  return {
    id: 1,
    patientId: 10,
    type: 'PAC',
    datePose: '2025-01-15',
    aspect: 'Sain',
    volumeMl: 150,
    ...overrides,
  }
}

function makeInput(overrides: Partial<DispositifInput> = {}): DispositifInput {
  return {
    patientId: 10,
    type: 'PAC',
    datePose: '2025-01-15',
    aspect: 'Sain',
    volumeMl: 150,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('useDispositifs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // -----------------------------------------------------------------------
  // fetchDispositifs
  // -----------------------------------------------------------------------
  describe('fetchDispositifs', () => {
    it('loads dispositifs into the ref', async () => {
      const records = [makeDispositif({ id: 1 }), makeDispositif({ id: 2 })]
      mockIpcInvoke.mockResolvedValueOnce(records)

      const ctx = mountComposable()
      await ctx.fetchDispositifs(10)

      expect(ctx.dispositifs.value).toHaveLength(2)
      expect(ctx.dispositifs.value[0].id).toBe(1)
    })

    it('sets loading to true during fetch and false after', async () => {
      let resolvePromise: (v: any) => void
      mockIpcInvoke.mockReturnValueOnce(new Promise((r) => { resolvePromise = r }))

      const ctx = mountComposable()
      const promise = ctx.fetchDispositifs(10)
      expect(ctx.loading.value).toBe(true)

      resolvePromise!([])
      await promise
      expect(ctx.loading.value).toBe(false)
    })

    it('sets error on failure', async () => {
      mockIpcInvoke.mockRejectedValueOnce(new Error('Network error'))

      const ctx = mountComposable()
      await ctx.fetchDispositifs(10)

      expect(ctx.error.value).toBe('Network error')
      expect(ctx.dispositifs.value).toEqual([])
    })

    it('clears previous error before fetch', async () => {
      mockIpcInvoke.mockRejectedValueOnce(new Error('fail 1'))
      const ctx = mountComposable()
      await ctx.fetchDispositifs(10)
      expect(ctx.error.value).toBe('fail 1')

      mockIpcInvoke.mockResolvedValueOnce([])
      await ctx.fetchDispositifs(10)
      expect(ctx.error.value).toBeNull()
    })

    it('handles null result as empty array', async () => {
      mockIpcInvoke.mockResolvedValueOnce(null)

      const ctx = mountComposable()
      await ctx.fetchDispositifs(10)
      expect(ctx.dispositifs.value).toEqual([])
    })

    it('calls ipcInvoke with correct channel and params', async () => {
      mockIpcInvoke.mockResolvedValueOnce([])
      const ctx = mountComposable()
      await ctx.fetchDispositifs(42)
      expect(mockIpcInvoke).toHaveBeenCalledWith('dispositifs:list', { patientId: 42 })
    })
  })

  // -----------------------------------------------------------------------
  // addDispositif
  // -----------------------------------------------------------------------
  describe('addDispositif', () => {
    it('creates a dispositif and returns it', async () => {
      const created = makeDispositif({ id: 99 })
      mockIpcInvoke.mockResolvedValueOnce(created)

      const ctx = mountComposable()
      const result = await ctx.addDispositif(makeInput())

      expect(result).toEqual(created)
      expect(mockIpcInvoke).toHaveBeenCalledWith('dispositifs:create', expect.objectContaining({
        patientId: 10,
        type: 'PAC',
      }))
    })

    it('returns null on failure', async () => {
      mockIpcInvoke.mockRejectedValueOnce(new Error('Create failed'))

      const ctx = mountComposable()
      const result = await ctx.addDispositif(makeInput())

      expect(result).toBeNull()
      expect(ctx.error.value).toBe('Create failed')
    })

    it('handles null result', async () => {
      mockIpcInvoke.mockResolvedValueOnce(null)

      const ctx = mountComposable()
      const result = await ctx.addDispositif(makeInput())
      expect(result).toBeNull()
    })

    it('manages loading state', async () => {
      mockIpcInvoke.mockResolvedValueOnce(makeDispositif())
      const ctx = mountComposable()
      const promise = ctx.addDispositif(makeInput())
      expect(ctx.loading.value).toBe(true)
      await promise
      expect(ctx.loading.value).toBe(false)
    })

    it('clears error before create', async () => {
      mockIpcInvoke.mockRejectedValueOnce(new Error('prev'))
      const ctx = mountComposable()
      await ctx.addDispositif(makeInput())
      expect(ctx.error.value).toBe('prev')

      mockIpcInvoke.mockResolvedValueOnce(makeDispositif())
      await ctx.addDispositif(makeInput())
      expect(ctx.error.value).toBeNull()
    })
  })

  // -----------------------------------------------------------------------
  // removeDispositif
  // -----------------------------------------------------------------------
  describe('removeDispositif', () => {
    it('calls ipcInvoke with correct channel', async () => {
      mockIpcInvoke.mockResolvedValueOnce(undefined)

      const ctx = mountComposable()
      await ctx.removeDispositif(5)
      expect(mockIpcInvoke).toHaveBeenCalledWith('dispositifs:delete', { id: 5 })
    })

    it('sets error on failure', async () => {
      mockIpcInvoke.mockRejectedValueOnce(new Error('Delete failed'))

      const ctx = mountComposable()
      await ctx.removeDispositif(5)
      expect(ctx.error.value).toBe('Delete failed')
    })

    it('manages loading state', async () => {
      mockIpcInvoke.mockResolvedValueOnce(undefined)
      const ctx = mountComposable()
      const promise = ctx.removeDispositif(5)
      expect(ctx.loading.value).toBe(true)
      await promise
      expect(ctx.loading.value).toBe(false)
    })

    it('clears error before delete', async () => {
      mockIpcInvoke.mockRejectedValueOnce(new Error('prev'))
      const ctx = mountComposable()
      await ctx.removeDispositif(5)
      expect(ctx.error.value).toBe('prev')

      mockIpcInvoke.mockResolvedValueOnce(undefined)
      await ctx.removeDispositif(5)
      expect(ctx.error.value).toBeNull()
    })
  })
})
