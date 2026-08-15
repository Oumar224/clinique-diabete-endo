// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { nextTick, defineComponent } from 'vue'
import { mount } from '@vue/test-utils'

// ---------------------------------------------------------------------------
// Captured callbacks from electronAPI mocks
// ---------------------------------------------------------------------------
let entityChangedCallback: ((event: any) => void) | null = null
let syncProgressCallback: ((event: any) => void) | null = null
let cleanupEntityFn: (() => void) | null = null
let cleanupSyncFn: (() => void) | null = null

function setupElectronMocks() {
  entityChangedCallback = null
  syncProgressCallback = null
  cleanupEntityFn = null
  cleanupSyncFn = null

  vi.stubGlobal('electronAPI', {
    invoke: vi.fn(),
    onEntityChanged: vi.fn((cb: any) => {
      entityChangedCallback = cb
      return () => { cleanupEntityFn?.call(null) }
    }),
    onSyncProgress: vi.fn((cb: any) => {
      syncProgressCallback = cb
      return () => { cleanupSyncFn?.call(null) }
    }),
  })
}

// ---------------------------------------------------------------------------
// Helper: fresh module import per test group to reset singleton state
// ---------------------------------------------------------------------------
async function importModule() {
  vi.resetModules()
  // Re-setup electronAPI after resetModules clears stubs
  setupElectronMocks()
  const mod = await import('../useSyncStatus')
  return mod
}

