// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useStock } from '@/composables/useStock'
import { useDispensations } from '@/composables/useDispensations'

const mockIpcInvoke = vi.hoisted(() => vi.fn())

vi.mock('@/utils/ipc', () => ({
  ipcInvoke: mockIpcInvoke,
}))

describe('pharmacie fetch payloads (P0: omission des clés null/undefined)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIpcInvoke.mockResolvedValue([])
  })

  it('fetchMouvements sends only {limit:100} when no filter is set', async () => {
    await useStock().fetchMouvements()

    expect(mockIpcInvoke).toHaveBeenCalledWith('stock:mouvements', { limit: 100 })
  })

  it('fetchMouvements includes explicitly set filters', async () => {
    await useStock().fetchMouvements({ medicamentId: 3, type: 'entree', limit: 10 })

    expect(mockIpcInvoke).toHaveBeenCalledWith(
      'stock:mouvements',
      { limit: 10, medicamentId: 3, type: 'entree' },
    )
  })

  it('fetchFile sends {} when no statut is set', async () => {
    await useDispensations().fetchFile()

    expect(mockIpcInvoke).toHaveBeenCalledWith('dispensation:file', {})
  })

  it('fetchFile includes statut when set', async () => {
    await useDispensations().fetchFile('servie')

    expect(mockIpcInvoke).toHaveBeenCalledWith('dispensation:file', { statut: 'servie' })
  })
})
