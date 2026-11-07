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
import * as ExcelJS from 'exceljs'
import { METRIC_KEYS, type MetricKey } from '../../dto/indicateurs.dto'

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
    // labo multi (pull DB) : une ligne par analyse (N lignes), pas de join en une ligne
    expect(html).toContain('NFS')
    expect(html).toContain('Ionogramme')
    expect(html).not.toContain('NFS, Ionogramme')
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

  it('maps examenType + examens[] (laboratoire multi) into IMAGERIE / LABORATOIRE sub-blocks', async () => {
    const html = await service.previewCrhDiabete('doc-1', {
      admission: {},
      ordonnanceSortie: [
        { categorie: 'examen', examenType: 'imagerie', examen: 'Scanner cérébral', motif: 'Céphalées' },
        { categorie: 'examen', examenType: 'laboratoire', examen: 'NFS (compat)', examens: ['NFS', 'Ionogramme'], motif: 'À jeun' },
      ],
    })

    expect(html).toContain('>DEMANDES D\u2019EXAMENS<')
    expect(html).toContain('>Imagerie<')
    expect(html).toContain('>Laboratoire<')
    expect(html).toContain('Scanner cérébral')
    // labo multi : une ligne par analyse (motif sur la 1re seulement), pas de join en une ligne
    expect(html).toContain('<span style="font-weight:bold;">NFS</span> : À jeun')
    expect(html).toContain('<span style="font-weight:bold;">Ionogramme</span>')
    expect(html).not.toContain('NFS, Ionogramme')
    expect(html).not.toContain('Ionogramme</span> : À jeun')
    expect(html).not.toContain('NFS (compat)')
  })

  it('keeps the flat DEMANDES D’EXAMENS rendering for legacy examen items without examenType', async () => {
    const html = await service.previewCrhDiabete('doc-1', {
      admission: {},
      ordonnanceSortie: [
        { categorie: 'examen', examen: 'Scanner cérébral', motif: 'Céphalées' },
      ],
    })

    expect(html).toContain('>DEMANDES D\u2019EXAMENS<')
    expect(html).toContain('Scanner cérébral')
    expect(html).not.toContain('>Imagerie<')
    expect(html).not.toContain('>Laboratoire<')
  })

  it('assembles for soins only the frequency (no dosage, unit nor voie)', async () => {
    const html = await service.previewCrhDiabete('doc-1', {
      admission: {},
      ordonnanceSortie: [
        { categorie: 'soins', medicament: 'Pansement quotidien', dosage: '500', unite: 'mg', voie: 'PO', frequence: ['1/jour'] },
      ],
    })

    expect(html).toContain('Pansement quotidien</span> : 1/jour')
    expect(html).not.toContain('500 - mg - PO')
    expect(html).not.toContain(': 500')
    expect(html).not.toContain('>MÉDICAMENTS<')
  })

  it('maps the 5 new soins fields (nbSeances, objectif, consignes, dispositifs, professionnel) from formData.ordonnanceSortie into the CRH html', async () => {
    const html = await service.previewCrhDiabete('doc-1', {
      admission: {},
      ordonnanceSortie: [
        {
          categorie: 'soins',
          medicament: 'Pansement quotidien',
          frequence: ['1/jour'],
          nbSeances: 3,
          objectifClinique: '<p>Favoriser <strong>la cicatrisation</strong></p>',
          consignesSpecifiques: '<p>À faire à jeun</p>',
          dispositifsMedicaux: 'Compresses stériles, Seringue',
          professionnelCible: 'Infirmier référent',
        },
      ],
    })

    expect(html).toContain('Nb séances :</span> 3')
    expect(html).toContain('Objectif clinique :</span> Favoriser <strong>la cicatrisation</strong>')
    expect(html).toContain('Consignes spécifiques :</span> À faire à jeun')
    expect(html).toContain('Dispositifs &amp; Voies d\u2019abord :</span> Compresses stériles, Seringue')
    expect(html).toContain('Professionnel cible :</span> Infirmier référent')
    // la source formData est prioritaire : aucun appel à la base
    expect(mockPrescriptionService.listByPatient).not.toHaveBeenCalled()
    expect(mockExamRequestService.listByPatient).not.toHaveBeenCalled()
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
        journalEvolution: [],
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
        journalEvolution: [],
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
      evolutionMedicale: { journalEvolution: [], avis: [] },
    })

    expect(mockExamRequestService.listByPatient).toHaveBeenCalled()
    expect(html).toContain('>AVIS SPÉCIALISÉS<')
    expect(html).toContain('<span style="font-weight:bold;">Cardiologie DB</span> : Motif DB')
  })

  it('keeps "Non renseigné" for an empty ordonnanceSortie array even with an empty evolutionMedicale.avis', async () => {
    const html = await service.previewCrhDiabete('doc-1', {
      admission: {},
      ordonnanceSortie: [],
      evolutionMedicale: { journalEvolution: [], avis: [] },
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

  it('propagates prescripteur/plannedDate/plannedHour from formData.ordonnanceSortie into the CRH examens/avis', async () => {
    const html = await service.previewCrhDiabete('doc-1', {
      admission: {},
      ordonnanceSortie: [
        { categorie: 'examen', examenType: 'imagerie', examen: 'Scanner cérébral', motif: 'Céphalées', prescripteur: 'Dr Diallo', plannedDate: '2026-01-10', plannedHour: 8 },
        { categorie: 'avis', specialite: 'Cardiologue', motif: 'Bilan cardiaque', prescripteur: 'Dr Camara', plannedDate: '2026-02-15', plannedHour: 14 },
      ],
    })

    expect(html).toContain('Scanner cérébral')
    expect(html).toContain('Prescrit par Dr Diallo · Planifié le 10/01/2026 (à 08:00)')
    expect(html).toContain('Cardiologue')
    expect(html).toContain('Prescrit par Dr Camara · Planifié le 15/02/2026 (à 14:00)')
    expect(mockPrescriptionService.listByPatient).not.toHaveBeenCalled()
    expect(mockExamRequestService.listByPatient).not.toHaveBeenCalled()
  })

  it('omits the prescripteur/planifié line in the CRH html when absent', async () => {
    const html = await service.previewCrhDiabete('doc-1', {
      admission: {},
      ordonnanceSortie: [
        { categorie: 'examen', examen: 'Scanner cérébral', motif: 'Céphalées' },
        { categorie: 'avis', specialite: 'Cardiologue', motif: 'Bilan cardiaque' },
      ],
    })

    expect(html).toContain('Scanner cérébral')
    expect(html).not.toContain('Prescrit par')
    expect(html).not.toContain('Planifié')
  })

  it('propagates prescripteur_nom/planned_date/planned_hour from the DB exam_requests into the CRH html', async () => {
    mockPrescriptionService.listByPatient.mockResolvedValue([])
    mockExamRequestService.listByPatient.mockResolvedValue([
      { type: 'imagerie', examen_label: 'Scanner cérébral', motif: 'Céphalées', statut: 'en_attente', prescripteur_nom: 'Dr Diallo', planned_date: '2026-01-10', planned_hour: 8 },
      { type: 'avis', specialite: 'Cardio-DB', specialty_name: 'Cardiologie DB', motif: 'Motif DB', statut: 'en_attente', prescripteur_nom: 'Dr Camara', planned_date: '2026-02-15', planned_hour: 14 },
    ])

    const html = await service.previewCrhDiabete('doc-1', {
      admission: {},
    })

    expect(html).toContain('Prescrit par Dr Diallo · Planifié le 10/01/2026 (à 08:00)')
    expect(html).toContain('Prescrit par Dr Camara · Planifié le 15/02/2026 (à 14:00)')
  })

  it('generateClinicalDocumentPdf throws when the document does not exist', async () => {
    mockClinicalDocumentService.getDocumentById.mockResolvedValue(null)

    await expect(service.generateClinicalDocumentPdf('missing')).rejects.toThrow('Document introuvable')
  })
})

// ─── Ordonnance libre par groupe : generateOrdonnancePreview / exportOrdonnancePdf ──

describe('ExportService ordonnance par groupe (generateOrdonnancePreview / exportOrdonnancePdf)', () => {
  let service: ExportService
  let mocks: Record<string, any>

  const PATIENT_ENTITY = {
    id: 7,
    civilite: 'M',
    nom: 'Diallo',
    prenom: 'Mamadou',
    date_naissance: '1980-05-15',
    nip: 'NIP-789',
  }

  const GROUP_ITEMS = [
    { categorie: 'medicament', medicament: 'Metformine 500 mg', dosage: '500', unite: 'mg', voie: 'PO', frequence: ['Matin', 'Soir'] },
    { categorie: 'soins', medicament: 'Pansement quotidien', dosage: '', unite: '', voie: '', frequence: ['1/jour'] },
    { categorie: 'examen', examen: 'Scanner cérébral', motif: 'Céphalées' },
    { categorie: 'avis', specialite: 'Cardiologue', motif: 'Bilan cardiaque' },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    electronState.pdfHtml = ''
    electronState.savePath = ''

    mocks = {
      authService: { getUserById: vi.fn().mockResolvedValue(null) },
      settingsService: {
        getHospitalInfo: vi.fn().mockResolvedValue({ name: 'Hôpital Central', city: 'Conakry', address: '456 Avenue du Sahel', phone: '+224 123' }),
        getSetting: vi.fn().mockImplementation((key: string) =>
          key === 'legal_notice' ? Promise.resolve(undefined) : Promise.resolve('AGR-001'),
        ),
      },
      logoService: { getLogoBase64: vi.fn().mockResolvedValue(null) },
      patientExportService: { enrich: vi.fn().mockResolvedValue(createEnrichedPatient()) },
      patientService: { getById: vi.fn().mockResolvedValue(PATIENT_ENTITY) },
      clinicalDocumentService: {
        getDocumentById: vi.fn().mockResolvedValue(createMockDoc()),
        getPatientIdByDocument: vi.fn().mockResolvedValue(7),
        getDocumentTypeById: vi.fn().mockResolvedValue(null),
      },
      prescriptionService: { listByPatient: vi.fn().mockResolvedValue([]) },
      examRequestService: { listByPatient: vi.fn().mockResolvedValue([]), findTypeNames: vi.fn().mockResolvedValue([]) },
    }
    service = new ExportService(
      mocks.authService as unknown as AuthService,
      mocks.settingsService as unknown as SettingsService,
      mocks.logoService as unknown as LogoService,
      mocks.patientExportService as unknown as PatientExportService,
      mocks.patientService as unknown as PatientService,
      mocks.clinicalDocumentService as unknown as ClinicalDocumentService,
      mocks.prescriptionService as unknown as PrescriptionService,
      mocks.examRequestService as unknown as ExamRequestService,
    )
  })

  afterEach(() => {
    try {
      if (electronState.savePath && fs.existsSync(electronState.savePath)) {
        fs.unlinkSync(electronState.savePath)
      }
    } catch { /* cleanup best-effort */ }
  })

  it('builds the ordonnance from ordonnanceItems (4 blocs) sans toucher à la base', async () => {
    const html = await service.generateOrdonnancePreview({ patientId: 7, ordonnanceItems: GROUP_ITEMS })

    expect(html).toContain('>SOINS<')
    expect(html).toContain('>DEMANDES D\u2019EXAMENS<')
    expect(html).toContain('>AVIS SPÉCIALISÉS<')
    // le template d'ordonnance met le nom du médicament en majuscules
    expect(html).toContain('METFORMINE 500 MG</span> : 500 - mg - PO - Matin, Soir')
    expect(html).toContain('Pansement quotidien</span> : 1/jour')
    expect(html).toContain('Scanner cérébral')
    expect(html).toContain('Cardiologue')
    // la branche ordonnanceItems court-circuite la base
    expect(mocks.prescriptionService.listByPatient).not.toHaveBeenCalled()
    expect(mocks.examRequestService.listByPatient).not.toHaveBeenCalled()
    expect(mocks.authService.getUserById).not.toHaveBeenCalled()
  })

  it('maps the rich soins fields through to the ordonnance HTML', async () => {
    const html = await service.generateOrdonnancePreview({
      patientId: 7,
      ordonnanceItems: [
        {
          categorie: 'soins',
          medicament: 'Rééducation',
          frequence: ['3 séances/semaine'],
          nbSeances: 6,
          objectifClinique: '<p>Récupérer <strong>la mobilité</strong></p>',
          consignesSpecifiques: '<p>À jeun le matin</p>',
          dispositifsMedicaux: 'Attelle, Béquilles',
          professionnelCible: 'Kinésithérapeute',
        },
      ],
    })

    expect(html).toContain('>SOINS<')
    expect(html).toContain('Nb séances :</span> 6')
    expect(html).toContain('Objectif clinique :</span> Récupérer <strong>la mobilité</strong>')
    expect(html).toContain('Consignes spécifiques :</span> À jeun le matin')
    expect(html).toContain('Dispositifs &amp; Voies d\u2019abord :</span> Attelle, Béquilles')
    expect(html).toContain('Professionnel cible :</span> Kinésithérapeute')
  })

  it('propagates examen kind through to the ordonnance libre preview (IMAGERIE / LABORATOIRE)', async () => {
    const html = await service.generateOrdonnancePreview({
      patientId: 7,
      ordonnanceItems: [
        { categorie: 'examen', examenType: 'imagerie', examen: 'Scanner cérébral', motif: 'Sans injection' },
        { categorie: 'examen', examenType: 'laboratoire', examens: ['NFS', 'CRP'], motif: 'À jeun' },
      ],
    })

    expect(html).toContain('>DEMANDES D\u2019EXAMENS<')
    expect(html).toContain('>Imagerie<')
    expect(html).toContain('>Laboratoire<')
    expect(html).toContain('Scanner cérébral')
    // labo multi : une ligne par analyse (motif sur la 1re seulement)
    expect(html).toContain('<span style="font-weight:bold;">NFS</span> : À jeun')
    expect(html).toContain('<span style="font-weight:bold;">CRP</span>')
    expect(html).not.toContain('NFS, CRP')
    expect(html).not.toContain('CRP</span> : À jeun')
  })

  it('defaults items without categorie to the MÉDICAMENTS block in the item-only branch', async () => {
    const html = await service.generateOrdonnancePreview({
      patientId: 7,
      ordonnanceItems: [
        { medicament: 'Sans catégorie', dosage: '10', unite: 'mg', voie: 'PO', frequence: ['Matin'] },
      ],
    })

    expect(html).toContain('SANS CATÉGORIE</span> : 10 - mg - PO - Matin')
    expect(html).not.toContain('>SOINS<')
    expect(html).not.toContain('>DEMANDES D\u2019EXAMENS<')
    expect(html).not.toContain('>AVIS SPÉCIALISÉS<')
  })

  it('renders a single soins group without MÉDICAMENTS ni examens/avis blocs', async () => {
    const html = await service.generateOrdonnancePreview({
      patientId: 7,
      ordonnanceItems: [
        { categorie: 'soins', medicament: 'Pansement quotidien', frequence: ['1/jour'] },
      ],
    })

    expect(html).toContain('>SOINS<')
    expect(html).toContain('Pansement quotidien</span> : 1/jour')
    expect(html).not.toContain('>DEMANDES D\u2019EXAMENS<')
    expect(html).not.toContain('>AVIS SPÉCIALISÉS<')
    // comportement du template : quand il n'y a aucun médicament, le message
    // "Aucun médicament prescrit" reste affiché en plus du bloc SOINS
    expect(html).toContain('Aucun m\u00e9dicament prescrit')
  })

  it('falls back to the DB path when ordonnanceItems is an empty array', async () => {
    mocks.prescriptionService.listByPatient.mockResolvedValue([
      { type: 'medicament', prescription_type: 'medicament', medicament: 'DB-METFORMINE', dosage: '500 mg', voie: 'PO', frequence: 'Matin,Soir', statut: 'active', prescripteur_id: 42 },
    ])

    const html = await service.generateOrdonnancePreview({ patientId: 7, ordonnanceItems: [] })

    expect(mocks.prescriptionService.listByPatient).toHaveBeenCalledWith(7)
    expect(mocks.authService.getUserById).toHaveBeenCalledWith(42)
    expect(html).toContain('DB-METFORMINE')
  })

  it('falls back to the DB path when ordonnanceItems is undefined', async () => {
    mocks.prescriptionService.listByPatient.mockResolvedValue([])

    await service.generateOrdonnancePreview({ patientId: 7 })

    expect(mocks.prescriptionService.listByPatient).toHaveBeenCalledWith(7)
  })

  it('rejects when the patient does not exist', async () => {
    mocks.patientService.getById.mockResolvedValue(null)

    await expect(service.generateOrdonnancePreview({ patientId: 999, ordonnanceItems: GROUP_ITEMS }))
      .rejects.toThrow('Patient introuvable')
  })

  it('exportOrdonnancePdf prints the ordonnance html des items de groupe dans le PDF', async () => {
    electronState.savePath = path.join(os.tmpdir(), 'cde-ordo-groupe-test.pdf')

    const filePath = await service.exportOrdonnancePdf({ patientId: 7, ordonnanceItems: GROUP_ITEMS })

    expect(filePath).toBe(electronState.savePath)
    expect(electronState.pdfHtml).toContain('>SOINS<')
    expect(electronState.pdfHtml).toContain('>DEMANDES D\u2019EXAMENS<')
    expect(electronState.pdfHtml).toContain('METFORMINE 500 MG')
    expect(fs.existsSync(filePath)).toBe(true)
  })

  it('propagates prescripteur/plannedDate/plannedHour from ordonnanceItems to the ordonnance libre html', async () => {
    const html = await service.generateOrdonnancePreview({
      patientId: 7,
      ordonnanceItems: [
        { categorie: 'examen', examenType: 'imagerie', examen: 'Scanner cérébral', motif: 'Céphalées', prescripteur: 'Dr Diallo', plannedDate: '2026-01-10', plannedHour: 8 },
        { categorie: 'avis', specialite: 'Cardiologue', motif: 'Bilan', prescripteur: 'Dr Camara', plannedDate: '2026-02-15', plannedHour: 14 },
      ],
    })

    expect(html).toContain('Prescrit par Dr Diallo · Planifié le 10/01/2026 (à 08:00)')
    expect(html).toContain('Prescrit par Dr Camara · Planifié le 15/02/2026 (à 14:00)')
    // sous-blocs et titres intacts
    expect(html).toContain('>Imagerie<')
    expect(html).toContain('>AVIS SPÉCIALISÉS<')
  })

  it('omits the prescripteur/planifié line in the ordonnance libre html when absent', async () => {
    const html = await service.generateOrdonnancePreview({
      patientId: 7,
      ordonnanceItems: [
        { categorie: 'examen', examen: 'Scanner cérébral', motif: 'Céphalées' },
        { categorie: 'avis', specialite: 'Cardiologue', motif: 'Bilan' },
      ],
    })

    expect(html).toContain('Scanner cérébral')
    expect(html).toContain('Cardiologue')
    expect(html).not.toContain('Prescrit par')
    expect(html).not.toContain('Planifié')
  })
})

describe('ExportService — exportIndicateursExcel (cumuls nullables)', () => {
  let service: ExportService
  let filePath: string
  let indicateursService: {
    getExportRows: ReturnType<typeof vi.fn>
    getMonthlyStats: ReturnType<typeof vi.fn>
  }

  const emptyMetrics = (): Record<MetricKey, null> =>
    Object.fromEntries(METRIC_KEYS.map((key) => [key, null])) as Record<MetricKey, null>

  beforeEach(() => {
    vi.clearAllMocks()
    electronState.savePath = ''
    filePath = path.join(os.tmpdir(), `indicateurs-${Date.now()}-${Math.random().toString(36).slice(2)}.xlsx`)
    electronState.savePath = filePath

    const rows = [
      // Aucune valeur en 2024.
      { annee: 2024, ...emptyMetrics() },
      // Deux métriques renseignées en 2025 ; `moyenne_activites` existe pour
      // vérifier que le total NE SOMME PAS les moyennes.
      {
        annee: 2025,
        ...emptyMetrics(),
        suivi_diabete_endocrino: 34,
        soins_ambulatoires: 12,
        moyenne_activites: 7,
      },
    ]
    const monthly = {
      annee: 2025,
      lignes: [
        {
          metric: 'soins_ambulatoires' as const,
          mois: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
          total: 78,
        },
      ],
      totaux_mois: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      total: 78,
    }
    indicateursService = {
      getExportRows: vi.fn().mockResolvedValue(rows),
      getMonthlyStats: vi.fn().mockResolvedValue(monthly),
    }
    const settings = { getHospitalInfo: vi.fn().mockResolvedValue({ name: 'Clinique Test' }) }

    service = new ExportService(
      {} as unknown as AuthService,
      settings as unknown as SettingsService,
      {} as unknown as LogoService,
      {} as unknown as PatientExportService,
      {} as unknown as PatientService,
      {} as unknown as ClinicalDocumentService,
      {} as unknown as PrescriptionService,
      {} as unknown as ExamRequestService,
      {} as unknown as import('../invoice.service').InvoiceService,
      undefined,
      indicateursService as unknown as import('../indicateurs.service').IndicateursService,
    )
  })

  afterEach(() => {
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
    } catch { /* cleanup best-effort */ }
  })

  it('affiche « — » pour une métrique sans valeur et laisse la colonne moyenne blanche', async () => {
    const savedPath = await service.exportIndicateursExcel({ fromYear: 2024, toYear: 2025 })
    expect(savedPath).toBe(filePath)

    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.readFile(filePath)
    const sheet = workbook.getWorksheet('Indicateurs annuels')!
    const totalRow = sheet.getRow(14) // en-tête 11, deux années 12-13, total 14

    expect(totalRow.getCell(1).value).toBe('Total')
    // Suivi et soins : cumul numérique des années renseignées.
    expect(totalRow.getCell(2).value).toBe(34)
    expect(totalRow.getCell(3).value).toBe(12)
    // Métriques sans aucune valeur : « — », jamais 0.
    expect(totalRow.getCell(4).value).toBe('—') // nouveaux_cas_diabete
    expect(totalRow.getCell(13).value).toBe('—') // total_activites
    // Moyenne : jamais une somme de moyennes (7 + 0), cellule blanche.
    expect(totalRow.getCell(14).value ?? '').toBe('')

    // Période multi-années : aucune feuille mensuelle demandée.
    expect(indicateursService.getMonthlyStats).not.toHaveBeenCalled()
  })

  it('ajoute une feuille mensuelle pour une année seule', async () => {
    const savedPath = await service.exportIndicateursExcel({ fromYear: 2025, toYear: 2025 })
    expect(savedPath).toBe(filePath)

    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.readFile(filePath)

    expect(indicateursService.getMonthlyStats).toHaveBeenCalledWith({ annee: 2025 })
    const sheet = workbook.getWorksheet('Mensuel 2025')!
    expect(sheet).toBeDefined()
    expect(sheet.getRow(11).getCell(1).value).toBe('Mois')
    expect(sheet.getRow(12).getCell(1).value).toBe('Janvier')
    expect(sheet.getRow(12).getCell(2).value).toBe(1)
    expect(sheet.getRow(23).getCell(1).value).toBe('Décembre')
    expect(sheet.getRow(24).getCell(1).value).toBe('Total')
    expect(sheet.getRow(24).getCell(2).value).toBe(78)
    expect(sheet.getRow(24).getCell(12).value).toBe(78)
  })
})

