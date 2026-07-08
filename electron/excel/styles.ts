import type { Borders } from 'exceljs'

export const COLORS = {
  DARK_BLUE: 'FF0B3B6B' as const,
  WHITE: 'FFFFFFFF' as const,
  GREY_BORDER: 'FF999999' as const,
  MEDIUM_GREY: 'FF666666' as const,
  DARK_GREY: 'FF555555' as const,
  LIGHT_GREY: 'FF888888' as const,
  ZEBRA_STRIPE: 'FFF0F4FA' as const,
  LABEL_BG: 'FFE0EAF5' as const,
  SECTION_BG: 'FFF2F6FA' as const,
  BODY_TEXT: 'FF333333' as const,
  HAIRLINE_GREY: 'FFCCCCCC' as const,
} as const

export const FONT = {
  FAMILY: 'Calibri' as const,
  HEADER_SIZE: 14,
  SUBTITLE_SIZE: 11,
  INSTITUTION_SIZE: 12,
  CONTACT_SIZE: 10,
  TITLE_SIZE: 13,
  HEADER_ROW_SIZE: 10,
  DATA_SIZE: 9.5,
  LABEL_SIZE: 10,
  VALUE_SIZE: 10.5,
} as const

export const THIN_GREY_BORDER: Partial<Borders> = {
  top: { style: 'thin', color: { argb: COLORS.GREY_BORDER } },
  bottom: { style: 'thin', color: { argb: COLORS.GREY_BORDER } },
  left: { style: 'thin', color: { argb: COLORS.GREY_BORDER } },
  right: { style: 'thin', color: { argb: COLORS.GREY_BORDER } },
}

export const MEDIUM_BLUE_BOTTOM_BORDER: Partial<Borders> = {
  bottom: { style: 'medium', color: { argb: COLORS.DARK_BLUE } },
}

export const SECTION_TOP_BORDER: Partial<Borders> = {
  top: { style: 'thin', color: { argb: COLORS.DARK_BLUE } },
  bottom: { style: 'thin', color: { argb: COLORS.GREY_BORDER } },
  left: { style: 'thin', color: { argb: COLORS.GREY_BORDER } },
  right: { style: 'thin', color: { argb: COLORS.GREY_BORDER } },
}

export const HAIRLINE_BOTTOM_BORDER: Partial<Borders> = {
  bottom: { style: 'hair', color: { argb: COLORS.HAIRLINE_GREY } },
}

export const HEADER_FILL = {
  type: 'pattern' as const,
  pattern: 'solid' as const,
  fgColor: { argb: COLORS.DARK_BLUE },
}

export const ZEBRA_FILL = {
  type: 'pattern' as const,
  pattern: 'solid' as const,
  fgColor: { argb: COLORS.ZEBRA_STRIPE },
}

export const LABEL_FILL = {
  type: 'pattern' as const,
  pattern: 'solid' as const,
  fgColor: { argb: COLORS.LABEL_BG },
}

export const SECTION_FILL = {
  type: 'pattern' as const,
  pattern: 'solid' as const,
  fgColor: { argb: COLORS.SECTION_BG },
}

export const PAGE_SETUP_LANDSCAPE = {
  paperSize: 9,
  orientation: 'landscape' as const,
  fitToPage: true,
  fitToWidth: 1,
  fitToHeight: 0,
  margins: {
    top: 0.5, bottom: 0.5, left: 0.3, right: 0.3, header: 0.2, footer: 0.2,
  },
}

export const PAGE_SETUP_PORTRAIT = {
  paperSize: 9,
  orientation: 'portrait' as const,
  fitToPage: true,
  fitToWidth: 1,
  fitToHeight: 0,
  margins: {
    top: 0.5, bottom: 0.5, left: 0.3, right: 0.3, header: 0.2, footer: 0.2,
  },
}
