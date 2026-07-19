// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useExamTypes } from '../useExamTypes'
import type { ExamCategoryDto, ExamTypeDto } from '../useExamTypes'

// ─── Mock ipcInvoke ────────────────────────────────────────────────
const mockIpcInvoke = vi.hoisted(() => vi.fn())
vi.mock('@/utils/ipc', () => ({
  ipcInvoke: mockIpcInvoke,
}))

vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), warning: vi.fn(), error: vi.fn() },
  ElMessageBox: { confirm: vi.fn(() => Promise.resolve()) },
}))

// ─── Test fixtures ─────────────────────────────────────────────────
const mockExamTypes: ExamTypeDto[] = [
  { id: 1, category_id: 1, label: 'Radiographie thoracique', is_active: true, category_label: 'Imagerie' },
  { id: 2, category_id: 1, label: 'Scanner cérébral', is_active: true, category_label: 'Imagerie' },
  { id: 3, category_id: 1, label: 'IRM cardiaque', is_active: true, category_label: 'Imagerie' },
  { id: 4, category_id: 2, label: 'NFS', is_active: true, category_label: 'Laboratoire' },
  { id: 5, category_id: 2, label: 'HbA1c', is_active: true, category_label: 'Laboratoire' },
  { id: 6, category_id: 3, label: 'Avis cardiologique', is_active: true, category_label: 'Avis spécialisé' },
]

