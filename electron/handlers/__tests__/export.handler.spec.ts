import 'reflect-metadata'
import { describe, it, expect, vi, beforeEach } from 'vitest'

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
}

describe('registerExportHandlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
})