describe('ExportService — fiche de paie', () => {
  const salaireMock = { getPayslip: vi.fn() }
  let payslipService: ExportService
  let payslipPath: string

  beforeEach(() => {
    vi.clearAllMocks()
    payslipPath = path.join(os.tmpdir(), `payslip-${Date.now()}-${Math.random().toString(36).slice(2)}.pdf`)
    electronState.savePath = payslipPath

    payslipService = new ExportService(
      {} as unknown as AuthService,
      { getHospitalInfo: vi.fn().mockResolvedValue({ name: 'Clinique Test' }) } as unknown as SettingsService,
      { getLogoBase64: vi.fn().mockResolvedValue(null) } as unknown as LogoService,
      {} as unknown as PatientExportService,
      {} as unknown as PatientService,
      {} as unknown as ClinicalDocumentService,
      {} as unknown as PrescriptionService,
      {} as unknown as ExamRequestService,
      {} as unknown as import('../invoice.service').InvoiceService,
      undefined,
      undefined,
      salaireMock as unknown as import('../salaire.service').SalaireService,
    )
  })

  afterEach(() => {
    try {
      if (fs.existsSync(payslipPath)) fs.unlinkSync(payslipPath)
    } catch { /* cleanup best-effort */ }
  })

  it('imprime l’identité, les rubriques informatives et le net à payer', async () => {
    salaireMock.getPayslip.mockResolvedValue({
      employee: {
        userId: 7,
        nom: 'Diallo',
        prenom: 'Aminata',
        role: 'MEDECIN',
        fonction: 'Endocrinologue',
        service: 'Cardiologie',
        telephone: '+224 600 00 00 00',
        typeContrat: 'CDI',
        tempsTravail: 'PLEIN',
        dateDebutContrat: '2024-01-15',
      },
      periode: '2026-10',
      base: 5_000_000,
      joursTravailles: 22,
      rubriques: [
        {
          libelle: 'Prime de transport',
          type: 'journalier',
          montant: 0,
          montantJour: 10_000,
          jours: 24,
          impactNet: false,
          montantCalcule: 240_000,
        },
      ],
      totalMensuel: 5_240_000,
      totalInformations: 240_000,
      netAPayer: 5_000_000,
      paiement: null,
    })

    const saved = await payslipService.exportPayslipPdf({ userId: 7, periode: '2026-10' })

    expect(saved).toBe(payslipPath)
    expect(salaireMock.getPayslip).toHaveBeenCalledWith(7, '2026-10')
    expect(electronState.pdfHtml).toContain('FICHE DE PAIE')
    expect(electronState.pdfHtml).toContain('Aminata Diallo')
    expect(electronState.pdfHtml).toContain('Endocrinologue')
    // En-tête employé : grille de 6 colonnes égales (pas de retour à la ligne orphelin).
    expect(electronState.pdfHtml).toContain('.employee{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));align-items:center;gap:0}')
    expect(electronState.pdfHtml).toContain('.employee div{min-width:0;padding:0 14px;')
    expect(electronState.pdfHtml).toContain('.employee div:last-child{border-right:none;padding-right:0}')
    expect(electronState.pdfHtml).toContain('.employee span{display:block;')
    expect(electronState.pdfHtml).not.toContain('.employee{display:flex;flex-wrap:wrap')
    expect(electronState.pdfHtml).not.toContain('Service :')
    expect(electronState.pdfHtml).toContain('Sécurité sociale :')
    expect(electronState.pdfHtml).toContain('Temps travaillé :</span> Temps plein')
    expect(electronState.pdfHtml).toContain('Octobre 2026 (2026-10)')
    expect(electronState.pdfHtml).not.toContain('Début de contrat')
    expect(electronState.pdfHtml).not.toContain('15 janvier 2024')

    // L'en-tête employé contient exactement 6 champs (dont la Période), répartis sur une seule ligne.
    const employeeRow = electronState.pdfHtml.match(/<div class="box employee">([\s\S]*?)<\/div>\s*<table/)?.[1] ?? ''
    const employeeLabels = [...employeeRow.matchAll(/<span>([^<]+)<\/span>/g)].map((match) => match[1])
    expect(employeeLabels).toEqual([
      'Employé :',
      'Fonction :',
      'Sécurité sociale :',
      'Contrat :',
      'Temps travaillé :',
      'Période :',
    ])
    expect(electronState.pdfHtml).toContain('Prime de transport')
    expect(electronState.pdfHtml).toContain('(informatif)')
    expect(electronState.pdfHtml).toContain('NET À PAYER')
    expect(electronState.pdfHtml).toContain('non réglé à ce jour')
  })

  it('imprime le temps partiel, le NSS et le paiement en toutes lettres', async () => {
    salaireMock.getPayslip.mockResolvedValue({
      employee: {
        userId: 8,
        nom: 'Camara',
        prenom: 'Ibrahima',
        role: 'SECRETAIRE',
        fonction: 'Accueil',
        typeContrat: 'CDD',
        tempsTravail: 'PARTIEL',
        numeroSecuriteSociale: 'NSS-2026-0042',
        dateDebutContrat: '2026-10-24',
      },
      periode: '2026-10',
      base: 2_000_000,
      joursTravailles: 11,
      rubriques: [],
      totalMensuel: 2_000_000,
      totalInformations: 0,
      netAPayer: 2_000_000,
      paiement: {
        modePaiement: 'mobile_money',
        datePaiement: '2026-10-31',
        reference: 'PAY-001',
      },
    })

    await payslipService.exportPayslipPdf({ userId: 8, periode: '2026-10' })

    expect(electronState.pdfHtml).toContain('Temps travaillé :</span> Temps partiel')
    expect(electronState.pdfHtml).toContain('Sécurité sociale :</span> NSS-2026-0042')
    expect(electronState.pdfHtml).not.toContain('Début de contrat')
    expect(electronState.pdfHtml).toContain('Mobile Money — Payé le 31 octobre 2026 (31/10/2026)')
  })
})

