import 'reflect-metadata'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockHandle = vi.hoisted(() => vi.fn())
const mockValidate = vi.hoisted(() => vi.fn())

vi.mock('electron', () => ({
  ipcMain: { handle: mockHandle },
}))

import { container } from 'tsyringe'
import { MedicamentService } from '../../services/medicament.service'
import { StockService } from '../../services/stock.service'
import { DispensationService } from '../../services/dispensation.service'
import { SessionService } from '../../services/auth/session.service'
import { CurrentSessionService } from '../../services/auth/current-session.service'
import { registerMedicamentHandlers } from '../medicament.handler'
import { registerStockHandlers } from '../stock.handler'
import { registerDispensationHandlers } from '../dispensation.handler'

const mockMedicamentService = {
  list: vi.fn(),
  getById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  deactivate: vi.fn(),
}

const mockStockService = {
  niveaux: vi.fn(),
  lots: vi.fn(),
  mouvements: vi.fn(),
  entree: vi.fn(),
  sortieManuelle: vi.fn(),
  ajustement: vi.fn(),
  alertes: vi.fn(),
}

const mockDispensationService = {
  file: vi.fn(),
  getById: vi.fn(),
  createFromDocument: vi.fn(),
  servir: vi.fn(),
  annuler: vi.fn(),
  reouvrir: vi.fn(),
  orphelines: vi.fn(),
  lignesNonMappees: vi.fn(),
  mapLigne: vi.fn(),
}

function channel(name: string): (...args: any[]) => Promise<any> {
  const found = mockHandle.mock.calls.find((c: any[]) => c[0] === name)
  expect(found, `canal IPC ${name} enregistré`).toBeDefined()
  return found![1]
}

