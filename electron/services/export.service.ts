import { container, inject, singleton } from 'tsyringe'
import { BrowserWindow, dialog, app } from 'electron'
import * as path from 'path'
import * as fs from 'fs'
import crypto from 'crypto'
import type { Worksheet } from 'exceljs'
import * as ExcelJS from 'exceljs'
import { AuthService } from './auth.service'
import { SettingsService } from './settings.service'
import { LogoService } from './logo.service'
import { PatientExportService } from './patient-export.service'
import { PatientService } from './patient.service'
import { ClinicalDocumentService } from './clinical-document.service'
import { DocumentAttachmentService } from './document-attachment.service'
import { PrescriptionService } from './prescription.service'
import { ExamRequestService } from './exam-request.service'
import { PatientEntity } from '../entities/patient.entity'
import type { PatientDto } from '../dto/patient.dto'
import type { PrescriptionEntity } from '../entities/prescription.entity'
import { generateUserListHtml, generateUserProfileHtml, generatePatientProfileHtml, generateCrhDiabeteHtml, generateCrcObesiteHtml, generateCrcGestaHtml, generateClinicalDocumentHtml, generateOrdonnanceHtml, generateMedicalHeader, generateFooter, generateBonCommandeHtml, generateBonReceptionHtml } from '../export-templates'
import { InvoiceService } from './invoice.service'
import { LaboratoireService } from './laboratoire.service'
import { DispensationService } from './dispensation.service'
import { SalaireService } from './salaire.service'
import { IndicateursService } from './indicateurs.service'
import { CommandeService } from './commande.service'
import { montantEnLettres } from '../utils/montant-lettres'
import type { RecuServiceDto } from '../dto/recu-service.dto'
import type { CrhDiabeteOptions, CrhOrdonnanceData } from '../export-templates'
import type { HospitalInfoDto } from '../dto/settings.dto'
import type { SalairePayslipDto } from '../dto/salaire.dto'
import { ACTIVITY_KEYS, type IndicateursMensuelsDto, type IndicateursParams, type MetricKey } from '../dto/indicateurs.dto'
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

const CRC_OBESITE_OPTIONS: CrhDiabeteOptions = {
  docTitle: "DOSSIER PATIENT EN PARCOURS DE SOINS D'OBÉSITÉ",
  docRefPrefix: 'CDE-CRO',
  typeLabel: 'CRO',
}