describe('Reçus de service (laboratoire / pharmacie)', () => {
  function build(mocks: {
    laboratoire?: unknown
    dispensation?: unknown
  }): ExportService {
    const settings = {
      getHospitalInfo: vi.fn().mockResolvedValue({
        name: 'Clinique Diabète & Endocrinologie',
        address: 'Commune de Ratoma',
        city: 'Conakry',
        phone: '+224 620 00 00 00',
      }),
    }
    const logo = { getLogoBase64: vi.fn().mockResolvedValue(null) }
    return new ExportService(
      { getUserById: vi.fn() } as unknown as AuthService,
      settings as unknown as SettingsService,
      logo as unknown as LogoService,
      { enrich: vi.fn() } as unknown as PatientExportService,
      {} as unknown as PatientService,
      {} as unknown as ClinicalDocumentService,
      {} as unknown as PrescriptionService,
      {} as unknown as ExamRequestService,
      {} as unknown as never,
      undefined,
      undefined,
      undefined,
      undefined,
      mocks.laboratoire as never,
      mocks.dispensation as never,
    )
  }

  const recuLaboratoire = {
    ref: 'LB-20260101-0001',
    date: '2026-01-01',
    service: 'laboratoire' as const,
    origine: 'Interne' as const,
    patientNom: 'Keita',
    patientPrenom: 'Mamadou',
    patientNip: 'NIP-001',
    patientTelephone: '+224620000010',
    prescripteur: 'Dr Bah',
    statut: 'Réalisé',
    statutPaiement: 'partiel' as const,
    lignes: [
      { label: 'Hémogramme complet', quantite: 1, prixUnitaire: 10_000, montant: 10_000 },
      { label: 'Glycémie à jeun', quantite: 1, prixUnitaire: 5_000, montant: 5_000 },
    ],
    paiements: [
      { date: '2026-01-01', montant: 5_000, mode: 'espece', reference: 'REC-1', numeroRecu: null },
    ],
    montantTotal: 15_000,
    montantPaye: 5_000,
    reste: 10_000,
    caissier: 'Fatou DIALLO',
  }

  it('rend le reçu laboratoire avec prestations, totaux et statut', async () => {
    const laboratoire = { getRecu: vi.fn().mockResolvedValue(recuLaboratoire) }
    const html = await build({ laboratoire }).previewLaboRecuHtml(12)

    expect(laboratoire.getRecu).toHaveBeenCalledWith(12)
    expect(html).toContain('REÇU DE SERVICE')
    expect(html).toContain('LB-20260101-0001')
    expect(html).toContain('Hémogramme complet')
    expect(html).toContain('Glycémie à jeun')
    expect(html).toContain('Partiellement payé')
    expect(html).toContain('Fatou DIALLO')
    expect(html).toMatch(/15[\s\u00a0\u202f]000 GNF/)
    expect(html).toMatch(/10[\s\u00a0\u202f]000 GNF/)
  })

  it('rend le reçu pharmacie avec les lignes servies et le statut exonéré', async () => {
    const dispensation = {
      getRecuVente: vi.fn().mockResolvedValue({
        ...recuLaboratoire,
        ref: 'PH-20260101-0007',
        service: 'pharmacie' as const,
        origine: undefined,
        statutPaiement: 'exonere' as const,
        prescripteur: null,
        paiements: [],
        montantTotal: 0,
        montantPaye: 0,
        reste: 0,
      }),
    }
    const html = await build({ dispensation }).previewPharmacieRecuHtml(7)

    expect(dispensation.getRecuVente).toHaveBeenCalledWith(7)
    expect(html).toContain('PH-20260101-0007')
    expect(html).toContain('Exonéré')
    expect(html).not.toContain('Origine :')
  })
})

