import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockIpcInvoke } = vi.hoisted(() => ({ mockIpcInvoke: vi.fn() }))

vi.mock('@/utils/ipc', () => ({
  ipcInvoke: mockIpcInvoke,
}))

import { useCommandes } from '../useCommandes'

const COMMANDE = {
  id: 7,
  numero: 'BC-20261024-0001',
  statut: 'brouillon' as const,
  fournisseurId: 2,
  lignes: [{ id: 11, medicamentId: 1, quantiteCommandee: 10 }],
}

const SERIES = { mois: ['2026-10'], fournisseurs: [], commandes: [], ventes: [] }

/** Crée une promesse contrôlable pour observer l’état pendant un appel. */
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('useCommandes — canaux IPC', () => {
  beforeEach(() => {
    mockIpcInvoke.mockReset()
  })

  it('fetchCommandes appelle commande:list avec les filtres et renvoie la liste', async () => {
    mockIpcInvoke.mockResolvedValue([COMMANDE])
    const { fetchCommandes, commandes, error, loading } = useCommandes()

    const result = await fetchCommandes({ statut: 'brouillon', search: 'BC' })

    expect(mockIpcInvoke).toHaveBeenCalledTimes(1)
    expect(mockIpcInvoke).toHaveBeenCalledWith(
      'commande:list',
      { statut: 'brouillon', search: 'BC' },
      { silent: true },
    )
    expect(result).toEqual([COMMANDE])
    expect(commandes.value).toEqual([COMMANDE])
    expect(error.value).toBeNull()
    expect(loading.value).toBe(false)
  })

  it('fetchCommandes renvoie [] et expose l’erreur en cas d’échec', async () => {
    mockIpcInvoke.mockRejectedValue(new Error('base indisponible'))
    const { fetchCommandes, commandes, error } = useCommandes()

    const result = await fetchCommandes()

    expect(result).toEqual([])
    expect(commandes.value).toEqual([])
    expect(error.value).toBe('base indisponible')
  })

  it('fetchCommande appelle commande:get avec { id }', async () => {
    mockIpcInvoke.mockResolvedValue(COMMANDE)
    const { fetchCommande, commande, error } = useCommandes()

    const result = await fetchCommande(7)

    expect(mockIpcInvoke).toHaveBeenCalledWith('commande:get', { id: 7 }, { silent: true })
    expect(result).toEqual(COMMANDE)
    expect(commande.value).toEqual(COMMANDE)
    expect(error.value).toBeNull()
  })

  it('fetchCommande renvoie null et expose l’erreur en cas d’échec', async () => {
    mockIpcInvoke.mockRejectedValue(new Error('bon introuvable'))
    const { fetchCommande, commande, error } = useCommandes()

    const result = await fetchCommande(999)

    expect(result).toBeNull()
    expect(commande.value).toBeNull()
    expect(error.value).toBe('bon introuvable')
  })

  it('prefill appelle commande:prefill avec les articles et la date', async () => {
    const suggestions = [{ medicamentId: 1, cmm: 120, stockRestant: 40 }]
    mockIpcInvoke.mockResolvedValue(suggestions)
    const { prefill, error } = useCommandes()

    const result = await prefill([1, 2], '2026-10-24')

    expect(mockIpcInvoke).toHaveBeenCalledWith(
      'commande:prefill',
      { medicamentIds: [1, 2], dateCommande: '2026-10-24' },
      { silent: true },
    )
    expect(result).toEqual(suggestions)
    expect(error.value).toBeNull()
  })

  it('prefill renvoie [] et expose l’erreur en cas d’échec', async () => {
    mockIpcInvoke.mockRejectedValue(new Error('CMM impossible'))
    const { prefill, error } = useCommandes()

    const result = await prefill([1])

    expect(result).toEqual([])
    expect(error.value).toBe('CMM impossible')
  })

  it('prefill efface l’erreur précédente lors d’un appel réussi', async () => {
    mockIpcInvoke
      .mockRejectedValueOnce(new Error('CMM impossible'))
      .mockResolvedValueOnce([{ medicamentId: 1, cmm: 120 }])
    const { prefill, error } = useCommandes()

    await prefill([1])
    expect(error.value).toBe('CMM impossible')

    const result = await prefill([1])

    expect(result).toEqual([{ medicamentId: 1, cmm: 120 }])
    expect(error.value).toBeNull()
  })

  it('fetchSeriesFournisseurs pilote loading pendant l’appel et le relâche ensuite', async () => {
    const pending = deferred<typeof SERIES>()
    mockIpcInvoke.mockReturnValueOnce(pending.promise)
    const { fetchSeriesFournisseurs, loading, error } = useCommandes()

    const request = fetchSeriesFournisseurs({ dateDebut: '2026-10-01', dateFin: '2026-10-31' })

    expect(loading.value).toBe(true)
    expect(error.value).toBeNull()

    pending.resolve(SERIES)
    const result = await request

    expect(result).toEqual(SERIES)
    expect(loading.value).toBe(false)
  })

  it('fetchSeriesFournisseurs efface l’erreur après un succès ultérieur', async () => {
    mockIpcInvoke
      .mockRejectedValueOnce(new Error('canal indisponible'))
      .mockResolvedValueOnce(SERIES)
    const { fetchSeriesFournisseurs, loading, error } = useCommandes()

    await fetchSeriesFournisseurs({ dateDebut: '2026-10-01', dateFin: '2026-10-31' })
    expect(error.value).toBe('canal indisponible')
    expect(loading.value).toBe(false)

    const result = await fetchSeriesFournisseurs({ dateDebut: '2026-11-01', dateFin: '2026-11-30' })

    expect(result).toEqual(SERIES)
    expect(error.value).toBeNull()
    expect(loading.value).toBe(false)
  })

  it('createCommande appelle commande:create avec le DTO complet', async () => {
    mockIpcInvoke.mockResolvedValue(COMMANDE)
    const { createCommande, saving, error } = useCommandes()
    const dto = {
      fournisseurId: 2,
      dateCommande: '2026-10-24',
      lignes: [{ medicamentId: 1, quantiteCommandee: 10 }],
    }

    const result = await createCommande(dto)

    expect(mockIpcInvoke).toHaveBeenCalledWith('commande:create', dto, { silent: true })
    expect(result).toEqual(COMMANDE)
    expect(saving.value).toBe(false)
    expect(error.value).toBeNull()
  })

  it('createCommande renvoie null, expose l’erreur et relâche saving', async () => {
    mockIpcInvoke.mockRejectedValue(new Error('fournisseur invalide'))
    const { createCommande, saving, error } = useCommandes()

    const result = await createCommande({
      fournisseurId: 0,
      lignes: [{ medicamentId: 1, quantiteCommandee: 1 }],
    })

    expect(result).toBeNull()
    expect(error.value).toBe('fournisseur invalide')
    expect(saving.value).toBe(false)
  })

  it('receptionnerCommande appelle commande:receptionner avec { id, ...dto }', async () => {
    mockIpcInvoke.mockResolvedValue({ ...COMMANDE, statut: 'partielle' })
    const { receptionnerCommande, saving, error } = useCommandes()
    const dto = {
      dateReception: '2026-10-25',
      refBl: 'BL-001',
      lignes: [{ commandeLigneId: 11, quantiteRecue: 4, numeroLot: 'LOT-1' }],
    }

    const result = await receptionnerCommande(7, dto)

    expect(mockIpcInvoke).toHaveBeenCalledWith(
      'commande:receptionner',
      { id: 7, ...dto },
      { silent: true },
    )
    expect(result?.statut).toBe('partielle')
    expect(saving.value).toBe(false)
    expect(error.value).toBeNull()
  })

  it('receptionnerCommande renvoie null et expose l’erreur', async () => {
    mockIpcInvoke.mockRejectedValue(new Error('quantité supérieure au reste'))
    const { receptionnerCommande, error } = useCommandes()

    const result = await receptionnerCommande(7, {
      lignes: [{ commandeLigneId: 11, quantiteRecue: 99 }],
    })

    expect(result).toBeNull()
    expect(error.value).toBe('quantité supérieure au reste')
  })

  it('cloturerCommande appelle commande:cloturer avec { id }', async () => {
    mockIpcInvoke.mockResolvedValue({ ...COMMANDE, statut: 'cloturee' })
    const { cloturerCommande, error } = useCommandes()

    const result = await cloturerCommande(7)

    expect(mockIpcInvoke).toHaveBeenCalledWith('commande:cloturer', { id: 7 }, { silent: true })
    expect(result?.statut).toBe('cloturee')
    expect(error.value).toBeNull()
  })

  it('cloturerCommande renvoie null et expose l’erreur', async () => {
    mockIpcInvoke.mockRejectedValue(new Error('statut incompatible'))
    const { cloturerCommande, error } = useCommandes()

    const result = await cloturerCommande(7)

    expect(result).toBeNull()
    expect(error.value).toBe('statut incompatible')
  })

  it('couvre les transitions et pièces jointes restantes', async () => {
    mockIpcInvoke.mockResolvedValue({ ...COMMANDE, statut: 'envoyee' })
    const api = useCommandes()

    await api.updateCommande({ id: 7, notes: 'maj' })
    expect(mockIpcInvoke).toHaveBeenLastCalledWith(
      'commande:update',
      { id: 7, notes: 'maj' },
      { silent: true },
    )

    await api.envoyerCommande(7)
    expect(mockIpcInvoke).toHaveBeenLastCalledWith('commande:envoyer', { id: 7 }, { silent: true })

    await api.annulerCommande(7)
    expect(mockIpcInvoke).toHaveBeenLastCalledWith('commande:annuler', { id: 7 }, { silent: true })

    await api.deleteCommande(7)
    expect(mockIpcInvoke).toHaveBeenLastCalledWith('commande:delete', { id: 7 }, { silent: true })

    mockIpcInvoke.mockResolvedValue([])
    await api.listReceptionAttachments(3)
    expect(mockIpcInvoke).toHaveBeenLastCalledWith(
      'commande:reception-attachments:list',
      { receptionId: 3 },
      { silent: true },
    )

    mockIpcInvoke.mockResolvedValue({ id: 4, fileData: 'data:application/pdf;base64,AA==' })
    await api.downloadReceptionAttachment(4, 3)
    expect(mockIpcInvoke).toHaveBeenLastCalledWith(
      'commande:reception-attachments:download',
      { id: 4, receptionId: 3 },
      { silent: true },
    )

    const attachment = { fileName: 'bl.pdf', fileType: 'application/pdf', fileData: 'data:application/pdf;base64,AA==' }
    mockIpcInvoke.mockResolvedValue({ id: 5, ...attachment })
    await api.createReceptionAttachment(3, attachment)
    expect(mockIpcInvoke).toHaveBeenLastCalledWith(
      'commande:reception-attachments:create',
      { receptionId: 3, ...attachment },
      { silent: true },
    )

    mockIpcInvoke.mockResolvedValue(undefined)
    await api.deleteReceptionAttachment(5, 3)
    expect(mockIpcInvoke).toHaveBeenLastCalledWith(
      'commande:reception-attachments:delete',
      { id: 5, receptionId: 3 },
      { silent: true },
    )

    mockIpcInvoke.mockResolvedValue({ mois: ['2026-10'], fournisseurs: [], commandes: [], ventes: [] })
    await api.fetchSeriesFournisseurs({ dateDebut: '2026-10-01', dateFin: '2026-10-31' })
    expect(mockIpcInvoke).toHaveBeenLastCalledWith(
      'commande:series-fournisseurs',
      { dateDebut: '2026-10-01', dateFin: '2026-10-31' },
      { silent: true },
    )
  })

  it('clearError remet le message à zéro', async () => {
    mockIpcInvoke.mockRejectedValue(new Error('boom'))
    const { fetchCommandes, error, clearError } = useCommandes()

    await fetchCommandes()
    expect(error.value).toBe('boom')

    clearError()
    expect(error.value).toBeNull()
  })
})
