import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  buildDefaultRubriques,
  computeSalaireNet,
  SALAIRES_RUBRIQUES_DEFAUT,
  useSalaires,
} from '../useSalaires'

const { mockIpcInvoke } = vi.hoisted(() => ({ mockIpcInvoke: vi.fn() }))

vi.mock('@/utils/ipc', () => ({
  ipcInvoke: mockIpcInvoke,
}))

describe('useSalaires — rubriques standard', () => {
  it('propose la prime de transport sur 24 jours à titre informatif', () => {
    const transport = SALAIRES_RUBRIQUES_DEFAUT.find(
      (rubrique) => rubrique.libelle === 'Prime de transport',
    )

    expect(transport).toMatchObject({
      type: 'journalier',
      jours: 24,
      impactNet: false,
    })
  })

  it('retourne des copies indépendantes des rubriques standard', () => {
    const first = buildDefaultRubriques()
    first[0].libelle = 'Modifié'

    expect(buildDefaultRubriques()[0].libelle).toBe('Prime de responsabilité')
    expect(SALAIRES_RUBRIQUES_DEFAUT[0].libelle).toBe('Prime de responsabilité')
  })
})

describe('useSalaires — computeSalaireNet', () => {
  it('applique les jours explicites puis les jours travaillés par défaut', () => {
    const net = computeSalaireNet({
      base: 1_000_000,
      joursTravailles: 20,
      rubriques: [
        { libelle: 'Transport', type: 'journalier', montantJour: 10_000, jours: 24, impactNet: false },
        { libelle: 'Pan', type: 'journalier', montantJour: 5_000, jours: null, impactNet: true },
        { libelle: 'Prime', type: 'fixe', montant: 250_000, impactNet: true },
      ],
    })

    expect(net).toBe(1_000_000 + 5_000 * 20 + 250_000)
  })
})

describe('useSalaires — historique des paiements', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('charge les paiements d’un employé sans écraser la ref historique partagée', async () => {
    mockIpcInvoke.mockImplementation((channel: string, filtres?: { userId?: number }) => {
      if (channel !== 'salaire:historique') return Promise.resolve([])
      return Promise.resolve(
        filtres?.userId === 7
          ? [
              { id: 2, userId: 7, periode: '2026-09', montantNet: 500_000 },
              { id: 1, userId: 7, periode: '2026-08', montantNet: 450_000 },
            ]
          : [{ id: 9, userId: 9, periode: '2026-09', montantNet: 300_000 }],
      )
    })

    const salaires = useSalaires()
    await salaires.fetchHistorique({ userId: 9 })
    const paiements = await salaires.fetchPaiementsEmploye(7)

    expect(mockIpcInvoke).toHaveBeenCalledWith('salaire:historique', { userId: 7 })
    expect(paiements).toHaveLength(2)
    expect(salaires.historique.value).toHaveLength(1)
    expect(salaires.historique.value[0].userId).toBe(9)
  })

  it('retourne un tableau vide quand le backend renvoie null', async () => {
    mockIpcInvoke.mockResolvedValue(null)

    const salaires = useSalaires()

    await expect(salaires.fetchPaiementsEmploye(7)).resolves.toEqual([])
  })

  it('ne sollicite pas le backend sans identifiant employé valide', async () => {
    const salaires = useSalaires()

    await expect(salaires.fetchPaiementsEmploye(Number.NaN)).resolves.toEqual([])
    await expect(salaires.fetchPaiementsEmploye(1.5)).resolves.toEqual([])

    expect(mockIpcInvoke).not.toHaveBeenCalled()
  })
})
