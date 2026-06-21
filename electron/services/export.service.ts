import { inject, singleton } from 'tsyringe'
import { BrowserWindow, dialog, app } from 'electron'
import * as path from 'path'
import * as fs from 'fs'
import { AuthService } from './auth.service'
import { SettingsService } from './settings.service'
import { LogoService } from './logo.service'
import { generateUserListHtml, generateUserProfileHtml } from '../export-templates'
import * as ExcelJS from 'exceljs'

@singleton()
export class ExportService {
  constructor(
    @inject(AuthService) private authService: AuthService,
    @inject(SettingsService) private settingsService: SettingsService,
    @inject(LogoService) private logoService: LogoService,
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

    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'CDE'
    workbook.created = new Date()
    const sheet = workbook.addWorksheet('Utilisateurs')

    const columnDefs = [
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
    sheet.columns = columnDefs

    const borderAll: Partial<ExcelJS.Borders> = {
      top: { style: 'thin', color: { argb: 'FF999999' } },
      bottom: { style: 'thin', color: { argb: 'FF999999' } },
      left: { style: 'thin', color: { argb: 'FF999999' } },
      right: { style: 'thin', color: { argb: 'FF999999' } },
    }

    sheet.mergeCells('A1:K1')
    const cellR1 = sheet.getCell('A1')
    cellR1.value = 'RÉPUBLIQUE DE GUINÉE'
    cellR1.font = { bold: true, size: 14, color: { argb: 'FF0B3B6B' }, name: 'Calibri' }
    cellR1.alignment = { horizontal: 'center', vertical: 'middle' }

    sheet.mergeCells('A2:K2')
    const cellR2 = sheet.getCell('A2')
    cellR2.value = 'Travail — Justice — Solidarité'
    cellR2.font = { size: 11, italic: true, color: { argb: 'FF666666' }, name: 'Calibri' }
    cellR2.alignment = { horizontal: 'center', vertical: 'middle' }

    sheet.mergeCells('A3:K3')
    const cellR3 = sheet.getCell('A3')
    cellR3.value = ''
    cellR3.border = {
      bottom: { style: 'medium', color: { argb: 'FF0B3B6B' } },
    }

    const institutionLine = [
      hospital.name || 'Établissement de Santé',
      [hospital.address, hospital.city].filter(Boolean).join(', '),
    ].filter(Boolean).join(' — ')
    sheet.mergeCells('A4:K4')
    const cellR4 = sheet.getCell('A4')
    cellR4.value = institutionLine
    cellR4.font = { bold: true, size: 12, color: { argb: 'FF0B3B6B' }, name: 'Calibri' }

    const contactParts = [`Tél : ${hospital.phone || '—'}`]
    if (hospital.email) contactParts.push(`Email : ${hospital.email}`)
    if (hospital.regNumber) contactParts.push(`N° agrément : ${hospital.regNumber}`)
    sheet.mergeCells('A5:K5')
    const cellR5 = sheet.getCell('A5')
    cellR5.value = contactParts.join('  |  ')
    cellR5.font = { size: 10, color: { argb: 'FF555555' }, name: 'Calibri' }

    sheet.mergeCells('A6:K6')
    const cellR6 = sheet.getCell('A6')
    cellR6.value = ''
    cellR6.border = {
      bottom: { style: 'medium', color: { argb: 'FF0B3B6B' } },
    }

    sheet.mergeCells('A8:K8')
    const titleCell = sheet.getCell('A8')
    const displayDate = new Date().toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'long', year: 'numeric',
    })
    titleCell.value = 'Liste des utilisateurs — Tous les détails'
    titleCell.font = { bold: true, size: 13, color: { argb: 'FF0B3B6B' }, name: 'Calibri' }

    sheet.mergeCells('A9:K9')
    const dateCell = sheet.getCell('A9')
    dateCell.value = `Éditée le ${displayDate}`
    dateCell.font = { italic: true, size: 10, color: { argb: 'FF888888' }, name: 'Calibri' }