describe('pharmacie handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    container.clearInstances()
    container.registerInstance(MedicamentService, mockMedicamentService as unknown as MedicamentService)
    container.registerInstance(StockService, mockStockService as unknown as StockService)
    container.registerInstance(DispensationService, mockDispensationService as unknown as DispensationService)
    // Session pharmacien : les canaux de pharmacie exigent une session valide.
    mockValidate.mockResolvedValue({
      id: 1,
      role: 'PHARMACIEN',
      is_validated: 1,
      email: 'pharm@cde.test',
      nom: 'Pharm',
    })
    container.registerInstance(SessionService, {
      validate: mockValidate,
      invalidate: vi.fn(),
    } as unknown as SessionService)
    container.resolve(CurrentSessionService).set({ token: 'token-test', userId: 1, role: 'PHARMACIEN' })
    registerMedicamentHandlers()
    registerStockHandlers()
    registerDispensationHandlers()
  })

  it('registers the 27 pharmacie channels with unchanged names', () => {
    const channels = mockHandle.mock.calls.map((c: any[]) => c[0])
    for (const name of [
      'medicament:list', 'medicament:get', 'medicament:create', 'medicament:update', 'medicament:deactivate',
      'stock:niveaux', 'stock:lots', 'stock:mouvements', 'stock:entree', 'stock:sortie-manuelle', 'stock:ajustement', 'stock:alertes',
      'dispensation:file', 'dispensation:get', 'dispensation:create-from-document', 'dispensation:servir', 'dispensation:annuler', 'dispensation:reouvrir', 'dispensation:orphelines', 'dispensation:unmapped', 'dispensation:map-ligne',
      'dispensation:encaisser', 'dispensation:vente', 'dispensation:ventes', 'dispensation:ventes-credit', 'dispensation:synthese-comptable',
    ]) {
      expect(channels).toContain(name)
    }
  })

  // ─── medicament ────────────────────────────────────────────────

  it('medicament:list forwards filters and returns DTOs', async () => {
    mockMedicamentService.list.mockResolvedValue([{ id: 1, dci: 'Metformine', nom_commercial: 'Glucophage', actif: 1 }])
    const res = await channel('medicament:list')({}, { actif: true, search: 'met' })
    expect(mockMedicamentService.list).toHaveBeenCalledWith({ actif: true, search: 'met' })
    expect(res.success).toBe(true)
    expect(res.data[0]).toMatchObject({ dci: 'Metformine', actif: true })
  })

  it('medicament:get returns null passthrough and requires id', async () => {
    mockMedicamentService.getById.mockResolvedValue(null)
    expect((await channel('medicament:get')({}, { id: 1 })).data).toBeNull()
    const bad = await channel('medicament:get')({}, {})
    expect(bad.success).toBe(false)
    expect(bad.message).toMatch(/id requis/)
  })

  it('medicament:create requires a DCI and forwards the DTO', async () => {
    const bad = await channel('medicament:create')({}, { dci: '  ' })
    expect(bad.success).toBe(false)
    expect(bad.message).toMatch(/DCI/)
    expect(mockMedicamentService.create).not.toHaveBeenCalled()

    mockMedicamentService.create.mockResolvedValue({ id: 9, dci: 'TEST-X', actif: 1 })
    const res = await channel('medicament:create')({}, { dci: 'TEST-X', seuilAlerte: 5 })
    expect(mockMedicamentService.create).toHaveBeenCalledWith(expect.objectContaining({ dci: 'TEST-X', seuilAlerte: 5 }))
    expect(res.success).toBe(true)
    expect(res.data.dci).toBe('TEST-X')
  })

  it('medicament:update and medicament:deactivate require id', async () => {
    expect((await channel('medicament:update')({}, { dosage: 'x' })).success).toBe(false)
    expect((await channel('medicament:deactivate')({}, {})).success).toBe(false)

    mockMedicamentService.update.mockResolvedValue({ id: 3, dci: 'Y', actif: 1 })
    const res = await channel('medicament:update')({}, { id: 3, dosage: '200 mg' })
    expect(mockMedicamentService.update).toHaveBeenCalledWith(3, expect.objectContaining({ dosage: '200 mg' }))
    expect(res.success).toBe(true)
  })

  // ─── stock ─────────────────────────────────────────────────────

  it('stock:niveaux and stock:alertes forward params', async () => {
    mockStockService.niveaux.mockResolvedValue([{ medicamentId: 1 }])
    mockStockService.alertes.mockResolvedValue({ ruptures: [], sousSeuil: [], perimes: [], peremptionProche: [] })
    await channel('stock:niveaux')({})
    expect(mockStockService.niveaux).toHaveBeenCalled()
    await channel('stock:alertes')({}, { peremptionMois: 6 })
    expect(mockStockService.alertes).toHaveBeenCalledWith({ peremptionMois: 6 })
  })

  it('stock:lots requires medicamentId', async () => {
    const bad = await channel('stock:lots')({}, {})
    expect(bad.success).toBe(false)
    expect(bad.message).toMatch(/medicamentId requis/)
    expect(mockStockService.lots).not.toHaveBeenCalled()

    mockStockService.lots.mockResolvedValue([{ id: 1, medicament_id: 2, quantite: 5 }])
    const res = await channel('stock:lots')({}, { medicamentId: 2 })
    expect(mockStockService.lots).toHaveBeenCalledWith(2)
    expect(res.data[0]).toMatchObject({ medicamentId: 2, quantite: 5 })
  })

  it('stock:mouvements rejects an invalid type and forwards filters', async () => {
    const bad = await channel('stock:mouvements')({}, { type: 'vol' })
    expect(bad.success).toBe(false)
    expect(bad.message).toMatch(/type invalide/)
    expect(mockStockService.mouvements).not.toHaveBeenCalled()

    mockStockService.mouvements.mockResolvedValue([])
    await channel('stock:mouvements')({}, { medicamentId: 1, type: 'entree', limit: 10, offset: 5 })
    expect(mockStockService.mouvements).toHaveBeenCalledWith({ medicamentId: 1, type: 'entree', limit: 10, offset: 5 })
  })

  it('stock:mouvements tolerates a null type but rejects an empty one (P0)', async () => {
    mockStockService.mouvements.mockResolvedValue([])

    const nullType = await channel('stock:mouvements')({}, { type: null })
    expect(nullType.success).toBe(true)
    expect(mockStockService.mouvements).toHaveBeenCalledWith(
      expect.objectContaining({ type: null }),
    )

    const emptyType = await channel('stock:mouvements')({}, { type: '' })
    expect(emptyType.success).toBe(false)
    expect(emptyType.message).toMatch(/type invalide/)
  })

  it('stock:entree requires medicamentId and quantite', async () => {
    expect((await channel('stock:entree')({}, { quantite: 5 })).success).toBe(false)
    expect((await channel('stock:entree')({}, { medicamentId: 1 })).success).toBe(false)
    expect(mockStockService.entree).not.toHaveBeenCalled()

    mockStockService.entree.mockResolvedValue({ id: 4, medicament_id: 1, quantite: 5 })
    const res = await channel('stock:entree')({}, { medicamentId: 1, quantite: 5, numeroLot: 'L1' })
    expect(mockStockService.entree).toHaveBeenCalledWith({ medicamentId: 1, quantite: 5, numeroLot: 'L1', userId: 1 })
    expect(res.success).toBe(true)
  })

  it('stock:sortie-manuelle and stock:ajustement require a motif', async () => {
    expect((await channel('stock:sortie-manuelle')({}, { medicamentId: 1, quantite: 2, motif: '  ' })).success).toBe(false)
    expect((await channel('stock:sortie-manuelle')({}, { medicamentId: 1, quantite: 2 })).success).toBe(false)
    expect((await channel('stock:ajustement')({}, { medicamentId: 1, quantiteNouvelle: 3, motif: '' })).success).toBe(false)
    expect((await channel('stock:ajustement')({}, { medicamentId: 1, motif: 'x' })).success).toBe(false)
    expect(mockStockService.sortieManuelle).not.toHaveBeenCalled()
    expect(mockStockService.ajustement).not.toHaveBeenCalled()

    mockStockService.sortieManuelle.mockResolvedValue([{ lotId: 1, quantite: 2 }])
    const res = await channel('stock:sortie-manuelle')({}, { medicamentId: 1, quantite: 2, motif: 'casse' })
    expect(res.success).toBe(true)
    expect(res.data).toEqual([{ lotId: 1, quantite: 2 }])
    expect(mockStockService.sortieManuelle).toHaveBeenCalledWith({
      medicamentId: 1, quantite: 2, motif: 'casse', userId: 1,
    })
  })

  it('refuse les écritures de stock à un rôle non pharmacie', async () => {
    mockValidate.mockResolvedValueOnce({
      id: 9, role: 'SECRETAIRE', is_validated: 1, email: 'sec@cde.test', nom: 'Secrétaire',
    })
    container.resolve(CurrentSessionService).set({ token: 'token-test', userId: 9, role: 'SECRETAIRE' })

    const res = await channel('stock:entree')({}, { medicamentId: 1, quantite: 5 })
    expect(res.success).toBe(false)
    expect(res.message).toMatch(/pas autorisé/)
    expect(mockStockService.entree).not.toHaveBeenCalled()
  })

  it('refuse tous les canaux stock (lecture et écriture) à un rôle non pharmacie', async () => {
    const secretaire = {
      id: 9, role: 'SECRETAIRE', is_validated: 1, email: 'sec@cde.test', nom: 'Secrétaire',
    }
    const calls: Array<[string, Record<string, unknown>]> = [
      ['stock:niveaux', {}],
      ['stock:lots', { medicamentId: 1 }],
      ['stock:mouvements', { medicamentId: 1 }],
      ['stock:entree', { medicamentId: 1, quantite: 1 }],
      ['stock:sortie-manuelle', { medicamentId: 1, quantite: 1, motif: 'x' }],
      ['stock:ajustement', { medicamentId: 1, quantiteNouvelle: 1, motif: 'x' }],
      ['stock:alertes', {}],
      ['stock:lot-attachments:list', { stockLotId: 1 }],
      ['stock:lot-attachments:get', { stockLotId: 1, id: 1 }],
      ['stock:lot-attachments:download', { stockLotId: 1, id: 1 }],
      ['stock:lot-attachments:create', { stockLotId: 1 }],
      ['stock:lot-attachments:delete', { stockLotId: 1, id: 1 }],
    ]

    for (const [name, params] of calls) {
      mockValidate.mockResolvedValueOnce({ ...secretaire })
      container.resolve(CurrentSessionService).set({ token: 'token-test', userId: 9, role: 'SECRETAIRE' })
      const res = await channel(name)({}, params)
      expect(res.success, `${name} doit être refusé`).toBe(false)
      expect(res.message, `${name} doit être refusé`).toMatch(/pas autorisé/)
    }

    expect(mockStockService.entree).not.toHaveBeenCalled()
    expect(mockStockService.sortieManuelle).not.toHaveBeenCalled()
    expect(mockStockService.ajustement).not.toHaveBeenCalled()
  })

  it('ignore un userId fourni par le renderer sur les écritures de stock', async () => {
    mockStockService.entree.mockResolvedValue({ id: 4, medicament_id: 1, quantite: 5 })
    mockStockService.sortieManuelle.mockResolvedValue([{ lotId: 1, quantite: 1 }])
    mockStockService.ajustement.mockResolvedValue({ id: 4, medicament_id: 1, quantite: 2 })

    await channel('stock:entree')({}, { medicamentId: 1, quantite: 5, userId: 999 })
    expect(mockStockService.entree).toHaveBeenCalledWith(expect.objectContaining({ userId: 1 }))
    expect(mockStockService.entree).not.toHaveBeenCalledWith(expect.objectContaining({ userId: 999 }))

    await channel('stock:sortie-manuelle')({}, { medicamentId: 1, quantite: 1, motif: 'casse', userId: 999 })
    expect(mockStockService.sortieManuelle).toHaveBeenCalledWith(expect.objectContaining({ userId: 1 }))
    expect(mockStockService.sortieManuelle).not.toHaveBeenCalledWith(expect.objectContaining({ userId: 999 }))

    await channel('stock:ajustement')({}, { medicamentId: 1, quantiteNouvelle: 2, motif: 'inventaire', userId: 999 })
    expect(mockStockService.ajustement).toHaveBeenCalledWith(expect.objectContaining({ userId: 1 }))
    expect(mockStockService.ajustement).not.toHaveBeenCalledWith(expect.objectContaining({ userId: 999 }))
  })

  // ─── dispensation ──────────────────────────────────────────────

  it('dispensation:file and dispensation:unmapped forward the statut filter', async () => {
    mockDispensationService.file.mockResolvedValue([])
    mockDispensationService.lignesNonMappees.mockResolvedValue([])
    await channel('dispensation:file')({}, { statut: 'a_servir' })
    expect(mockDispensationService.file).toHaveBeenCalledWith({ statut: 'a_servir' })
    await channel('dispensation:unmapped')({})
    expect(mockDispensationService.lignesNonMappees).toHaveBeenCalledWith({})
  })

  it('dispensation:get and dispensation:create-from-document require their id', async () => {
    expect((await channel('dispensation:get')({}, {})).success).toBe(false)
    expect((await channel('dispensation:create-from-document')({}, {})).success).toBe(false)
    expect(mockDispensationService.getById).not.toHaveBeenCalled()
    expect(mockDispensationService.createFromDocument).not.toHaveBeenCalled()

    mockDispensationService.getById.mockResolvedValue({ delivrance: { id: 1 }, lignes: [], patient: null, document: null })
    const res = await channel('dispensation:get')({}, { id: 1 })
    expect(res.success).toBe(true)
    expect(res.data.delivrance.id).toBe(1)
  })

  it('dispensation:servir requires delivranceId and a non-empty lignes array', async () => {
    expect((await channel('dispensation:servir')({}, { lignes: [{ ligneId: 1, quantite: 1 }] })).success).toBe(false)
    expect((await channel('dispensation:servir')({}, { delivranceId: 1, lignes: [] })).success).toBe(false)
    expect((await channel('dispensation:servir')({}, { delivranceId: 1 })).success).toBe(false)
    expect(mockDispensationService.servir).not.toHaveBeenCalled()

    mockDispensationService.servir.mockResolvedValue({ delivrance: { id: 1, statut: 'servie' }, lignes: [] })
    const res = await channel('dispensation:servir')({}, { delivranceId: 1, lignes: [{ ligneId: 2, quantite: 3 }] })
    // Le vendeur est imposé par la session (userId=1), pas par le payload.
    expect(mockDispensationService.servir).toHaveBeenCalledWith(expect.objectContaining({ delivranceId: 1, lignes: [{ ligneId: 2, quantite: 3 }], userId: 1 }))
    expect(res.data.delivrance.statut).toBe('servie')
  })

  it('dispensation:servir réserve la saisie d’un prix unitaire à la caisse', async () => {
    mockValidate.mockResolvedValueOnce({
      id: 2,
      role: 'INFIRMIER',
      is_validated: 1,
      email: 'inf@cde.test',
      nom: 'Inf',
    })
    container.resolve(CurrentSessionService).set({ token: 'token-test', userId: 2, role: 'INFIRMIER' })

    const res = await channel('dispensation:servir')({}, {
      delivranceId: 1,
      lignes: [{ ligneId: 2, quantite: 1, prixUnitaire: 500 }],
    })
    expect(res.success).toBe(false)
    expect(mockDispensationService.servir).not.toHaveBeenCalled()
  })

  it('dispensation:annuler requires delivranceId and motif', async () => {
    expect((await channel('dispensation:annuler')({}, { motif: 'x' })).success).toBe(false)
    expect((await channel('dispensation:annuler')({}, { delivranceId: 1, motif: '  ' })).success).toBe(false)
    expect(mockDispensationService.annuler).not.toHaveBeenCalled()

    mockDispensationService.annuler.mockResolvedValue({ id: 1, statut: 'annulee' })
    const res = await channel('dispensation:annuler')({}, { delivranceId: 1, motif: 'doublon' })
    expect(mockDispensationService.annuler).toHaveBeenCalledWith({ delivranceId: 1, motif: 'doublon' })
    expect(res.data.statut).toBe('annulee')
  })

  it('dispensation:map-ligne requires ligneId and medicamentId', async () => {
    expect((await channel('dispensation:map-ligne')({}, { medicamentId: 1 })).success).toBe(false)
    expect((await channel('dispensation:map-ligne')({}, { ligneId: 1 })).success).toBe(false)
    expect(mockDispensationService.mapLigne).not.toHaveBeenCalled()

    mockDispensationService.mapLigne.mockResolvedValue({ id: 1, medicamentId: 2 })
    const res = await channel('dispensation:map-ligne')({}, { ligneId: 1, medicamentId: 2 })
    expect(mockDispensationService.mapLigne).toHaveBeenCalledWith({ ligneId: 1, medicamentId: 2 })
    expect(res.data.medicamentId).toBe(2)
  })

  it('dispensation:reouvrir requires delivranceId and motif', async () => {
    expect((await channel('dispensation:reouvrir')({}, { motif: 'x' })).success).toBe(false)
    expect((await channel('dispensation:reouvrir')({}, { delivranceId: 1, motif: '  ' })).success).toBe(false)
    expect(mockDispensationService.reouvrir).not.toHaveBeenCalled()

    mockDispensationService.reouvrir.mockResolvedValue({ id: 1, statut: 'a_servir' })
    const res = await channel('dispensation:reouvrir')({}, { delivranceId: 1, motif: 'reprise' })
    expect(mockDispensationService.reouvrir).toHaveBeenCalledWith({ delivranceId: 1, motif: 'reprise' })
    expect(res.data.statut).toBe('a_servir')
  })

  it('dispensation:orphelines forwards to the service', async () => {
    mockDispensationService.orphelines.mockResolvedValue([{ documentId: 'doc-1', nbLignes: 2 }])
    const res = await channel('dispensation:orphelines')({})
    expect(mockDispensationService.orphelines).toHaveBeenCalled()
    expect(res.success).toBe(true)
    expect(res.data).toEqual([{ documentId: 'doc-1', nbLignes: 2 }])
  })
})
