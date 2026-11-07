import 'reflect-metadata'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockHandle = vi.hoisted(() => vi.fn())

vi.mock('electron', () => ({
  ipcMain: { handle: mockHandle },
}))

import { container } from 'tsyringe'
import { SalaireService } from '../../services/salaire.service'
import { DepenseService } from '../../services/depense.service'
import { CaisseService } from '../../services/caisse.service'
import { DispensationService } from '../../services/dispensation.service'
import { DashboardService } from '../../services/dashboard.service'
import { AuthService } from '../../services/auth.service'
import { SessionService } from '../../services/auth/session.service'
import { CurrentSessionService } from '../../services/auth/current-session.service'
import { registerSalaireHandlers } from '../salaire.handler'
import { registerDepenseHandlers } from '../depense.handler'
import { registerCaisseHandlers } from '../caisse.handler'
import { registerDispensationHandlers } from '../dispensation.handler'
import { registerDashboardHandlers } from '../dashboard.handler'
import { registerAuthHandlers } from '../auth.handler'
import type { AppRole } from '../../utils/authorization'

const mockSalaireService = {
  listConfigs: vi.fn(),
  saveConfig: vi.fn(),
  copyPreviousMonth: vi.fn(),
  getPaie: vi.fn(),
  payer: vi.fn(),
  payerBulk: vi.fn(),
  historique: vi.fn(),
}

const mockDepenseService = {
  listCategories: vi.fn(),
  createCategorie: vi.fn(),
  updateCategorie: vi.fn(),
  deleteCategorie: vi.fn(),
  list: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  marquerPayee: vi.fn(),
  getSynthese: vi.fn(),
}

const mockCaisseService = {
  getSolde: vi.fn(),
  getSynthese: vi.fn(),
}

const mockDashboardService = {
  getStats: vi.fn(),
}

const mockDispensationService = {
  file: vi.fn(),
  getById: vi.fn(),
  createFromDocument: vi.fn(),
  servir: vi.fn(),
  encaisser: vi.fn(),
  getVente: vi.fn(),
  listVentes: vi.fn(),
  getVentesCredit: vi.fn(),
  getSynthesePharmacie: vi.fn(),
  annuler: vi.fn(),
  lignesNonMappees: vi.fn(),
  mapLigne: vi.fn(),
  reouvrir: vi.fn(),
  orphelines: vi.fn(),
}

/** Faux `sessionService.validate` : revalidation en base de la session du main. */
const mockValidate = vi.fn()

/** Récupère le handler IPC enregistré pour un canal. */
function channel(name: string): (...args: any[]) => Promise<any> {
  const found = mockHandle.mock.calls.find((c: any[]) => c[0] === name)
  expect(found, `canal IPC ${name} enregistré`).toBeDefined()
  return found![1]
}

/**
 * Ouvre une session authentifiée côté processus principal.
 * Le rôle provient de la base (session revalidée), jamais du payload.
 */
function openSession(role: AppRole, userId = 42): void {
  mockValidate.mockImplementation(async () => ({
    id: userId,
    role,
    is_validated: 1,
    email: `${role.toLowerCase()}@cde.test`,
    nom: 'Utilisateur',
  }))
  container.resolve(CurrentSessionService).set({
    token: `token-${role}`,
    userId,
    role,
  })
}

