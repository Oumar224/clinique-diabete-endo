// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useContactOrigins } from '../useContactOrigins'

const mockInvoke = vi.fn()
vi.stubGlobal('window', {
  electronAPI: {
    invoke: mockInvoke,
  },
})

const mockOrigins = [
  { id: 1, value: 'auto_refere', label: 'Auto-référé / De lui-même', sort_order: 1, is_active: true },
  { id: 2, value: 'centre_sante', label: 'Centre de santé', sort_order: 2, is_active: true },
  { id: 3, value: 'assurance', label: 'Assurance', sort_order: 10, is_active: true },
]

describe('useContactOrigins', () => {
  beforeEach(() => {
    mockInvoke.mockReset()
    mockInvoke.mockResolvedValue({ success: true, data: [] })
    const { origins, loading, error } = useContactOrigins()
    origins.value = []
    loading.value = false
    error.value = null
  })

  describe('fetchOrigins', () => {
    it('appelle ipcInvoke avec "contact-origins:list" et met à jour origins', async () => {
      mockInvoke.mockResolvedValue({ success: true, data: mockOrigins })
      const { fetchOrigins, origins, loading } = useContactOrigins()

      expect(origins.value).toEqual([])
      expect(loading.value).toBe(false)

      await fetchOrigins()

      expect(mockInvoke).toHaveBeenCalledWith('contact-origins:list', undefined)
      expect(origins.value).toEqual(mockOrigins)
      expect(origins.value).toHaveLength(3)
      expect(loading.value).toBe(false)
    })

    it('met loading à true pendant la requête', async () => {
      let resolvePromise!: (v: unknown) => void
      mockInvoke.mockImplementation(() => new Promise(resolve => { resolvePromise = resolve }))

      const { fetchOrigins, loading } = useContactOrigins()
      const promise = fetchOrigins()

      expect(loading.value).toBe(true)

      resolvePromise({ success: true, data: [] })
      await promise
      expect(loading.value).toBe(false)
    })

    it('met error en cas d\'échec IPC', async () => {
      mockInvoke.mockRejectedValue(new Error('Erreur réseau'))
      const { fetchOrigins, origins, error } = useContactOrigins()

      await fetchOrigins()

      expect(origins.value).toEqual([])
      expect(error.value).toBe('Erreur réseau')
    })
  })

  describe('fetchActiveOrigins', () => {
    it('appelle "contact-origins:list-active" et retourne les origines', async () => {
      mockInvoke.mockResolvedValue({ success: true, data: mockOrigins })
      const { fetchActiveOrigins } = useContactOrigins()

      const result = await fetchActiveOrigins()

      expect(mockInvoke).toHaveBeenCalledWith('contact-origins:list-active', undefined)
      expect(result).toEqual(mockOrigins)
    })

    it('retourne un tableau vide en cas d\'erreur', async () => {
      mockInvoke.mockRejectedValue(new Error('Erreur'))
      const { fetchActiveOrigins } = useContactOrigins()

      const result = await fetchActiveOrigins()

      expect(result).toEqual([])
    })
  })

  describe('createOrigin', () => {
    it('crée une origine puis refresh la liste', async () => {
      const newOrigin = { id: 4, value: 'hopital', label: 'Hôpital', sort_order: 5, is_active: true }
      mockInvoke
        .mockResolvedValueOnce({ success: true, data: newOrigin })
        .mockResolvedValueOnce({ success: true, data: [...mockOrigins, newOrigin] })

      const { createOrigin, origins } = useContactOrigins()
      const result = await createOrigin({ value: 'hopital', label: 'Hôpital', sort_order: 5, is_active: true })

      expect(result).toEqual(newOrigin)
      expect(mockInvoke).toHaveBeenNthCalledWith(1, 'contact-origins:create', {
        value: 'hopital', label: 'Hôpital', sort_order: 5, is_active: true,
      })
      expect(mockInvoke).toHaveBeenNthCalledWith(2, 'contact-origins:list', undefined)
      expect(origins.value).toHaveLength(4)
    })

    it('retourne null en cas d\'erreur', async () => {
      mockInvoke.mockRejectedValue(new Error('Erreur'))
      const { createOrigin } = useContactOrigins()

      const result = await createOrigin({ value: 'x', label: 'X', sort_order: 1, is_active: true })

      expect(result).toBeNull()
    })
  })

  describe('updateOrigin', () => {
    it('modifie une origine puis refresh', async () => {
      const updated = { id: 1, value: 'auto_refere', label: 'Auto-référé modifié', sort_order: 1, is_active: true }
      mockInvoke
        .mockResolvedValueOnce({ success: true, data: updated })
        .mockResolvedValueOnce({ success: true, data: [updated, mockOrigins[1], mockOrigins[2]] })

      const { updateOrigin } = useContactOrigins()
      const result = await updateOrigin(1, { label: 'Auto-référé modifié' })

      expect(result).toEqual(updated)
      expect(mockInvoke).toHaveBeenNthCalledWith(1, 'contact-origins:update', { id: 1, label: 'Auto-référé modifié' })
      expect(mockInvoke).toHaveBeenNthCalledWith(2, 'contact-origins:list', undefined)
    })

    it('retourne null en cas d\'erreur', async () => {
      mockInvoke.mockRejectedValue(new Error('Erreur'))
      const { updateOrigin } = useContactOrigins()

      const result = await updateOrigin(999, { label: 'X' })

      expect(result).toBeNull()
    })
  })

  describe('deleteOrigin', () => {
    it('supprime une origine puis refresh', async () => {
      mockInvoke
        .mockResolvedValueOnce({ success: true, data: null })
        .mockResolvedValueOnce({ success: true, data: [mockOrigins[1], mockOrigins[2]] })

      const { deleteOrigin } = useContactOrigins()
      const ok = await deleteOrigin(1)

      expect(ok).toBe(true)
      expect(mockInvoke).toHaveBeenNthCalledWith(1, 'contact-origins:delete', { id: 1 })
      expect(mockInvoke).toHaveBeenNthCalledWith(2, 'contact-origins:list', undefined)
    })

    it('retourne false en cas d\'erreur', async () => {
      mockInvoke.mockRejectedValue(new Error('Erreur'))
      const { deleteOrigin } = useContactOrigins()

      const ok = await deleteOrigin(999)

      expect(ok).toBe(false)
    })
  })
})