    const headerRowNumber = 11
    const headerRow = sheet.getRow(headerRowNumber)
    columnDefs.forEach((col, idx) => {
      const cell = headerRow.getCell(idx + 1)
      cell.value = col.header
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10, name: 'Calibri' }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0B3B6B' } }
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
      cell.border = borderAll
    })
    headerRow.height = 22

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
        cell.border = borderAll
        cell.font = { size: 9.5, name: 'Calibri' }
        cell.alignment = { vertical: 'top', wrapText: true }
      })
      if (i % 2 === 1) {
        row.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F4FA' } }
        })
      }
    })

    const summaryRowNumber = headerRowNumber + users.length + 1
    const summaryRow = sheet.getRow(summaryRowNumber)
    const summaryCell = summaryRow.getCell(1)
    summaryCell.value = `Total : ${users.length} utilisateur${users.length > 1 ? 's' : ''}`
    summaryCell.font = { bold: true, size: 10, color: { argb: 'FF0B3B6B' }, name: 'Calibri' }
    sheet.mergeCells(`A${summaryRowNumber}:K${summaryRowNumber}`)

    if (users.length > 0) {
      sheet.autoFilter = {
        from: { row: headerRowNumber, column: 1 },
        to: { row: headerRowNumber + users.length, column: 11 },
      }
    }

    sheet.views = [
      { state: 'frozen', ySplit: headerRowNumber, xSplit: 0, activeCell: 'A12' },
    ]

    sheet.pageSetup = {
      paperSize: 9,
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: {
        top: 0.5, bottom: 0.5, left: 0.3, right: 0.3, header: 0.2, footer: 0.2,
      },
      printTitlesRow: `${headerRowNumber}:${headerRowNumber}`,
    }

    const buffer = (await workbook.xlsx.writeBuffer()) as unknown as Buffer
    return this.saveFile(buffer, 'liste-utilisateurs.xlsx', [
      { name: 'Excel', extensions: ['xlsx'] },
    ])
  }

  async exportUserProfileExcel(userId: number): Promise<string> {
    const [user, relations] = await Promise.all([
      this.authService.getUserById(userId),
      this.authService.enrichUserWithRelations(userId),
    ])
    if (!user) throw new Error('Utilisateur introuvable')

    const merged = { ...user, ...relations }
    const hospital = await this.settingsService.getHospitalInfo()

    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'CDE'
    workbook.created = new Date()
    const sheet = workbook.addWorksheet('Fiche utilisateur')

    const columnDefs = [
      { header: 'Champ', key: 'label', width: 28 },
      { header: 'Valeur', key: 'value', width: 55 },
    ]
    sheet.columns = columnDefs

    const borderAll: Partial<ExcelJS.Borders> = {
      top: { style: 'thin', color: { argb: 'FF999999' } },
      bottom: { style: 'thin', color: { argb: 'FF999999' } },
      left: { style: 'thin', color: { argb: 'FF999999' } },
      right: { style: 'thin', color: { argb: 'FF999999' } },
    }

    const headerBg = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFE0EAF5' } }
    const sectionBg = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFF2F6FA' } }

    let rowNum = 1

    sheet.mergeCells('A1:B1')
    const c1 = sheet.getCell('A1')
    c1.value = 'RÉPUBLIQUE DE GUINÉE'
    c1.font = { bold: true, size: 14, color: { argb: 'FF0B3B6B' }, name: 'Calibri' }
    c1.alignment = { horizontal: 'center', vertical: 'middle' }

    sheet.mergeCells('A2:B2')
    const c2 = sheet.getCell('A2')
    c2.value = 'Travail — Justice — Solidarité'
    c2.font = { size: 11, italic: true, color: { argb: 'FF666666' }, name: 'Calibri' }
    c2.alignment = { horizontal: 'center', vertical: 'middle' }

    sheet.mergeCells('A3:B3')
    const c3 = sheet.getCell('A3')
    c3.value = hospital.name || 'Établissement de Santé'
    c3.font = { bold: true, size: 12, color: { argb: 'FF0B3B6B' }, name: 'Calibri' }

    sheet.mergeCells('A4:B4')
    const contactParts = [`Tél : ${hospital.phone || '—'}`]
    if (hospital.email) contactParts.push(`Email : ${hospital.email}`)
    if (hospital.address) contactParts.push(hospital.address)
    if (hospital.regNumber) contactParts.push(`N° agrément : ${hospital.regNumber}`)
    const c4 = sheet.getCell('A4')
    c4.value = contactParts.join('  |  ')
    c4.font = { size: 10, color: { argb: 'FF555555' }, name: 'Calibri' }

    rowNum = 5
    sheet.mergeCells(`A${rowNum}:B${rowNum}`)
    sheet.getCell(`A${rowNum}`).border = {
      bottom: { style: 'medium', color: { argb: 'FF0B3B6B' } },
    }

    rowNum = 6
    sheet.mergeCells(`A${rowNum}:B${rowNum}`)
    const titleCell = sheet.getCell(`A${rowNum}`)
    const displayDate = new Date().toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'long', year: 'numeric',
    })
    titleCell.value = `Fiche individuelle — Personnel — ${displayDate}`
    titleCell.font = { bold: true, size: 13, color: { argb: 'FF0B3B6B' }, name: 'Calibri' }

    const m = merged as any
    const fonctionName = m.fonction?.name || m.fonction || ''

    function writeField(label: string, value: string, withBorder = true) {
      rowNum++
      const row = sheet.getRow(rowNum)
      row.getCell(1).value = label
      row.getCell(1).font = { bold: true, size: 10, name: 'Calibri', color: { argb: 'FF333333' } }
      row.getCell(1).fill = headerBg
      row.getCell(2).value = value || '—'
      row.getCell(2).font = { size: 10.5, name: 'Calibri' }
      if (withBorder) {
        row.getCell(1).border = borderAll
        row.getCell(2).border = borderAll
      }
    }

    function writeSection(title: string) {
      rowNum++
      sheet.mergeCells(`A${rowNum}:B${rowNum}`)
      const cell = sheet.getCell(`A${rowNum}`)
      cell.value = title
      cell.font = { bold: true, size: 10, color: { argb: 'FF0B3B6B' }, name: 'Calibri' }
      cell.fill = sectionBg
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF0B3B6B' } },
        bottom: { style: 'thin', color: { argb: 'FF999999' } },
        left: { style: 'thin', color: { argb: 'FF999999' } },
        right: { style: 'thin', color: { argb: 'FF999999' } },
      }
      rowNum++
      sheet.mergeCells(`A${rowNum}:B${rowNum}`)
      sheet.getCell(`A${rowNum}`).border = {
        bottom: { style: 'hair', color: { argb: 'FFCCCCCC' } },
      }
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

    sheet.pageSetup = {
      paperSize: 9,
      orientation: 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: {
        top: 0.5, bottom: 0.5, left: 0.3, right: 0.3, header: 0.2, footer: 0.2,
      },
    }

    const buffer = (await workbook.xlsx.writeBuffer()) as unknown as Buffer
    const safeName = `utilisateur-${user.nom || 'inconnu'}.xlsx`.replace(/[^a-zA-Z0-9\-_.]/g, '_')
    return this.saveFile(buffer, safeName, [
      { name: 'Excel', extensions: ['xlsx'] },
    ])
  }

  private async generatePdf(html: string): Promise<Buffer> {
    const win = new BrowserWindow({ show: false, width: 800, height: 600 })
    win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
    await new Promise<void>((resolve) => {
      win.webContents.on('did-finish-load', () => resolve())
    })
    const buffer = await win.webContents.printToPDF({
      printBackground: true,
      margins: { top: 0.79, bottom: 0.79, left: 0.59, right: 0.59 },
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

function roleLabel(role?: string): string {
  const labels: Record<string, string> = {
    MEDECIN: 'Médecin',
    SECRETAIRE: 'Secrétaire',
    PHARMACIEN: 'Pharmacien',
    COMPTABLE: 'Comptable',
    ADMIN: 'Administrateur',
    INFIRMIER: 'Infirmier d\'État',
  }
  return labels[role || ''] || role || ''
}
