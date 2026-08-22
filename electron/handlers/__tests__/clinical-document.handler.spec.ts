import 'reflect-metadata'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockHandle = vi.hoisted(() => vi.fn())

// Mock electron: ipcMain for createHandler, plus stubs for the
// ExportService import graph (BrowserWindow/dialog/app) and for
// shell/app used by the import channels.
vi.mock('electron', () => ({
  ipcMain: { handle: mockHandle },
  BrowserWindow: class {},
  dialog: { showSaveDialog: vi.fn(), showOpenDialog: vi.fn() },
  app: { getPath: () => '/tmp' },
  shell: { openPath: vi.fn() },
}))

import { container } from 'tsyringe'
import { ClinicalDocumentService } from '../../services/clinical-document.service'
import { ExportService } from '../../services/export.service'
import { registerClinicalDocumentHandlers } from '../clinical-document.handler'

const mockClinicalDocumentService = {
  signDocument: vi.fn(),
  setDocumentPdfPath: vi.fn(),
  getDocumentTypes: vi.fn(),
  getDocumentTypesWithPricing: vi.fn(),
  getDocumentsByContact: vi.fn(),
  countDocumentsByContact: vi.fn(),
  getDocumentsByPatient: vi.fn(),
  getDocumentById: vi.fn(),
  createDocument: vi.fn(),
  createDocumentWithActe: vi.fn(),
  updateDocumentData: vi.fn(),
  deleteDocument: vi.fn(),
  isContactExpired: vi.fn(),
}

const mockExportService = {
  generateClinicalDocumentPdf: vi.fn(),
}

describe('registerClinicalDocumentHandlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    container.clearInstances()
    container.registerInstance(ClinicalDocumentService, mockClinicalDocumentService as unknown as ClinicalDocumentService)
    container.registerInstance(ExportService, mockExportService as unknown as ExportService)
  })

  it('registers the clinical-documents:sign channel', () => {
    registerClinicalDocumentHandlers()
    const channels = mockHandle.mock.calls.map((c: any[]) => c[0])
    expect(channels).toContain('clinical-documents:sign')
  })

  it('clinical-documents:sign signs the document, generates the stored PDF and saves the pdfPath', async () => {
    const signedDoc = { id: 'doc-1', status: 'signed', signedAt: '2026-01-10T08:00:00.000Z' }
    const withPdf = { ...signedDoc, pdfPath: '/tmp/pdf-imports/abc.pdf' }
    mockClinicalDocumentService.signDocument.mockResolvedValue(signedDoc)
    mockClinicalDocumentService.setDocumentPdfPath.mockResolvedValue(withPdf)
    mockExportService.generateClinicalDocumentPdf.mockResolvedValue('/tmp/pdf-imports/abc.pdf')

    registerClinicalDocumentHandlers()
    const handler = mockHandle.mock.calls.find((c: any[]) => c[0] === 'clinical-documents:sign')![1]

    const result = await handler({}, { id: 'doc-1', userId: 'user-1' })

    expect(mockClinicalDocumentService.signDocument).toHaveBeenCalledWith('doc-1', 'user-1')
    expect(mockExportService.generateClinicalDocumentPdf).toHaveBeenCalledWith('doc-1')
    expect(mockClinicalDocumentService.setDocumentPdfPath).toHaveBeenCalledWith('doc-1', '/tmp/pdf-imports/abc.pdf')
    expect(result).toEqual({ success: true, data: withPdf, message: '' })
  })

  it('clinical-documents:sign propagates errors from the export service', async () => {
    mockClinicalDocumentService.signDocument.mockResolvedValue({ id: 'doc-1' })
    mockExportService.generateClinicalDocumentPdf.mockRejectedValue(new Error('PDF generation failed'))

    registerClinicalDocumentHandlers()
    const handler = mockHandle.mock.calls.find((c: any[]) => c[0] === 'clinical-documents:sign')![1]

    const result = await handler({}, { id: 'doc-1', userId: 'user-1' })

    expect(result).toEqual({ success: false, data: null, message: 'PDF generation failed' })
    expect(mockClinicalDocumentService.setDocumentPdfPath).not.toHaveBeenCalled()
  })
})
