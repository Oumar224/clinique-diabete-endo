import { inject, singleton } from 'tsyringe'
import { BrowserWindow, dialog, app } from 'electron'
import * as path from 'path'
import * as fs from 'fs'
import type { Worksheet } from 'exceljs'
import * as ExcelJS from 'exceljs'
import { AuthService } from './auth.service'
import { SettingsService } from './settings.service'
import { LogoService } from './logo.service'
import { PatientExportService } from './patient-export.service'
import { PatientService } from './patient.service'
import { ClinicalDocumentService } from './clinical-document.service'
import { PrescriptionService } from './prescription.service'
import { PatientEntity } from '../entities/patient.entity'
import type { PatientDto } from '../dto/patient.dto'
import { generateUserListHtml, generateUserProfileHtml, generatePatientProfileHtml, generateCrhDiabeteHtml, generateOrdonnanceHtml } from '../export-templates'
import type { CrhDiabeteOptions } from '../export-templates'
import { generateCode128Svg } from '../utils/barcode'
import * as QRCode from 'qrcode'
import { roleLabel } from '../utils/role-labels'
import {
  COLORS,
  FONT,
  THIN_GREY_BORDER,
  HEADER_FILL,
  ZEBRA_FILL,
  LABEL_FILL,
  SECTION_FILL,
  SECTION_TOP_BORDER,
  HAIRLINE_BOTTOM_BORDER,
  PAGE_SETUP_LANDSCAPE,
  PAGE_SETUP_PORTRAIT,
} from '../excel/styles'
import {
  buildRepublicHeader,
  buildDeviseLine,
  buildSeparatorLine,
  buildInstitutionLine,
  buildContactLine,
  buildTitleAndDate,
  buildProfileTitle,
} from '../excel/header-builder'

const COLUMN_COUNT = 11

const CRC_DIABETE_OPTIONS: CrhDiabeteOptions = {
  docTitle: 'COMPTE RENDU DE CONSULTATION — DIABÈTE',
  docRefPrefix: 'CDE-CRC',
  typeLabel: 'CRC',
}

// CRH/CRC @page margins declared in export-templates.ts (mm): top 18mm, bottom 22mm, left/right 15mm.
// printToPDF margins are in inches and override the CSS @page margins, so use inch equivalents to
// match the on-screen preview and keep room for the @bottom-* footer margin boxes (0.87in ≈ 22mm).
const CRH_MARGINS = { top: 0.71, bottom: 0.87, left: 0.59, right: 0.59 }

interface ColumnDef {
  header: string
  key: string
  width: number
}

@singleton()
export class ExportService {
  constructor(
    @inject(AuthService) private authService: AuthService,
    @inject(SettingsService) private settingsService: SettingsService,
    @inject(LogoService) private logoService: LogoService,
    @inject(PatientExportService) private patientExportService: PatientExportService,
    @inject(PatientService) private patientService: PatientService,
    @inject(ClinicalDocumentService) private clinicalDocumentService: ClinicalDocumentService,
    @inject(PrescriptionService) private prescriptionService: PrescriptionService,
  ) {}

  async exportUsersListPdf(_filters?: any): Promise<string> {
    const [users, hospital, logo] = await Promise.all([
      this.authService.listUsers(),
      this.settingsService.getHospitalInfo(),
      this.logoService.getLogoBase64(),
    ])
    const html = generateUserListHtml(users, hospital, logo)
    const buffer = await this.generatePdf(html)

    return this.saveFile(buffer, 'liste-utilisateurs.pdf', [
      { name: 'PDF', extensions: ['pdf'] },
    ])
  }

  async exportUserProfilePdf(userId: number): Promise<string> {
    const [user, relations, hospital, logo] = await Promise.all([
      this.authService.getUserById(userId),
      this.authService.enrichUserWithRelations(userId),
      this.settingsService.getHospitalInfo(),
      this.logoService.getLogoBase64(),
    ])
    if (!user) throw new Error('Utilisateur introuvable')

    const merged = { ...user, ...relations }
    const html = generateUserProfileHtml(merged, hospital, logo)
    const buffer = await this.generatePdf(html)

    const safeName = `utilisateur-${user.nom || 'inconnu'}-${user.prenom || ''}.pdf`.replace(/[^a-zA-Z0-9\-_.]/g, '_')
    return this.saveFile(buffer, safeName, [
      { name: 'PDF', extensions: ['pdf'] },
    ])
  }