describe('Reçu de service — prise en charge dossier patient', () => {
  it('affiche « Facturé au dossier patient » au lieu d’un reste dû', async () => {
    const laboratoire = {
      getRecu: vi.fn().mockResolvedValue({
        ref: 'LB-20260101-0002',
        date: '2026-01-01',
        service: 'laboratoire',
        origine: 'Interne',
        patientNom: 'Diallo',
        patientPrenom: 'Amadou',
        statut: 'En attente',
        statutPaiement: 'non_paye',
        factureAuDossier: true,
        lignes: [{ label: 'Glycémie à jeun', quantite: 1, prixUnitaire: 15_000, montant: 15_000 }],
        paiements: [],
        montantTotal: 15_000,
        montantPaye: 0,
        reste: 0,
        caissier: null,
      }),
    }
    const svc = new ExportService(
      { getUserById: vi.fn() } as unknown as AuthService,
      {
        getHospitalInfo: vi.fn().mockResolvedValue({ name: 'CDE', city: 'Conakry' }),
      } as unknown as SettingsService,
      { getLogoBase64: vi.fn().mockResolvedValue(null) } as unknown as LogoService,
      { enrich: vi.fn() } as unknown as PatientExportService,
      {} as unknown as PatientService,
      {} as unknown as ClinicalDocumentService,
      {} as unknown as PrescriptionService,
      {} as unknown as ExamRequestService,
      {} as unknown as never,
      undefined, undefined, undefined, undefined,
      laboratoire as never,
    )

    const html = await svc.previewLaboRecuHtml(2)
    expect(html).toContain('Facturé au dossier patient')
    expect(html).not.toContain('Reste dû')
  })
})
