import type { Worksheet } from 'exceljs'
import { COLORS, FONT, MEDIUM_BLUE_BOTTOM_BORDER } from './styles'

interface HospitalInfo {
  name?: string
  address?: string
  city?: string
  phone?: string
  email?: string
  regNumber?: string
}

function darkBlueFont(size: number, bold = false) {
  return { bold, size, color: { argb: COLORS.DARK_BLUE }, name: FONT.FAMILY }
}

export function buildRepublicHeader(sheet: Worksheet, columnCount: number): void {
  sheet.mergeCells(1, 1, 1, columnCount)
  const cell = sheet.getCell('A1')
  cell.value = 'RÉPUBLIQUE DE GUINÉE'
  cell.font = darkBlueFont(FONT.HEADER_SIZE, true)
  cell.alignment = { horizontal: 'center', vertical: 'middle' }
}

export function buildDeviseLine(sheet: Worksheet, columnCount: number): void {
  sheet.mergeCells(2, 1, 2, columnCount)
  const cell = sheet.getCell('A2')
  cell.value = 'Travail — Justice — Solidarité'
  cell.font = { size: FONT.SUBTITLE_SIZE, italic: true, color: { argb: COLORS.MEDIUM_GREY }, name: FONT.FAMILY }
  cell.alignment = { horizontal: 'center', vertical: 'middle' }
}

export function buildSeparatorLine(sheet: Worksheet, columnCount: number, row: number): void {
  sheet.mergeCells(row, 1, row, columnCount)
  const cell = sheet.getCell(`A${row}`)
  cell.value = ''
  cell.border = MEDIUM_BLUE_BOTTOM_BORDER
}

export function buildInstitutionLine(sheet: Worksheet, columnCount: number, row: number, hospital: HospitalInfo): void {
  const institutionLine = [
    hospital.name || 'Établissement de Santé',
    [hospital.address, hospital.city].filter(Boolean).join(', '),
  ].filter(Boolean).join(' — ')
  sheet.mergeCells(row, 1, row, columnCount)
  const cell = sheet.getCell(`A${row}`)
  cell.value = institutionLine
  cell.font = darkBlueFont(FONT.INSTITUTION_SIZE, true)
}

export function buildContactLine(sheet: Worksheet, columnCount: number, row: number, hospital: HospitalInfo): void {
  const contactParts = [`Tél : ${hospital.phone || '—'}`]
  if (hospital.email) contactParts.push(`Email : ${hospital.email}`)
  if (hospital.regNumber) contactParts.push(`N° agrément : ${hospital.regNumber}`)
  sheet.mergeCells(row, 1, row, columnCount)
  const cell = sheet.getCell(`A${row}`)
  cell.value = contactParts.join('  |  ')
  cell.font = { size: FONT.CONTACT_SIZE, color: { argb: COLORS.DARK_GREY }, name: FONT.FAMILY }
}

export function buildTitleAndDate(
  sheet: Worksheet,
  columnCount: number,
  titleRow: number,
  title: string,
  dateRow: number,
): void {
  sheet.mergeCells(titleRow, 1, titleRow, columnCount)
  const titleCell = sheet.getCell(`A${titleRow}`)
  titleCell.value = title
  titleCell.font = darkBlueFont(FONT.TITLE_SIZE, true)

  sheet.mergeCells(dateRow, 1, dateRow, columnCount)
  const dateCell = sheet.getCell(`A${dateRow}`)
  const displayDate = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
  dateCell.value = `Éditée le ${displayDate}`
  dateCell.font = { italic: true, size: FONT.CONTACT_SIZE, color: { argb: COLORS.LIGHT_GREY }, name: FONT.FAMILY }
}

export function buildProfileTitle(
  sheet: Worksheet,
  columnCount: number,
  row: number,
  title: string,
): void {
  sheet.mergeCells(row, 1, row, columnCount)
  const cell = sheet.getCell(`A${row}`)
  const displayDate = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
  cell.value = `${title} — ${displayDate}`
  cell.font = darkBlueFont(FONT.TITLE_SIZE, true)
}
