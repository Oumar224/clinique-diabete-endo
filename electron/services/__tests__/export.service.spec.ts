import 'reflect-metadata'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'

// ── Hoisted mutable state shared with the electron mock ──────────
const electronState = vi.hoisted(() => ({
  pdfHtml: '',
  savePath: '',
  // Assigned in module body once `fs` is imported (mock factory runs at import time,
  // so it cannot capture module-scope imports directly).
  readTempFile: null as null | ((filePath: string) => string),
}))

// ── Mock electron BEFORE any module imports ─────────────────────
vi.mock('electron', () => ({
  BrowserWindow: class {
    private _cbs = new Map<string, Array<() => void>>()
    webContents: any
    loadURL: any
    loadFile: any
    close: any

    constructor() {
      this.webContents = {
        on: (event: string, cb: () => void) => {
          const list = this._cbs.get(event) || []
          list.push(cb)
          this._cbs.set(event, list)
        },
        once: (event: string, cb: () => void) => {
          const list = this._cbs.get(event) || []
          list.push(cb)
          this._cbs.set(event, list)
        },
        printToPDF: vi.fn().mockResolvedValue(Buffer.from('%PDF-1.4-mock')),
      }
      this.loadURL = vi.fn(async (url: string) => {
        electronState.pdfHtml = decodeURIComponent(url.replace('data:text/html;charset=utf-8,', ''))
        await new Promise((resolve) => setTimeout(resolve, 0))
        this._cbs.get('did-finish-load')?.forEach((cb) => cb())
      })
      this.loadFile = vi.fn(async (filePath: string) => {
        electronState.pdfHtml = electronState.readTempFile!(filePath)
        await new Promise((resolve) => setTimeout(resolve, 0))
        this._cbs.get('did-finish-load')?.forEach((cb) => cb())
      })
      this.close = vi.fn()
    }
  },
  dialog: {
    showSaveDialog: vi.fn(async () => ({ canceled: false, filePath: electronState.savePath })),
  },
  app: { getPath: () => '/tmp' },
}))

import type { AuthService } from '../auth.service'
import type { SettingsService } from '../settings.service'
import type { LogoService } from '../logo.service'
import type { PatientExportService } from '../patient-export.service'
import type { PatientService } from '../patient.service'
import type { ClinicalDocumentService } from '../clinical-document.service'
import type { PrescriptionService } from '../prescription.service'
import { ExportService } from '../export.service'

// The electron mock's loadFile must read the temp HTML file written by generatePdf.
electronState.readTempFile = (filePath: string) => fs.readFileSync(filePath, 'utf-8')

// ─── Test data ───────────────────────────────────────────────────

const DB_FORM_DATA = JSON.stringify({
  admission: { motifHospitalisation: '<p>MOTIF_DB_ALPHA</p>' },
})

const OVERRIDE_FORM_DATA = {
  admission: { motifHospitalisation: '<p>MOTIF_OVERRIDE_BETA</p>' },
}

function createMockDoc() {
  return {
    id: 'doc-1',
    contactId: '42',
    serviceId: null,
    formData: DB_FORM_DATA,
  }
}

function createEnrichedPatient() {
  return {
    patient: {
      id: 7,
      nom: 'Diallo',
      prenom: 'Mamadou',
      civilite: 'M',
      date_naissance: '1980-05-15',
      nip: 'NIP-789',
      adresse: '123 Rue de la Paix',
    },
    trustedPerson: null,
    hospital: {
      name: 'Hôpital Central',
      address: '456 Avenue du Sahel',
      phone: '+224 123 456 789',
      email: 'contact@hopital.gn',
      regNumber: 'AGR-001',
      city: 'Conakry',
    },
    logo: null,
  }
}

// ─── Test suite ──────────────────────────────────────────────────

describe('ExportService CRH/CRC formData override', () => {
  let service: ExportService
  let mockClinicalDocumentService: { getDocumentById: ReturnType<typeof vi.fn>; getPatientIdByDocument: ReturnType<typeof vi.fn> }
  let mockPatientExportService: { enrich: ReturnType<typeof vi.fn> }

  beforeEach(() => {
    vi.clearAllMocks()
    electronState.pdfHtml = ''
    electronState.savePath = ''

    mockClinicalDocumentService = {
      getDocumentById: vi.fn().mockResolvedValue(createMockDoc()),
      getPatientIdByDocument: vi.fn().mockResolvedValue(7),
    }
    mockPatientExportService = {
      enrich: vi.fn().mockResolvedValue(createEnrichedPatient()),
    }

    service = new ExportService(
      {} as unknown as AuthService,
      {} as unknown as SettingsService,
      {} as unknown as LogoService,
      mockPatientExportService as unknown as PatientExportService,
      {} as unknown as PatientService,
      mockClinicalDocumentService as unknown as ClinicalDocumentService,
      {} as unknown as PrescriptionService,
    )
  })

  afterEach(() => {
    try {
      if (electronState.savePath && fs.existsSync(electronState.savePath)) {
        fs.unlinkSync(electronState.savePath)
      }
    } catch { /* cleanup best-effort */ }
  })

  it('previewCrhDiabete uses the provided formData override instead of the stored document formData', async () => {
    const html = await service.previewCrhDiabete('doc-1', OVERRIDE_FORM_DATA)

    expect(html).toContain('MOTIF_OVERRIDE_BETA')
    expect(html).not.toContain('MOTIF_DB_ALPHA')
  })

  it('previewCrhDiabete falls back to the stored document formData when no override is provided', async () => {
    const html = await service.previewCrhDiabete('doc-1')

    expect(html).toContain('MOTIF_DB_ALPHA')
    expect(html).not.toContain('MOTIF_OVERRIDE_BETA')
  })

  it('previewCrhDiabete treats an empty object override as absent and falls back to the DB', async () => {
    const html = await service.previewCrhDiabete('doc-1', {})

    expect(html).toContain('MOTIF_DB_ALPHA')
    expect(html).not.toContain('MOTIF_OVERRIDE_BETA')
  })

  it('previewCrcDiabete uses the override and keeps the CRC options', async () => {
    const html = await service.previewCrcDiabete('doc-1', OVERRIDE_FORM_DATA)

    expect(html).toContain('COMPTE RENDU DE CONSULTATION')
    expect(html).toContain('MOTIF_OVERRIDE_BETA')
    expect(html).not.toContain('MOTIF_DB_ALPHA')
  })

  it('exportCrhDiabetePdf prints the override formData into the PDF html', async () => {
    electronState.savePath = path.join(os.tmpdir(), 'cde-crh-override-test.pdf')

    const filePath = await service.exportCrhDiabetePdf('doc-1', OVERRIDE_FORM_DATA)

    expect(filePath).toBe(electronState.savePath)
    expect(electronState.pdfHtml).toContain('MOTIF_OVERRIDE_BETA')
    expect(electronState.pdfHtml).not.toContain('MOTIF_DB_ALPHA')
  })

  it('exportCrhDiabetePdf prints the stored formData when no override is provided', async () => {
    electronState.savePath = path.join(os.tmpdir(), 'cde-crh-db-test.pdf')

    const filePath = await service.exportCrhDiabetePdf('doc-1')

    expect(filePath).toBe(electronState.savePath)
    expect(electronState.pdfHtml).toContain('MOTIF_DB_ALPHA')
    expect(electronState.pdfHtml).not.toContain('MOTIF_OVERRIDE_BETA')
  })
})