describe('autorisation serveur des canaux de comptabilité', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    container.clearInstances()

    container.registerInstance(SalaireService, mockSalaireService as unknown as SalaireService)
    container.registerInstance(DepenseService, mockDepenseService as unknown as DepenseService)
    container.registerInstance(CaisseService, mockCaisseService as unknown as CaisseService)
    container.registerInstance(DispensationService, mockDispensationService as unknown as DispensationService)
    container.registerInstance(DashboardService, mockDashboardService as unknown as DashboardService)
    container.registerInstance(SessionService, { validate: mockValidate, invalidate: vi.fn() } as unknown as SessionService)

    registerSalaireHandlers()
    registerDepenseHandlers()
    registerCaisseHandlers()
    registerDispensationHandlers()
    registerDashboardHandlers()

    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    warnSpy.mockRestore()
  })

  // ─── Rôles non autorisés ────────────────────────────────────────────────

  it('refuse un MEDECIN sur tous les canaux salaire:*', async () => {
    openSession('MEDECIN')

    for (const name of [
      'salaire:configs',
      'salaire:config:save',
      'salaire:config:copy-previous',
      'salaire:paie',
      'salaire:payer',
      'salaire:payer-bulk',
      'salaire:historique',
    ]) {
      const res = await channel(name)({}, { periode: '2026-01', userId: 3 })
      expect(res.success, `canal ${name}`).toBe(false)
      expect(res.message).toMatch(/Accès refusé/)
    }

    expect(mockSalaireService.payer).not.toHaveBeenCalled()
    expect(mockSalaireService.payerBulk).not.toHaveBeenCalled()
    expect(mockSalaireService.saveConfig).not.toHaveBeenCalled()
  })

  it('refuse un SECRETAIRE sur depense:*, caisse:* et dispensing:synthese-comptable', async () => {
    openSession('SECRETAIRE')

    const depense = await channel('depense:create')({}, { date: '2026-01-01', categorieId: 1, libelle: 'x', montant: 100 })
    expect(depense.success).toBe(false)
    expect(depense.message).toMatch(/Accès refusé/)

    const caisse = await channel('caisse:synthese')({})
    expect(caisse.success).toBe(false)
    expect(caisse.message).toMatch(/Accès refusé/)

    const synthese = await channel('dispensation:synthese-comptable')({})
    expect(synthese.success).toBe(false)
    expect(synthese.message).toMatch(/Accès refusé/)

    expect(mockDepenseService.create).not.toHaveBeenCalled()
    expect(mockCaisseService.getSynthese).not.toHaveBeenCalled()
    expect(mockDispensationService.getSynthesePharmacie).not.toHaveBeenCalled()
  })

  it('refuse un MEDECIN sur les canaux de caisse et de comptabilité pharmacie', async () => {
    openSession('MEDECIN')

    expect((await channel('caisse:synthese')({})).success).toBe(false)
    expect((await channel('dispensation:ventes')({})).success).toBe(false)
    expect((await channel('dispensation:ventes-credit')({})).success).toBe(false)
    expect((await channel('dispensation:vente')({}, { id: 1 })).success).toBe(false)
    expect((await channel('dispensation:synthese-comptable')({})).success).toBe(false)

    expect(mockCaisseService.getSynthese).not.toHaveBeenCalled()
    expect(mockDispensationService.listVentes).not.toHaveBeenCalled()
    expect(mockDispensationService.getVentesCredit).not.toHaveBeenCalled()
  })

  // ─── Rôles autorisés ────────────────────────────────────────────────────

  it('accepte un ADMIN sur la paie et les dépenses', async () => {
    openSession('ADMIN', 7)
    mockSalaireService.payer.mockResolvedValue({ id: 1 })
    mockDepenseService.create.mockResolvedValue({ id: 2 })

    const paie = await channel('salaire:payer')({}, { userId: 3, periode: '2026-01', modePaiement: 'especes', datePaiement: '2026-01-31' })
    expect(paie.success).toBe(true)
    expect(mockSalaireService.payer).toHaveBeenCalled()

    const depense = await channel('depense:create')({}, { date: '2026-01-01', categorieId: 1, libelle: 'loyer', montant: 100 })
    expect(depense.success).toBe(true)
    expect(mockDepenseService.create).toHaveBeenCalled()
  })

  it('accepte un COMPTABLE sur la paie, les dépenses et la caisse', async () => {
    openSession('COMPTABLE', 11)
    mockSalaireService.payerBulk.mockResolvedValue({ paid: 2, skipped: 0, totalPaye: 100, reste: 0 })
    mockDepenseService.create.mockResolvedValue({ id: 3 })
    mockCaisseService.getSynthese.mockResolvedValue({ entrees: 0, sorties: 0, solde: 1234, count: 0, parSource: [], parMode: [] })

    expect((await channel('salaire:payer-bulk')({}, { periode: '2026-01', montantDisponible: 100, modePaiement: 'especes', datePaiement: '2026-01-31' })).success).toBe(true)
    expect((await channel('depense:create')({}, { date: '2026-01-01', categorieId: 1, libelle: 'loyer', montant: 100 })).success).toBe(true)
    expect((await channel('caisse:synthese')({})).success).toBe(true)

    expect(mockSalaireService.payerBulk).toHaveBeenCalled()
    expect(mockDepenseService.create).toHaveBeenCalled()
    expect(mockCaisseService.getSynthese).toHaveBeenCalled()
  })

  it('accepte un PHARMACIEN sur dispensing:encaisser mais le refuse sur salaire:*', async () => {
    openSession('PHARMACIEN', 5)
    mockDispensationService.encaisser.mockResolvedValue({ id: 1 })

    const encaissement = await channel('dispensation:encaisser')({}, { delivranceId: 1, montant: 100, modePaiement: 'especes' })
    expect(encaissement.success).toBe(true)
    expect(mockDispensationService.encaisser).toHaveBeenCalled()

    const paie = await channel('salaire:payer')({}, { userId: 3, periode: '2026-01', modePaiement: 'especes', datePaiement: '2026-01-31' })
    expect(paie.success).toBe(false)
    expect(paie.message).toMatch(/Accès refusé/)
    expect(mockSalaireService.payer).not.toHaveBeenCalled()
  })

  it('laisse un PHARMACIEN servir et lire la file de la pharmacie', async () => {
    openSession('PHARMACIEN', 5)
    mockDispensationService.file.mockResolvedValue([])
    mockDispensationService.servir.mockResolvedValue({ delivrance: { id: 1 } })

    expect((await channel('dispensation:file')({}, { statut: 'a_servir' })).success).toBe(true)
    expect((await channel('dispensation:servir')({}, { delivranceId: 1, lignes: [{ ligneId: 2, quantite: 1 }] })).success).toBe(true)
  })

  it('laisse un INFIRMIER délivrer mais lui refuse tout encaissement sur servir', async () => {
    openSession('INFIRMIER', 8)
    mockDispensationService.servir.mockResolvedValue({ delivrance: { id: 1 } })

    // Délivrance sans paiement : autorisée.
    const delivrance = await channel('dispensation:servir')(
      {},
      { delivranceId: 1, lignes: [{ ligneId: 2, quantite: 1 }] },
    )
    expect(delivrance.success).toBe(true)
    expect(mockDispensationService.servir).toHaveBeenCalledTimes(1)

    // Paiement dans la même requête : réservé à la caisse.
    const avecPaiement = await channel('dispensation:servir')(
      {},
      {
        delivranceId: 1,
        lignes: [{ ligneId: 2, quantite: 1 }],
        paiement: { montant: 5_000, modePaiement: 'espèces' },
      },
    )
    expect(avecPaiement.success).toBe(false)
    expect(avecPaiement.message).toMatch(/réservé à la caisse/)
    expect(mockDispensationService.servir).toHaveBeenCalledTimes(1)
    expect(warnSpy).toHaveBeenCalled()
  })

  it('autorise un PHARMACIEN à encaisser via servir', async () => {
    openSession('PHARMACIEN', 5)
    mockDispensationService.servir.mockResolvedValue({ delivrance: { id: 1 } })

    const res = await channel('dispensation:servir')(
      {},
      {
        delivranceId: 1,
        lignes: [{ ligneId: 2, quantite: 1 }],
        paiement: { montant: 5_000, modePaiement: 'espèces' },
      },
    )
    expect(res.success).toBe(true)
    expect(mockDispensationService.servir).toHaveBeenCalledTimes(1)
  })

  it('protège la lecture des délivrances et le tableau de bord par une session', async () => {
    container.resolve(CurrentSessionService).clear()
    mockValidate.mockResolvedValue(null)

    for (const [name, params] of [
      ['dispensation:get', { id: 1 }],
      ['dispensation:unmapped', {}],
      ['dispensation:orphelines', {}],
      ['dashboard:stats', {}],
    ] as const) {
      const res = await channel(name)({}, params)
      expect(res.success, `canal ${name}`).toBe(false)
      expect(res.message).toMatch(/Accès refusé/)
    }

    expect(mockDispensationService.getById).not.toHaveBeenCalled()
    expect(mockDispensationService.lignesNonMappees).not.toHaveBeenCalled()
    expect(mockDispensationService.orphelines).not.toHaveBeenCalled()
    expect(mockDashboardService.getStats).not.toHaveBeenCalled()
  })

  it('laisse un MEDECIN consulter les délivrances et le tableau de bord', async () => {
    openSession('MEDECIN', 4)
    mockDispensationService.getById.mockResolvedValue({ id: 1 })
    mockDispensationService.lignesNonMappees.mockResolvedValue([])
    mockDispensationService.orphelines.mockResolvedValue([])
    mockDashboardService.getStats.mockResolvedValue({ ca: {} })

    expect((await channel('dispensation:get')({}, { id: 1 })).success).toBe(true)
    expect((await channel('dispensation:unmapped')({})).success).toBe(true)
    expect((await channel('dispensation:orphelines')({})).success).toBe(true)
    expect((await channel('dashboard:stats')({})).success).toBe(true)
  })

  // ─── Identité de l'acteur ───────────────────────────────────────────────

  it('impose le createdBy de la session et ignore le createdBy du payload', async () => {
    openSession('COMPTABLE', 11)
    mockDepenseService.create.mockResolvedValue({ id: 4 })
    mockSalaireService.payer.mockResolvedValue({ id: 5 })

    await channel('depense:create')({}, { date: '2026-01-01', categorieId: 1, libelle: 'loyer', montant: 100, createdBy: 999 })
    expect(mockDepenseService.create).toHaveBeenCalledWith(expect.objectContaining({ createdBy: 11 }))

    await channel('salaire:payer')({}, { userId: 3, periode: '2026-01', modePaiement: 'especes', datePaiement: '2026-01-31', createdBy: 999 })
    expect(mockSalaireService.payer).toHaveBeenCalledWith(expect.objectContaining({ createdBy: 11 }))
  })

  it("impose le vendeur (userId) de la session sur dispensing:servir", async () => {
    openSession('PHARMACIEN', 5)
    mockDispensationService.servir.mockResolvedValue({ delivrance: { id: 1 } })

    await channel('dispensation:servir')({}, { delivranceId: 1, lignes: [{ ligneId: 2, quantite: 1 }], userId: 999 })
    expect(mockDispensationService.servir).toHaveBeenCalledWith(expect.objectContaining({ userId: 5 }))
  })

  it('impose le createdBy de la session sur dispensing:encaisser', async () => {
    openSession('PHARMACIEN', 5)
    mockDispensationService.encaisser.mockResolvedValue({ id: 6 })

    await channel('dispensation:encaisser')({}, { delivranceId: 1, montant: 100, modePaiement: 'especes', createdBy: 999 })
    expect(mockDispensationService.encaisser).toHaveBeenCalledWith(expect.objectContaining({ createdBy: 5 }))
  })

  // ─── Tentatives d'élévation de privilèges ───────────────────────────────

  it('refuse un rôle forgé dans le payload', async () => {
    openSession('MEDECIN')

    const forged = await channel('salaire:payer')(
      {},
      {
        userId: 3,
        periode: '2026-01',
        modePaiement: 'especes',
        datePaiement: '2026-01-31',
        role: 'ADMIN',
        user: { id: 1, role: 'ADMIN' },
      },
    )
    expect(forged.success).toBe(false)
    expect(forged.message).toMatch(/Accès refusé/)
    expect(mockSalaireService.payer).not.toHaveBeenCalled()

    const forgedDepense = await channel('depense:create')(
      {},
      { date: '2026-01-01', categorieId: 1, libelle: 'x', montant: 100, role: 'COMPTABLE' },
    )
    expect(forgedDepense.success).toBe(false)
    expect(mockDepenseService.create).not.toHaveBeenCalled()
  })

  it('refuse tout appel protégé quand aucune session n est ouverte', async () => {
    container.resolve(CurrentSessionService).clear()
    mockValidate.mockResolvedValue(null)

    const res = await channel('salaire:payer')({}, { userId: 3, periode: '2026-01', modePaiement: 'especes', datePaiement: '2026-01-31' })
    expect(res.success).toBe(false)
    expect(res.message).toMatch(/Accès refusé/)
    expect(mockSalaireService.payer).not.toHaveBeenCalled()
  })

  it('refuse quand la session a expiré entre-temps (revalidation en base)', async () => {
    openSession('ADMIN', 7)
    mockValidate.mockResolvedValue(null)

    const res = await channel('depense:create')({}, { date: '2026-01-01', categorieId: 1, libelle: 'x', montant: 100 })
    expect(res.success).toBe(false)
    expect(mockDepenseService.create).not.toHaveBeenCalled()
  })

  // ─── Audit ──────────────────────────────────────────────────────────────

  it('journalise le refus (canal + motif + rôle)', async () => {
    openSession('MEDECIN', 9)

    await channel('caisse:synthese')({})

    expect(warnSpy).toHaveBeenCalled()
    const logged = warnSpy.mock.calls.map(c => String(c[0])).join('\n')
    expect(logged).toMatch(/caisse:synthese/)
    expect(logged).toMatch(/MEDECIN/)
    expect(logged).toMatch(/userId=9/)
  })
})

