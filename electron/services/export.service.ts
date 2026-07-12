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
import { PatientEntity } from '../entities/patient.entity'
import { generateUserListHtml, generateUserProfileHtml, generatePatientProfileHtml, generateCrhDiabeteHtml } from '../export-templates'
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

  async exportCrhDiabetePdf(documentId: string): Promise<string> {
    const doc = await this.clinicalDocumentService.getDocumentById(documentId)
    if (!doc) throw new Error('Document introuvable')

    const patientId = await this.clinicalDocumentService.getPatientIdByDocument(doc.contactId)
    const { patient, hospital, logo } = await this.patientExportService.enrich(patientId)

    const contact = {
      id: doc.contactId,
      service_name: doc.serviceId ?? undefined,
    }

    const formData = doc.formData ? JSON.parse(doc.formData) : {}

    let signedByName: string | undefined
    if (doc.signedBy) {
      const user = await this.authService.getUserById(Number(doc.signedBy))
      signedByName = user ? `${user.prenom || ''} ${(user.nom || '').toUpperCase()}`.trim() : undefined
    }

    const html = generateCrhDiabeteHtml(formData, patient, contact, hospital as any, logo, doc.signedAt ?? undefined, signedByName)
    const buffer = await this.generatePdf(html, { top: 0, bottom: 0, left: 0, right: 0 })
    const safeName = `crh-${patient.nom || 'inconnu'}-${patient.prenom || ''}.pdf`.replace(/[^a-zA-Z0-9\-_.]/g, '_')
    return this.saveFile(buffer, safeName, [
      { name: 'PDF', extensions: ['pdf'] },
    ])
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
    win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
    await new Promise<void>((resolve) => {
      win.webContents.on('did-finish-load', () => resolve())
    })
    const buffer = await win.webContents.printToPDF({
      printBackground: true,
      margins: margins ?? { top: 0.79, bottom: 0.79, left: 0.59, right: 0.59 },
    })
    win.close()
    return buffer
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