const CRC_GESTA_OPTIONS: CrhDiabeteOptions = {
  docTitle: 'DOSSIER PATIENTE EN PARCOURS DE SOINS DE DIABÈTE GESTATIONNEL / DIABÈTE & GROSSESSE',
  docRefPrefix: 'CDE-CRG',
  typeLabel: 'CRG',
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

interface AnnexeAttachment {
  id?: number
  display_name?: string
  file_name?: string
  mime_type?: string
  file_size?: number
  description?: string
  file_data?: string
}

/**
 * Marges des reçus de service, en pouces (unité attendue par `printToPDF`).
 * Elles reprennent celles des autres reçus : 20 mm en haut, 15 mm ailleurs, et
 * correspondent exactement au padding écran du document (`@media screen`).
 */
const RECU_SERVICE_PDF_MARGINS = { top: 0.79, bottom: 0.59, left: 0.59, right: 0.59 }

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
    @inject(ExamRequestService) private examRequestService: ExamRequestService,
    @inject(InvoiceService) private invoiceService: InvoiceService,
    @inject(DocumentAttachmentService, { isOptional: true }) private documentAttachmentService?: DocumentAttachmentService,
    @inject(IndicateursService, { isOptional: true }) private indicateursService?: IndicateursService,
    @inject(SalaireService, { isOptional: true }) private salaireService?: SalaireService,
    @inject(CommandeService, { isOptional: true }) private commandeService?: CommandeService,
    @inject(LaboratoireService, { isOptional: true }) private laboratoireService?: LaboratoireService,
    @inject(DispensationService, { isOptional: true }) private dispensationService?: DispensationService,
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

  async exportCrcObesitePdf(documentId?: string | null, formData?: Record<string, any>, patientId?: number | null, contactId?: string | number | null): Promise<string> {
    const { html, patient } = await this.buildCrcObesiteHtml(documentId, CRC_OBESITE_OPTIONS, formData, patientId, contactId)
    const buffer = await this.generatePdf(html, CRH_MARGINS)
    const safeName = `cro-${patient.nom || 'inconnu'}-${patient.prenom || ''}.pdf`.replace(/[^a-zA-Z0-9\-_.]/g, '_')
    return this.saveFile(buffer, safeName, [
      { name: 'PDF', extensions: ['pdf'] },
    ])
  }

  async exportCrcGestaPdf(documentId?: string | null, formData?: Record<string, any>, patientId?: number | null, contactId?: string | number | null): Promise<string> {
    const { html, patient } = await this.buildCrcGestaHtml(documentId, CRC_GESTA_OPTIONS, formData, patientId, contactId)
    const buffer = await this.generatePdf(html, CRH_MARGINS)
    const safeName = `crg-${patient.nom || 'inconnu'}-${patient.prenom || ''}.pdf`.replace(/[^a-zA-Z0-9\-_.]/g, '_')
    return this.saveFile(buffer, safeName, [
      { name: 'PDF', extensions: ['pdf'] },
    ])
  }

  async previewBonCommandeHtml(commandeId: number): Promise<string> {
    if (!this.commandeService) throw new Error('Service commandes indisponible')
    const [commande, hospital, logo] = await Promise.all([
      this.commandeService.getById(commandeId),
      this.settingsService.getHospitalInfo(),
      this.logoService.getLogoBase64(),
    ])
    return generateBonCommandeHtml({
      commande: {
        numero: commande.numero ?? '',
        dateCommande: commande.dateCommande ?? '',
        datePrevue: commande.datePrevue ?? null,
        periode: commande.periode ?? null,
        urgence: commande.urgence === true,
        statut: commande.statut ?? null,
        fournisseurNom: commande.fournisseurNom ?? null,
        notes: commande.notes ?? null,
        lignes: (commande.lignes ?? []).map((ligne) => ({
          designation: ligne.designation ?? '',
          forme: ligne.forme ?? null,
          dosage: ligne.dosage ?? null,
          conditionnement: ligne.conditionnement ?? null,
          unite: ligne.unite ?? null,
          cmm: ligne.cmm ?? null,
          stockRestant: ligne.stockRestant ?? null,
          quantiteCommandee: ligne.quantiteCommandee ?? 0,
          quantiteLivree: ligne.quantiteLivree ?? 0,
        })),
      },
      hospital,
      logoBase64: logo,
    })
  }

  async exportBonCommandePdf(commandeId: number): Promise<string> {
    const [commande, html] = await Promise.all([
      this.commandeService ? this.commandeService.getById(commandeId) : Promise.reject(new Error('Service commandes indisponible')),
      this.previewBonCommandeHtml(commandeId),
    ])
    // Le bon de commande est un tableau large : il doit sortir en A4 paysage.
    // printToPDF ignore `@page { size: ... }` du HTML, l'orientation doit être
    // passée explicitement, sinon les 10 colonnes sont écrasées en portrait.
    const buffer = await this.generatePdf(html, { top: 0.47, bottom: 0.47, left: 0.47, right: 0.47 }, {
      landscape: true,
      pageSize: 'A4',
    })
    const numero = (commande.numero ?? `commande-${commandeId}`).replace(/[^a-zA-Z0-9\-_.]/g, '_')
    return this.saveFile(buffer, `bon-commande-${numero}.pdf`, [
      { name: 'PDF', extensions: ['pdf'] },
    ])
  }

  /**
   * Construit le HTML du bon de réception d'une réception donnée.
   *
   * La réception est cherchée dans le bon de commande (source unique des
   * lignes, du fournisseur et des lots), ce qui évite un second contrat DTO.
   */
  private async buildBonReceptionHtml(commandeId: number, receptionId: number): Promise<{ html: string; numero: string }> {
    if (!this.commandeService) throw new Error('Service commandes indisponible')
    const [commande, hospital, logo] = await Promise.all([
      this.commandeService.getById(commandeId),
      this.settingsService.getHospitalInfo(),
      this.logoService.getLogoBase64(),
    ])
    const reception = (commande.receptions ?? []).find((row) => Number(row.id) === Number(receptionId))
    if (!reception) throw new Error('Réception introuvable sur ce bon de commande')

    const numero = commande.numero ?? `commande-${commandeId}`
    const html = generateBonReceptionHtml({
      reception: {
        reference: `BR-${numero}`,
        commandeNumero: numero,
        dateCommande: commande.dateCommande ?? null,
        dateReception: reception.dateReception ?? '',
        refBl: reception.refBl ?? null,
        fournisseurNom: commande.fournisseurNom ?? null,
        notes: reception.notes ?? null,
        attachments: (reception.attachments ?? [])
          .map((attachment) => attachment.fileName ?? '')
          .filter(Boolean),
        lignes: (reception.lignes ?? []).map((ligne) => ({
          designation: ligne.designation ?? '',
          forme: ligne.forme ?? null,
          dosage: ligne.dosage ?? null,
          conditionnement: ligne.conditionnement ?? null,
          unite: ligne.unite ?? null,
          cmm: ligne.cmm ?? 0,
          stockRestant: ligne.stockRestant ?? 0,
          quantiteCommandee: ligne.quantiteCommandee ?? 0,
          quantiteLivree: ligne.quantiteLivree ?? 0,
          quantiteRecue: ligne.quantiteRecue ?? 0,
          numeroLot: ligne.numeroLot ?? null,
          datePeremption: ligne.datePeremption ?? null,
        })),
      },
      hospital,
      logoBase64: logo,
    })
    return { html, numero }
  }

  async previewBonReceptionHtml(commandeId: number, receptionId: number): Promise<string> {
    const { html } = await this.buildBonReceptionHtml(commandeId, receptionId)
    return html
  }

  async exportBonReceptionPdf(commandeId: number, receptionId: number): Promise<string> {
    const { html, numero } = await this.buildBonReceptionHtml(commandeId, receptionId)
    const buffer = await this.generatePdf(html, { top: 0.47, bottom: 0.47, left: 0.47, right: 0.47 }, {
      landscape: true,
      pageSize: 'A4',
    })
    const safeNumero = numero.replace(/[^a-zA-Z0-9\-_.]/g, '_')
    return this.saveFile(buffer, `bon-reception-${safeNumero}-${receptionId}.pdf`, [
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

  async previewCrcObesite(documentId?: string | null, formData?: Record<string, any>, patientId?: number | null, contactId?: string | number | null): Promise<string> {
    const { html } = await this.buildCrcObesiteHtml(documentId, CRC_OBESITE_OPTIONS, formData, patientId, contactId)
    return html
  }

  async previewCrcGesta(documentId?: string | null, formData?: Record<string, any>, patientId?: number | null, contactId?: string | number | null): Promise<string> {
    const { html } = await this.buildCrcGestaHtml(documentId, CRC_GESTA_OPTIONS, formData, patientId, contactId)
    return html
  }

  async generateClinicalDocumentPdf(documentId: string): Promise<string> {
    const { html, isCrh } = await this.buildClinicalDocumentHtml(documentId)

    let buffer: Buffer
    if (isCrh) {
      buffer = await this.generatePdf(html, CRH_MARGINS)
    } else {
      buffer = await this.generatePdf(html)
    }

    const importDir = path.join(app.getPath('userData'), 'pdf-imports')
    if (!fs.existsSync(importDir)) {
      fs.mkdirSync(importDir, { recursive: true })
    }

    const filePath = path.join(importDir, `${crypto.randomUUID()}.pdf`)
    fs.writeFileSync(filePath, buffer)
    return filePath
  }

  // ─── Clinical document: HTML preview / PDF / Word export ─────────

  async previewClinicalDocumentHtml(documentId: string): Promise<string> {
    const { html } = await this.buildClinicalDocumentHtml(documentId)
    return html
  }

  async exportClinicalDocumentPdf(documentId: string): Promise<string> {
    const { html, isCrh } = await this.buildClinicalDocumentHtml(documentId)
    const buffer = isCrh ? await this.generatePdf(html, CRH_MARGINS) : await this.generatePdf(html)
    return this.saveFile(buffer, `document-${documentId}.pdf`, [
      { name: 'PDF', extensions: ['pdf'] },
    ])
  }

  async exportClinicalDocumentDoc(documentId: string): Promise<string> {
    const { html } = await this.buildClinicalDocumentHtml(documentId)
    // Word opens UTF-8 HTML documents with a BOM; the MIME sniffing then
    // recognizes the file as HTML (not plain text) and renders it as a
    // styled document preserving the clinical layout.
    const buffer = Buffer.from('\uFEFF' + html, 'utf-8')
    return this.saveFile(buffer, `document-${documentId}.doc`, [
      { name: 'Word', extensions: ['doc'] },
    ])
  }

  private async buildClinicalDocumentHtml(documentId: string): Promise<{ html: string; isCrh: boolean }> {
    const doc = await this.clinicalDocumentService.getDocumentById(documentId)
    if (!doc) throw new Error('Document introuvable')

    if (doc.documentTypeCode === 'CRH_DIABETE') {
      const { html } = await this.buildCrhDiabeteHtml(doc.id!)
      return { html, isCrh: true }
    }
    if (doc.documentTypeCode === 'CRC_DIABETE') {
      const { html } = await this.buildCrhDiabeteHtml(doc.id!, CRC_DIABETE_OPTIONS)
      return { html, isCrh: true }
    }
    if (doc.documentTypeCode === 'CRC_OBESITE') {
      const { html } = await this.buildCrcObesiteHtml(doc.id!, CRC_OBESITE_OPTIONS)
      return { html, isCrh: true }
    }
    if (doc.documentTypeCode === 'CRC_GESTA') {
      const { html } = await this.buildCrcGestaHtml(doc.id!, CRC_GESTA_OPTIONS)
      return { html, isCrh: true }
    }

    const docType = doc.documentTypeId
      ? await this.clinicalDocumentService.getDocumentTypeById(doc.documentTypeId)
      : null
    const formData = doc.formData ? JSON.parse(doc.formData) : {}
    const pid = await this.clinicalDocumentService.getPatientIdByDocument(doc.contactId!)
    const { patient, hospital, logo } = await this.patientExportService.enrich(pid)

    let signedByName: string | undefined
    if (doc.signedBy) {
      const user = await this.authService.getUserById(Number(doc.signedBy))
      signedByName = user ? `${user.prenom || ''} ${(user.nom || '').toUpperCase()}`.trim() : undefined
    }

    const html = generateClinicalDocumentHtml({
      title: doc.title || docType?.label || 'Document clinique',
      formSchema: (docType?.formSchema ?? []) as any,
      formData,
      patient,
      hospital: hospital as any,
      logo,
      signedAt: doc.signedAt,
      signedByName,
    })
    return { html, isCrh: false }
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

      const html = generateCrhDiabeteHtml(formData, patient, contact, hospital as any, logo, doc.signedAt ?? undefined, signedByName, options, await this.loadAnnexeAttachments(documentId), this.buildOrdonnanceFromFormData(formData) ?? await this.buildOrdonnanceData(pid, formData.admission?.dateEntree))
      return { html, patient }
    }

    if (patientId == null) throw new Error('Ni identifiant de document ni identifiant de patient fournis')
    if (!formDataOverride || Object.keys(formDataOverride).length === 0) throw new Error('Les données du formulaire (formData) sont requises pour générer le document')

    const { patient, hospital, logo } = await this.patientExportService.enrich(patientId)
    const contact = { id: contactId ?? null }
    const html = generateCrhDiabeteHtml(formDataOverride, patient, contact, hospital as any, logo, undefined, undefined, options, undefined, this.buildOrdonnanceFromFormData(formDataOverride) ?? await this.buildOrdonnanceData(patientId, formDataOverride.admission?.dateEntree))
    return { html, patient }
  }

  private async buildCrcObesiteHtml(documentId?: string | null, options?: CrhDiabeteOptions, formDataOverride?: Record<string, any>, patientId?: number | null, contactId?: string | number | null): Promise<{ html: string; patient: PatientDto }> {
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

      const html = generateCrcObesiteHtml(formData, patient, contact, hospital as any, logo, doc.signedAt ?? undefined, signedByName, options, await this.loadAnnexeAttachments(documentId), this.buildOrdonnanceFromFormData(formData) ?? await this.buildOrdonnanceData(pid, formData.admission?.dateEntree))
      return { html, patient }
    }

    if (patientId == null) throw new Error('Ni identifiant de document ni identifiant de patient fournis')
    if (!formDataOverride || Object.keys(formDataOverride).length === 0) throw new Error('Les données du formulaire (formData) sont requises pour générer le document')

    const { patient, hospital, logo } = await this.patientExportService.enrich(patientId)
    const contact = { id: contactId ?? null }
    const html = generateCrcObesiteHtml(formDataOverride, patient, contact, hospital as any, logo, undefined, undefined, options, undefined, this.buildOrdonnanceFromFormData(formDataOverride) ?? await this.buildOrdonnanceData(patientId, formDataOverride.admission?.dateEntree))
    return { html, patient }
  }

  private async buildCrcGestaHtml(documentId?: string | null, options?: CrhDiabeteOptions, formDataOverride?: Record<string, any>, patientId?: number | null, contactId?: string | number | null): Promise<{ html: string; patient: PatientDto }> {
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

      const html = generateCrcGestaHtml(formData, patient, contact, hospital as any, logo, doc.signedAt ?? undefined, signedByName, options, await this.loadAnnexeAttachments(documentId), this.buildOrdonnanceFromFormData(formData) ?? await this.buildOrdonnanceData(pid, formData.admission?.dateEntree))
      return { html, patient }
    }

    if (patientId == null) throw new Error('Ni identifiant de document ni identifiant de patient fournis')
    if (!formDataOverride || Object.keys(formDataOverride).length === 0) throw new Error('Les données du formulaire (formData) sont requises pour générer le document')

    const { patient, hospital, logo } = await this.patientExportService.enrich(patientId)
    const contact = { id: contactId ?? null }
    const html = generateCrcGestaHtml(formDataOverride, patient, contact, hospital as any, logo, undefined, undefined, options, undefined, this.buildOrdonnanceFromFormData(formDataOverride) ?? await this.buildOrdonnanceData(patientId, formDataOverride.admission?.dateEntree))
    return { html, patient }
  }

  private async buildOrdonnanceData(patientId: number, dateEntree?: string): Promise<CrhOrdonnanceData> {
    const [prescriptions, examRequests] = await Promise.all([
      this.prescriptionService.listByPatient(patientId),
      this.examRequestService.listByPatient(patientId),
    ])

    const isActive = (statut: string | undefined) => (statut ?? 'active') === 'active'
    const toItem = (p: PrescriptionEntity) => {
      const isSoins = (p.type || p.prescription_type) === 'soins'
      return {
        nom: p.medicament || '',
        posologie: [
          isSoins ? '' : p.dosage,
          isSoins ? '' : p.voie,
          (p.frequence || '').split(',').filter(Boolean).join(', '),
        ].filter(Boolean).join(' - '),
        dureeType: (p.duree_type ?? 'courte') as 'courte' | 'longue',
      }
    }

    const medicaments = prescriptions
      .filter(p => (p.type || p.prescription_type) === 'medicament' && isActive(p.statut))
      .filter(p => !dateEntree || !p.date_prescription || p.date_prescription <= dateEntree)
      .map(toItem)

    const soins = prescriptions
      .filter(p => (p.type || p.prescription_type) === 'soins' && isActive(p.statut))
      .map(toItem)

    const labIds = [...new Set(examRequests.flatMap(r => {
      if (r.type !== 'laboratoire' || !r.exam_ids) return []
      try { return JSON.parse(r.exam_ids) as number[] } catch { return [] }
    }))]
    const typeNames = new Map((await this.examRequestService.findTypeNames(labIds)).map(t => [t.id, t.name]))

    const isRequested = (statut: string | undefined) => (statut ?? 'en_attente') !== 'annule'
    const dbMetaOf = (r: any): { prescripteur?: string; plannedDate?: string | null; plannedHour?: number | null } => {
      const meta: { prescripteur?: string; plannedDate?: string | null; plannedHour?: number | null } = {}
      if (typeof r.prescripteur_nom === 'string' && r.prescripteur_nom.trim()) meta.prescripteur = r.prescripteur_nom.trim()
      if (typeof r.planned_date === 'string' && r.planned_date.trim()) meta.plannedDate = r.planned_date.trim()
      if (typeof r.planned_hour === 'number' && Number.isFinite(r.planned_hour)) meta.plannedHour = r.planned_hour
      return meta
    }
    const examens = examRequests
      .filter(r => (r.type === 'imagerie' || r.type === 'laboratoire') && isRequested(r.statut))
      .flatMap(r => {
        const kind = r.type as 'imagerie' | 'laboratoire'
        const motif = r.motif || undefined
        const meta = dbMetaOf(r)
        // Labo multi-analyses (pull DB) : une entrée par analyse résolue via
        // exam_ids + typeNames, motif sur la PREMIÈRE ligne seulement.
        if (r.type === 'laboratoire' && r.exam_ids) {
          try {
            const names = (JSON.parse(r.exam_ids) as number[]).map(id => typeNames.get(id) || '').filter(Boolean)
            if (names.length > 0) {
              return names.map((label, idx) => ({
                label,
                detail: idx === 0 ? motif : undefined,
                kind,
                ...meta,
              }))
            }
            return [{ label: names.join(', '), detail: motif, kind, ...meta }]
          } catch { return [{ label: '', detail: motif, kind, ...meta }] }
        }
        return [{ label: r.examen_label || '', detail: motif, kind, ...meta }]
      })
      .filter(r => r.label || r.detail)

    const avis: CrhOrdonnanceData['avis'] = examRequests
      .filter(r => r.type === 'avis' && isRequested(r.statut))
      .map(r => ({ label: r.specialty_name || r.specialite || 'Avis spécialisé', detail: r.motif || undefined, ...dbMetaOf(r) }))
      .filter(r => r.label || r.detail)

    return { medicaments, soins, examens, avis }
  }

  /**
   * Build the CRH/CRC ordonnance buckets (medicaments / soins / examens / avis)
   * from a list of `PrescriptionSortie`-like items. When `categorie` is provided,
   * only the matching bucket is populated (used for single-group ordonnance libre
   * exports); otherwise all buckets are computed. Items without a category default
   * to 'medicament'. The mapping mirrors `buildOrdonnanceFromFormData`.
   */
  private crhOrdonnanceFromItems(items: any[], categorie?: 'medicament' | 'soins' | 'examen' | 'avis'): CrhOrdonnanceData {
    const toNomPosologie = (item: any): { nom: string; posologie: string; dureeType?: 'courte' | 'longue'; quantite?: number; nbSeances?: number; objectifClinique?: string; consignesSpecifiques?: string; dispositifsMedicaux?: string; professionnelCible?: string } => {
      const isSoins = item.categorie === 'soins'
      return {
        nom: item.medicament || '',
        posologie: [
          isSoins ? '' : item.dosage,
          isSoins ? '' : item.unite,
          isSoins ? '' : item.voie,
          Array.isArray(item.frequence) ? item.frequence.filter(Boolean).join(', ') : (item.frequence || ''),
        ].filter(Boolean).join(' - '),
        dureeType: (item.dureeType ?? 'courte') as 'courte' | 'longue',
        quantite: typeof item.quantite === 'number' && Number.isFinite(item.quantite) ? item.quantite : undefined,
        ...(isSoins ? {
          nbSeances: item.nbSeances,
          objectifClinique: item.objectifClinique || undefined,
          consignesSpecifiques: item.consignesSpecifiques || undefined,
          dispositifsMedicaux: item.dispositifsMedicaux || undefined,
          professionnelCible: item.professionnelCible || undefined,
        } : {}),
      }
    }

    const isCat = (item: any, cat: 'medicament' | 'soins' | 'examen' | 'avis'): boolean =>
      cat === 'medicament'
        ? (item.categorie ?? 'medicament') === 'medicament'
        : item.categorie === cat
    const enabled = (cat: 'medicament' | 'soins' | 'examen' | 'avis'): boolean =>
      !categorie || categorie === cat

    // Champs parallèles du frontend sur PrescriptionSortie (examens + avis) :
    // `prescripteur?: string`, `plannedDate?: string|null`, `plannedHour?: number|null`.
    const itemMetaOf = (item: any): { prescripteur?: string; plannedDate?: string | null; plannedHour?: number | null } => {
      const meta: { prescripteur?: string; plannedDate?: string | null; plannedHour?: number | null } = {}
      if (typeof item.prescripteur === 'string' && item.prescripteur.trim()) meta.prescripteur = item.prescripteur.trim()
      if (typeof item.plannedDate === 'string' && item.plannedDate.trim()) meta.plannedDate = item.plannedDate.trim()
      if (typeof item.plannedHour === 'number' && Number.isFinite(item.plannedHour)) meta.plannedHour = item.plannedHour
      return meta
    }

    const medicaments = items
      .filter((item: any) => enabled('medicament') && isCat(item, 'medicament'))
      .map(toNomPosologie)
      .filter((m: { nom: string }) => m.nom)

    const soins = items
      .filter((item: any) => enabled('soins') && isCat(item, 'soins'))
      .map(toNomPosologie)
      .filter((m: { nom: string }) => m.nom)

    const examens = items
      .filter((item: any) => enabled('examen') && isCat(item, 'examen'))
      .flatMap((item: any) => {
        const kind = item.examenType === 'imagerie' || item.examenType === 'laboratoire' ? item.examenType : undefined
        const kindProp = kind ? { kind } : {}
        const meta = itemMetaOf(item)
        const isLabo = item.examenType === 'laboratoire'
        const laboList = Array.isArray(item.examens) ? item.examens.filter(Boolean) : []
        // Labo multi-analyses : une entrée par analyse, motif sur la PREMIÈRE ligne seulement.
        if (isLabo && laboList.length > 0) {
          return laboList.map((analyse: string, idx: number) => ({
            label: analyse,
            detail: idx === 0 ? (item.motif || undefined) : undefined,
            ...kindProp,
            ...meta,
          }))
        }
        return [{ label: item.examen || '', detail: item.motif || undefined, ...kindProp, ...meta }]
      })
      .filter((e: { label: string; detail?: string }) => e.label || e.detail)

    const avis = items
      .filter((item: any) => enabled('avis') && isCat(item, 'avis') && (item.specialite || item.motif))
      .map((item: any) => ({ label: item.specialite || 'Avis spécialisé', detail: item.motif || undefined, ...itemMetaOf(item) }))

    return { medicaments, soins, examens, avis }
  }

  /**
   * Build the CRH/CRC ordonnance data from the form's editable "Ordonnance de sortie" tab.
   * Returns null when the form has no ordonnanceSortie array (callers fall back to the DB pull).
   * Each item's fields are all optional except `_key`; unknown categories are treated as 'medicament'
   * only for the default case, and items without a category default to medicaments.
   */
  private buildOrdonnanceFromFormData(formData: Record<string, any>): CrhOrdonnanceData | null {
    const ordonnanceItems = Array.isArray(formData.ordonnanceSortie) ? formData.ordonnanceSortie : []
    const evolutionAvis = Array.isArray(formData.evolutionMedicale?.avis)
      ? formData.evolutionMedicale.avis.filter((a: any) => a && (a.specialite || a.motif))
      : []
    if (!Array.isArray(formData.ordonnanceSortie) && evolutionAvis.length === 0) return null

    const base = this.crhOrdonnanceFromItems(ordonnanceItems)

    const avisFromEvolution: Array<{ label: string; detail?: string }> = []
    const seenAvis = new Set<string>()
    for (const a of evolutionAvis) {
      const key = `${a.specialite || ''}|${a.motif || ''}`
      if (seenAvis.has(key)) continue
      seenAvis.add(key)
      avisFromEvolution.push({ label: a.specialite || 'Avis spécialisé', detail: a.motif || undefined })
    }
    // Drop empty avis rows (no specialite AND no motif) even though the rendered label falls back to 'Avis spécialisé'
    const avis = avisFromEvolution.length > 0
      ? avisFromEvolution
      : base.avis

    return { medicaments: base.medicaments, soins: base.soins, examens: base.examens, avis }
  }

  private async loadAnnexeAttachments(documentId: string): Promise<AnnexeAttachment[]> {
    if (!this.documentAttachmentService) return []
    const service = this.documentAttachmentService
    try {
      const attachments = await service.listByDocument(documentId)
      const annexes = await Promise.all(
        attachments.map(async (att): Promise<AnnexeAttachment | null> => {
          const annexe: AnnexeAttachment = {
            id: att.id,
            display_name: att.display_name,
            file_name: att.file_name,
            mime_type: att.mime_type,
            file_size: att.file_size,
            description: att.description,
          }
          if (!(att.mime_type || '').startsWith('image/')) return annexe
          try {
            const full = await service.getById(att.id!)
            return { ...annexe, file_data: full.file_data }
          } catch {
            console.warn(`[CDE] Annexe ${att.id} introuvable pendant l'export — ignorée`)
            return null
          }
        }),
      )
      return annexes.filter((a): a is AnnexeAttachment => a !== null)
    } catch (error) {
      console.warn(`[CDE] Échec du chargement des annexes du document ${documentId}`, error)
      return []
    }
  }

  async exportOrdonnancePdf(params: { patientId: number; prescriptionIds?: number[]; inlinePrescriptions?: Array<{ medicament: string; dosage: string; unite: string; voie: string; duree: number; frequenceType: string; frequence: string[]; prn: boolean; instructions: string }>; ordonnanceItems?: any[] }): Promise<string> {
    const html = await this.generateOrdonnancePreview(params)
    const buffer = await this.generatePdf(html)
    const now = new Date()
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')
    return this.saveFile(buffer, `ordonnance-${dateStr}.pdf`, [
      { name: 'PDF', extensions: ['pdf'] },
    ])
  }

  async generateOrdonnancePreview(params: { patientId: number; prescriptionIds?: number[]; inlinePrescriptions?: Array<{ medicament: string; dosage: string; unite: string; voie: string; duree: number; frequenceType: string; frequence: string[]; prn: boolean; instructions: string }>; ordonnanceItems?: any[] }): Promise<string> {
    const patientEntity = await this.patientService.getById(params.patientId)
    if (!patientEntity) throw new Error('Patient introuvable')

    const hasOrdonnanceItems = Array.isArray(params.ordonnanceItems) && params.ordonnanceItems.length > 0

    const [hospital, logo, legalNotice, agrementNumber] = await Promise.all([
      this.settingsService.getHospitalInfo(),
      this.logoService.getLogoBase64(),
      this.settingsService.getSetting('legal_notice'),
      this.settingsService.getSetting('agrement_number'),
    ])

    let prescriptorUser: any = null
    let mappedPrescriptions: Array<{ nomMedicament: string; posologie: string; reglesConditionnelles?: string[]; dureeType?: 'courte' | 'longue' }> = []
    let mappedDispositifs: Array<{ nom: string; quantiteFrequence: string }> = []
    let ordonnanceSoins: Array<{ nom: string; quantiteFrequence: string; nbSeances?: number; objectifClinique?: string; consignesSpecifiques?: string; dispositifsMedicaux?: string; professionnelCible?: string }> | undefined
    let ordonnanceExamens: Array<{ label: string; detail?: string; kind?: 'imagerie' | 'laboratoire'; prescripteur?: string; plannedDate?: string | null; plannedHour?: number | null }> | undefined
    let ordonnanceAvis: Array<{ label: string; detail?: string; prescripteur?: string; plannedDate?: string | null; plannedHour?: number | null }> | undefined

    if (hasOrdonnanceItems) {
      // Build the ordonnance exclusively from the provided group items — skip the
      // linkedIds / inline / DB path entirely.
      const data = this.crhOrdonnanceFromItems(params.ordonnanceItems!)
      mappedPrescriptions = data.medicaments.map(m => ({
        nomMedicament: m.nom,
        posologie: m.posologie,
        dureeType: m.dureeType,
      }))
      ordonnanceSoins = data.soins.map(s => ({
        nom: s.nom,
        quantiteFrequence: s.posologie,
        nbSeances: s.nbSeances,
        objectifClinique: s.objectifClinique,
        consignesSpecifiques: s.consignesSpecifiques,
        dispositifsMedicaux: s.dispositifsMedicaux,
        professionnelCible: s.professionnelCible,
      }))
      ordonnanceExamens = data.examens
      ordonnanceAvis = data.avis
    } else {
      const prescriptions = await this.prescriptionService.listByPatient(params.patientId)

      const filteredPrescriptions = params.prescriptionIds
        ? prescriptions.filter(p => params.prescriptionIds!.includes(p.id!))
        : prescriptions.filter(p => p.statut === 'active')

      const inlineMapped = (params.inlinePrescriptions || []).map(ip => ({
        nomMedicament: ip.medicament || '',
        posologie: [ip.dosage, ip.unite, ip.voie, Array.isArray(ip.frequence) ? ip.frequence.join(', ') : (ip.frequence || '')].filter(Boolean).join(' - '),
        reglesConditionnelles: ip.instructions ? [ip.instructions] : undefined,
        dureeType: 'courte' as const,
      }))

      const firstPrescription = filteredPrescriptions[0]
      if (firstPrescription?.prescripteur_id) {
        prescriptorUser = await this.authService.getUserById(firstPrescription.prescripteur_id)
      }

      const medicaments = filteredPrescriptions.filter(p => (p.type || p.prescription_type) === 'medicament')
      const soins = filteredPrescriptions.filter(p => (p.type || p.prescription_type) === 'soins')

      mappedPrescriptions = [
        ...medicaments.map(p => ({
          nomMedicament: p.medicament || '',
          posologie: [p.dosage, p.voie, (p.frequence || '').split(',').filter(Boolean).join(', ')].filter(Boolean).join(' - '),
          reglesConditionnelles: p.instructions ? [p.instructions] : undefined,
          dureeType: (p.duree_type ?? 'courte') as 'courte' | 'longue',
        })),
        ...inlineMapped,
      ]

      mappedDispositifs = soins.map(p => ({
        nom: p.medicament || '',
        quantiteFrequence: (p.frequence || '').split(',').filter(Boolean).join(', '),
      }))
    }


    const age = patientEntity.date_naissance
      ? Math.floor((new Date().getTime() - new Date(patientEntity.date_naissance).getTime()) / 31557600000)
      : 0

    const now = new Date()
    const dateStr = now.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    const ordonnanceRef = `ORD-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(patientEntity.id || 0).padStart(4, '0')}`

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

    // Detect insulin mention from either the DB prescriptions or the group items
    const hasInsulin = mappedPrescriptions.some(p =>
      (p.nomMedicament || '').toLowerCase().includes('insuline'),
    )

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
      soins: ordonnanceSoins,
      examens: ordonnanceExamens,
      avis: ordonnanceAvis,
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

  private async generatePdf(
    html: string,
    margins?: { top: number; bottom: number; left: number; right: number },
    options?: { landscape?: boolean; pageSize?: 'A4' | 'A3' | 'Letter' | 'Legal' | 'Tabloid' },
  ): Promise<Buffer> {
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
        ...(options?.landscape ? { landscape: true } : {}),
        ...(options?.pageSize ? { pageSize: options.pageSize } : {}),
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

  // ─── Facturation pro : Excel factures / PDF reçu / PDF rapport caisse ──

  async exportInvoicesExcel(filters?: { search?: string; status?: string; date_debut?: string; date_fin?: string }): Promise<string> {
    const invoices = await this.invoiceService.list(filters)
    const hospital = await this.settingsService.getHospitalInfo()
    const workbook = this.createWorkbook('Factures')
    const sheet = workbook.getWorksheet('Factures')!
    sheet.columns = [
      { header: 'N° Facture', key: 'numero', width: 20 },
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Patient', key: 'patient', width: 28 },
      { header: 'Remise %', key: 'remise', width: 10 },
      { header: 'TVA %', key: 'tva', width: 10 },
      { header: 'Total', key: 'total', width: 16 },
      { header: 'Assurance', key: 'assurance', width: 18 },
      { header: 'Part patient', key: 'part_patient', width: 16 },
      { header: 'Restant', key: 'restant', width: 16 },
      { header: 'Statut', key: 'status', width: 14 },
      { header: 'Mode', key: 'mode', width: 14 },
    ]
    buildRepublicHeader(sheet, 11)
    buildDeviseLine(sheet, 11)
    buildSeparatorLine(sheet, 11, 3)
    buildInstitutionLine(sheet, 11, 4, hospital)
    buildContactLine(sheet, 11, 5, hospital)
    buildSeparatorLine(sheet, 11, 6)
    buildTitleAndDate(sheet, 11, 8, 'Registre des factures', 9)
    const headerRow = sheet.getRow(11)
    sheet.columns.forEach((c, idx) => {
      const cell = headerRow.getCell(idx + 1)
      cell.value = (c as any).header
      cell.font = { bold: true, color: { argb: COLORS.WHITE }, size: FONT.HEADER_ROW_SIZE, name: FONT.FAMILY }
      cell.fill = HEADER_FILL
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
      cell.border = THIN_GREY_BORDER
    })
    headerRow.height = 22
    invoices.forEach((inv: any, i: number) => {
      const row = sheet.addRow([
        inv.numero ?? '', inv.date ?? '',
        `${inv.patient_prenom ?? ''} ${inv.patient_nom ?? ''}`.trim(),
        inv.remise_pct ?? 0, inv.tva_pct ?? 0,
        inv.montant_total ?? 0, inv.assurance_nom ?? '',
        inv.part_patient ?? inv.montant_total ?? 0,
        inv.montant_restant ?? 0, inv.status ?? '', inv.mode_paiement ?? '',
      ])
      row.eachCell((cell) => {
        cell.border = THIN_GREY_BORDER
        cell.font = { size: FONT.DATA_SIZE, name: FONT.FAMILY }
        cell.alignment = { vertical: 'top', wrapText: true }
      })
      if (i % 2 === 1) row.eachCell((cell) => { cell.fill = ZEBRA_FILL })
    })
    const summaryRow = sheet.getRow(12 + invoices.length)
    summaryRow.getCell(1).value = `Total : ${invoices.length} facture(s) — ${(invoices as any[]).reduce((s: number, r: any) => s + (r.montant_total ?? 0), 0).toLocaleString('fr-FR')} GNF`
    summaryRow.getCell(1).font = { bold: true, size: FONT.HEADER_ROW_SIZE, color: { argb: COLORS.DARK_BLUE }, name: FONT.FAMILY }
    sheet.mergeCells(`A${12 + invoices.length}:K${12 + invoices.length}`)
    sheet.pageSetup = { ...PAGE_SETUP_LANDSCAPE, printTitlesRow: '11:11' }
    return this.writeAndSave(workbook, `factures-${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  /**
   * Export Excel des indicateurs annuels — une ligne par année, plus une
   * ligne de total. Les en-têtes reprennent la feuille du gestionnaire.
   */
  async exportIndicateursExcel(params: IndicateursParams = {}): Promise<string> {
    const indicateurs = this.indicateursService ?? container.resolve(IndicateursService)
    const currentYear = new Date().getFullYear()
    let fromYear = params.fromYear ?? currentYear
    let toYear = params.toYear ?? currentYear
    if (fromYear > toYear) [fromYear, toYear] = [toYear, fromYear]
    const singleYear = fromYear === toYear ? fromYear : null

    // Feuille mensuelle uniquement pour une année seule. Le détail mensuel est
    // calculé (jamais surchargé) ; on le demande dans le même lot parallèle.
    const monthlyPromise: Promise<IndicateursMensuelsDto | null> =
      singleYear != null && typeof indicateurs.getMonthlyStats === 'function'
        ? indicateurs.getMonthlyStats({ annee: singleYear })
        : Promise.resolve(null)

    const [rows, hospital, monthly] = await Promise.all([
      indicateurs.getExportRows(params),
      this.settingsService.getHospitalInfo(),
      monthlyPromise,
    ])

    const columns: Array<{ header: string; key: MetricKey; width: number }> = [
      { header: 'Suivi diabète / endocrino (cas)', key: 'suivi_diabete_endocrino', width: 28 },
      { header: 'Soins ambulatoires', key: 'soins_ambulatoires', width: 20 },
      { header: 'Nouveaux cas de Diabète', key: 'nouveaux_cas_diabete', width: 18 },
      { header: 'Nouveaux cas de Thyroïde/Endocrino', key: 'nouveaux_cas_thyroide_endocrino', width: 24 },
      { header: 'Nouveaux venus diabète', key: 'nouveaux_venus_diabete', width: 20 },
      { header: 'Bilan Labo annuelle', key: 'bilan_labo', width: 18 },
      { header: 'Hosp jour / an', key: 'hospitalisation_jour', width: 16 },
      { header: 'Hospitalisation complète annuelle', key: 'hospitalisation_complete', width: 24 },
      { header: 'Autres Nouveaux cas', key: 'autres_nouveaux_cas', width: 20 },
      { header: 'ECG', key: 'ecg', width: 10 },
      { header: 'Hôpital de jour', key: 'hopital_de_jour', width: 16 },
      { header: 'Total annual activités', key: 'total_activites', width: 20 },
      { header: 'Moyenne annuelle activités', key: 'moyenne_activites', width: 22 },
    ]
    const columnCount = columns.length + 1
    const headerRowNumber = 11
    const workbook = this.createWorkbook('Indicateurs annuels')
    const sheet = workbook.getWorksheet('Indicateurs annuels')!
    sheet.columns = [
      { header: 'Année', key: 'annee', width: 10 },
      ...columns.map((column) => ({ header: column.header, key: column.key, width: column.width })),
    ]

    buildRepublicHeader(sheet, columnCount)
    buildDeviseLine(sheet, columnCount)
    buildSeparatorLine(sheet, columnCount, 3)
    buildInstitutionLine(sheet, columnCount, 4, hospital)
    buildContactLine(sheet, columnCount, 5, hospital)
    buildSeparatorLine(sheet, columnCount, 6)
    buildTitleAndDate(sheet, columnCount, 8, 'Indicateurs annuels', 9)

    const headerRow = sheet.getRow(headerRowNumber)
    sheet.columns.forEach((column, index) => {
      const cell = headerRow.getCell(index + 1)
      cell.value = (column as { header?: string }).header ?? ''
      cell.font = { bold: true, color: { argb: COLORS.WHITE }, size: FONT.HEADER_ROW_SIZE, name: FONT.FAMILY }
      cell.fill = HEADER_FILL
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
      cell.border = THIN_GREY_BORDER
    })
    headerRow.height = 30

    rows.forEach((row, index) => {
      const values = [row.annee, ...columns.map((column) => row[column.key] ?? '')]
      const sheetRow = sheet.addRow(values)
      sheetRow.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
        cell.border = THIN_GREY_BORDER
        cell.font = { size: FONT.DATA_SIZE, name: FONT.FAMILY }
        cell.alignment = columnNumber === 1
          ? { horizontal: 'center', vertical: 'middle' }
          : { horizontal: 'right', vertical: 'middle' }
        if (columnNumber > 1 && typeof cell.value === 'number') cell.numFmt = '0'
      })
      if (index % 2 === 1) sheetRow.eachCell({ includeEmpty: true }, (cell) => { cell.fill = ZEBRA_FILL })
    })

    // Une métrique sans aucune valeur sur la période reste « — » : on ne
    // confond pas « aucune donnée » avec un total réellement nul. La colonne
    // « moyenne » n'est jamais cumulée (une somme de moyennes n'a aucun sens) :
    // elle reste blanche.
    const totalValues = [
      'Total',
      ...columns.map((column) => {
        if (column.key === 'moyenne_activites') return ''
        const values = rows
          .map((row) => row[column.key])
          .filter((value): value is number => value != null)
        return values.length > 0
          ? values.reduce((sum, value) => sum + value, 0)
          : '—'
      }),
    ]
    const totalRow = sheet.addRow(totalValues)
    totalRow.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
      cell.border = THIN_GREY_BORDER
      cell.fill = LABEL_FILL
      cell.font = { bold: true, size: FONT.HEADER_ROW_SIZE, color: { argb: COLORS.DARK_BLUE }, name: FONT.FAMILY }
      cell.alignment = columnNumber === 1
        ? { horizontal: 'center', vertical: 'middle' }
        : { horizontal: 'right', vertical: 'middle' }
      if (columnNumber > 1 && typeof cell.value === 'number') cell.numFmt = '0'
    })

    sheet.views = [{ state: 'frozen', ySplit: headerRowNumber, xSplit: 0, activeCell: 'A12' }]
    sheet.pageSetup = { ...PAGE_SETUP_LANDSCAPE, printTitlesRow: `${headerRowNumber}:${headerRowNumber}` }

    if (monthly) {
      const activityColumns = columns.filter((column) =>
        (ACTIVITY_KEYS as readonly string[]).includes(column.key),
      )
      this.buildMonthlyIndicateursSheet(workbook, monthly, hospital, activityColumns)
    }

    return this.writeAndSave(
      workbook,
      `indicateurs-annuels-${new Date().toISOString().slice(0, 10)}.xlsx`,
    )
  }

  /** Feuille « Mensuel {annee} » : 12 lignes, une par mois. */
  private buildMonthlyIndicateursSheet(
    workbook: ExcelJS.Workbook,
    monthly: IndicateursMensuelsDto,
    hospital: HospitalInfoDto,
    activityColumns: Array<{ header: string; key: MetricKey; width: number }>,
  ): void {
    const sheet = workbook.addWorksheet(`Mensuel ${monthly.annee}`)
    const columnCount = activityColumns.length + 2
    const headerRowNumber = 11
    const monthNames = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
    ]

    sheet.columns = [
      { header: 'Mois', key: 'mois', width: 14 },
      ...activityColumns.map((column) => ({ header: column.header, key: column.key, width: column.width })),
      { header: 'Total mensuel', key: 'total', width: 18 },
    ]

    buildRepublicHeader(sheet, columnCount)
    buildDeviseLine(sheet, columnCount)
    buildSeparatorLine(sheet, columnCount, 3)
    buildInstitutionLine(sheet, columnCount, 4, hospital)
    buildContactLine(sheet, columnCount, 5, hospital)
    buildSeparatorLine(sheet, columnCount, 6)
    buildTitleAndDate(sheet, columnCount, 8, `Indicateurs mensuels ${monthly.annee}`, 9)

    const headerRow = sheet.getRow(headerRowNumber)
    sheet.columns.forEach((column, index) => {
      const cell = headerRow.getCell(index + 1)
      cell.value = (column as { header?: string }).header ?? ''
      cell.font = { bold: true, color: { argb: COLORS.WHITE }, size: FONT.HEADER_ROW_SIZE, name: FONT.FAMILY }
      cell.fill = HEADER_FILL
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
      cell.border = THIN_GREY_BORDER
    })
    headerRow.height = 30

    const byMetric = new Map<string, (typeof monthly.lignes)[number]>(
      monthly.lignes.map((ligne) => [ligne.metric, ligne]),
    )

    for (let month = 0; month < 12; month += 1) {
      const values = [
        monthNames[month],
        ...activityColumns.map((column) => byMetric.get(column.key)?.mois[month] ?? ''),
        monthly.totaux_mois[month] ?? '',
      ]
      const row = sheet.addRow(values)
      row.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
        cell.border = THIN_GREY_BORDER
        cell.font = { size: FONT.DATA_SIZE, name: FONT.FAMILY }
        cell.alignment = columnNumber === 1
          ? { horizontal: 'left', vertical: 'middle' }
          : { horizontal: 'right', vertical: 'middle' }
        if (columnNumber > 1 && typeof cell.value === 'number') cell.numFmt = '0'
      })
      if (month % 2 === 1) row.eachCell({ includeEmpty: true }, (cell) => { cell.fill = ZEBRA_FILL })
    }

    const totalRow = sheet.addRow([
      'Total',
      ...activityColumns.map((column) => byMetric.get(column.key)?.total ?? '—'),
      monthly.total ?? '—',
    ])
    totalRow.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
      cell.border = THIN_GREY_BORDER
      cell.fill = LABEL_FILL
      cell.font = { bold: true, size: FONT.HEADER_ROW_SIZE, color: { argb: COLORS.DARK_BLUE }, name: FONT.FAMILY }
      cell.alignment = columnNumber === 1
        ? { horizontal: 'left', vertical: 'middle' }
        : { horizontal: 'right', vertical: 'middle' }
      if (columnNumber > 1 && typeof cell.value === 'number') cell.numFmt = '0'
    })

    sheet.views = [{ state: 'frozen', ySplit: headerRowNumber, xSplit: 0, activeCell: 'A12' }]
    sheet.pageSetup = { ...PAGE_SETUP_LANDSCAPE, printTitlesRow: `${headerRowNumber}:${headerRowNumber}` }
  }

  async exportPayslipPdf(params: { userId: number; periode: string }): Promise<string> {
    if (!this.salaireService) throw new Error('Service de paie indisponible')
    const payslip = await this.salaireService.getPayslip(params?.userId, params?.periode)
    const [hospital, logo] = await Promise.all([
      this.settingsService.getHospitalInfo(),
      this.logoService.getLogoBase64(),
    ])
    const html = this.buildPayslipHtml(payslip, hospital, logo)
    const buffer = await this.generatePdf(html)
    const safe = `fiche-paie-${payslip.employee.nom}-${payslip.employee.prenom}-${payslip.periode}.pdf`
      .replace(/[^A-Za-z0-9\-_.]/g, '_')
    return this.saveFile(buffer, safe, [{ name: 'PDF', extensions: ['pdf'] }])
  }

  async exportReceiptPdf(params: { payment_id?: number; numero_recu?: string }): Promise<string> {
    const recu = await this.invoiceService.getRecu(params)
    if (!recu) throw new Error('Reçu introuvable')
    const [hospital, logo] = await Promise.all([
      this.settingsService.getHospitalInfo(),
      this.logoService.getLogoBase64(),
    ])
    const html = this.buildReceiptHtml(recu, hospital, logo)
    const buffer = await this.generatePdf(html)
    const safe = `recu-${(recu.payment.numero_recu ?? 'recu').replace(/[^A-Za-z0-9\-_]/g, '_')}.pdf`
    return this.saveFile(buffer, safe, [{ name: 'PDF', extensions: ['pdf'] }])
  }


  // ═══════════════════ Reçus de service (laboratoire / pharmacie) ═══════════════════

  private async loadRecuLaboratoire(id: number): Promise<RecuServiceDto> {
    if (!this.laboratoireService) throw new Error('Service laboratoire indisponible')
    return this.laboratoireService.getRecu(id)
  }

  private async loadRecuPharmacie(id: number): Promise<RecuServiceDto> {
    if (!this.dispensationService) throw new Error('Service pharmacie indisponible')
    return this.dispensationService.getRecuVente(id)
  }

  /** Aperçu HTML du reçu de service d'une demande de laboratoire. */
  async previewLaboRecuHtml(id: number): Promise<string> {
    return this.buildRecuServiceHtml(await this.loadRecuLaboratoire(id))
  }

  /** PDF du reçu de service d'une demande de laboratoire. */
  async exportLaboRecuPdf(id: number): Promise<string> {
    const recu = await this.loadRecuLaboratoire(id)
    const html = await this.buildRecuServiceHtml(recu)
    const buffer = await this.generatePdf(html, RECU_SERVICE_PDF_MARGINS)
    const safe = `recu-laboratoire-${recu.ref}`.replace(/[^A-Za-z0-9\-_.]/g, '_')
    return this.saveFile(buffer, `${safe}.pdf`, [{ name: 'PDF', extensions: ['pdf'] }])
  }

  /** Aperçu HTML du reçu de service d'une vente pharmacie. */
  async previewPharmacieRecuHtml(id: number): Promise<string> {
    return this.buildRecuServiceHtml(await this.loadRecuPharmacie(id))
  }

  /** PDF du reçu de service d'une vente pharmacie. */
  async exportPharmacieRecuPdf(id: number): Promise<string> {
    const recu = await this.loadRecuPharmacie(id)
    const html = await this.buildRecuServiceHtml(recu)
    const buffer = await this.generatePdf(html, RECU_SERVICE_PDF_MARGINS)
    const safe = `recu-pharmacie-${recu.ref}`.replace(/[^A-Za-z0-9\-_.]/g, '_')
    return this.saveFile(buffer, `${safe}.pdf`, [{ name: 'PDF', extensions: ['pdf'] }])
  }

  /** Rendu commun des reçus de service (aperçu et PDF strictement identiques). */
  private async buildRecuServiceHtml(recu: RecuServiceDto): Promise<string> {
    const [hospital, logo] = await Promise.all([
      this.settingsService.getHospitalInfo(),
      this.logoService.getLogoBase64(),
    ])
    const h = {
      name: hospital?.name || 'Clinique Diabète & Endocrinologie',
      address: hospital?.address || 'Conakry, République de Guinée',
      phone: hospital?.phone || '+224 000 00 00 00',
      email: hospital?.email || '',
      city: hospital?.city || 'Conakry',
      regNumber: hospital?.regNumber || '',
    }

    const serviceLabel = recu.service === 'laboratoire' ? 'Laboratoire' : 'Pharmacie'
    const header = generateMedicalHeader(h, logo ?? null, 'REÇU DE SERVICE', recu.ref)
    const footer = generateFooter()
    const genDate = new Date().toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    })
    const esc = (value: unknown): string => String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')

    const MODES: Record<string, string> = {
      espece: 'Espèces',
      'espèces': 'Espèces',
      mobile_money: 'Mobile Money',
      carte: 'Carte bancaire',
      carte_bancaire: 'Carte bancaire',
      virement: 'Virement',
      cheque: 'Chèque',
      'chèque': 'Chèque',
      exonere: 'Exonéré',
      assurance: 'Assurance',
      autre: 'Autre',
    }
    const STATUTS: Record<string, string> = {
      non_paye: 'Non payé',
      partiel: 'Partiellement payé',
      paye: 'Payé',
      exonere: 'Exonéré',
    }

    const formatDate = (value: string): string => {
      const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value ?? ''))
      return match ? `${match[3]}/${match[2]}/${match[1]}` : esc(value || '—')
    }

    let qr = ''
    try {
      qr = await QRCode.toDataURL(
        `${serviceLabel}|${recu.ref}|${recu.montantTotal}|${recu.date}`,
        { margin: 0, width: 96 },
      )
    } catch {
      // Le QR code est décoratif : une erreur ne doit pas bloquer le document.
      qr = ''
    }

    const ligneRows = recu.lignes.length > 0
      ? recu.lignes.map((ligne) => `
        <tr>
          <td>${esc(ligne.label)}</td>
          <td style="text-align:center">${esc(ligne.quantite)}</td>
          <td style="text-align:right">${this.fmt(ligne.prixUnitaire)}</td>
          <td style="text-align:right;font-weight:600">${this.fmt(ligne.montant)}</td>
        </tr>`).join('')
      : '<tr><td colspan="4" style="text-align:center;color:#777">Aucune prestation enregistrée</td></tr>'

    const paiementRows = recu.paiements.length > 0
      ? `<table class="payments">
          <thead><tr><th>Date</th><th>Mode</th><th>N° reçu</th><th>Référence</th><th style="text-align:right">Montant</th></tr></thead>
          <tbody>
            ${recu.paiements.map((paiement) => `
              <tr>
                <td>${formatDate(paiement.date)}</td>
                <td>${esc(MODES[paiement.mode] ?? paiement.mode)}</td>
                <td>${esc(paiement.numeroRecu || '—')}</td>
                <td>${esc(paiement.reference || '—')}</td>
                <td style="text-align:right;font-weight:600">${this.fmt(paiement.montant)}</td>
              </tr>`).join('')}
          </tbody>
        </table>`
      : ''

    // Bandeau d'identité : les champs s'alignent horizontalement (4 colonnes)
    // pour occuper toute la largeur de la page, comme sur les autres reçus.
    const champs: Array<{ label: string; value: string; strong?: boolean }> = [
      {
        label: 'Patient',
        value: [recu.patientPrenom, recu.patientNom].filter(Boolean).join(' ') || '—',
        strong: true,
      },
      ...(recu.patientNip ? [{ label: 'NIP', value: recu.patientNip }] : []),
      ...(recu.patientTelephone ? [{ label: 'Téléphone', value: recu.patientTelephone }] : []),
      { label: 'Service', value: serviceLabel },
      ...(recu.origine ? [{ label: 'Origine', value: recu.origine }] : []),
      { label: 'Date', value: formatDate(recu.date) },
      ...(recu.prescripteur ? [{ label: 'Prescripteur', value: recu.prescripteur }] : []),
      ...(recu.statut ? [{ label: 'Statut', value: recu.statut }] : []),
    ]
    const identite = champs.map((champ) => `
      <div class="identity__item">
        <span>${esc(champ.label)}</span>
        <strong${champ.strong ? ' class="identity__strong"' : ''}>${esc(champ.value)}</strong>
      </div>`).join('')

    const totaux = recu.factureAuDossier
      ? `
      <tr><td>Montant total</td><td style="text-align:right">${this.fmt(recu.montantTotal)}</td></tr>
      <tr class="grand"><td>Règlement</td><td style="text-align:right"><span class="badge badge--exo">Facturé au dossier patient</span></td></tr>`
      : `
      <tr><td>Montant total</td><td style="text-align:right">${this.fmt(recu.montantTotal)}</td></tr>
      <tr><td>Montant réglé</td><td style="text-align:right">${this.fmt(recu.montantPaye)}</td></tr>
      <tr><td>Reste dû</td><td style="text-align:right">${this.fmt(recu.reste)}</td></tr>
      <tr class="grand"><td>Statut</td><td style="text-align:right">
        <span class="badge ${recu.statutPaiement === 'paye' ? 'badge--ok' : recu.statutPaiement === 'partiel' ? 'badge--part' : recu.statutPaiement === 'exonere' ? 'badge--exo' : 'badge--no'}">${esc(STATUTS[recu.statutPaiement] ?? recu.statutPaiement)}</span>
      </td></tr>`

    return `<!doctype html><html lang="fr"><head><meta charset="utf-8" />
    <style>
      @page { size: A4 portrait; margin: 15mm 15mm 15mm 15mm; @bottom-center { content: "— Page " counter(page) " / " counter(pages) " —"; font-family: Arial, Helvetica, sans-serif; font-size: 9px; color: #888; } }
      body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:0;padding:0;line-height:1.4;-webkit-print-color-adjust:exact;print-color-adjust:exact}
      .republique{text-align:center;margin-bottom:4px} .rep-devise{font-size:13px;font-weight:700;letter-spacing:1.5px;color:#0b3b6b} .rep-devise-sub{font-size:10px;font-weight:600;color:#555;letter-spacing:.8px}
      .separator{text-align:center;font-size:11px;color:#999;margin:4px 0}
      .header{display:flex;align-items:center;margin:6px 0 4px} .header-text{flex:1}
      .institution-name{font-size:16px;font-weight:700;color:#0b3b6b} .institution-addr,.institution-contact,.institution-reg{font-size:10px;color:#555;margin-top:1px}
      .doc-title-block{margin:6px 0 10px;display:flex;justify-content:space-between;align-items:baseline} .doc-title{font-size:18px;font-weight:800;color:#0b3b6b;letter-spacing:2px} .doc-meta{text-align:right;font-size:9px;color:#777;line-height:1.6} .doc-ref{display:block;font-family:'Courier New',monospace;font-weight:600;color:#555} .doc-date{display:block}
      *{box-sizing:border-box}
      .identity{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px 18px;border:1px solid #ccc;border-radius:8px;padding:10px 16px;margin-top:8px;font-size:12.5px}
      .identity__item{min-width:0}
      .identity__item span{font-size:9px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:#0b3b6b;display:block;margin-bottom:2px}
      .identity__item strong{display:block;font-weight:600;overflow-wrap:anywhere}
      .identity__strong{font-weight:800}
      table{width:100%;border-collapse:collapse;margin-top:10px} td,th{border:1px solid #ddd;padding:7px;font-size:12.5px} th{background:#f2f6fb;text-align:left}
      .payments th{background:#f8fafc;font-size:11px}
      .totals{margin-top:10px;margin-left:auto;width:52%}
      .totals tr td{border:none;padding:3px 8px;font-size:13px} .totals tr.grand td{border-top:2px solid #0b3b6b;font-weight:800;font-size:15px;color:#0b3b6b}
      .badge{display:inline-block;padding:2px 10px;border-radius:999px;font-size:11px;font-weight:700}
      .badge--ok{background:#e7f6ec;color:#1c7c3c;border:1px solid #b7e0c3}
      .badge--part{background:#fff5e5;color:#a15c00;border:1px solid #f0d19a}
      .badge--no{background:#fdecec;color:#b42318;border:1px solid #f3c0bc}
      .badge--exo{background:#eef2f7;color:#33475b;border:1px solid #cbd5e1}
      .words{border:1px solid #e2e8f0;background:#f8fafc;border-radius:8px;padding:8px 14px;margin-top:8px;font-size:12px}
      .sign{display:flex;justify-content:space-between;align-items:flex-end;margin-top:26px;font-size:12.5px} .stamp{border:2px dashed #1a5fb4;border-radius:8px;padding:14px 22px;color:#1a5fb4;font-weight:700}
      .qr{display:flex;justify-content:flex-end;margin-top:2px} .qr img{width:70px;height:70px}
      .footer{text-align:center;font-size:8px;color:#aaa;margin-top:12px;border-top:1px solid #ddd;padding-top:6px} .gen-date{text-align:center;font-size:9px;color:#888;margin-top:3px}
      /* À l'écran, @page est ignoré : on reproduit les marges du PDF pour que
         l'aperçu présente exactement la même page que le document imprimé. */
      @media screen { body{padding:15mm} }
      @media print { thead{display:table-header-group} tr{page-break-inside:avoid} }
    </style></head><body>
    ${header}
    <div class="identity">${identite}</div>
    <table>
      <thead><tr><th>Désignation</th><th style="width:60px;text-align:center">Qté</th><th style="width:130px;text-align:right">Prix unitaire</th><th style="width:140px;text-align:right">Montant</th></tr></thead>
      <tbody>${ligneRows}</tbody>
    </table>
    <table class="totals">
      ${totaux}
    </table>
    ${paiementRows}
    <div class="words"><strong>Montant total en lettres :</strong> <em>${esc(montantEnLettres(recu.montantTotal))}</em></div>
    ${qr ? `<div class="qr"><img src="${qr}" alt="QR code du reçu" /></div>` : ''}
    <div class="sign">
      <div><strong>Le caissier(ère)</strong><br/>${esc(recu.caissier || '—')}<br/><br/>Signature :</div>
      <div class="stamp">CACHET DE LA CLINIQUE</div>
    </div>
    ${footer}
    <div class="gen-date">Document généré par CDE le ${genDate} — Conservez ce reçu, il fait foi en cas de réclamation.</div>
    </body></html>`
  }

  private buildPayslipHtml(payslip: SalairePayslipDto, hospital: any, logo: string | null): string {
    const h = {
      name: hospital?.name || 'Clinique Diabète & Endocrinologie',
      address: hospital?.address || 'Conakry, République de Guinée',
      phone: hospital?.phone || '+224 000 00 00 00',
      email: hospital?.email || '',
      city: hospital?.city || 'Conakry',
      regNumber: hospital?.regNumber || '',
    }
    const employee = payslip.employee
    const header = generateMedicalHeader(h, logo ?? null, 'FICHE DE PAIE', `PAIE-${payslip.periode}-${employee.userId}`)
    const footer = generateFooter()
    const genDate = new Date().toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    })
    const escapeHtml = (value: string): string => value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')

    const MONTH_NAMES = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
    ]
    const MODE_LABELS: Record<string, string> = {
      'espèces': 'Espèces',
      'mobile_money': 'Mobile Money',
      'carte_bancaire': 'Carte bancaire',
      'chèque': 'Chèque',
      'virement': 'Virement',
      'assurance': 'Assurance',
      'autre': 'Autre',
    }

    const formatPeriode = (value: string): string => {
      const raw = String(value ?? '').trim()
      const match = /^(\d{4})-(\d{2})$/.exec(raw)
      if (!match) return raw || '—'
      const monthIndex = Number(match[2]) - 1
      if (monthIndex < 0 || monthIndex > 11) return raw
      return `${MONTH_NAMES[monthIndex]} ${match[1]} (${match[1]}-${match[2]})`
    }

    const formatDateLongue = (value?: string | null): string => {
      const raw = String(value ?? '').trim()
      const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw)
      if (!match) return '—'
      const year = Number(match[1])
      const monthIndex = Number(match[2]) - 1
      const day = Number(match[3])
      const date = new Date(Date.UTC(year, monthIndex, day))
      if (
        monthIndex < 0 || monthIndex > 11 ||
        date.getUTCFullYear() !== year ||
        date.getUTCMonth() !== monthIndex ||
        date.getUTCDate() !== day
      ) return '—'
      return `${day} ${MONTH_NAMES[monthIndex].toLowerCase()} ${year} (${match[3]}/${match[2]}/${match[1]})`
    }

    const rubriqueRows = payslip.rubriques.map((rubrique) => {
      const base = rubrique.type === 'journalier'
        ? `${this.fmt(rubrique.montantJour ?? 0)} × ${rubrique.jours ?? 0} j`
        : this.fmt(rubrique.montant)
      const libelle = escapeHtml(String(rubrique.libelle ?? ''))
      const mention = rubrique.impactNet
        ? ''
        : ' <span style="color:#a15c00;font-size:9px">(informatif)</span>'
      return `<tr><td>${libelle}${mention}</td><td style="text-align:center">${base}</td><td style="text-align:right;font-weight:600">${this.fmt(rubrique.montantCalcule)}</td></tr>`
    }).join('')

    const paiement = payslip.paiement
      ? `<div class="box"><strong>Paiement :</strong> ${escapeHtml(MODE_LABELS[String(payslip.paiement.modePaiement ?? '')] ?? '—')} — Payé le ${escapeHtml(formatDateLongue(payslip.paiement.datePaiement))}${payslip.paiement.reference ? ` — Réf : ${escapeHtml(payslip.paiement.reference)}` : ''}</div>`
      : '<div class="box"><strong>Paiement :</strong> non réglé à ce jour</div>'

    return `<!doctype html><html lang="fr"><head><meta charset="utf-8" />
    <style>
      @page { size: A4 portrait; margin: 15mm 15mm 20mm 15mm; @bottom-center { content: "— Page " counter(page) " / " counter(pages) " —"; font-family: Arial, Helvetica, sans-serif; font-size: 9px; color: #888; } }
      body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:0;padding:0;line-height:1.4;-webkit-print-color-adjust:exact;print-color-adjust:exact}
      .header{display:flex;align-items:center;margin:6px 0 4px} .header-text{flex:1}
      .institution-name{font-size:16px;font-weight:700;color:#0b3b6b} .institution-addr,.institution-contact,.institution-reg{font-size:10px;color:#555;margin-top:1px}
      .doc-title-block{margin:8px 0 12px;display:flex;justify-content:space-between;align-items:baseline} .doc-title{font-size:18px;font-weight:800;color:#0b3b6b;letter-spacing:2px} .doc-meta{text-align:right;font-size:9px;color:#777;line-height:1.6} .doc-ref{display:block;font-family:'Courier New',monospace;font-weight:600;color:#555}
      .box{border:1px solid #ccc;border-radius:8px;padding:12px 16px;margin-top:14px;font-size:13px}
      .employee{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));align-items:center;gap:0}
      .employee div{min-width:0;padding:0 14px;font-size:12px;font-weight:500;line-height:1.35;color:#111;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;border-right:1px solid #E5E5E5}
      .employee div:first-child{padding-left:0} .employee div:last-child{border-right:none;padding-right:0}
      .employee span{display:block;margin-bottom:3px;font-size:10px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:#0b3b6b}
      .employee strong{font-weight:600;color:#111}
      table{width:100%;border-collapse:collapse;margin-top:12px} td,th{border:1px solid #ddd;padding:8px;font-size:12px} th{background:#f2f6fb;text-align:left}
      .totals{margin-top:12px;margin-left:auto;width:60%}
      .totals tr td{border:none;padding:4px 8px;font-size:13px} .totals tr.net td{border-top:2px solid #0b3b6b;font-weight:800;font-size:15px;color:#0b3b6b}
      .sign{display:flex;justify-content:space-between;margin-top:44px;font-size:13px} .stamp{border:2px dashed #1a5fb4;border-radius:8px;padding:16px 24px;color:#1a5fb4;font-weight:700}
      .footer{text-align:center;font-size:8px;color:#aaa;margin-top:24px;border-top:1px solid #ddd;padding-top:6px} .gen-date{text-align:center;font-size:9px;color:#888;margin-top:4px}
      @media print { thead{display:table-header-group} tr{page-break-inside:avoid} }
    </style></head><body>
    ${header}
    <div class="box employee">
      <div><span>Employé :</span> <strong>${escapeHtml(employee.prenom)} ${escapeHtml(employee.nom)}</strong></div>
      <div><span>Fonction :</span> ${escapeHtml(employee.fonction || roleLabel(employee.role))}</div>
      <div><span>Sécurité sociale :</span> ${escapeHtml(employee.numeroSecuriteSociale || '—')}</div>
      <div><span>Contrat :</span> ${escapeHtml(employee.typeContrat || '—')}</div>
      <div><span>Temps travaillé :</span> ${employee.tempsTravail === 'PARTIEL' ? 'Temps partiel' : 'Temps plein'}</div>
      <div><span>Période :</span> <strong>${escapeHtml(formatPeriode(payslip.periode))}</strong></div>
    </div>
    <table>
      <thead><tr><th>Rubrique</th><th style="text-align:center;width:30%">Base / Jours</th><th style="text-align:right;width:25%">Montant</th></tr></thead>
      <tbody>
        <tr><td>Salaire de base</td><td style="text-align:center">—</td><td style="text-align:right;font-weight:600">${this.fmt(payslip.base)}</td></tr>
        ${rubriqueRows}
      </tbody>
    </table>
    <table class="totals">
      <tr><td>Total mensuel (toutes rubriques)</td><td style="text-align:right">${this.fmt(payslip.totalMensuel)}</td></tr>
      ${payslip.totalInformations > 0 ? `<tr><td>dont rubriques informatives (sans impact net)</td><td style="text-align:right">${this.fmt(payslip.totalInformations)}</td></tr>` : ''}
      <tr class="net"><td>NET À PAYER</td><td style="text-align:right">${this.fmt(payslip.netAPayer)}</td></tr>
    </table>
    ${paiement}
    <div class="sign"><div><strong>L'employeur</strong><br/>Nom et signature :</div><div><strong>L'employé(e)</strong><br/>${escapeHtml(employee.prenom)} ${escapeHtml(employee.nom)}<br/><br/>Signature :</div><div class="stamp">CACHET DE LA CLINIQUE</div></div>
    ${footer}
    <div class="gen-date">Document généré par CDE le ${genDate}</div>
    </body></html>`
  }

  private fmt(n: number): string {
    return `${Math.round(n ?? 0).toLocaleString('fr-FR')} GNF`
  }

  private buildReceiptHtml(recu: any, hospital: any, logo: string | null): string {
    const p = recu.payment
    const h = {
      name: hospital?.name || 'Clinique Diabète & Endocrinologie',
      address: hospital?.address || 'Conakry, République de Guinée',
      phone: hospital?.phone || '+224 000 00 00 00',
      email: hospital?.email || '',
      city: hospital?.city || 'Conakry',
      regNumber: hospital?.regNumber || '',
    }
    const docRef = p.numero_recu ?? 'RECU'
    const header = generateMedicalHeader(h, logo ?? null, 'REÇU', docRef)
    const footer = generateFooter()
    const genDate = new Date().toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    return `<!doctype html><html lang="fr"><head><meta charset="utf-8" />
    <style>
      @page { size: A4 portrait; margin: 15mm 15mm 20mm 15mm; @bottom-center { content: "— Page " counter(page) " / " counter(pages) " —"; font-family: Arial, Helvetica, sans-serif; font-size: 9px; color: #888; } }
      body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:0;padding:0;line-height:1.4;-webkit-print-color-adjust:exact;print-color-adjust:exact}
      .republique{text-align:center;margin-bottom:4px} .rep-devise{font-size:13px;font-weight:700;letter-spacing:1.5px;color:#0b3b6b} .rep-devise-sub{font-size:10px;font-weight:600;color:#555;letter-spacing:.8px}
      .separator{text-align:center;font-size:11px;color:#999;margin:4px 0}
      .header{display:flex;align-items:center;margin:6px 0 4px} .header-text{flex:1}
      .institution-name{font-size:16px;font-weight:700;color:#0b3b6b} .institution-addr,.institution-contact,.institution-reg{font-size:10px;color:#555;margin-top:1px}
      .doc-title-block{margin:8px 0 12px;display:flex;justify-content:space-between;align-items:baseline} .doc-title{font-size:18px;font-weight:800;color:#0b3b6b;letter-spacing:2px} .doc-meta{text-align:right;font-size:9px;color:#777;line-height:1.6} .doc-ref{display:block;font-family:'Courier New',monospace;font-weight:600;color:#555} .doc-date{display:block}
      .box{border:1px solid #ccc;border-radius:8px;padding:12px 16px;margin-top:16px;font-size:13px} table{width:100%;border-collapse:collapse;margin-top:12px} td,th{border:1px solid #ddd;padding:8px;font-size:13px} th{background:#f2f6fb;text-align:left} .sign{display:flex;justify-content:space-between;margin-top:48px;font-size:13px} .stamp{border:2px dashed #1a5fb4;border-radius:8px;padding:16px 24px;color:#1a5fb4;font-weight:700} .footer{text-align:center;font-size:8px;color:#aaa;margin-top:24px;border-top:1px solid #ddd;padding-top:6px} .gen-date{text-align:center;font-size:9px;color:#888;margin-top:4px}
      @media print { thead{display:table-header-group} tr{page-break-inside:avoid} }
    </style></head><body>
    ${header}
    <div class="box"><strong>Facture :</strong> ${recu.invoice_numero ?? ''} du ${recu.invoice_date ?? ''} &nbsp;•&nbsp; <strong>Patient :</strong> ${recu.patient_prenom ?? ''} ${recu.patient_nom ?? ''}${recu.patient_nip ? ` (NIP ${recu.patient_nip})` : ''}${recu.assurance_nom ? ` &nbsp;•&nbsp; <strong>Assurance :</strong> ${recu.assurance_nom}` : ''}</div>
    <table><tr><th>Désignation</th><th style="text-align:right">Montant</th></tr>
    <tr><td>Paiement facture ${recu.invoice_numero ?? ''} — ${p.mode_paiement ?? ''}${p.reference ? ` (Réf : ${p.reference})` : ''}</td><td style="text-align:right;font-weight:700">${this.fmt(p.montant)}</td></tr></table>
    <div class="box"><strong>Montant en lettres :</strong> <em>${recu.montant_lettres ?? montantEnLettres(p.montant ?? 0)}</em><br/><strong>Mode de paiement :</strong> ${p.mode_paiement ?? '—'}${p.reference ? ` — Réf : ${p.reference}` : ''}<br/><strong>Total facture :</strong> ${this.fmt(recu.invoice_total ?? 0)} &nbsp;•&nbsp; <strong>Reste dû :</strong> ${this.fmt(recu.reste_du ?? 0)}<br/><strong>Caissier(ère) :</strong> ${recu.caissier_nom ?? '—'}</div>
    <div class="sign"><div><strong>Caissier(ère)</strong><br/>${recu.caissier_nom ?? '—'}<br/><br/>Signature :</div><div class="stamp">CACHET DE LA CLINIQUE</div></div>
    ${footer}
    <div class="gen-date">Document généré par CDE le ${genDate}</div>
    </body></html>`
  }
}