  async exportUsersListExcel(_filters?: any): Promise<string> {
    const [users, hospital] = await Promise.all([
      this.authService.listUsers(),
      this.settingsService.getHospitalInfo(),
    ])

    const workbook = this.createWorkbook('Utilisateurs')
    const sheet = workbook.getWorksheet('Utilisateurs')!

    const columnDefs = this.buildColumnDefs()
    sheet.columns = columnDefs

    this.buildListHeader(sheet, hospital)
    this.buildHeaderRow(sheet, columnDefs)
    this.buildDataRows(sheet, users)
    this.buildSummaryRow(sheet, users)
    this.configureListSheet(sheet, users)

    return this.writeAndSave(workbook, 'liste-utilisateurs.xlsx')
  }

  async exportUserProfileExcel(userId: number): Promise<string> {
    const [user, relations] = await Promise.all([
      this.authService.getUserById(userId),
      this.authService.enrichUserWithRelations(userId),
    ])
    if (!user) throw new Error('Utilisateur introuvable')

    const merged = { ...user, ...relations }
    const hospital = await this.settingsService.getHospitalInfo()

    const profileColumnCount = 2
    const workbook = this.createWorkbook('Fiche utilisateur')
    const sheet = workbook.getWorksheet('Fiche utilisateur')!
    sheet.columns = [
      { header: 'Champ', key: 'label', width: 28 },
      { header: 'Valeur', key: 'value', width: 55 },
    ]

    this.buildProfileHeader(sheet, hospital, profileColumnCount)
    this.writeProfileSections(sheet, merged)

    sheet.pageSetup = PAGE_SETUP_PORTRAIT

    const buffer = (await workbook.xlsx.writeBuffer()) as unknown as Buffer
    const safeName = `utilisateur-${user.nom || 'inconnu'}.xlsx`.replace(/[^a-zA-Z0-9\-_.]/g, '_')
    return this.saveFile(buffer, safeName, [
      { name: 'Excel', extensions: ['xlsx'] },
    ])
  }

  private createWorkbook(sheetName: string): ExcelJS.Workbook {
    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'CDE'
    workbook.created = new Date()
    workbook.addWorksheet(sheetName)
    return workbook
  }

