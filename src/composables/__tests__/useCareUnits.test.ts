// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useCareUnits } from '../useCareUnits'
import type { CareUnitDto } from '../useCareUnits'

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
const mockUnits: CareUnitDto[] = [
  { id: 1, service_id: 1, name: 'Hospitalisation', code: 'HOSP', description: null, sort_order: 1, is_active: true, service_name: 'Médecine Générale' },
  { id: 2, service_id: 2, name: 'Consultation', code: 'CONS', description: 'Consultation externe', sort_order: 2, is_active: true, service_name: 'Endocrinologie' },
  { id: 3, service_id: 1, name: 'Soins Intensifs', code: 'SI', description: null, sort_order: 3, is_active: false, service_name: 'Médecine Générale' },
]

// ---------------------------------------------------------------------------
// The ipcInvoke utility sanitizes params via JSON.stringify, which converts
// `undefined` values to `null`. The mock receives the raw object after
// sanitization, so expect `null` not `undefined`.
// ---------------------------------------------------------------------------

describe('useCareUnits', () => {
  beforeEach(() => {
    mockInvoke.mockReset()
    // Default: succeed from IPC with empty array
    mockInvoke.mockResolvedValue({ success: true, data: [] })
  })

  // -----------------------------------------------------------------------
  // fetchUnits
  // -----------------------------------------------------------------------
  describe('fetchUnits', () => {
    it('calls ipcInvoke with "care-units:list" and sets units ref', async () => {
      mockInvoke.mockResolvedValue({ success: true, data: mockUnits })
      const { fetchUnits, units } = useCareUnits()

      expect(units.value).toEqual([])
      await fetchUnits()

      expect(mockInvoke).toHaveBeenCalledWith('care-units:list', { serviceId: null })
      expect(units.value).toEqual(mockUnits)
      expect(units.value).toHaveLength(3)
    })

    it('passes serviceId filter to IPC', async () => {
      mockInvoke.mockResolvedValue({ success: true, data: [mockUnits[0]] })
      const { fetchUnits } = useCareUnits()

      await fetchUnits(5)

      expect(mockInvoke).toHaveBeenCalledWith('care-units:list', { serviceId: 5 })
    })

    it('sets error on IPC failure (units unchanged)', async () => {
      // First populate units with data via successful call
      mockInvoke.mockResolvedValue({ success: true, data: mockUnits })
      const { fetchUnits: fetchOk, units } = useCareUnits()
      await fetchOk()
      expect(units.value).toHaveLength(3)

      // Now simulate a failure — units should keep old data
      mockInvoke.mockRejectedValue(new Error('Erreur réseau'))
      const { fetchUnits: fetchFail, error } = useCareUnits()
      await fetchFail()

      // units retains previous data on error
      expect(units.value).toHaveLength(3)
      expect(error.value).toBe('Erreur réseau')
    })
  })

  // -----------------------------------------------------------------------
  // createUnit
  // -----------------------------------------------------------------------
  describe('createUnit', () => {
    it('creates a unit then refreshes the list', async () => {
      const created: CareUnitDto = {
        id: 4, service_id: 1, name: 'Nouvelle Unité',
        code: 'NU', description: null, sort_order: 4, is_active: true,
      }
      mockInvoke
        .mockResolvedValueOnce({ success: true, data: created })
        .mockResolvedValueOnce({ success: true, data: [...mockUnits, created] })

      const { createUnit, units } = useCareUnits()
      const result = await createUnit({ service_id: 1, name: 'Nouvelle Unité', code: 'NU' })

      expect(result).toEqual(created)
      expect(mockInvoke).toHaveBeenNthCalledWith(1, 'care-units:create', {
        service_id: 1, name: 'Nouvelle Unité', code: 'NU',
      })
      expect(mockInvoke).toHaveBeenNthCalledWith(2, 'care-units:list', { serviceId: null })
      expect(units.value).toHaveLength(4)
    })

    it('returns null on IPC error', async () => {
      mockInvoke.mockRejectedValue(new Error('Erreur création'))
      const { createUnit } = useCareUnits()
      const result = await createUnit({ service_id: 1, name: 'Erreur', code: 'ERR' })
      expect(result).toBeNull()
    })
  })

  // -----------------------------------------------------------------------
  // updateUnit
  // -----------------------------------------------------------------------
  describe('updateUnit', () => {
    it('updates a unit then refreshes the list', async () => {
      const updated: CareUnitDto = { ...mockUnits[0], name: 'Modifié' }
      mockInvoke
        .mockResolvedValueOnce({ success: true, data: updated })
        .mockResolvedValueOnce({ success: true, data: [updated, mockUnits[1], mockUnits[2]] })

      const { updateUnit } = useCareUnits()
      const result = await updateUnit(1, { name: 'Modifié' })

      expect(result).toEqual(updated)
      expect(mockInvoke).toHaveBeenNthCalledWith(1, 'care-units:update', { id: 1, name: 'Modifié' })
      expect(mockInvoke).toHaveBeenNthCalledWith(2, 'care-units:list', { serviceId: null })
    })

    it('returns null on IPC error', async () => {
      mockInvoke.mockRejectedValue(new Error('Erreur mise à jour'))
      const { updateUnit } = useCareUnits()
      const result = await updateUnit(999, { name: 'Ghost' })
      expect(result).toBeNull()
    })
  })

  // -----------------------------------------------------------------------
  // deleteUnit
  // -----------------------------------------------------------------------
  describe('deleteUnit', () => {
    it('deletes a unit then refreshes the list', async () => {
      mockInvoke
        .mockResolvedValueOnce({ success: true, data: null })
        .mockResolvedValueOnce({ success: true, data: [mockUnits[1], mockUnits[2]] })

      const { deleteUnit } = useCareUnits()
      const ok = await deleteUnit(1)

      expect(ok).toBe(true)
      expect(mockInvoke).toHaveBeenNthCalledWith(1, 'care-units:delete', { id: 1 })
      expect(mockInvoke).toHaveBeenNthCalledWith(2, 'care-units:list', { serviceId: null })
    })

    it('returns false on IPC error', async () => {
      mockInvoke.mockRejectedValue(new Error('Erreur suppression'))
      const { deleteUnit } = useCareUnits()
      const ok = await deleteUnit(999)
      expect(ok).toBe(false)
    })
  })

  // -----------------------------------------------------------------------
  // toggleUnit
  // -----------------------------------------------------------------------
  describe('toggleUnit', () => {
    it('toggles the status and updates local state', async () => {
      const toggled: CareUnitDto = { ...mockUnits[0], is_active: false }
      mockInvoke.mockResolvedValue({ success: true, data: toggled })

      const { toggleUnit, units } = useCareUnits()
      units.value = [...mockUnits]

      const result = await toggleUnit(1, false)

      expect(result).toEqual(toggled)
      expect(mockInvoke).toHaveBeenCalledWith('care-units:toggle', { id: 1, is_active: false })
      // Local state updated
      expect(units.value[0].is_active).toBe(false)
    })

    it('does not modify local state if id is not found', async () => {
      const toggled: CareUnitDto = { id: 99, service_id: 1, name: 'Ghost', sort_order: 0, is_active: false }
      mockInvoke.mockResolvedValue({ success: true, data: toggled })

      const { toggleUnit, units } = useCareUnits()
      units.value = [...mockUnits]

      await toggleUnit(99, false)

      // Local state unchanged (no id match)
      expect(units.value).toHaveLength(3)
      // Original units unchanged
      expect(units.value[0].is_active).toBe(true)
    })

    it('returns null on IPC error', async () => {
      mockInvoke.mockRejectedValue(new Error('Erreur bascule'))
      const { toggleUnit } = useCareUnits()
      const result = await toggleUnit(1, false)
      expect(result).toBeNull()
    })
  })

  // -----------------------------------------------------------------------
  // Loading state
  // -----------------------------------------------------------------------
  describe('loading state', () => {
    it('sets loading true during fetchUnits and false after', async () => {
      mockInvoke.mockResolvedValue({ success: true, data: mockUnits })
      const { fetchUnits, loading } = useCareUnits()

      const promise = fetchUnits()
      expect(loading.value).toBe(true)
      await promise
      expect(loading.value).toBe(false)
    })
  })
})
