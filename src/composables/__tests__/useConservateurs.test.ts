// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useConservateurs } from '../useConservateurs'
import type { StockageDto, ChampLocalisationDto } from '../useConservateurs'

// ---------------------------------------------------------------------------
// Mock electronAPI / ipcInvoke
// ---------------------------------------------------------------------------
const mockInvoke = vi.fn()
vi.stubGlobal('window', {
  electronAPI: {
    invoke: mockInvoke,
  },
})

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const mockStockages: StockageDto[] = [
  { id: 1, code: 'stk_01', name: 'Réfrigérateur (2°C - 8°C)', description: 'Stockage standard', sort_order: 1, champs_count: 2, is_active: true },
  { id: 2, code: 'stk_02', name: 'Congélateur Standard (-20°C)', description: 'Pour la conservation', sort_order: 2, champs_count: 3, is_active: true },
  { id: 3, code: 'stk_06', name: 'Température Ambiante', description: 'Ancien', sort_order: 6, champs_count: 0, is_active: false },
]

const mockChamps: ChampLocalisationDto[] = [
  { id: 1, stockage_id: 1, cle: 'etagere', label: 'Étagère', type: 'texte', sort_order: 1 },
  { id: 2, stockage_id: 1, cle: 'bac', label: 'Bac / Casier', type: 'texte', sort_order: 2 },
]

