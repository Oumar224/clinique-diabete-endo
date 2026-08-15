// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { nextTick } from 'vue'

const mockIpcInvoke = vi.hoisted(() => vi.fn())

vi.mock('@/utils/ipc', () => ({
  ipcInvoke: mockIpcInvoke,
}))

vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}))

// Must import after vi.mock
import { useOrdonnanceLibre } from '../useOrdonnanceLibre'

describe('useOrdonnanceLibre', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIpcInvoke.mockReset()
  })

  // ─── fetchOrdonnances ──────────────────────────────────────────

  describe('fetchOrdonnances', () => {
    it('should call IPC with correct channel and patientId', async () => {
      mockIpcInvoke.mockResolvedValue([])
      const { fetchOrdonnances } = useOrdonnanceLibre()
      await fetchOrdonnances(1)
      expect(mockIpcInvoke).toHaveBeenCalledWith('ordonnance-libre:list', { patientId: 1 })
    })

    it('should populate ordonnances ref with result', async () => {
      const mockData = [
        { id: 1, title: 'Ordonnance 1', status: 'draft' },
        { id: 2, title: 'Ordonnance 2', status: 'signed' },
      ]
      mockIpcInvoke.mockResolvedValue(mockData)
      const { fetchOrdonnances, ordonnances } = useOrdonnanceLibre()
      await fetchOrdonnances(1)
      await nextTick()
      expect(ordonnances.value).toEqual(mockData)
    })

    it('should handle null result gracefully', async () => {
      mockIpcInvoke.mockResolvedValue(null)
      const { fetchOrdonnances, ordonnances } = useOrdonnanceLibre()
      await fetchOrdonnances(1)
      await nextTick()
      expect(ordonnances.value).toEqual([])
    })

    it('should set loading to true during fetch and false after', async () => {
      mockIpcInvoke.mockResolvedValue([])
      const { fetchOrdonnances, loading } = useOrdonnanceLibre()
      expect(loading.value).toBe(false)
      const promise = fetchOrdonnances(1)
      expect(loading.value).toBe(true)
      await promise
      expect(loading.value).toBe(false)
    })

    it('should set error on failure and clear ordonnances', async () => {
      mockIpcInvoke.mockRejectedValue(new Error('Network error'))
      const { fetchOrdonnances, error, ordonnances } = useOrdonnanceLibre()
      await fetchOrdonnances(1)
      await nextTick()
      expect(error.value).toBe('Network error')
      expect(ordonnances.value).toEqual([])
    })

    it('should handle empty error message', async () => {
      mockIpcInvoke.mockRejectedValue(new Error())
      const { fetchOrdonnances, error } = useOrdonnanceLibre()
      await fetchOrdonnances(1)
      await nextTick()
      expect(error.value).toBe('Erreur lors du chargement des ordonnances')
    })
  })

  // ─── getOrdonnance ─────────────────────────────────────────────

  describe('getOrdonnance', () => {
    it('should call IPC with correct channel and id', async () => {
      mockIpcInvoke.mockResolvedValue({ id: 1 })
      const { getOrdonnance } = useOrdonnanceLibre()
      await getOrdonnance(1)
      expect(mockIpcInvoke).toHaveBeenCalledWith('ordonnance-libre:get', { id: 1 })
    })

    it('should return the ordonnance record', async () => {
      const mockDoc = { id: 1, title: 'Test', status: 'draft' }
      mockIpcInvoke.mockResolvedValue(mockDoc)
      const { getOrdonnance } = useOrdonnanceLibre()
      const result = await getOrdonnance(1)
      expect(result).toEqual(mockDoc)
    })

    it('should return null on error', async () => {
      mockIpcInvoke.mockRejectedValue(new Error('Not found'))
      const { getOrdonnance } = useOrdonnanceLibre()
      const result = await getOrdonnance(999)
      expect(result).toBeNull()
    })
  })

  // ─── fetchAvailablePrescriptions ───────────────────────────────

  describe('fetchAvailablePrescriptions', () => {
    it('should call prescription:list IPC', async () => {
      mockIpcInvoke.mockResolvedValue([])
      const { fetchAvailablePrescriptions } = useOrdonnanceLibre()
      await fetchAvailablePrescriptions(1)
      expect(mockIpcInvoke).toHaveBeenCalledWith('prescription:list', { patientId: 1 })
    })

    it('should return prescriptions list', async () => {
      const mockRx = [{ id: 1, medicament: 'Metformine' }]
      mockIpcInvoke.mockResolvedValue(mockRx)
      const { fetchAvailablePrescriptions } = useOrdonnanceLibre()
      const result = await fetchAvailablePrescriptions(1)
      expect(result).toEqual(mockRx)
    })

    it('should return empty array on error', async () => {
      mockIpcInvoke.mockRejectedValue(new Error('fail'))
      const { fetchAvailablePrescriptions } = useOrdonnanceLibre()
      const result = await fetchAvailablePrescriptions(1)
      expect(result).toEqual([])
    })
  })

  // ─── deleteOrdonnance ──────────────────────────────────────────

  describe('deleteOrdonnance', () => {
    it('should call IPC with correct channel and id', async () => {
      mockIpcInvoke.mockResolvedValue(undefined)
      const { deleteOrdonnance } = useOrdonnanceLibre()
      await deleteOrdonnance(5)
      expect(mockIpcInvoke).toHaveBeenCalledWith('ordonnance-libre:delete', { id: 5 })
    })

    it('should set loading during delete', async () => {
      let resolvePromise: () => void
      mockIpcInvoke.mockImplementation(() => new Promise(r => { resolvePromise = r }))
      const { deleteOrdonnance, loading } = useOrdonnanceLibre()
      expect(loading.value).toBe(false)
      const promise = deleteOrdonnance(1)
      expect(loading.value).toBe(true)
      resolvePromise!()
      await promise
      expect(loading.value).toBe(false)
    })

    it('should set error on failure', async () => {
      mockIpcInvoke.mockRejectedValue(new Error('Delete failed'))
      const { deleteOrdonnance, error } = useOrdonnanceLibre()
      await deleteOrdonnance(1)
      await nextTick()
      expect(error.value).toBe('Delete failed')
    })
  })
})
