import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockIpcInvoke } = vi.hoisted(() => ({ mockIpcInvoke: vi.fn() }))

vi.mock('@/utils/ipc', () => ({
  ipcInvoke: mockIpcInvoke,
}))

import { useApports } from '../useApports'

const APPORT = {
  id: 3,
  reference: 'AP-20261024-0001',
  type: 'dette' as const,
  libelle: 'Avance fournisseur',
  montant: 100_000,
  statut: 'ouvert' as const,
  montantRembourse: 0,
  resteARembourser: 100_000,
}

describe('useApports — canaux IPC', () => {
  beforeEach(() => {
    mockIpcInvoke.mockReset()
  })

  it('fetchApports appelle apport:list avec les filtres et renvoie la liste', async () => {
    mockIpcInvoke.mockResolvedValue([APPORT])
    const { fetchApports, apports, error, loading } = useApports()

    const result = await fetchApports({ statut: 'ouvert', type: 'dette' })

    expect(mockIpcInvoke).toHaveBeenCalledWith(
      'apport:list',
      { statut: 'ouvert', type: 'dette' },
      { silent: true },
    )
    expect(result).toEqual([APPORT])
    expect(apports.value).toEqual([APPORT])
    expect(error.value).toBeNull()
    expect(loading.value).toBe(false)
  })

  it('fetchApports renvoie [] et expose l’erreur en cas d’échec', async () => {
    mockIpcInvoke.mockRejectedValue(new Error('lecture impossible'))
    const { fetchApports, apports, error } = useApports()

    const result = await fetchApports()

    expect(result).toEqual([])
    expect(apports.value).toEqual([])
    expect(error.value).toBe('lecture impossible')
  })

  it('fetchApport appelle apport:get avec { id }', async () => {
    mockIpcInvoke.mockResolvedValue(APPORT)
    const { fetchApport, apport, error } = useApports()

    const result = await fetchApport(3)

    expect(mockIpcInvoke).toHaveBeenCalledWith('apport:get', { id: 3 }, { silent: true })
    expect(result).toEqual(APPORT)
    expect(apport.value).toEqual(APPORT)
    expect(error.value).toBeNull()
  })

  it('fetchApport renvoie null et expose l’erreur en cas d’échec', async () => {
    mockIpcInvoke.mockRejectedValue(new Error('apport introuvable'))
    const { fetchApport, apport, error } = useApports()

    const result = await fetchApport(404)

    expect(result).toBeNull()
    expect(apport.value).toBeNull()
    expect(error.value).toBe('apport introuvable')
  })

  it('fetchApport efface l’erreur précédente lors d’un appel réussi', async () => {
    mockIpcInvoke
      .mockRejectedValueOnce(new Error('apport introuvable'))
      .mockResolvedValueOnce(APPORT)
    const { fetchApport, error } = useApports()

    await fetchApport(404)
    expect(error.value).toBe('apport introuvable')

    const result = await fetchApport(3)

    expect(result).toEqual(APPORT)
    expect(error.value).toBeNull()
  })

  it('createApport appelle apport:create avec le DTO', async () => {
    mockIpcInvoke.mockResolvedValue(APPORT)
    const { createApport, saving, error } = useApports()
    const dto = {
      type: 'dette' as const,
      libelle: 'Avance fournisseur',
      montant: 100_000,
      dateApport: '2026-10-24',
    }

    const result = await createApport(dto)

    expect(mockIpcInvoke).toHaveBeenCalledWith('apport:create', dto, { silent: true })
    expect(result).toEqual(APPORT)
    expect(saving.value).toBe(false)
    expect(error.value).toBeNull()
  })

  it('createApport renvoie null, expose l’erreur et relâche saving', async () => {
    mockIpcInvoke.mockRejectedValue(new Error('montant invalide'))
    const { createApport, saving, error } = useApports()

    const result = await createApport({ type: 'fonds_propres', libelle: 'X', montant: 0 })

    expect(result).toBeNull()
    expect(error.value).toBe('montant invalide')
    expect(saving.value).toBe(false)
  })

  it('rembourserApport appelle apport:rembourser avec { id, ...dto } et renvoie le statut', async () => {
    mockIpcInvoke.mockResolvedValue({
      ...APPORT,
      statut: 'rembourse',
      montantRembourse: 100_000,
      resteARembourser: 0,
    })
    const { rembourserApport, saving, error } = useApports()
    const dto = { montant: 100_000, dateRemboursement: '2026-10-25', modePaiement: 'especes' as const }

    const result = await rembourserApport(3, dto)

    expect(mockIpcInvoke).toHaveBeenCalledWith(
      'apport:rembourser',
      { id: 3, ...dto },
      { silent: true },
    )
    expect(result?.statut).toBe('rembourse')
    expect(result?.resteARembourser).toBe(0)
    expect(saving.value).toBe(false)
    expect(error.value).toBeNull()
  })

  it('rembourserApport renvoie null et expose l’erreur (reste dû insuffisant)', async () => {
    mockIpcInvoke.mockRejectedValue(new Error('supérieur au reste dû'))
    const { rembourserApport, error } = useApports()

    const result = await rembourserApport(3, { montant: 999_999 })

    expect(result).toBeNull()
    expect(error.value).toBe('supérieur au reste dû')
  })

  it('deleteRemboursement appelle apport:delete-remboursement avec { id } et réouvre le statut', async () => {
    mockIpcInvoke.mockResolvedValue({
      ...APPORT,
      statut: 'ouvert',
      montantRembourse: 0,
      resteARembourser: 100_000,
    })
    const { deleteRemboursement, error } = useApports()

    const result = await deleteRemboursement(12)

    expect(mockIpcInvoke).toHaveBeenCalledWith(
      'apport:delete-remboursement',
      { id: 12 },
      { silent: true },
    )
    expect(result?.statut).toBe('ouvert')
    expect(error.value).toBeNull()
  })

  it('deleteRemboursement renvoie null et expose l’erreur', async () => {
    mockIpcInvoke.mockRejectedValue(new Error('remboursement introuvable'))
    const { deleteRemboursement, error } = useApports()

    const result = await deleteRemboursement(99)

    expect(result).toBeNull()
    expect(error.value).toBe('remboursement introuvable')
  })

  it('couvre update, annulation et suppression', async () => {
    mockIpcInvoke.mockResolvedValue(APPORT)
    const api = useApports()

    await api.updateApport({ id: 3, notes: 'maj' })
    expect(mockIpcInvoke).toHaveBeenLastCalledWith(
      'apport:update',
      { id: 3, notes: 'maj' },
      { silent: true },
    )

    await api.annulerApport(3)
    expect(mockIpcInvoke).toHaveBeenLastCalledWith('apport:annuler', { id: 3 }, { silent: true })

    await api.deleteApport(3)
    expect(mockIpcInvoke).toHaveBeenLastCalledWith('apport:delete', { id: 3 }, { silent: true })
  })

  it('clearError remet le message à zéro', async () => {
    mockIpcInvoke.mockRejectedValue(new Error('boom'))
    const { fetchApports, error, clearError } = useApports()

    await fetchApports()
    expect(error.value).toBe('boom')

    clearError()
    expect(error.value).toBeNull()
  })
})