  private buildColumnDefs(): ColumnDef[] {
    return [
      { header: 'Noms', key: 'nom', width: 30 },
      { header: 'Rôle', key: 'role', width: 18 },
      { header: 'Fonction', key: 'fonction', width: 22 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Téléphone', key: 'telephone', width: 18 },
      { header: 'Service', key: 'service', width: 22 },
      { header: 'Spécialités', key: 'specialites', width: 28 },
      { header: 'Sites', key: 'sites', width: 22 },
      { header: 'Type contrat', key: 'type_contrat', width: 18 },
      { header: 'Statut contrat', key: 'statut_contrat', width: 18 },
      { header: 'Pays', key: 'pays', width: 18 },
    ]
  }

  private buildListHeader(sheet: Worksheet, hospital: any): void {
    buildRepublicHeader(sheet, COLUMN_COUNT)
    buildDeviseLine(sheet, COLUMN_COUNT)
    buildSeparatorLine(sheet, COLUMN_COUNT, 3)
    buildInstitutionLine(sheet, COLUMN_COUNT, 4, hospital)
    buildContactLine(sheet, COLUMN_COUNT, 5, hospital)
    buildSeparatorLine(sheet, COLUMN_COUNT, 6)
    buildTitleAndDate(sheet, COLUMN_COUNT, 8, 'Liste des utilisateurs — Tous les détails', 9)
  }

  private buildProfileHeader(sheet: Worksheet, hospital: any, columnCount: number): void {
    buildRepublicHeader(sheet, columnCount)
    buildDeviseLine(sheet, columnCount)
    buildSeparatorLine(sheet, columnCount, 3)

    const cell3 = sheet.getCell('A3')
    cell3.value = hospital.name || 'Établissement de Santé'
    cell3.font = { bold: true, size: FONT.INSTITUTION_SIZE, color: { argb: COLORS.DARK_BLUE }, name: FONT.FAMILY }

    buildContactLine(sheet, columnCount, 4, { ...hospital, address: undefined })
    buildSeparatorLine(sheet, columnCount, 5)
    buildProfileTitle(sheet, columnCount, 6, 'Fiche individuelle — Personnel')
  }

  private buildHeaderRow(sheet: Worksheet, columnDefs: ColumnDef[]): void {
    const headerRowNumber = 11
    const headerRow = sheet.getRow(headerRowNumber)
    columnDefs.forEach((col, idx) => {
      const cell = headerRow.getCell(idx + 1)
      cell.value = col.header
      cell.font = { bold: true, color: { argb: COLORS.WHITE }, size: FONT.HEADER_ROW_SIZE, name: FONT.FAMILY }
      cell.fill = HEADER_FILL
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
      cell.border = THIN_GREY_BORDER
    })
    headerRow.height = 22
  }

  private buildDataRows(sheet: Worksheet, users: any[]): void {
    users.forEach((u: any, i: number) => {
      const fonctionName = typeof u.fonction === 'object' && u.fonction?.name ? u.fonction.name : (u.fonction || '')
      const specialties = (u.specialties || []).map((s: any) => s.name).join(', ')
      const sites = (u.sites || []).map((s: any) => s.name).join(', ')
      const row = sheet.addRow([
        `${u.nom || ''} ${u.prenom || ''}`,
        roleLabel(u.role),
        fonctionName,
        u.email || '',
        u.telephone || '',
        u.service || '',
        specialties,
        sites,
        u.type_contrat || '',
        u.statut_contrat || '',
        u.pays || '',
      ])
      row.eachCell((cell) => {
        cell.border = THIN_GREY_BORDER
        cell.font = { size: FONT.DATA_SIZE, name: FONT.FAMILY }
        cell.alignment = { vertical: 'top', wrapText: true }
      })
      if (i % 2 === 1) {
        row.eachCell((cell) => {
          cell.fill = ZEBRA_FILL
        })
      }
    })
  }

  private buildSummaryRow(sheet: Worksheet, users: any[]): void {
    const headerRowNumber = 11
    const summaryRowNumber = headerRowNumber + users.length + 1
    const summaryRow = sheet.getRow(summaryRowNumber)
    const summaryCell = summaryRow.getCell(1)
    summaryCell.value = `Total : ${users.length} utilisateur${users.length > 1 ? 's' : ''}`
    summaryCell.font = { bold: true, size: FONT.HEADER_ROW_SIZE, color: { argb: COLORS.DARK_BLUE }, name: FONT.FAMILY }
    sheet.mergeCells(`A${summaryRowNumber}:K${summaryRowNumber}`)
  }

  private configureListSheet(sheet: Worksheet, users: any[]): void {
    const headerRowNumber = 11

    if (users.length > 0) {
      sheet.autoFilter = {
        from: { row: headerRowNumber, column: 1 },
        to: { row: headerRowNumber + users.length, column: COLUMN_COUNT },
      }
    }

    sheet.views = [
      { state: 'frozen', ySplit: headerRowNumber, xSplit: 0, activeCell: 'A12' },
    ]

    sheet.pageSetup = {
      ...PAGE_SETUP_LANDSCAPE,
      printTitlesRow: `${headerRowNumber}:${headerRowNumber}`,
    }
  }

  private writeProfileSections(sheet: Worksheet, merged: any): void {
    const m = merged as any
    const fonctionName = m.fonction?.name || m.fonction || ''
    let rowNum = 6

    const writeField = (label: string, value: string, withBorder = true) => {
      rowNum++
      const row = sheet.getRow(rowNum)
      row.getCell(1).value = label
      row.getCell(1).font = { bold: true, size: FONT.LABEL_SIZE, name: FONT.FAMILY, color: { argb: COLORS.BODY_TEXT } }
      row.getCell(1).fill = LABEL_FILL
      row.getCell(2).value = value || '—'
      row.getCell(2).font = { size: FONT.VALUE_SIZE, name: FONT.FAMILY }
      if (withBorder) {
        row.getCell(1).border = THIN_GREY_BORDER
        row.getCell(2).border = THIN_GREY_BORDER
      }
    }

    const writeSection = (title: string) => {
      rowNum++
      sheet.mergeCells(`A${rowNum}:B${rowNum}`)
      const cell = sheet.getCell(`A${rowNum}`)
      cell.value = title
      cell.font = { bold: true, size: FONT.LABEL_SIZE, color: { argb: COLORS.DARK_BLUE }, name: FONT.FAMILY }
      cell.fill = SECTION_FILL
      cell.border = SECTION_TOP_BORDER
      rowNum++
      sheet.mergeCells(`A${rowNum}:B${rowNum}`)
      sheet.getCell(`A${rowNum}`).border = HAIRLINE_BOTTOM_BORDER
    }

    writeSection('IDENTITÉ')
    writeField('Nom complet', `${m.nom || ''} ${m.prenom || ''}`)
    writeField('Rôle', roleLabel(m.role))

    writeSection('COORDONNÉES')
    writeField('Email', m.email || '')
    writeField('Téléphone', m.telephone || '')
    writeField('Ville / Pays', [m.ville || '', m.pays || ''].filter(Boolean).join(', '))

    writeSection('PROFESSION')
    writeField('Fonction', fonctionName)
    writeField('Service', m.service || '')
    if (m.specialties?.length) {
      writeField('Spécialités', m.specialties.map((s: { name: string }) => s.name).join(', '))
    }
    if (m.services?.length) {
      writeField('Services', m.services.map((s: { name: string }) => s.name).join(', '))
    }
    if (m.sites?.length) {
      writeField('Sites', m.sites.map((s: { name: string }) => s.name).join(', '))
    }
    if (m.medical_units?.length) {
      writeField('Unités médicales', m.medical_units.map((u: { name: string }) => u.name).join(', '))
    }

    writeSection('CONTRAT')
    writeField('Type', m.type_contrat || '')
    writeField('Date de début', m.date_debut_contrat || '')
    writeField('Date de fin', m.date_fin_contrat || '')
    writeField('Statut', m.statut_contrat || '')
    if (m.motif_resiliation) {
      writeField('Motif de résiliation', m.motif_resiliation)
    }

    writeSection('COMPTE')
    writeField('Statut du compte', m.is_validated ? 'Validé ✓' : 'En attente')
    writeField('Actif', m.is_active ? 'Oui' : 'Non')
  }

  async exportPatientProfilePdf(patientId: number): Promise<string> {
    const { patient, trustedPerson, hospital, logo } = await this.patientExportService.enrich(patientId)
    const html = generatePatientProfileHtml(patient, trustedPerson, hospital, logo)
    const buffer = await this.generatePdf(html)
    const safeName = `patient-${patient.nom || 'inconnu'}-${patient.prenom || ''}.pdf`.replace(/[^a-zA-Z0-9\-_.]/g, '_')
    return this.saveFile(buffer, safeName, [
      { name: 'PDF', extensions: ['pdf'] },
    ])
  }

  async exportCrhDiabetePdf(documentId?: string | null, formData?: Record<string, any>, patientId?: number | null, contactId?: string | number | null): Promise<string> {
    const { html, patient } = await this.buildCrhDiabeteHtml(documentId, undefined, formData, patientId, contactId)
    const buffer = await this.generatePdf(html, CRH_MARGINS)
    const safeName = `crh-${patient.nom || 'inconnu'}-${patient.prenom || ''}.pdf`.replace(/[^a-zA-Z0-9\-_.]/g, '_')
    return this.saveFile(buffer, safeName, [
      { name: 'PDF', extensions: ['pdf'] },
    ])
  }

  async exportCrcDiabetePdf(documentId?: string | null, formData?: Record<string, any>, patientId?: number | null, contactId?: string | number | null): Promise<string> {
    const { html, patient } = await this.buildCrhDiabeteHtml(documentId, CRC_DIABETE_OPTIONS, formData, patientId, contactId)
    const buffer = await this.generatePdf(html, CRH_MARGINS)
    const safeName = `crc-${patient.nom || 'inconnu'}-${patient.prenom || ''}.pdf`.replace(/[^a-zA-Z0-9\-_.]/g, '_')
    return this.saveFile(buffer, safeName, [
      { name: 'PDF', extensions: ['pdf'] },
    ])
  }

  async previewCrhDiabete(documentId?: string | null, formData?: Record<string, any>, patientId?: number | null, contactId?: string | number | null): Promise<string> {
    const { html } = await this.buildCrhDiabeteHtml(documentId, undefined, formData, patientId, contactId)
    return html
  }

  async previewCrcDiabete(documentId?: string | null, formData?: Record<string, any>, patientId?: number | null, contactId?: string | number | null): Promise<string> {
    const { html } = await this.buildCrhDiabeteHtml(documentId, CRC_DIABETE_OPTIONS, formData, patientId, contactId)
    return html
  }

  private async buildCrhDiabeteHtml(documentId?: string | null, options?: CrhDiabeteOptions, formDataOverride?: Record<string, any>, patientId?: number | null, contactId?: string | number | null): Promise<{ html: string; patient: PatientDto }> {
    if (documentId) {
      const doc = await this.clinicalDocumentService.getDocumentById(documentId)
      if (!doc) throw new Error('Document introuvable')

      const pid = await this.clinicalDocumentService.getPatientIdByDocument(doc.contactId!)
      const { patient, hospital, logo } = await this.patientExportService.enrich(pid)

      const contact = {
        id: doc.contactId,
        service_name: doc.serviceId ?? undefined,
      }

      let formData: Record<string, any>
      if (formDataOverride && Object.keys(formDataOverride).length > 0) {
        formData = formDataOverride
      } else {
        formData = doc.formData ? JSON.parse(doc.formData) : {}
      }

      let signedByName: string | undefined
      if (doc.signedBy) {
        const user = await this.authService.getUserById(Number(doc.signedBy))
        signedByName = user ? `${user.prenom || ''} ${(user.nom || '').toUpperCase()}`.trim() : undefined
      }

      const html = generateCrhDiabeteHtml(formData, patient, contact, hospital as any, logo, doc.signedAt ?? undefined, signedByName, options)
      return { html, patient }
    }

    if (patientId == null) throw new Error('Ni identifiant de document ni identifiant de patient fournis')
    if (!formDataOverride || Object.keys(formDataOverride).length === 0) throw new Error('Les données du formulaire (formData) sont requises pour générer le document')

    const { patient, hospital, logo } = await this.patientExportService.enrich(patientId)
    const contact = { id: contactId ?? null }
    const html = generateCrhDiabeteHtml(formDataOverride, patient, contact, hospital as any, logo, undefined, undefined, options)
    return { html, patient }
  }

  async exportOrdonnancePdf(params: { patientId: number; prescriptionIds?: number[]; inlinePrescriptions?: Array<{ medicament: string; dosage: string; unite: string; voie: string; duree: number; frequenceType: string; frequence: string[]; prn: boolean; instructions: string }> }): Promise<string> {
    const html = await this.generateOrdonnancePreview(params)
    const buffer = await this.generatePdf(html)
    const now = new Date()
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')
    return this.saveFile(buffer, `ordonnance-${dateStr}.pdf`, [
      { name: 'PDF', extensions: ['pdf'] },
    ])
  }

  async generateOrdonnancePreview(params: { patientId: number; prescriptionIds?: number[]; inlinePrescriptions?: Array<{ medicament: string; dosage: string; unite: string; voie: string; duree: number; frequenceType: string; frequence: string[]; prn: boolean; instructions: string }> }): Promise<string> {
    const patientEntity = await this.patientService.getById(params.patientId)
    if (!patientEntity) throw new Error('Patient introuvable')

    const [prescriptions, hospital, logo, legalNotice, agrementNumber] = await Promise.all([
      this.prescriptionService.listByPatient(params.patientId),
      this.settingsService.getHospitalInfo(),
      this.logoService.getLogoBase64(),
      this.settingsService.getSetting('legal_notice'),
      this.settingsService.getSetting('agrement_number'),
    ])

    const filteredPrescriptions = params.prescriptionIds
      ? prescriptions.filter(p => params.prescriptionIds!.includes(p.id!))
      : prescriptions.filter(p => p.statut === 'active')

    const inlineMapped = (params.inlinePrescriptions || []).map(ip => ({
      nomMedicament: ip.medicament || '',
      posologie: [ip.dosage, ip.unite, ip.voie, Array.isArray(ip.frequence) ? ip.frequence.join(', ') : (ip.frequence || '')].filter(Boolean).join(' - '),
      reglesConditionnelles: ip.instructions ? [ip.instructions] : undefined,
    }))

    let prescriptorUser: any = null
    const firstPrescription = filteredPrescriptions[0]
    if (firstPrescription?.prescripteur_id) {
      prescriptorUser = await this.authService.getUserById(firstPrescription.prescripteur_id)
    }

    const age = patientEntity.date_naissance
      ? Math.floor((new Date().getTime() - new Date(patientEntity.date_naissance).getTime()) / 31557600000)
      : 0

    const now = new Date()
    const dateStr = now.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    const ordonnanceRef = `ORD-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(patientEntity.id || 0).padStart(4, '0')}`

    const medicaments = filteredPrescriptions.filter(p => (p.type || p.prescription_type) === 'medicament')
    const soins = filteredPrescriptions.filter(p => (p.type || p.prescription_type) === 'soins')

    const medecinFullName = prescriptorUser
      ? `${prescriptorUser.prenom || ''} ${(prescriptorUser.nom || '').toUpperCase()}`
      : 'Dr Non renseigné'

    const patient = {
      civilite: patientEntity.civilite || 'M.',
      nom: patientEntity.nom || '',
      prenom: patientEntity.prenom || '',
      numeroDossier: patientEntity.nip || String(patientEntity.id || ''),
      pieceIdentite: undefined as string | undefined,
      dateNaissance: patientEntity.date_naissance || '',
      age,
      poids: undefined as number | undefined,
      taille: undefined as number | undefined,
      traitementChronique: undefined as boolean | undefined,
    }

    const medecin = {
      nom: medecinFullName,
      prenom: prescriptorUser?.prenom || '',
      specialite: prescriptorUser?.service || '',
      numeroOrdre: prescriptorUser?.numero_ordre || '—',
    }

    const structure = {
      nom: hospital.name || '',
      ville: hospital.city || '',
      adresse: hospital.address || '',
      telephone: hospital.phone || '',
      numeroAgrement: agrementNumber || '—',
    }

    const clinique = {
      logoUrl: logo, // base64 data URI or null
    }

    // Generate barcodes (Code128) for doctor order number and facility agreement number
    const ordreSvg = medecin.numeroOrdre && medecin.numeroOrdre !== '—'
      ? generateCode128Svg(medecin.numeroOrdre, { height: 40, barWidth: 2, fontSize: 10 })
      : ''
    const agrementSvg = structure.numeroAgrement && structure.numeroAgrement !== '—'
      ? generateCode128Svg(structure.numeroAgrement, { height: 40, barWidth: 2, fontSize: 10 })
      : ''

    // Generate QR code for patient dossier number
    let dossierQrSvg = ''
    try {
      if (patient.numeroDossier) {
        dossierQrSvg = await QRCode.toString(patient.numeroDossier, { type: 'svg', width: 80, margin: 1 })
      }
    } catch { /* ignore */ }

    // Map prescriptions
    const hasInsulin = [...medicaments, ...(params.inlinePrescriptions || [])].some(p =>
      (p.medicament || '').toLowerCase().includes('insuline'),
    )
    const mappedPrescriptions = [
      ...medicaments.map(p => ({
        nomMedicament: p.medicament || '',
        posologie: [p.dosage, p.voie, (p.frequence || '').split(',').filter(Boolean).join(', ')].filter(Boolean).join(' - '),
        reglesConditionnelles: p.instructions ? [p.instructions] : undefined,
      })),
      ...inlineMapped,
    ]

    const mappedDispositifs = soins.map(p => ({
      nom: p.medicament || '',
      quantiteFrequence: (p.frequence || '').split(',').filter(Boolean).join(', '),
    }))

    // Generate QR notices for medications needing demonstration
    const noticeQrCodes: Array<{ medicament: string; svg: string; sousTitre: string; url?: string }> = []
    if (hasInsulin) {
      for (const p of mappedPrescriptions) {
        if ((p.nomMedicament || '').toLowerCase().includes('insuline') || (p.nomMedicament || '').toLowerCase().includes('stylo')) {
          try {
            const qrSvg = await QRCode.toString(`https://example.com/notice/${encodeURIComponent(p.nomMedicament)}`, { type: 'svg', width: 70, margin: 1 })
            noticeQrCodes.push({
              medicament: p.nomMedicament,
              svg: qrSvg,
              sousTitre: p.nomMedicament.toLowerCase(),
            })
          } catch { /* skip */ }
        }
      }
    }

    // Default legal notice if none configured
    const defaultLegalNotice = 'Ordonnance émise conformément à la réglementation en vigueur en République de Guinée relative à l\'exercice de la médecine et de la pharmacie. Toute falsification ou usage frauduleux de ce document expose son auteur aux sanctions prévues par la loi.'
    const legalNoticeText = legalNotice || defaultLegalNotice

    return generateOrdonnanceHtml({
      clinique,
      medecin,
      structure,
      patient,
      prescriptions: mappedPrescriptions,
      dispositifsMedicaux: mappedDispositifs,
      dateEmission: dateStr,
      heureEmission: timeStr,
      numeroOrdonnance: ordonnanceRef,
      legalNotice: legalNoticeText,
      barcodes: { ordreSvg, agrementSvg },
      qrCodes: { dossierSvg: dossierQrSvg, notices: noticeQrCodes.length > 0 ? noticeQrCodes : undefined },
    })
  }

  async exportPatientsListExcel(_filters?: any): Promise<string> {
    const patients = await this.patientService.list()
    const hospital = await this.settingsService.getHospitalInfo()

    const columnCount = 11
    const workbook = this.createWorkbook('Patients')
    const sheet = workbook.getWorksheet('Patients')!

    const columnDefs: ColumnDef[] = [
      { header: 'Civilité', key: 'civilite', width: 14 },
      { header: 'Nom', key: 'nom', width: 24 },
      { header: 'Prénom', key: 'prenom', width: 24 },
      { header: 'Date naissance', key: 'date_naissance', width: 18 },
      { header: 'Âge', key: 'age', width: 8 },
      { header: 'NIP', key: 'nip', width: 14 },
      { header: 'N° SS', key: 'nir', width: 18 },
      { header: 'Téléphone', key: 'telephone', width: 18 },
      { header: 'Assurance', key: 'assurance', width: 20 },
      { header: 'Région', key: 'region', width: 16 },
      { header: 'Profession', key: 'profession', width: 22 },
    ]

    sheet.columns = columnDefs

    this.buildPatientListHeader(sheet, hospital, columnCount)
    this.buildPatientListHeaderRow(sheet, columnDefs)
    this.buildPatientListDataRows(sheet, patients)
    this.buildPatientListSummaryRow(sheet, patients)
    this.configurePatientListSheet(sheet, patients, columnDefs)

    return this.writeAndSave(workbook, 'liste-patients.xlsx')
  }

  private buildPatientListHeader(sheet: Worksheet, hospital: any, columnCount: number): void {
    buildRepublicHeader(sheet, columnCount)
    buildDeviseLine(sheet, columnCount)
    buildSeparatorLine(sheet, columnCount, 3)
    buildInstitutionLine(sheet, columnCount, 4, hospital)
    buildContactLine(sheet, columnCount, 5, hospital)
    buildSeparatorLine(sheet, columnCount, 6)
    buildTitleAndDate(sheet, columnCount, 8, 'Liste des patients — Tous les détails', 9)
  }

  private buildPatientListHeaderRow(sheet: Worksheet, columnDefs: ColumnDef[]): void {
    const headerRowNumber = 11
    const headerRow = sheet.getRow(headerRowNumber)
    columnDefs.forEach((col, idx) => {
      const cell = headerRow.getCell(idx + 1)
      cell.value = col.header
      cell.font = { bold: true, color: { argb: COLORS.WHITE }, size: FONT.HEADER_ROW_SIZE, name: FONT.FAMILY }
      cell.fill = HEADER_FILL
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
      cell.border = THIN_GREY_BORDER
    })
    headerRow.height = 22
  }

  private buildPatientListDataRows(sheet: Worksheet, patients: any[]): void {
    patients.forEach((p: any, i: number) => {
      const age = p.date_naissance
        ? Math.floor((new Date().getTime() - new Date(p.date_naissance).getTime()) / 31557600000)
        : ''
      const dto = PatientEntity.toDto(p)
      const row = sheet.addRow([
        dto.civilite || '',
        dto.nom || '',
        dto.prenom || '',
        dto.date_naissance || '',
        age,
        dto.nip || '',
        dto.nir || '',
        dto.telephone || '',
        dto.assuranceMutuelle || '',
        dto.region || '',
        dto.profession || '',
      ])
      row.eachCell((cell) => {
        cell.border = THIN_GREY_BORDER
        cell.font = { size: FONT.DATA_SIZE, name: FONT.FAMILY }
        cell.alignment = { vertical: 'top', wrapText: true }
      })
      if (i % 2 === 1) {
        row.eachCell((cell) => {
          cell.fill = ZEBRA_FILL
        })
      }
    })
  }

  private buildPatientListSummaryRow(sheet: Worksheet, patients: any[]): void {
    const headerRowNumber = 11
    const summaryRowNumber = headerRowNumber + patients.length + 1
    const summaryRow = sheet.getRow(summaryRowNumber)
    const summaryCell = summaryRow.getCell(1)
    summaryCell.value = `Total : ${patients.length} patient${patients.length > 1 ? 's' : ''}`
    summaryCell.font = { bold: true, size: FONT.HEADER_ROW_SIZE, color: { argb: COLORS.DARK_BLUE }, name: FONT.FAMILY }
    sheet.mergeCells(`A${summaryRowNumber}:K${summaryRowNumber}`)
  }

  private configurePatientListSheet(sheet: Worksheet, patients: any[], columnDefs: ColumnDef[]): void {
    const headerRowNumber = 11

    if (patients.length > 0) {
      sheet.autoFilter = {
        from: { row: headerRowNumber, column: 1 },
        to: { row: headerRowNumber + patients.length, column: columnDefs.length },
      }
    }

    sheet.views = [
      { state: 'frozen', ySplit: headerRowNumber, xSplit: 0, activeCell: 'A12' },
    ]

    sheet.pageSetup = {
      ...PAGE_SETUP_LANDSCAPE,
      printTitlesRow: `${headerRowNumber}:${headerRowNumber}`,
    }
  }

  private async writeAndSave(workbook: ExcelJS.Workbook, defaultName: string): Promise<string> {
    const buffer = (await workbook.xlsx.writeBuffer()) as unknown as Buffer
    return this.saveFile(buffer, defaultName, [
      { name: 'Excel', extensions: ['xlsx'] },
    ])
  }

  private async generatePdf(html: string, margins?: { top: number; bottom: number; left: number; right: number }): Promise<Buffer> {
    const win = new BrowserWindow({ show: false, width: 800, height: 600 })
    // The document can embed a multi-MB base64 logo → a data: URL would exceed
    // Chromium's 2 097 152-character navigation limit, `did-finish-load` would
    // never fire and the export would hang forever. Load from a temp file instead.
    const tmpFile = path.join(app.getPath('temp'), `crh-pdf-${Date.now()}.html`)
    fs.writeFileSync(tmpFile, html, 'utf-8')
    try {
      await new Promise<void>((resolve, reject) => {
        win.webContents.once('did-finish-load', () => resolve())
        win.webContents.once('did-fail-load', (_event, errorCode) => {
          reject(new Error(`Impossible de charger le document pour l'export PDF (code: ${errorCode})`))
        })
        win.loadFile(tmpFile)
      })
      const buffer = await win.webContents.printToPDF({
        printBackground: true,
        margins: margins ?? { top: 0.79, bottom: 0.79, left: 0.59, right: 0.59 },
      })
      return buffer
    } finally {
      win.close()
      fs.rmSync(tmpFile, { force: true })
    }
  }

  private async saveFile(
    buffer: Buffer,
    defaultName: string,
    filters: Array<{ name: string; extensions: string[] }>,
  ): Promise<string> {
    const result = await dialog.showSaveDialog({
      defaultPath: path.join(app.getPath('documents'), defaultName),
      filters,
    })
    if (result.canceled || !result.filePath) throw new Error('Enregistrement annulé')
    fs.writeFileSync(result.filePath, buffer)
    return result.filePath
  }
}