describe('cycle de vie de la session côté processus principal', () => {
  const mockLogin = vi.fn()
  const mockInvalidate = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    container.clearInstances()
    container.registerInstance(AuthService, { login: mockLogin } as unknown as AuthService)
    container.registerInstance(SessionService, {
      validate: mockValidate,
      invalidate: mockInvalidate,
    } as unknown as SessionService)
    registerAuthHandlers()
  })

  it('ouvre la session courante à la connexion', async () => {
    mockLogin.mockResolvedValue({
      token: 'token-xyz',
      user: { id: 12, role: 'COMPTABLE', email: 'comptable@cde.test', nom: 'Comptable' },
    })

    const res = await channel('auth:login')({}, { email: 'comptable@cde.test', password: 'secret' })
    expect(res.success).toBe(true)

    expect(container.resolve(CurrentSessionService).get()).toMatchObject({
      token: 'token-xyz',
      userId: 12,
      role: 'COMPTABLE',
    })
  })

  it('révoque la session courante et le jeton en base à la déconnexion', async () => {
    container.resolve(CurrentSessionService).set({ token: 'token-xyz', userId: 12, role: 'COMPTABLE' })

    const res = await channel('auth:logout')({}, {})
    expect(res.success).toBe(true)
    expect(mockInvalidate).toHaveBeenCalledWith('token-xyz')
    expect(container.resolve(CurrentSessionService).get()).toBeNull()
  })
})
