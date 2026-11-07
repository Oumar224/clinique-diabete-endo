// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { nextTick } from 'vue'
import type { ElMessage } from 'element-plus'

const mockIpcInvoke = vi.hoisted(() => vi.fn())

vi.mock('@/utils/ipc', () => ({
  ipcInvoke: mockIpcInvoke,
}))

vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}))

// Must import after vi.mock
import { useOrdonnanceLibre } from '../useOrdonnanceLibre'
import { ElMessage as mockElMessage } from 'element-plus'

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

  // ─── createOrReplaceFromGroup ──────────────────────────────────

  describe('createOrReplaceFromGroup', () => {
    const params = {
      patientId: 7,
      contactId: '42',
      serviceId: null,
      siteId: null,
      createdBy: 'user-1',
      title: 'CRH - 05/09/2026',
      sourceDocumentId: 'doc-1',
      categorie: 'medicament',
      items: [{ _key: 'k1', medicament: 'Metformine' }],
    }

    it('should call IPC with channel ordonnance-libre:create-from-group and full params', async () => {
      mockIpcInvoke.mockResolvedValue({ documentId: 'new-1', replaced: false })
      const { createOrReplaceFromGroup } = useOrdonnanceLibre()
      await createOrReplaceFromGroup(params)
      expect(mockIpcInvoke).toHaveBeenCalledWith(
        'ordonnance-libre:create-from-group',
        params,
      )
    })

    it('should return the result { documentId, replaced }', async () => {
      const result = { documentId: 'doc-new', replaced: true }
      mockIpcInvoke.mockResolvedValue(result)
      const { createOrReplaceFromGroup } = useOrdonnanceLibre()
      expect(await createOrReplaceFromGroup(params)).toEqual(result)
    })

    it('should return null and toast an error when IPC rejects', async () => {
      mockIpcInvoke.mockRejectedValue(new Error('Boom'))
      const { createOrReplaceFromGroup } = useOrdonnanceLibre()
      const result = await createOrReplaceFromGroup(params)
      expect(result).toBeNull()
      expect(mockElMessage.error).toHaveBeenCalledWith('Boom')
    })

    it('should return null and toast the default error when IPC rejects with no message', async () => {
      mockIpcInvoke.mockRejectedValue(new Error())
      const { createOrReplaceFromGroup } = useOrdonnanceLibre()
      const result = await createOrReplaceFromGroup(params)
      expect(result).toBeNull()
      expect(mockElMessage.error).toHaveBeenCalledWith(
        "Erreur lors de la génération de l'ordonnance",
      )
    })
  })

  // ─── findCrhGroupOrdonnance ────────────────────────────────────

  describe('findCrhGroupOrdonnance', () => {
    it('should call ordonnance-libre:list with the patientId', async () => {
      mockIpcInvoke.mockResolvedValue([])
      const { findCrhGroupOrdonnance } = useOrdonnanceLibre()
      await findCrhGroupOrdonnance(7, 'doc-1', 'soins')
      expect(mockIpcInvoke).toHaveBeenCalledWith('ordonnance-libre:list', { patientId: 7 })
    })

    it('should return the record whose parsed form_data matches source=crh, sourceDocumentId and categorie', async () => {
      const target = {
        id: 99,
        form_data: JSON.stringify({
          source: 'crh',
          sourceDocumentId: 'doc-1',
          categorie: 'soins',
          title: 'CRH - x',
        }),
      }
      const other = {
        id: 100,
        form_data: JSON.stringify({
          source: 'crh',
          sourceDocumentId: 'doc-1',
          categorie: 'medicament',
        }),
      }
      mockIpcInvoke.mockResolvedValue([other, target])
      const { findCrhGroupOrdonnance } = useOrdonnanceLibre()
      const result = await findCrhGroupOrdonnance(7, 'doc-1', 'soins')
      expect(result).toEqual(target)
    })

    it('should handle form_data as an object (already parsed)', async () => {
      const target = {
        id: 3,
        form_data: { source: 'crh', sourceDocumentId: 'AB', categorie: 'avis' },
      }
      mockIpcInvoke.mockResolvedValue([target])
      const { findCrhGroupOrdonnance } = useOrdonnanceLibre()
      expect(await findCrhGroupOrdonnance(7, 'AB', 'avis')).toEqual(target)
    })

    it('should return null when no record matches', async () => {
      mockIpcInvoke.mockResolvedValue([
        { id: 1, form_data: JSON.stringify({ source: 'libre' }) },
      ])
      const { findCrhGroupOrdonnance } = useOrdonnanceLibre()
      expect(await findCrhGroupOrdonnance(7, 'doc-x', 'medicament')).toBeNull()
    })

    it('should return null when the IPC call rejects', async () => {
      mockIpcInvoke.mockRejectedValue(new Error('fail'))
      const { findCrhGroupOrdonnance } = useOrdonnanceLibre()
      expect(await findCrhGroupOrdonnance(7, 'doc-1', 'medicament')).toBeNull()
    })
  })
})
