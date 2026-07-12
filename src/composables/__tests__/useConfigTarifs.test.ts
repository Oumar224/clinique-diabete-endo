// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useConfigTarifs } from '../useConfigTarifs'
import type { TarifDto } from '../useConfigTarifs'

const mockInvoke = vi.fn()
vi.stubGlobal('window', {
  electronAPI: {
    invoke: mockInvoke,
  },
})

const mockTarifs: TarifDto[] = [
  { id: 1, acte_id: 1, code_tarif: 'TARIF.STANDARD', prix_unitaire: 50000, date_application: '2025-01-01', acte_code: 'CONS-GEN-001', acte_label: 'Consultation générale', service_name: 'Consultation Générale' },
  { id: 2, acte_id: 2, code_tarif: 'TARIF.STANDARD', prix_unitaire: 75000, date_application: '2025-01-01', acte_code: 'CONS-ENDO-001', acte_label: 'Consultation endocrinologie', service_name: 'Endocrinologie' },
]

describe('useConfigTarifs', () => {
  beforeEach(() => {
    mockInvoke.mockReset()
    mockInvoke.mockResolvedValue({ success: true, data: [] })
  })

  describe('fetchTarifs', () => {
    it('calls ipcInvoke with tarifs:list and sets tarifs ref', async () => {
      mockInvoke.mockResolvedValue({ success: true, data: mockTarifs })
      const { fetchTarifs, tarifs } = useConfigTarifs()

      expect(tarifs.value).toEqual([])
      await fetchTarifs()

      expect(mockInvoke).toHaveBeenCalledWith('tarifs:list', {})
      expect(tarifs.value).toEqual(mockTarifs)
      expect(tarifs.value).toHaveLength(2)
    })

    it('passes optional filters acteId and codeTarif', async () => {
      mockInvoke.mockResolvedValue({ success: true, data: [mockTarifs[0]] })
      const { fetchTarifs } = useConfigTarifs()

      await fetchTarifs(1, 'TARIF.STANDARD')

      expect(mockInvoke).toHaveBeenCalledWith('tarifs:list', { acte_id: 1, code_tarif: 'TARIF.STANDARD' })
    })

    it('sets empty array on non-array response', async () => {
      mockInvoke.mockResolvedValue({ success: true, data: null })
      const { fetchTarifs, tarifs } = useConfigTarifs()

      await fetchTarifs()

      expect(tarifs.value).toEqual([])
    })

    it('sets error and empty tarifs on IPC failure', async () => {
      mockInvoke.mockRejectedValue(new Error('Erreur réseau'))
      const { fetchTarifs, tarifs, error } = useConfigTarifs()

      await fetchTarifs()

      expect(tarifs.value).toEqual([])
      expect(error.value).toBe('Erreur réseau')
    })
  })

  describe('getActiveTarif', () => {
    it('calls tarifs:get-active and returns result', async () => {
      mockInvoke.mockResolvedValue({ success: true, data: mockTarifs[0] })
      const { getActiveTarif } = useConfigTarifs()

      const result = await getActiveTarif(1)

      expect(mockInvoke).toHaveBeenCalledWith('tarifs:get-active', { acte_id: 1 })
      expect(result).toEqual(mockTarifs[0])
    })

    it('passes optional codeTarif', async () => {
      mockInvoke.mockResolvedValue({ success: true, data: null })
      const { getActiveTarif } = useConfigTarifs()

      await getActiveTarif(1, 'TARIF.VIP')

      expect(mockInvoke).toHaveBeenCalledWith('tarifs:get-active', { acte_id: 1, code_tarif: 'TARIF.VIP' })
    })

    it('returns null on error', async () => {
      mockInvoke.mockRejectedValue(new Error('Erreur'))
      const { getActiveTarif } = useConfigTarifs()

      const result = await getActiveTarif(1)

      expect(result).toBeNull()
    })
  })

  describe('bulkUpdateTarifs', () => {
    it('calls tarifs:bulk-update and returns true', async () => {
      mockInvoke.mockResolvedValueOnce({ success: true, data: mockTarifs })
        .mockResolvedValueOnce({ success: true, data: mockTarifs })

      const { bulkUpdateTarifs } = useConfigTarifs()
      const items = [
        { acte_id: 1, code_tarif: 'TARIF.STANDARD', prix_unitaire: 60000 },
        { acte_id: 2, code_tarif: 'TARIF.STANDARD', prix_unitaire: 80000 },
      ]

      const ok = await bulkUpdateTarifs(items)

      expect(ok).toBe(true)
      expect(mockInvoke).toHaveBeenNthCalledWith(1, 'tarifs:bulk-update', { items })
      expect(mockInvoke).toHaveBeenNthCalledWith(2, 'tarifs:list', {})
    })

    it('returns false on error', async () => {
      mockInvoke.mockRejectedValue(new Error('Erreur'))
      const { bulkUpdateTarifs } = useConfigTarifs()

      const ok = await bulkUpdateTarifs([{ acte_id: 1, code_tarif: 'TARIF.STANDARD', prix_unitaire: 100 }])

      expect(ok).toBe(false)
    })
  })

  describe('createTarif', () => {
    it('calls tarifs:create and refreshes list', async () => {
      mockInvoke
        .mockResolvedValueOnce({ success: true, data: mockTarifs[0] })
        .mockResolvedValueOnce({ success: true, data: mockTarifs })

      const { createTarif } = useConfigTarifs()
      const result = await createTarif({ acte_id: 1, prix_unitaire: 50000 })

      expect(result).toEqual(mockTarifs[0])
      expect(mockInvoke).toHaveBeenNthCalledWith(1, 'tarifs:create', { acte_id: 1, prix_unitaire: 50000, code_tarif: 'TARIF.STANDARD' })
      expect(mockInvoke).toHaveBeenNthCalledWith(2, 'tarifs:list', {})
    })

    it('returns null on error', async () => {
      mockInvoke.mockRejectedValue(new Error('Erreur'))
      const { createTarif } = useConfigTarifs()

      const result = await createTarif({ acte_id: 1, prix_unitaire: 50000 })

      expect(result).toBeNull()
    })
  })

  describe('updateTarif', () => {
    it('calls tarifs:update and refreshes list', async () => {
      const updated = { ...mockTarifs[0], prix_unitaire: 55000 }
      mockInvoke
        .mockResolvedValueOnce({ success: true, data: updated })
        .mockResolvedValueOnce({ success: true, data: mockTarifs })

      const { updateTarif } = useConfigTarifs()
      const result = await updateTarif(1, { prix_unitaire: 55000 })

      expect(result).toEqual(updated)
      expect(mockInvoke).toHaveBeenNthCalledWith(1, 'tarifs:update', { id: 1, prix_unitaire: 55000 })
    })
  })

  describe('deleteTarif', () => {
    it('calls tarifs:delete and refreshes list', async () => {
      mockInvoke
        .mockResolvedValueOnce({ success: true, data: null })
        .mockResolvedValueOnce({ success: true, data: [mockTarifs[1]] })

      const { deleteTarif } = useConfigTarifs()
      const ok = await deleteTarif(1)

      expect(ok).toBe(true)
      expect(mockInvoke).toHaveBeenNthCalledWith(1, 'tarifs:delete', { id: 1 })
    })

    it('returns false on error', async () => {
      mockInvoke.mockRejectedValue(new Error('Erreur'))
      const { deleteTarif } = useConfigTarifs()

      const ok = await deleteTarif(999)

      expect(ok).toBe(false)
    })
  })

  describe('fetchPriceHistory', () => {
    it('calls tarifs:price-history and returns data', async () => {
      mockInvoke.mockResolvedValue({ success: true, data: mockTarifs })
      const { fetchPriceHistory } = useConfigTarifs()

      const result = await fetchPriceHistory(1)

      expect(mockInvoke).toHaveBeenCalledWith('tarifs:price-history', { acteId: 1 })
      expect(result).toEqual(mockTarifs)
    })

    it('returns empty array on error', async () => {
      mockInvoke.mockRejectedValue(new Error('Erreur'))
      const { fetchPriceHistory } = useConfigTarifs()

      const result = await fetchPriceHistory(1)

      expect(result).toEqual([])
    })

    it('returns empty array for null acteId', async () => {
      const { fetchPriceHistory } = useConfigTarifs()

      const result = await fetchPriceHistory(null as any)

      expect(result).toEqual([])
    })
  })

  describe('loading state', () => {
    it('sets loading true during fetch', async () => {
      mockInvoke.mockResolvedValue({ success: true, data: mockTarifs })
      const { fetchTarifs, loading } = useConfigTarifs()

      const promise = fetchTarifs()
      expect(loading.value).toBe(true)
      await promise
      expect(loading.value).toBe(false)
    })
  })
})
