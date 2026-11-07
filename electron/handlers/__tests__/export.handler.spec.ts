import 'reflect-metadata'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockHandle = vi.hoisted(() => vi.fn())
const mockAuthorize = vi.hoisted(() => vi.fn())

// Mock electron: ipcMain for createHandler, plus stubs for the
// ExportService import graph (BrowserWindow/dialog/app).
vi.mock('electron', () => ({
  ipcMain: { handle: mockHandle },
  BrowserWindow: class {},
  dialog: { showSaveDialog: vi.fn() },
  app: { getPath: () => '/tmp' },
}))

// Les canaux protégés (commandes pharmacie) passent par `authorize` avant
// d'appeler le handler : on simule une session ADMIN valide.
vi.mock('../../services/auth/authorization.service', () => ({
  authorize: mockAuthorize,
}))

import { container } from 'tsyringe'
import { ExportService } from '../../services/export.service'
import { registerExportHandlers } from '../export.handler'

const mockExportService = {
  exportUsersListPdf: vi.fn(),
  exportUserProfilePdf: vi.fn(),
  exportUsersListExcel: vi.fn(),
  exportUserProfileExcel: vi.fn(),
  exportPatientProfilePdf: vi.fn(),
  exportCrhDiabetePdf: vi.fn(),
  exportCrcDiabetePdf: vi.fn(),
  previewCrhDiabete: vi.fn(),
  previewCrcDiabete: vi.fn(),
  exportPatientsListExcel: vi.fn(),
  generateOrdonnancePreview: vi.fn(),
  exportOrdonnancePdf: vi.fn(),
  previewBonCommandeHtml: vi.fn(),
  exportBonCommandePdf: vi.fn(),
  previewBonReceptionHtml: vi.fn(),
  exportBonReceptionPdf: vi.fn(),
}

