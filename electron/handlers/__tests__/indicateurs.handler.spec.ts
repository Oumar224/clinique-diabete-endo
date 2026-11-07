import 'reflect-metadata'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockHandle = vi.hoisted(() => vi.fn())

// Mock electron: ipcMain for createHandler, plus stubs for the
// ExportService import graph (BrowserWindow/dialog/app).
vi.mock('electron', () => ({
  ipcMain: { handle: mockHandle },
  BrowserWindow: class {},
  dialog: { showSaveDialog: vi.fn() },
  app: { getPath: () => '/tmp' },
}))

import { container } from 'tsyringe'
import { IndicateursService } from '../../services/indicateurs.service'
import { ExportService } from '../../services/export.service'
import { SessionService } from '../../services/auth/session.service'
import { CurrentSessionService } from '../../services/auth/current-session.service'
import { registerIndicateursHandlers } from '../indicateurs.handler'
import type { AppRole } from '../../utils/authorization'

const mockIndicateursService = {
  getAnnualStats: vi.fn(),
  getMonthlyStats: vi.fn(),
  setManuel: vi.fn(),
  clearManuel: vi.fn(),
  getExportRows: vi.fn(),
}

const mockExportService = {
  exportIndicateursExcel: vi.fn(),
}

const mockValidate = vi.fn()

function channel(name: string): (...args: any[]) => Promise<any> {
  const found = mockHandle.mock.calls.find((call: any[]) => call[0] === name)
  expect(found, `canal IPC ${name} enregistré`).toBeDefined()
  return found![1]
}

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

