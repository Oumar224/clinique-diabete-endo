// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useContactCategories } from '../useContactCategories'

const mockInvoke = vi.fn()
vi.stubGlobal('window', {
  electronAPI: {
    invoke: mockInvoke,
  },
})

const mockCategories = [
  { id: 1, value: 'consultation', label: 'Consultation', sort_order: 1, is_active: true },
  { id: 2, value: 'urgence', label: 'Urgence', sort_order: 2, is_active: true },
  { id: 3, value: 'hospitalisation', label: 'Hospitalisation', sort_order: 4, is_active: true },
]

describe('useContactCategories', () => {
  beforeEach(() => {
    mockInvoke.mockReset()
    mockInvoke.mockResolvedValue({ success: true, data: [] })
    const { categories, loading, error } = useContactCategories()
    categories.value = []
    loading.value = false
    error.value = null
  })

  describe('fetchCategories', () => {
    it('appelle ipcInvoke avec "contact-categories:list" et met à jour categories', async () => {
      mockInvoke.mockResolvedValue({ success: true, data: mockCategories })
      const { fetchCategories, categories, loading } = useContactCategories()

      expect(categories.value).toEqual([])
      expect(loading.value).toBe(false)

      await fetchCategories()

      expect(mockInvoke).toHaveBeenCalledWith('contact-categories:list', undefined)
      expect(categories.value).toEqual(mockCategories)
      expect(categories.value).toHaveLength(3)
      expect(loading.value).toBe(false)
    })

    it('met loading à true pendant la requête', async () => {
      let resolvePromise!: (v: unknown) => void
      mockInvoke.mockImplementation(() => new Promise(resolve => { resolvePromise = resolve }))

      const { fetchCategories, loading } = useContactCategories()
      const promise = fetchCategories()

      expect(loading.value).toBe(true)

      resolvePromise({ success: true, data: [] })
      await promise
      expect(loading.value).toBe(false)
    })

    it('met error en cas d\'échec IPC', async () => {
      mockInvoke.mockRejectedValue(new Error('Erreur réseau'))
      const { fetchCategories, categories, error } = useContactCategories()

      await fetchCategories()

      expect(categories.value).toEqual([])
      expect(error.value).toBe('Erreur réseau')
    })
  })

  describe('fetchActiveCategories', () => {
    it('appelle "contact-categories:list-active" et retourne les catégories', async () => {
      mockInvoke.mockResolvedValue({ success: true, data: mockCategories })
      const { fetchActiveCategories } = useContactCategories()

      const result = await fetchActiveCategories()

      expect(mockInvoke).toHaveBeenCalledWith('contact-categories:list-active', undefined)
      expect(result).toEqual(mockCategories)
    })

    it('retourne un tableau vide en cas d\'erreur', async () => {
      mockInvoke.mockRejectedValue(new Error('Erreur'))
      const { fetchActiveCategories } = useContactCategories()

      const result = await fetchActiveCategories()

      expect(result).toEqual([])
    })
  })

  describe('createCategory', () => {
    it('crée une catégorie puis refresh la liste', async () => {
      const newCategory = { id: 4, value: 'suivi', label: 'Suivi', sort_order: 3, is_active: true }
      mockInvoke
        .mockResolvedValueOnce({ success: true, data: newCategory })
        .mockResolvedValueOnce({ success: true, data: [...mockCategories, newCategory] })

      const { createCategory, categories } = useContactCategories()
      const result = await createCategory({ value: 'suivi', label: 'Suivi', sort_order: 3, is_active: true })

      expect(result).toEqual(newCategory)
      expect(mockInvoke).toHaveBeenNthCalledWith(1, 'contact-categories:create', {
        value: 'suivi', label: 'Suivi', sort_order: 3, is_active: true,
      })
      expect(mockInvoke).toHaveBeenNthCalledWith(2, 'contact-categories:list', undefined)
      expect(categories.value).toHaveLength(4)
    })

    it('retourne null en cas d\'erreur', async () => {
      mockInvoke.mockRejectedValue(new Error('Erreur'))
      const { createCategory } = useContactCategories()

      const result = await createCategory({ value: 'x', label: 'X', sort_order: 1, is_active: true })

      expect(result).toBeNull()
    })
  })

  describe('updateCategory', () => {
    it('modifie une catégorie puis refresh', async () => {
      const updated = { id: 1, value: 'consultation', label: 'Consultation modifiée', sort_order: 1, is_active: true }
      mockInvoke
        .mockResolvedValueOnce({ success: true, data: updated })
        .mockResolvedValueOnce({ success: true, data: [updated, mockCategories[1], mockCategories[2]] })

      const { updateCategory } = useContactCategories()
      const result = await updateCategory(1, { label: 'Consultation modifiée' })

      expect(result).toEqual(updated)
      expect(mockInvoke).toHaveBeenNthCalledWith(1, 'contact-categories:update', { id: 1, label: 'Consultation modifiée' })
      expect(mockInvoke).toHaveBeenNthCalledWith(2, 'contact-categories:list', undefined)
    })

    it('retourne null en cas d\'erreur', async () => {
      mockInvoke.mockRejectedValue(new Error('Erreur'))
      const { updateCategory } = useContactCategories()

      const result = await updateCategory(999, { label: 'X' })

      expect(result).toBeNull()
    })
  })

  describe('deleteCategory', () => {
    it('supprime une catégorie puis refresh', async () => {
      mockInvoke
        .mockResolvedValueOnce({ success: true, data: null })
        .mockResolvedValueOnce({ success: true, data: [mockCategories[1], mockCategories[2]] })

      const { deleteCategory } = useContactCategories()
      const ok = await deleteCategory(1)

      expect(ok).toBe(true)
      expect(mockInvoke).toHaveBeenNthCalledWith(1, 'contact-categories:delete', { id: 1 })
      expect(mockInvoke).toHaveBeenNthCalledWith(2, 'contact-categories:list', undefined)
    })

    it('retourne false en cas d\'erreur', async () => {
      mockInvoke.mockRejectedValue(new Error('Erreur'))
      const { deleteCategory } = useContactCategories()

      const ok = await deleteCategory(999)

      expect(ok).toBe(false)
    })
  })
})
