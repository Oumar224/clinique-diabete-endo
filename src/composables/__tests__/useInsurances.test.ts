// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useInsurances } from '../useInsurances'

const mockInvoke = vi.fn()
vi.stubGlobal('window', {
  electronAPI: {
    invoke: mockInvoke,
  },
})

const mockInsurances = [
  { id: 1, name: 'CNSS', code: 'CNSS', is_active: true },
  { id: 2, name: 'AXA Assurance', code: 'AXA', is_active: true },
  { id: 3, name: 'NSIA', code: 'NSIA', is_active: false },
]

describe('useInsurances', () => {
  beforeEach(() => {
    mockInvoke.mockReset()
    mockInvoke.mockResolvedValue({ success: true, data: [] })
    const { insurances, loading, error } = useInsurances()
    insurances.value = []
    loading.value = false
    error.value = null
  })

  describe('fetchInsurances', () => {
    it('appelle ipcInvoke avec "insurances:list" et met à jour insurances', async () => {
      mockInvoke.mockResolvedValue({ success: true, data: mockInsurances })
      const { fetchInsurances, insurances, loading } = useInsurances()

      expect(insurances.value).toEqual([])
      expect(loading.value).toBe(false)

      await fetchInsurances()

      expect(mockInvoke).toHaveBeenCalledWith('insurances:list', undefined)
      expect(insurances.value).toEqual(mockInsurances)
      expect(insurances.value).toHaveLength(3)
      expect(loading.value).toBe(false)
    })

    it('met loading à true pendant la requête', async () => {
      let resolvePromise!: (v: unknown) => void
      mockInvoke.mockImplementation(() => new Promise(resolve => { resolvePromise = resolve }))

      const { fetchInsurances, loading } = useInsurances()
      const promise = fetchInsurances()

      expect(loading.value).toBe(true)

      resolvePromise({ success: true, data: [] })
      await promise
      expect(loading.value).toBe(false)
    })

    it('met error en cas d\'échec IPC', async () => {
      mockInvoke.mockRejectedValue(new Error('Erreur réseau'))
      const { fetchInsurances, insurances, error } = useInsurances()

      await fetchInsurances()

      expect(insurances.value).toEqual([])
      expect(error.value).toBe('Erreur réseau')
    })
  })

  describe('fetchActiveInsurances', () => {
    it('appelle "insurances:list-active" et retourne les assurances', async () => {
      mockInvoke.mockResolvedValue({ success: true, data: mockInsurances })
      const { fetchActiveInsurances } = useInsurances()

      const result = await fetchActiveInsurances()

      expect(mockInvoke).toHaveBeenCalledWith('insurances:list-active', undefined)
      expect(result).toEqual(mockInsurances)
    })

    it('retourne un tableau vide en cas d\'erreur', async () => {
      mockInvoke.mockRejectedValue(new Error('Erreur'))
      const { fetchActiveInsurances } = useInsurances()

      const result = await fetchActiveInsurances()

      expect(result).toEqual([])
    })
  })

  describe('createInsurance', () => {
    it('crée une assurance puis refresh la liste', async () => {
      const newInsurance = { id: 4, name: 'Prévoyance', code: 'PREV', is_active: true }
      mockInvoke
        .mockResolvedValueOnce({ success: true, data: newInsurance })
        .mockResolvedValueOnce({ success: true, data: [...mockInsurances, newInsurance] })

      const { createInsurance, insurances } = useInsurances()
      const result = await createInsurance({ name: 'Prévoyance', code: 'PREV', is_active: true })

      expect(result).toEqual(newInsurance)
      expect(mockInvoke).toHaveBeenNthCalledWith(1, 'insurances:create', {
        name: 'Prévoyance', code: 'PREV', is_active: true,
      })
      expect(mockInvoke).toHaveBeenNthCalledWith(2, 'insurances:list', undefined)
      expect(insurances.value).toHaveLength(4)
    })

    it('retourne null en cas d\'erreur', async () => {
      mockInvoke.mockRejectedValue(new Error('Erreur'))
      const { createInsurance } = useInsurances()

      const result = await createInsurance({ name: 'X', code: 'X', is_active: true })

      expect(result).toBeNull()
    })
  })

  describe('updateInsurance', () => {
    it('modifie une assurance puis refresh', async () => {
      const updated = { id: 1, name: 'CNSS Modifié', code: 'CNSS', is_active: true }
      mockInvoke
        .mockResolvedValueOnce({ success: true, data: updated })
        .mockResolvedValueOnce({ success: true, data: [updated, mockInsurances[1], mockInsurances[2]] })

      const { updateInsurance } = useInsurances()
      const result = await updateInsurance(1, { name: 'CNSS Modifié' })

      expect(result).toEqual(updated)
      expect(mockInvoke).toHaveBeenNthCalledWith(1, 'insurances:update', { id: 1, name: 'CNSS Modifié' })
      expect(mockInvoke).toHaveBeenNthCalledWith(2, 'insurances:list', undefined)
    })

    it('retourne null en cas d\'erreur', async () => {
      mockInvoke.mockRejectedValue(new Error('Erreur'))
      const { updateInsurance } = useInsurances()

      const result = await updateInsurance(999, { name: 'X' })

      expect(result).toBeNull()
    })
  })

  describe('deleteInsurance', () => {
    it('supprime une assurance puis refresh', async () => {
      mockInvoke
        .mockResolvedValueOnce({ success: true, data: null })
        .mockResolvedValueOnce({ success: true, data: [mockInsurances[1], mockInsurances[2]] })

      const { deleteInsurance } = useInsurances()
      const ok = await deleteInsurance(1)

      expect(ok).toBe(true)
      expect(mockInvoke).toHaveBeenNthCalledWith(1, 'insurances:delete', { id: 1 })
      expect(mockInvoke).toHaveBeenNthCalledWith(2, 'insurances:list', undefined)
    })

    it('retourne false en cas d\'erreur', async () => {
      mockInvoke.mockRejectedValue(new Error('Erreur'))
      const { deleteInsurance } = useInsurances()

      const ok = await deleteInsurance(999)

      expect(ok).toBe(false)
    })
  })
})