describe('canaux indicateurs — autorisation serveur', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    container.clearInstances()

    container.registerInstance(IndicateursService, mockIndicateursService as unknown as IndicateursService)
    container.registerInstance(ExportService, mockExportService as unknown as ExportService)
    container.registerInstance(SessionService, {
      validate: mockValidate,
      invalidate: vi.fn(),
    } as unknown as SessionService)

    mockIndicateursService.getAnnualStats.mockResolvedValue({ lignes: [], totaux: {} })
    mockIndicateursService.getMonthlyStats.mockResolvedValue({
      annee: 2025,
      lignes: [],
      totaux_mois: [],
      total: null,
    })
    mockExportService.exportIndicateursExcel.mockResolvedValue('/tmp/indicateurs.xlsx')

    registerIndicateursHandlers()
  })

  it('enregistre les cinq canaux attendus', () => {
    const channels = mockHandle.mock.calls.map((call: any[]) => call[0])
    expect(channels).toContain('indicateurs:annuels')
    expect(channels).toContain('indicateurs:mensuels')
    expect(channels).toContain('indicateurs:set-manuel')
    expect(channels).toContain('indicateurs:clear-manuel')
    expect(channels).toContain('export:indicateurs-excel')
  })

  it('autorise un COMPTABLE à lire les indicateurs annuels', async () => {
    openSession('COMPTABLE', 11)

    const res = await channel('indicateurs:annuels')({}, { fromYear: 2025, toYear: 2026 })

    expect(res.success).toBe(true)
    expect(mockIndicateursService.getAnnualStats).toHaveBeenCalledWith({ fromYear: 2025, toYear: 2026 })
  })

  it('autorise un COMPTABLE à lire le détail mensuel', async () => {
    openSession('COMPTABLE', 11)

    const res = await channel('indicateurs:mensuels')({}, { annee: 2025 })

    expect(res.success).toBe(true)
    expect(mockIndicateursService.getMonthlyStats).toHaveBeenCalledWith({ annee: 2025 })
  })

  it('refuse un MEDECIN sur le détail mensuel', async () => {
    openSession('MEDECIN', 4)

    const res = await channel('indicateurs:mensuels')({}, { annee: 2025 })

    expect(res.success).toBe(false)
    expect(res.message).toMatch(/Accès refusé/)
    expect(mockIndicateursService.getMonthlyStats).not.toHaveBeenCalled()
  })

  it('refuse un MEDECIN sur la lecture des indicateurs annuels', async () => {
    openSession('MEDECIN', 4)

    const res = await channel('indicateurs:annuels')({}, { fromYear: 2025, toYear: 2026 })

    expect(res.success).toBe(false)
    expect(res.message).toMatch(/Accès refusé/)
    expect(mockIndicateursService.getAnnualStats).not.toHaveBeenCalled()
  })

  it('autorise un ADMIN à saisir une valeur et impose l’acteur de la session', async () => {
    openSession('ADMIN', 7)

    const res = await channel('indicateurs:set-manuel')(
      {},
      { annee: 2025, metric: 'ecg', value: 3, userId: 999 },
    )

    expect(res.success).toBe(true)
    // 7 = acteur de la session ; le userId du payload est ignoré.
    expect(mockIndicateursService.setManuel).toHaveBeenCalledWith(2025, 'ecg', 3, 7)
  })

  it('autorise un ADMIN à effacer une valeur', async () => {
    openSession('ADMIN', 7)

    const res = await channel('indicateurs:clear-manuel')({}, { annee: 2025, metric: 'ecg' })

    expect(res.success).toBe(true)
    expect(mockIndicateursService.clearManuel).toHaveBeenCalledWith(2025, 'ecg')
  })

  it('refuse un COMPTABLE sur la saisie et l’effacement (réservés ADMIN)', async () => {
    openSession('COMPTABLE', 11)

    const set = await channel('indicateurs:set-manuel')({}, { annee: 2025, metric: 'ecg', value: 3 })
    expect(set.success).toBe(false)
    expect(set.message).toMatch(/Accès refusé/)

    const clear = await channel('indicateurs:clear-manuel')({}, { annee: 2025, metric: 'ecg' })
    expect(clear.success).toBe(false)
    expect(clear.message).toMatch(/Accès refusé/)

    expect(mockIndicateursService.setManuel).not.toHaveBeenCalled()
    expect(mockIndicateursService.clearManuel).not.toHaveBeenCalled()
  })

  it('autorise un COMPTABLE à exporter le classeur Excel', async () => {
    openSession('COMPTABLE', 11)

    const res = await channel('export:indicateurs-excel')({}, { fromYear: 2025, toYear: 2026 })

    expect(res.success).toBe(true)
    expect(mockExportService.exportIndicateursExcel).toHaveBeenCalledWith({ fromYear: 2025, toYear: 2026 })
  })

  it('refuse un MEDECIN sur l’export Excel', async () => {
    openSession('MEDECIN', 4)

    const res = await channel('export:indicateurs-excel')({}, { fromYear: 2025, toYear: 2026 })

    expect(res.success).toBe(false)
    expect(res.message).toMatch(/Accès refusé/)
    expect(mockExportService.exportIndicateursExcel).not.toHaveBeenCalled()
  })

  it('refuse toute opération sans session valide', async () => {
    container.resolve(CurrentSessionService).clear()
    mockValidate.mockResolvedValue(null)

    for (const [name, params] of [
      ['indicateurs:annuels', {}],
      ['indicateurs:mensuels', { annee: 2025 }],
      ['indicateurs:set-manuel', { annee: 2025, metric: 'ecg', value: 1 }],
      ['indicateurs:clear-manuel', { annee: 2025, metric: 'ecg' }],
      ['export:indicateurs-excel', {}],
    ] as const) {
      const res = await channel(name)({}, params)
      expect(res.success, `canal ${name}`).toBe(false)
      expect(res.message).toMatch(/Accès refusé/)
    }

    expect(mockIndicateursService.getAnnualStats).not.toHaveBeenCalled()
    expect(mockIndicateursService.getMonthlyStats).not.toHaveBeenCalled()
    expect(mockIndicateursService.setManuel).not.toHaveBeenCalled()
    expect(mockIndicateursService.clearManuel).not.toHaveBeenCalled()
    expect(mockExportService.exportIndicateursExcel).not.toHaveBeenCalled()
  })
})