describe('useExamTypes', () => {
  beforeEach(() => {
    mockIpcInvoke.mockReset()
    mockIpcInvoke.mockResolvedValue([])
  })

  // ─── Categories ──────────────────────────────────────────────────

  describe('categories', () => {
    it('includes all three predefined categories: imagerie, laboratoire, avis', () => {
      const { categories } = useExamTypes()
      expect(categories.value).toHaveLength(3)
      const codes = categories.value.map(c => c.code).sort()
      expect(codes).toEqual(['avis', 'imagerie', 'laboratoire'])
    })

    it('has correct labels for each category', () => {
      const { categories } = useExamTypes()
      const imagerie = categories.value.find(c => c.code === 'imagerie')
      const laboratoire = categories.value.find(c => c.code === 'laboratoire')
      const avis = categories.value.find(c => c.code === 'avis')

      expect(imagerie!.label).toBe('Imagerie')
      expect(laboratoire!.label).toBe('Laboratoire')
      expect(avis!.label).toBe('Avis spécialisé')
    })

    it('has correct sort_order for categories', () => {
      const { categories } = useExamTypes()
      expect(categories.value[0].sort_order).toBe(1)
      expect(categories.value[1].sort_order).toBe(2)
      expect(categories.value[2].sort_order).toBe(3)
    })

    it('categories are hardcoded and do not require an API call', async () => {
      const { categories, fetchCategories } = useExamTypes()
      expect(categories.value).toHaveLength(3)
      // fetchCategories is a no-op — calling it does not invoke IPC
      await fetchCategories()
      expect(mockIpcInvoke).not.toHaveBeenCalled()
    })
  })

  // ─── fetchTypesByCategory ────────────────────────────────────────

  describe('fetchTypesByCategory', () => {
    it('fetches exam types for a given category code', async () => {
      mockIpcInvoke.mockResolvedValue(mockExamTypes.filter(t => t.category_id === 1))
      const { fetchTypesByCategory, types } = useExamTypes()

      await fetchTypesByCategory('imagerie')

      expect(mockIpcInvoke).toHaveBeenCalledWith('exam-types:list-by-category', { category_code: 'imagerie' })
      expect(types.value).toHaveLength(3)
      expect(types.value[0].category_label).toBe('Imagerie')
    })

    it('fetches laboratoire types', async () => {
      mockIpcInvoke.mockResolvedValue(mockExamTypes.filter(t => t.category_id === 2))
      const { fetchTypesByCategory, types } = useExamTypes()

      await fetchTypesByCategory('laboratoire')

      expect(types.value).toHaveLength(2)
      expect(types.value.some(t => t.label === 'NFS')).toBe(true)
      expect(types.value.some(t => t.label === 'HbA1c')).toBe(true)
    })

    it('fetches avis category types', async () => {
      mockIpcInvoke.mockResolvedValue(mockExamTypes.filter(t => t.category_id === 3))
      const { fetchTypesByCategory, types } = useExamTypes()

      await fetchTypesByCategory('avis')

      expect(types.value).toHaveLength(1)
      expect(types.value[0].label).toBe('Avis cardiologique')
    })

    it('sets types to empty array when result is not an array', async () => {
      mockIpcInvoke.mockResolvedValue(null)
      const { fetchTypesByCategory, types } = useExamTypes()

      await fetchTypesByCategory('imagerie')

      expect(types.value).toEqual([])
    })

    it('sets error on IPC failure', async () => {
      mockIpcInvoke.mockRejectedValue(new Error('Erreur API'))
      const { fetchTypesByCategory, error } = useExamTypes()

      await fetchTypesByCategory('imagerie')

      expect(error.value).toBe('Erreur API')
    })
  })

  // ─── fetchAllByCategory ──────────────────────────────────────────

  describe('fetchAllByCategory', () => {
    it('fetches all exam types including inactive for a category', async () => {
      mockIpcInvoke.mockResolvedValue(mockExamTypes)
      const { fetchAllByCategory, allTypes } = useExamTypes()

      await fetchAllByCategory('imagerie')

      expect(mockIpcInvoke).toHaveBeenCalledWith('exam-types:list-all-by-category', { category_code: 'imagerie' })
      expect(allTypes.value).toHaveLength(6)
    })
  })

  // ─── fetchByType ─────────────────────────────────────────────────

  describe('fetchByType', () => {
    it('fetches exam types by parent type id', async () => {
      const childTypes: ExamTypeDto[] = [
        { id: 7, category_id: 1, parent_id: 1, label: 'Radio thorax face', is_active: true },
      ]
      mockIpcInvoke.mockResolvedValue(childTypes)
      const { fetchByType, types } = useExamTypes()

      await fetchByType(1)

      expect(mockIpcInvoke).toHaveBeenCalledWith('exam-types:list-by-type', { type_id: 1 })
      expect(types.value).toHaveLength(1)
      expect(types.value[0].label).toBe('Radio thorax face')
    })
  })

  // ─── createType ──────────────────────────────────────────────────

  describe('createType', () => {
    it('creates a new exam type', async () => {
      const newType: ExamTypeDto = { id: 10, category_id: 1, label: 'Nouvel examen', is_active: true }
      mockIpcInvoke.mockResolvedValue(newType)
      const { createType } = useExamTypes()

      const result = await createType({ label: 'Nouvel examen', category_id: 1 })

      expect(result).toEqual(newType)
      expect(mockIpcInvoke).toHaveBeenCalledWith('exam-types:create', { label: 'Nouvel examen', category_id: 1 })
    })

    it('returns null on failure', async () => {
      mockIpcInvoke.mockRejectedValue(new Error('Erreur création'))
      const { createType } = useExamTypes()

      const result = await createType({ label: 'Échec', category_id: 1 })

      expect(result).toBeNull()
    })
  })

  // ─── updateType ──────────────────────────────────────────────────

  describe('updateType', () => {
    it('updates an exam type label', async () => {
      const updated: ExamTypeDto = { id: 1, category_id: 1, label: 'Mis à jour', is_active: true }
      mockIpcInvoke.mockResolvedValue(updated)
      const { updateType } = useExamTypes()

      const result = await updateType(1, { label: 'Mis à jour' })

      expect(result).toEqual(updated)
      expect(mockIpcInvoke).toHaveBeenCalledWith('exam-types:update', { id: 1, label: 'Mis à jour' })
    })

    it('toggles is_active status', async () => {
      const toggled: ExamTypeDto = { id: 1, category_id: 1, label: 'Radio', is_active: false }
      mockIpcInvoke.mockResolvedValue(toggled)
      const { updateType } = useExamTypes()

      const result = await updateType(1, { is_active: false })

      expect(result!.is_active).toBe(false)
    })
  })

  // ─── deleteType ──────────────────────────────────────────────────

  describe('deleteType', () => {
    it('deletes an exam type', async () => {
      mockIpcInvoke.mockResolvedValue(undefined)
      const { deleteType } = useExamTypes()

      const result = await deleteType(1)

      expect(result).toBe(true)
      expect(mockIpcInvoke).toHaveBeenCalledWith('exam-types:delete', { id: 1 })
    })

    it('returns false on failure', async () => {
      mockIpcInvoke.mockRejectedValue(new Error('Erreur suppression'))
      const { deleteType } = useExamTypes()

      const result = await deleteType(999)

      expect(result).toBe(false)
    })
  })

  // ─── Loading state ───────────────────────────────────────────────

  describe('loading state', () => {
    it('sets typesLoading true during fetch and false after', async () => {
      let resolvePromise!: (val: unknown) => void
      mockIpcInvoke.mockReturnValue(new Promise(resolve => { resolvePromise = resolve }))

      const { fetchTypesByCategory, typesLoading } = useExamTypes()
      const promise = fetchTypesByCategory('imagerie')

      expect(typesLoading.value).toBe(true)

      resolvePromise([])
      await promise

      expect(typesLoading.value).toBe(false)
    })
  })
})