describe('registerExportHandlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuthorize.mockResolvedValue({ userId: 1, role: 'ADMIN' })
    container.clearInstances()
    container.registerInstance(ExportService, mockExportService as unknown as ExportService)
  })

  it('registers the four CRH/CRC channels with unchanged names', () => {
    registerExportHandlers()
    const channels = mockHandle.mock.calls.map((c: any[]) => c[0])
    expect(channels).toContain('export:crh-diabete-preview')
    expect(channels).toContain('export:crh-diabete-pdf')
    expect(channels).toContain('export:crc-diabete-preview')
    expect(channels).toContain('export:crc-diabete-pdf')
  })

  it('export:crh-diabete-preview forwards documentId and formData', async () => {
    registerExportHandlers()
    const handler = mockHandle.mock.calls.find((c: any[]) => c[0] === 'export:crh-diabete-preview')![1]
    const formData = { admission: { motifHospitalisation: '<p>MOTIF_OVERRIDE_BETA</p>' } }

    await handler({}, { documentId: 'doc-1', formData })

    expect(mockExportService.previewCrhDiabete).toHaveBeenCalledWith('doc-1', formData, null, null)
  })

  it('export:crh-diabete-preview forwards documentId without formData', async () => {
    registerExportHandlers()
    const handler = mockHandle.mock.calls.find((c: any[]) => c[0] === 'export:crh-diabete-preview')![1]

    await handler({}, { documentId: 'doc-1' })

    expect(mockExportService.previewCrhDiabete).toHaveBeenCalledWith('doc-1', undefined, null, null)
  })

  it('export:crh-diabete-preview works without documentId via patientId/contactId', async () => {
    registerExportHandlers()
    const handler = mockHandle.mock.calls.find((c: any[]) => c[0] === 'export:crh-diabete-preview')![1]
    const formData = { admission: { motifHospitalisation: '<p>MOTIF_OVERRIDE_BETA</p>' } }

    await handler({}, { patientId: 42, contactId: 7, formData })

    expect(mockExportService.previewCrhDiabete).toHaveBeenCalledWith(null, formData, 42, 7)
  })

  it('export:crh-diabete-pdf forwards documentId and formData', async () => {
    registerExportHandlers()
    const handler = mockHandle.mock.calls.find((c: any[]) => c[0] === 'export:crh-diabete-pdf')![1]
    const formData = { admission: { motifHospitalisation: '<p>MOTIF_OVERRIDE_BETA</p>' } }

    await handler({}, { documentId: 'doc-1', formData })

    expect(mockExportService.exportCrhDiabetePdf).toHaveBeenCalledWith('doc-1', formData, null, null)
  })

  it('export:crc-diabete-preview forwards documentId and formData', async () => {
    registerExportHandlers()
    const handler = mockHandle.mock.calls.find((c: any[]) => c[0] === 'export:crc-diabete-preview')![1]
    const formData = { admission: { motifHospitalisation: '<p>MOTIF_OVERRIDE_BETA</p>' } }

    await handler({}, { documentId: 'doc-1', formData })

    expect(mockExportService.previewCrcDiabete).toHaveBeenCalledWith('doc-1', formData, null, null)
  })

  it('export:crc-diabete-pdf forwards documentId and formData', async () => {
    registerExportHandlers()
    const handler = mockHandle.mock.calls.find((c: any[]) => c[0] === 'export:crc-diabete-pdf')![1]
    const formData = { admission: { motifHospitalisation: '<p>MOTIF_OVERRIDE_BETA</p>' } }

    await handler({}, { documentId: 'doc-1', formData })

    expect(mockExportService.exportCrcDiabetePdf).toHaveBeenCalledWith('doc-1', formData, null, null)
  })

  it('registers the ordonnance channels with their unchanged names', () => {
    registerExportHandlers()
    const channels = mockHandle.mock.calls.map((c: any[]) => c[0])
    expect(channels).toContain('export:prescription-preview')
    expect(channels).toContain('export:prescription-pdf')
  })

  it('export:prescription-preview forwards the full params (ordonnanceItems inclus)', async () => {
    registerExportHandlers()
    const handler = mockHandle.mock.calls.find((c: any[]) => c[0] === 'export:prescription-preview')![1]
    const params = {
      patientId: 42,
      ordonnanceItems: [{ categorie: 'soins', medicament: 'Pansement quotidien' }],
      prescriptionIds: [1, 2],
      inlinePrescriptions: [],
    }

    await handler({}, params)

    expect(mockExportService.generateOrdonnancePreview).toHaveBeenCalledWith(params)
  })

  it('export:prescription-pdf forwards the full params (ordonnanceItems inclus)', async () => {
    registerExportHandlers()
    const handler = mockHandle.mock.calls.find((c: any[]) => c[0] === 'export:prescription-pdf')![1]
    const params = {
      patientId: 42,
      ordonnanceItems: [{ categorie: 'medicament', medicament: 'Metformine 500 mg' }],
    }

    await handler({}, params)

    expect(mockExportService.exportOrdonnancePdf).toHaveBeenCalledWith(params)
  })

  it('enregistre les deux canaux du bon de réception', () => {
    registerExportHandlers()
    const channels = mockHandle.mock.calls.map((c: any[]) => c[0])
    expect(channels).toContain('export:reception-preview')
    expect(channels).toContain('export:reception-pdf')
  })

  it('export:reception-preview transmet commandeId et receptionId', async () => {
    registerExportHandlers()
    const handler = mockHandle.mock.calls.find((c: any[]) => c[0] === 'export:reception-preview')![1]

    await handler({}, { commandeId: 7, receptionId: 3 })

    expect(mockExportService.previewBonReceptionHtml).toHaveBeenCalledWith(7, 3)
  })

  it('export:reception-preview est protégé par les rôles commandes pharmacie', async () => {
    registerExportHandlers()
    const handler = mockHandle.mock.calls.find((c: any[]) => c[0] === 'export:reception-preview')![1]

    await handler({}, { commandeId: 7, receptionId: 3 })

    expect(mockAuthorize).toHaveBeenCalledWith(
      'export:reception-preview',
      expect.arrayContaining(['ADMIN', 'PHARMACIEN']),
    )
  })

  it('export:reception-pdf refuse un identifiant manquant', async () => {
    registerExportHandlers()
    const handler = mockHandle.mock.calls.find((c: any[]) => c[0] === 'export:reception-pdf')![1]

    // `controllerAdvice` convertit l'erreur métier en résultat IPC.
    const result = await handler({}, { commandeId: 7 })

    expect(result).toMatchObject({ success: false })
    expect((result as { message?: string }).message).toMatch(/receptionId requis/)
    expect(mockExportService.exportBonReceptionPdf).not.toHaveBeenCalled()
  })
})