describe('useConservateurs', () => {
  beforeEach(() => {
    mockInvoke.mockReset()
    // Default: succeed from IPC
    mockInvoke.mockResolvedValue({ success: true, data: [] })
  })

  // -----------------------------------------------------------------------
  // fetchStockages
  // -----------------------------------------------------------------------
  describe('fetchStockages', () => {
    it('appelle ipcInvoke avec "conservateurs:list" et met à jour stockages', async () => {
      mockInvoke.mockResolvedValue({ success: true, data: mockStockages })
      const { fetchStockages, stockages } = useConservateurs()

      expect(stockages.value).toEqual([])
      await fetchStockages()

      expect(mockInvoke).toHaveBeenCalledWith('conservateurs:list', undefined)
      expect(stockages.value).toEqual(mockStockages)
      expect(stockages.value).toHaveLength(3)
    })

    it('met error en cas d\'échec IPC', async () => {
      mockInvoke.mockRejectedValue(new Error('Erreur réseau'))
      const { fetchStockages, stockages, error } = useConservateurs()

      await fetchStockages()

      expect(stockages.value).toEqual([])
      expect(error.value).toBe('Erreur réseau')
    })
  })

  // -----------------------------------------------------------------------
  // fetchChampsByStockage
  // -----------------------------------------------------------------------
  describe('fetchChampsByStockage', () => {
    it('appelle "conservateurs:champs-list" avec le bon stockage_id', async () => {
      mockInvoke.mockResolvedValue({ success: true, data: mockChamps })
      const { fetchChampsByStockage, champs } = useConservateurs()

      await fetchChampsByStockage(1)

      expect(mockInvoke).toHaveBeenCalledWith('conservateurs:champs-list', { stockage_id: 1 })
      expect(champs.value).toEqual(mockChamps)
    })
  })

  // -----------------------------------------------------------------------
  // createStockage
  // -----------------------------------------------------------------------
  describe('createStockage', () => {
    it('crée un stockage puis refresh la liste', async () => {
      const created: StockageDto = {
        id: 4, code: 'stk_04', name: 'Nouveau Stockage',
        description: null, sort_order: 4, champs_count: 0, is_active: true,
      }
      mockInvoke
        .mockResolvedValueOnce({ success: true, data: created })   // create
        .mockResolvedValueOnce({ success: true, data: [...mockStockages, created] }) // refresh

      const { createStockage, stockages } = useConservateurs()
      const result = await createStockage({ code: 'stk_04', name: 'Nouveau Stockage', sort_order: 4 })

      expect(result).toEqual(created)
      expect(mockInvoke).toHaveBeenNthCalledWith(1, 'conservateurs:create', {
        code: 'stk_04', name: 'Nouveau Stockage', sort_order: 4,
      })
      expect(mockInvoke).toHaveBeenNthCalledWith(2, 'conservateurs:list', undefined)
      expect(stockages.value).toHaveLength(4)
    })

    it('retourne null en cas d\'erreur', async () => {
      mockInvoke.mockRejectedValue(new Error('Erreur'))
      const { createStockage } = useConservateurs()
      const result = await createStockage({ code: 'x', name: 'X', sort_order: 1 })

      expect(result).toBeNull()
    })
  })

  // -----------------------------------------------------------------------
  // updateStockage
  // -----------------------------------------------------------------------
  describe('updateStockage', () => {
    it('modifie un stockage puis refresh', async () => {
      const updated: StockageDto = { id: 1, code: 'stk_01', name: 'Réfrigérateur modifié', description: null, sort_order: 1, champs_count: 2, is_active: true }
      mockInvoke
        .mockResolvedValueOnce({ success: true, data: updated })
        .mockResolvedValueOnce({ success: true, data: [updated, mockStockages[1], mockStockages[2]] })

      const { updateStockage } = useConservateurs()
      const result = await updateStockage(1, { name: 'Réfrigérateur modifié' })

      expect(result).toEqual(updated)
      expect(mockInvoke).toHaveBeenNthCalledWith(1, 'conservateurs:update', { id: 1, name: 'Réfrigérateur modifié' })
      expect(mockInvoke).toHaveBeenNthCalledWith(2, 'conservateurs:list', undefined)
    })
  })

  // -----------------------------------------------------------------------
  // deleteStockage
  // -----------------------------------------------------------------------
  describe('deleteStockage', () => {
    it('supprime un stockage puis refresh', async () => {
      mockInvoke
        .mockResolvedValueOnce({ success: true, data: null })
        .mockResolvedValueOnce({ success: true, data: [mockStockages[1], mockStockages[2]] })

      const { deleteStockage } = useConservateurs()
      const ok = await deleteStockage(1)

      expect(ok).toBe(true)
      expect(mockInvoke).toHaveBeenNthCalledWith(1, 'conservateurs:delete', { id: 1 })
      expect(mockInvoke).toHaveBeenNthCalledWith(2, 'conservateurs:list', undefined)
    })

    it('retourne false en cas d\'erreur', async () => {
      mockInvoke.mockRejectedValue(new Error('Erreur'))
      const { deleteStockage } = useConservateurs()
      const ok = await deleteStockage(999)
      expect(ok).toBe(false)
    })
  })

  // -----------------------------------------------------------------------
  // toggleStockage
  // -----------------------------------------------------------------------
  describe('toggleStockage', () => {
    it('bascule le statut et met à jour stockages de manière optimiste', async () => {
      const toggled: StockageDto = { ...mockStockages[0], is_active: false }
      mockInvoke.mockResolvedValue({ success: true, data: toggled })

      const { toggleStockage, stockages } = useConservateurs()
      stockages.value = [...mockStockages]

      const result = await toggleStockage(1, false)

      expect(result).toEqual(toggled)
      expect(mockInvoke).toHaveBeenCalledWith('conservateurs:toggle', { id: 1, is_active: false })
      // Optimistic update: stockages[0] should have is_active = false
      expect(stockages.value[0].is_active).toBe(false)
    })

    it('ne modifie pas stockages si l\'élément n\'existe pas', async () => {
      const toggled: StockageDto = { id: 99, code: 'x', name: 'X', sort_order: 0, is_active: false }
      mockInvoke.mockResolvedValue({ success: true, data: toggled })

      const { toggleStockage, stockages } = useConservateurs()
      stockages.value = [...mockStockages]

      await toggleStockage(99, false)

      // stockages unchanged (no id match)
      expect(stockages.value).toHaveLength(3)
    })

    it('retourne null en cas d\'erreur', async () => {
      mockInvoke.mockRejectedValue(new Error('Erreur'))
      const { toggleStockage } = useConservateurs()
      const result = await toggleStockage(1, false)
      expect(result).toBeNull()
    })
  })

  // -----------------------------------------------------------------------
  // createChamp
  // -----------------------------------------------------------------------
  describe('createChamp', () => {
    it('crée un champ puis refresh les champs du stockage', async () => {
      const newChamp: ChampLocalisationDto = { id: 3, stockage_id: 1, cle: 'tiroir', label: 'Tiroir', type: 'texte', sort_order: 3 }
      mockInvoke
        .mockResolvedValueOnce({ success: true, data: newChamp })
        .mockResolvedValueOnce({ success: true, data: [...mockChamps, newChamp] })

      const { createChamp } = useConservateurs()
      const result = await createChamp({ stockage_id: 1, cle: 'tiroir', label: 'Tiroir', sort_order: 3 })

      expect(result).toEqual(newChamp)
      expect(mockInvoke).toHaveBeenNthCalledWith(1, 'conservateurs:champs-create', {
        stockage_id: 1, cle: 'tiroir', label: 'Tiroir', sort_order: 3,
      })
      expect(mockInvoke).toHaveBeenNthCalledWith(2, 'conservateurs:champs-list', { stockage_id: 1 })
    })

    it('retourne null en cas d\'erreur', async () => {
      mockInvoke.mockRejectedValue(new Error('Erreur'))
      const { createChamp } = useConservateurs()
      const result = await createChamp({ stockage_id: 1, cle: 'x', label: 'X', sort_order: 1 })
      expect(result).toBeNull()
    })
  })

  // -----------------------------------------------------------------------
  // updateChamp
  // -----------------------------------------------------------------------
  describe('updateChamp', () => {
    it('modifie un champ puis refresh', async () => {
      const updated: ChampLocalisationDto = { id: 1, stockage_id: 1, cle: 'etagere', label: 'Étagère modifiée', type: 'texte', sort_order: 1 }
      mockInvoke
        .mockResolvedValueOnce({ success: true, data: updated })
        .mockResolvedValueOnce({ success: true, data: [updated, mockChamps[1]] })

      const { updateChamp } = useConservateurs()
      const result = await updateChamp(1, { stockage_id: 1, label: 'Étagère modifiée' })

      expect(result).toEqual(updated)
      expect(mockInvoke).toHaveBeenNthCalledWith(1, 'conservateurs:champs-update', { id: 1, stockage_id: 1, label: 'Étagère modifiée' })
      expect(mockInvoke).toHaveBeenNthCalledWith(2, 'conservateurs:champs-list', { stockage_id: 1 })
    })
  })

  // -----------------------------------------------------------------------
  // deleteChamp
  // -----------------------------------------------------------------------
  describe('deleteChamp', () => {
    it('supprime un champ et refresh si stockageId fourni', async () => {
      mockInvoke
        .mockResolvedValueOnce({ success: true, data: null })
        .mockResolvedValueOnce({ success: true, data: [mockChamps[1]] })

      const { deleteChamp } = useConservateurs()
      const ok = await deleteChamp(1, 1)

      expect(ok).toBe(true)
      expect(mockInvoke).toHaveBeenNthCalledWith(1, 'conservateurs:champs-delete', { id: 1 })
      expect(mockInvoke).toHaveBeenNthCalledWith(2, 'conservateurs:champs-list', { stockage_id: 1 })
    })

    it('retourne false en cas d\'erreur', async () => {
      mockInvoke.mockRejectedValue(new Error('Erreur'))
      const { deleteChamp } = useConservateurs()
      const ok = await deleteChamp(999)
      expect(ok).toBe(false)
    })
  })
})