function mountComposable(useSyncStatus: ReturnType<typeof import('../useSyncStatus')['useSyncStatus']>) {
  let ctx!: ReturnType<typeof useSyncStatus>
  const wrapper = mount(
    defineComponent({
      setup() {
        ctx = useSyncStatus()
        return () => null
      },
    }),
  )
  return { ctx, wrapper }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('useSyncStatus', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true })
  })

  describe('initial state', () => {
    it('returns initial status based on navigator.onLine (online)', async () => {
      const { useSyncStatus } = await importModule()
      Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true })
      const { ctx } = mountComposable(useSyncStatus)
      expect(ctx.status.value).toBe('online')
    })

    it('returns offline status when navigator.onLine is false', async () => {
      const { useSyncStatus } = await importModule()
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true, configurable: true })
      const { ctx } = mountComposable(useSyncStatus)
      expect(ctx.status.value).toBe('offline')
    })

    it('returns initial pendingChanges as 0', async () => {
      const { useSyncStatus } = await importModule()
      const { ctx } = mountComposable(useSyncStatus)
      expect(ctx.pendingChanges.value).toBe(0)
    })

    it('returns initial lastSyncTime as null', async () => {
      const { useSyncStatus } = await importModule()
      const { ctx } = mountComposable(useSyncStatus)
      expect(ctx.lastSyncTime.value).toBeNull()
    })

    it('returns initial syncProgress as null', async () => {
      const { useSyncStatus } = await importModule()
      const { ctx } = mountComposable(useSyncStatus)
      expect(ctx.syncProgress.value).toBeNull()
    })
  })

  describe('event listeners', () => {
    it('adds online/offline event listeners on mount', async () => {
      const { useSyncStatus } = await importModule()
      const addSpy = vi.spyOn(window, 'addEventListener')
      mountComposable(useSyncStatus)
      expect(addSpy).toHaveBeenCalledWith('online', expect.any(Function))
      expect(addSpy).toHaveBeenCalledWith('offline', expect.any(Function))
    })

    it('removes online/offline event listeners on unmount', async () => {
      const { useSyncStatus } = await importModule()
      const removeSpy = vi.spyOn(window, 'removeEventListener')
      const { wrapper } = mountComposable(useSyncStatus)
      wrapper.unmount()
      expect(removeSpy).toHaveBeenCalledWith('online', expect.any(Function))
      expect(removeSpy).toHaveBeenCalledWith('offline', expect.any(Function))
    })

    it('registers onEntityChanged when electronAPI exists', async () => {
      const { useSyncStatus } = await importModule()
      mountComposable(useSyncStatus)
      expect((window as any).electronAPI.onEntityChanged).toHaveBeenCalled()
    })

    it('registers onSyncProgress when electronAPI exists', async () => {
      const { useSyncStatus } = await importModule()
      mountComposable(useSyncStatus)
      expect((window as any).electronAPI.onSyncProgress).toHaveBeenCalled()
    })

    it('works when electronAPI is undefined', async () => {
      vi.stubGlobal('electronAPI', undefined)
      const { useSyncStatus } = await importModule()
      // Need to re-stub for this test without onEntityChanged/onSyncProgress
      vi.stubGlobal('electronAPI', { invoke: vi.fn() })
      const { ctx } = mountComposable(useSyncStatus)
      expect(ctx.status.value).toBe('online')
      expect(ctx.pendingChanges.value).toBe(0)
    })
  })

  describe('status transitions', () => {
    it('transitions to syncing when going offline then online', async () => {
      const { useSyncStatus } = await importModule()
      const { ctx } = mountComposable(useSyncStatus)

      window.dispatchEvent(new Event('offline'))
      await nextTick()
      expect(ctx.status.value).toBe('offline')
      expect(ctx.pendingChanges.value).toBe(1)

      window.dispatchEvent(new Event('online'))
      await nextTick()
      expect(ctx.status.value).toBe('syncing')
    })

    it('sets status to online when going online from online', async () => {
      const { useSyncStatus } = await importModule()
      const { ctx } = mountComposable(useSyncStatus)
      expect(ctx.status.value).toBe('online')

      window.dispatchEvent(new Event('online'))
      await nextTick()
      expect(ctx.status.value).toBe('online')
    })

    it('sets status to offline on offline event', async () => {
      const { useSyncStatus } = await importModule()
      const { ctx } = mountComposable(useSyncStatus)
      expect(ctx.status.value).toBe('online')

      window.dispatchEvent(new Event('offline'))
      await nextTick()
      expect(ctx.status.value).toBe('offline')
    })

    it('increments pendingChanges on each offline event', async () => {
      const { useSyncStatus } = await importModule()
      const { ctx } = mountComposable(useSyncStatus)

      window.dispatchEvent(new Event('offline'))
      await nextTick()
      expect(ctx.pendingChanges.value).toBe(1)

      window.dispatchEvent(new Event('offline'))
      await nextTick()
      expect(ctx.pendingChanges.value).toBe(2)

      window.dispatchEvent(new Event('offline'))
      await nextTick()
      expect(ctx.pendingChanges.value).toBe(3)
    })
  })

  describe('entityChanged callback', () => {
    it('updates lastSyncTime on remote event', async () => {
      const { useSyncStatus } = await importModule()
      const { ctx } = mountComposable(useSyncStatus)

      expect(entityChangedCallback).toBeDefined()
      entityChangedCallback!({ source: 'remote', timestamp: 1234567890 })

      expect(ctx.lastSyncTime.value).toBe(1234567890)
    })

    it('does not update lastSyncTime on local event', async () => {
      const { useSyncStatus } = await importModule()
      const { ctx } = mountComposable(useSyncStatus)

      entityChangedCallback!({ source: 'local', timestamp: 999 })

      expect(ctx.lastSyncTime.value).toBeNull()
    })
  })

  describe('syncProgress callback', () => {
    it('sets syncing status and progress on started phase', async () => {
      const { useSyncStatus } = await importModule()
      const { ctx } = mountComposable(useSyncStatus)

      syncProgressCallback!({ phase: 'started', entityType: 'Patient', total: 100 })
      await nextTick()

      expect(ctx.status.value).toBe('syncing')
      expect(ctx.syncProgress.value).toEqual({ entityType: 'Patient', processed: 0, total: 100 })
    })

    it('sets online and clears progress on completed phase', async () => {
      const { useSyncStatus } = await importModule()
      const { ctx } = mountComposable(useSyncStatus)

      syncProgressCallback!({ phase: 'started', entityType: 'Patient', total: 50 })
      await nextTick()
      expect(ctx.status.value).toBe('syncing')

      syncProgressCallback!({ phase: 'completed', timestamp: 42 })
      await nextTick()
      expect(ctx.status.value).toBe('online')
      expect(ctx.syncProgress.value).toBeNull()
      expect(ctx.pendingChanges.value).toBe(0)
      expect(ctx.lastSyncTime.value).toBe(42)
    })

    it('sets offline and clears progress on error phase', async () => {
      const { useSyncStatus } = await importModule()
      const { ctx } = mountComposable(useSyncStatus)

      syncProgressCallback!({ phase: 'started', entityType: 'Patient', total: 50 })
      await nextTick()

      syncProgressCallback!({ phase: 'error' })
      await nextTick()
      expect(ctx.status.value).toBe('offline')
      expect(ctx.syncProgress.value).toBeNull()
    })
  })

  describe('cleanup', () => {
    it('calls cleanup functions on unmount', async () => {
      let entityCleanupCalled = false
      let syncCleanupCalled = false

      vi.stubGlobal('electronAPI', {
        invoke: vi.fn(),
        onEntityChanged: vi.fn(() => () => { entityCleanupCalled = true }),
        onSyncProgress: vi.fn(() => () => { syncCleanupCalled = true }),
      })

      vi.resetModules()
      const { useSyncStatus } = await import('../useSyncStatus')
      const { wrapper } = mountComposable(useSyncStatus)
      wrapper.unmount()

      expect(entityCleanupCalled).toBe(true)
      expect(syncCleanupCalled).toBe(true)
    })

    it('handles onEntityChanged returning undefined gracefully', async () => {
      vi.stubGlobal('electronAPI', {
        invoke: vi.fn(),
        onEntityChanged: vi.fn(() => undefined),
        onSyncProgress: vi.fn(() => () => {}),
      })

      vi.resetModules()
      const { useSyncStatus } = await import('../useSyncStatus')
      const { wrapper } = mountComposable(useSyncStatus)
      expect(() => wrapper.unmount()).not.toThrow()
    })

    it('handles onSyncProgress returning undefined gracefully', async () => {
      vi.stubGlobal('electronAPI', {
        invoke: vi.fn(),
        onEntityChanged: vi.fn(() => () => {}),
        onSyncProgress: vi.fn(() => undefined),
      })

      vi.resetModules()
      const { useSyncStatus } = await import('../useSyncStatus')
      const { wrapper } = mountComposable(useSyncStatus)
      expect(() => wrapper.unmount()).not.toThrow()
    })
  })
})
