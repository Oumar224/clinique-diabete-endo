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
import type { ExamRequestService } from '../exam-request.service'
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
  let mockAuthService: { getUserById: ReturnType<typeof vi.fn> }
  let mockClinicalDocumentService: { getDocumentById: ReturnType<typeof vi.fn>; getPatientIdByDocument: ReturnType<typeof vi.fn>; getDocumentTypeById: ReturnType<typeof vi.fn> }
  let mockPatientExportService: { enrich: ReturnType<typeof vi.fn> }
  let mockPrescriptionService: { listByPatient: ReturnType<typeof vi.fn> }
  let mockExamRequestService: { listByPatient: ReturnType<typeof vi.fn>; findTypeNames: ReturnType<typeof vi.fn> }

  beforeEach(() => {
    vi.clearAllMocks()
    electronState.pdfHtml = ''
    electronState.savePath = ''

    mockAuthService = {
      getUserById: vi.fn().mockResolvedValue(null),
    }
    mockClinicalDocumentService = {
      getDocumentById: vi.fn().mockResolvedValue(createMockDoc()),
      getPatientIdByDocument: vi.fn().mockResolvedValue(7),
      getDocumentTypeById: vi.fn().mockResolvedValue(null),
    }
    mockPatientExportService = {
      enrich: vi.fn().mockResolvedValue(createEnrichedPatient()),
    }
    mockPrescriptionService = {
      listByPatient: vi.fn().mockResolvedValue([]),
    }
    mockExamRequestService = {
      listByPatient: vi.fn().mockResolvedValue([]),
      findTypeNames: vi.fn().mockResolvedValue([]),
    }

    service = new ExportService(
      mockAuthService as unknown as AuthService,
      {} as unknown as SettingsService,
      {} as unknown as LogoService,
      mockPatientExportService as unknown as PatientExportService,
      {} as unknown as PatientService,
      mockClinicalDocumentService as unknown as ClinicalDocumentService,
      mockPrescriptionService as unknown as PrescriptionService,
      mockExamRequestService as unknown as ExamRequestService,
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

  it('builds the ordonnance blocks (medicaments, soins, examens, avis) in the CRH html', async () => {
    mockPrescriptionService.listByPatient.mockResolvedValue([
      { type: 'medicament', prescription_type: 'medicament', medicament: 'Metformine 500', dosage: '500 mg', voie: 'PO', frequence: 'Matin,Soir', statut: 'active', date_prescription: '2025-01-10' },
      { type: 'medicament', prescription_type: 'medicament', medicament: 'Furosémide', dosage: '40 mg', voie: 'PO', frequence: 'Matin', statut: 'active', date_prescription: '2026-01-10' },
      { type: 'soins', prescription_type: 'soins', medicament: 'Pansement', dosage: '', voie: '', frequence: '1/jour', statut: 'active', date_prescription: '2026-01-10' },
    ])
    mockExamRequestService.listByPatient.mockResolvedValue([
      { type: 'imagerie', examen_label: 'Scanner cérébral', motif: 'Céphalées', statut: 'en_attente' },
      { type: 'laboratoire', exam_ids: '[1,2]', statut: 'en_attente' },
      { type: 'avis', specialite: 'Cardiologue', specialty_name: 'Cardiologie', motif: 'Bilan cardiaque', statut: 'en_attente' },
      { type: 'avis', statut: 'annule' },
    ])
    mockExamRequestService.findTypeNames.mockResolvedValue([
      { id: 1, name: 'NFS' },
      { id: 2, name: 'Ionogramme' },
    ])

    const html = await service.previewCrhDiabete('doc-1', {
      admission: { dateEntree: '2025-02-01' },
    })

    expect(html).toContain('14. ORDONNANCE')
    expect(html).toContain('MÉDICAMENTS')
    // Metformine prescrite avant l'entrée (2025-01-10 <= 2025-02-01) → incluse
    expect(html).toContain('Metformine 500')
    // Furosémide prescrit après l'entrée (2026-01-10) → exclu du traitement à l'entrée
    expect(html).not.toContain('Furosémide')
    expect(html).toContain('Pansement')
    expect(html).toContain('Scanner cérébral')
    expect(html).toContain('NFS, Ionogramme')
    expect(html).toContain('Cardiologie')
    // la demande annulée ne doit pas apparaître (aucun avis sans spécialité affiché)
    expect(html).not.toContain('Avis spécialisé')
  })

  // ─── Ordonnance issue de formData.ordonnanceSortie (onglet OrdonnanceSortie) ──

  const ORDONNANCE_ITEMS = [
    { categorie: 'medicament', medicament: 'Metformine 500 mg', dosage: '500', unite: 'mg', voie: 'PO', frequence: ['Matin', 'Soir'] },
    { categorie: 'soins', medicament: 'Pansement quotidien', dosage: '', unite: '', voie: '', frequence: ['1/jour'] },
    { categorie: 'examen', examen: 'Scanner cérébral', motif: 'Céphalées' },
    { categorie: 'avis', specialite: 'Cardiologue', motif: 'Bilan cardiaque' },
  ]

  it('renders the 4 ordonnance blocks from formData.ordonnanceSortie without querying the DB', async () => {
    const html = await service.previewCrhDiabete('doc-1', { admission: {}, ordonnanceSortie: ORDONNANCE_ITEMS })

    expect(html).toContain('14. ORDONNANCE')
    expect(html).toContain('>MÉDICAMENTS<')
    expect(html).toContain('>SOINS<')
    expect(html).toContain('>DEMANDES D\u2019EXAMENS<')
    expect(html).toContain('>AVIS SPÉCIALISÉS<')

    expect(html).toContain('Metformine 500 mg')
    expect(html).toContain('Pansement quotidien')
    expect(html).toContain('Scanner cérébral')
    expect(html).toContain('Cardiologue')

    // la source formData est prioritaire : aucun appel à la base
    expect(mockPrescriptionService.listByPatient).not.toHaveBeenCalled()
    expect(mockExamRequestService.listByPatient).not.toHaveBeenCalled()
  })

  it('assembles the posologie as "dosage - unite - voie - frequence"', async () => {
    const html = await service.previewCrhDiabete('doc-1', {
      admission: {},
      ordonnanceSortie: [
        { categorie: 'medicament', medicament: 'Metformine 500 mg', dosage: '500', unite: 'mg', voie: 'PO', frequence: ['Matin', 'Soir'] },
      ],
    })

    expect(html).toContain('Metformine 500 mg</span> : 500 - mg - PO - Matin, Soir')
    // seuls les blocs non vides sont rendus
    expect(html).not.toContain('>SOINS<')
    expect(html).not.toContain('>DEMANDES D\u2019EXAMENS<')
    expect(html).not.toContain('>AVIS SPÉCIALISÉS<')
  })

  it('defaults items without categorie to the MÉDICAMENTS block', async () => {
    const html = await service.previewCrhDiabete('doc-1', {
      admission: {},
      ordonnanceSortie: [
        { medicament: 'Sans catégorie', dosage: '10', unite: 'mg', voie: 'PO', frequence: ['Matin'] },
      ],
    })

    expect(html).toContain('>MÉDICAMENTS<')
    expect(html).toContain('Sans catégorie')
    expect(html).not.toContain('>SOINS<')
    expect(html).not.toContain('>DEMANDES D\u2019EXAMENS<')
    expect(html).not.toContain('>AVIS SPÉCIALISÉS<')
  })

  it('renders "Non renseigné" for an empty ordonnanceSortie array without DB fallback', async () => {
    const html = await service.previewCrhDiabete('doc-1', { admission: {}, ordonnanceSortie: [] })

    const ordonnanceTitle = '<div class="crh-section-title">14. ORDONNANCE</div>'
    const sectionStart = html.indexOf(ordonnanceTitle)
    const sectionEnd = html.indexOf('class="crh-section-title">', sectionStart + ordonnanceTitle.length)
    const ordonnanceSection = html.slice(sectionStart, sectionEnd === -1 ? html.length : sectionEnd)

    expect(ordonnanceSection).toContain('Non renseigné')
    expect(ordonnanceSection).not.toContain('>MÉDICAMENTS<')
    // un tableau vide reste "vide" : pas de repli sur la base
    expect(mockPrescriptionService.listByPatient).not.toHaveBeenCalled()
    expect(mockExamRequestService.listByPatient).not.toHaveBeenCalled()
  })

  it('falls back to the DB ordonnance when ordonnanceSortie is not an array', async () => {
    mockPrescriptionService.listByPatient.mockResolvedValue([
      { type: 'medicament', prescription_type: 'medicament', medicament: 'DB-METFORMINE', dosage: '500 mg', voie: 'PO', frequence: 'Matin,Soir', statut: 'active', date_prescription: '2025-01-10' },
    ])
    mockExamRequestService.listByPatient.mockResolvedValue([])

    const html = await service.previewCrhDiabete('doc-1', {
      admission: { dateEntree: '2025-02-01' },
      ordonnanceSortie: 'pas-un-tableau',
    })

    expect(mockPrescriptionService.listByPatient).toHaveBeenCalled()
    expect(mockExamRequestService.listByPatient).toHaveBeenCalled()
    expect(html).toContain('DB-METFORMINE')
  })

  it('maps duree_type from the DB prescriptions into the longue durée subgroup', async () => {
    mockPrescriptionService.listByPatient.mockResolvedValue([
      { type: 'medicament', prescription_type: 'medicament', medicament: 'Metformine 500', dosage: '500 mg', voie: 'PO', frequence: 'Matin,Soir', statut: 'active', date_prescription: '2025-01-10', duree_type: 'longue' },
    ])
    mockExamRequestService.listByPatient.mockResolvedValue([])

    const html = await service.previewCrhDiabete('doc-1', {
      admission: { dateEntree: '2025-02-01' },
    })

    expect(html).toContain('<div class="crh-ord-subtitle">Traitement de longue durée</div>')
    expect(html).not.toContain('<div class="crh-ord-subtitle">Traitement de courte durée</div>')
    expect(html.indexOf('Traitement de longue durée')).toBeLessThan(html.indexOf('Metformine 500'))
  })

  it('maps dureeType from formData.ordonnanceSortie into the longue durée subgroup', async () => {
    const html = await service.previewCrhDiabete('doc-1', {
      admission: {},
      ordonnanceSortie: [
        { categorie: 'medicament', medicament: 'Metformine 500 mg', dosage: '500', unite: 'mg', voie: 'PO', frequence: ['Matin', 'Soir'], dureeType: 'longue' },
      ],
    })

    expect(html).toContain('<div class="crh-ord-subtitle">Traitement de longue durée</div>')
    expect(html).not.toContain('<div class="crh-ord-subtitle">Traitement de courte durée</div>')
    // la source formData est prioritaire : aucun appel à la base
    expect(mockPrescriptionService.listByPatient).not.toHaveBeenCalled()
    expect(mockExamRequestService.listByPatient).not.toHaveBeenCalled()
  })

  // ─── Avis fusionnés depuis evolutionMedicale.avis (bloc AVIS SPÉCIALISÉS) ──

  it('uses evolutionMedicale.avis for the AVIS SPÉCIALISÉS block ahead of ordonnanceSortie avis', async () => {
    const html = await service.previewCrhDiabete('doc-1', {
      admission: {},
      ordonnanceSortie: [
        { categorie: 'avis', specialite: 'Ordonnance-Cardio', motif: 'Depuis ordo' },
      ],
      evolutionMedicale: {
        journalEvolution: '',
        avis: [
          { _key: 'e1', date: '2026-08-15', specialite: 'Évolution-Cardio', motif: 'Depuis évolution' },
          { _key: 'e2', date: '2026-08-20', specialite: 'Ophtalmo', motif: 'FO' },
        ],
      },
    })

    expect(html).toContain('>AVIS SPÉCIALISÉS<')
    expect(html).toContain('<span style="font-weight:bold;">Évolution-Cardio</span> : Depuis évolution')
    expect(html).toContain('<span style="font-weight:bold;">Ophtalmo</span>')
    // la source evolutionMedicale.avis prime : l'avis de l'ordonnance est ignoré
    expect(html).not.toContain('Ordonnance-Cardio')
    expect(mockPrescriptionService.listByPatient).not.toHaveBeenCalled()
    expect(mockExamRequestService.listByPatient).not.toHaveBeenCalled()
  })

  it('dedupes evolution avis sharing the same specialite and motif', async () => {
    const html = await service.previewCrhDiabete('doc-1', {
      admission: {},
      evolutionMedicale: {
        journalEvolution: '',
        avis: [
          { _key: 'e1', date: '2026-08-15', specialite: 'Cardiologie', motif: 'Bilan' },
          { _key: 'e2', date: '2026-08-20', specialite: 'Cardiologie', motif: 'Bilan' },
          { _key: 'e3', date: '2026-08-21', specialite: 'Cardiologie', motif: 'Autre motif' },
        ],
      },
    })

    expect(html).toContain('>AVIS SPÉCIALISÉS<')
    // le doublon (Cardiologie|Bilan) n'est rendu qu'une fois
    expect(html.match(/<span style="font-weight:bold;">Cardiologie<\/span>/g)).toHaveLength(2)
    expect(html).toContain('<span style="font-weight:bold;">Cardiologie</span> : Autre motif')
  })

  it('falls back to the DB avis when ordonnanceSortie is absent and evolutionMedicale.avis is empty', async () => {
    mockPrescriptionService.listByPatient.mockResolvedValue([])
    mockExamRequestService.listByPatient.mockResolvedValue([
      { type: 'avis', specialite: 'Cardio-DB', specialty_name: 'Cardiologie DB', motif: 'Motif DB', statut: 'en_attente' },
    ])

    const html = await service.previewCrhDiabete('doc-1', {
      admission: {},
      evolutionMedicale: { journalEvolution: '', avis: [] },
    })

    expect(mockExamRequestService.listByPatient).toHaveBeenCalled()
    expect(html).toContain('>AVIS SPÉCIALISÉS<')
    expect(html).toContain('<span style="font-weight:bold;">Cardiologie DB</span> : Motif DB')
  })

  it('keeps "Non renseigné" for an empty ordonnanceSortie array even with an empty evolutionMedicale.avis', async () => {
    const html = await service.previewCrhDiabete('doc-1', {
      admission: {},
      ordonnanceSortie: [],
      evolutionMedicale: { journalEvolution: '', avis: [] },
    })

    const ordonnanceTitle = '<div class="crh-section-title">14. ORDONNANCE</div>'
    const sectionStart = html.indexOf(ordonnanceTitle)
    const sectionEnd = html.indexOf('class="crh-section-title">', sectionStart + ordonnanceTitle.length)
    const ordonnanceSection = html.slice(sectionStart, sectionEnd === -1 ? html.length : sectionEnd)

    expect(ordonnanceSection).toContain('Non renseigné')
    expect(ordonnanceSection).not.toContain('>AVIS SPÉCIALISÉS<')
    // un tableau vide reste "vide" : pas de repli sur la base
    expect(mockPrescriptionService.listByPatient).not.toHaveBeenCalled()
    expect(mockExamRequestService.listByPatient).not.toHaveBeenCalled()
  })

  // ─── generateClinicalDocumentPdf (template générique + pdf-imports) ──

  it('generateClinicalDocumentPdf renders the generic template and writes the PDF to pdf-imports', async () => {
    const DOC_TYPE_ID = '99999999-9999-4999-9999-999999999999'
    mockClinicalDocumentService.getDocumentById.mockResolvedValue({
      id: 'doc-gen',
      contactId: '42',
      serviceId: null,
      documentTypeId: DOC_TYPE_ID,
      documentTypeCode: 'LAB_REQUEST',
      title: 'Demande d\u2019examen de laboratoire',
      formData: JSON.stringify({ reason: 'Glycémie à jeun' }),
      status: 'signed',
      signedAt: '2026-01-10T08:00:00.000Z',
      signedBy: '3',
    })
    mockClinicalDocumentService.getDocumentTypeById.mockResolvedValue({
      id: DOC_TYPE_ID,
      code: 'LAB_REQUEST',
      label: 'Demande d\u2019examen de laboratoire',
      formSchema: [{ key: 'reason', type: 'textarea', label: 'Motif' }],
    })
    mockAuthService.getUserById.mockResolvedValue({ nom: 'Camara', prenom: 'Aïssatou', role: 'MEDECIN' })

    const filePath = await service.generateClinicalDocumentPdf('doc-gen')

    expect(filePath).toMatch(/\/tmp\/pdf-imports\/.+\.pdf$/)
    expect(fs.existsSync(filePath)).toBe(true)
    expect(electronState.pdfHtml).toContain('Demande d\u2019examen de laboratoire')
    expect(electronState.pdfHtml).toContain('Glycémie à jeun')
    expect(electronState.pdfHtml).toContain('Mamadou')
    expect(electronState.pdfHtml).toContain('Aïssatou CAMARA')
    expect(electronState.pdfHtml).toContain('10/01/2026')
  })

  it('generateClinicalDocumentPdf throws when the document does not exist', async () => {
    mockClinicalDocumentService.getDocumentById.mockResolvedValue(null)

    await expect(service.generateClinicalDocumentPdf('missing')).rejects.toThrow('Document introuvable')
  })
})
