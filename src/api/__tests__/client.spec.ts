// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { apiClient } from '../client'

// ─── Mock ipcInvoke ────────────────────────────────────────────────
const mockIpcInvoke = vi.hoisted(() => vi.fn())
vi.mock('@/utils/ipc', () => ({
  ipcInvoke: mockIpcInvoke,
}))

vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), warning: vi.fn(), error: vi.fn() },
}))

describe('apiClient', () => {
  beforeEach(() => {
    mockIpcInvoke.mockReset()
    mockIpcInvoke.mockResolvedValue({ success: true, data: null })
  })

  // ─── get ─────────────────────────────────────────────────────────

  describe('get', () => {
    it('calls ipcInvoke with channel and params', async () => {
      mockIpcInvoke.mockResolvedValue([{ id: 1, name: 'Test' }])

      const result = await apiClient.get('patients:list', { serviceId: 5 })

      expect(mockIpcInvoke).toHaveBeenCalledWith('patients:list', { serviceId: 5 })
      expect(result).toEqual([{ id: 1, name: 'Test' }])
    })

    it('works without params', async () => {
      mockIpcInvoke.mockResolvedValue([])

      const result = await apiClient.get('patients:list')

      expect(mockIpcInvoke).toHaveBeenCalledWith('patients:list', undefined)
      expect(result).toEqual([])
    })

    it('returns typed data', async () => {
      interface User { id: number; name: string }
      mockIpcInvoke.mockResolvedValue({ id: 1, name: 'Jean' })

      const result = await apiClient.get<User>('user:get', { id: 1 })

      expect(result.id).toBe(1)
      expect(result.name).toBe('Jean')
    })

    it('propagates errors from ipcInvoke', async () => {
      mockIpcInvoke.mockRejectedValue(new Error('Not found'))

      await expect(apiClient.get('patients:get', { id: 999 })).rejects.toThrow('Not found')
    })
  })

  // ─── post ────────────────────────────────────────────────────────

  describe('post', () => {
    it('calls ipcInvoke with channel and data', async () => {
      const created = { id: 1, name: 'Nouveau' }
      mockIpcInvoke.mockResolvedValue(created)

      const result = await apiClient.post('patients:create', { name: 'Nouveau' })

      expect(mockIpcInvoke).toHaveBeenCalledWith('patients:create', { name: 'Nouveau' })
      expect(result).toEqual(created)
    })

    it('works with empty data', async () => {
      mockIpcInvoke.mockResolvedValue(undefined)

      const result = await apiClient.post('session:create')

      expect(mockIpcInvoke).toHaveBeenCalledWith('session:create', undefined)
      expect(result).toBeUndefined()
    })
  })

  // ─── put ─────────────────────────────────────────────────────────

  describe('put', () => {
    it('calls ipcInvoke with channel and update data', async () => {
      const updated = { id: 1, name: 'Modifié' }
      mockIpcInvoke.mockResolvedValue(updated)

      const result = await apiClient.put('patients:update', { id: 1, name: 'Modifié' })

      expect(mockIpcInvoke).toHaveBeenCalledWith('patients:update', { id: 1, name: 'Modifié' })
      expect(result).toEqual(updated)
    })
  })

  // ─── delete ──────────────────────────────────────────────────────

  describe('delete', () => {
    it('calls ipcInvoke with channel and params', async () => {
      mockIpcInvoke.mockResolvedValue(undefined)

      await apiClient.delete('patients:delete', { id: 1 })

      expect(mockIpcInvoke).toHaveBeenCalledWith('patients:delete', { id: 1 })
    })

    it('works without params', async () => {
      mockIpcInvoke.mockResolvedValue(undefined)

      await apiClient.delete('session:clear')

      expect(mockIpcInvoke).toHaveBeenCalledWith('session:clear', undefined)
    })
  })

  // ─── IPC communication pattern ───────────────────────────────────

  describe('IPC communication pattern', () => {
    it('forwards exact parameters to ipcInvoke', async () => {
      const params = { patientId: 42, status: 'active' }
      mockIpcInvoke.mockResolvedValue([])

      await apiClient.get('encounters:list-by-patient', params)

      expect(mockIpcInvoke).toHaveBeenCalledWith('encounters:list-by-patient', params)
    })

    it('supports different channels for CRUD operations', async () => {
      const channelPatterns = [
        { method: 'get' as const, channel: 'sites:list' },
        { method: 'post' as const, channel: 'sites:create' },
        { method: 'put' as const, channel: 'sites:update' },
        { method: 'delete' as const, channel: 'sites:delete' },
      ]

      for (const { method, channel } of channelPatterns) {
        mockIpcInvoke.mockResolvedValue(null)
        await apiClient[method](channel, { id: 1 })
        expect(mockIpcInvoke).toHaveBeenCalledWith(channel, { id: 1 })
      }
    })

    it('handles complex nested parameters through IPC', async () => {
      const complexParams = {
        patientId: 42,
        filters: {
          dateFrom: '2025-01-01',
          dateTo: '2025-12-31',
          types: ['imagerie', 'laboratoire'],
          status: ['en_attente', 'en_cours'],
        },
        pagination: { page: 1, limit: 20 },
      }
      mockIpcInvoke.mockResolvedValue({ items: [], total: 0 })

      const result = await apiClient.post('exam-request:search', complexParams)

      expect(mockIpcInvoke).toHaveBeenCalledWith('exam-request:search', complexParams)
      expect(result).toEqual({ items: [], total: 0 })
    })
  })
})
