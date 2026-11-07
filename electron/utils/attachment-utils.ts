import { getBase64DecodedSize } from './file-utils'

/** MIME autorisés pour les pièces jointes de stock / réception. */
export const ALLOWED_ATTACHMENT_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
] as const

export type AllowedAttachmentMimeType = (typeof ALLOWED_ATTACHMENT_MIME_TYPES)[number]

export const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024 // 10 Mo

/** Miroir de la validation de `exam-request.service.ts`. */
const DATA_URI_RE = /^data:([^;]+);base64,([A-Za-z0-9+/=]+)$/

export interface AttachmentInput {
  fileName: string
  fileType: string
  fileSize?: number
  fileData: string
}

export interface ValidatedAttachment {
  fileName: string
  fileType: AllowedAttachmentMimeType
  fileSize: number
  fileData: string
}

function isAllowedMimeType(value: string): value is AllowedAttachmentMimeType {
  return (ALLOWED_ATTACHMENT_MIME_TYPES as readonly string[]).includes(value)
}

const EXTENSION_TO_MIME: Record<string, AllowedAttachmentMimeType> = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

/** Signatures binaires minimales (magic bytes) par type autorisé. */
function hasExpectedMagicBytes(buffer: Buffer, mime: AllowedAttachmentMimeType): boolean {
  switch (mime) {
    case 'application/pdf':
      return buffer.length >= 5 && buffer.subarray(0, 5).toString('ascii') === '%PDF-'
    case 'image/png':
      return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    case 'image/jpeg':
      return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
    case 'image/webp':
      return buffer.length >= 12
        && buffer.subarray(0, 4).toString('ascii') === 'RIFF'
        && buffer.subarray(8, 12).toString('ascii') === 'WEBP'
    default:
      return false
  }
}

/**
 * Valide le nom, le type MIME et la taille d'une pièce jointe base64.
 *
 * La taille est TOUJOURS recalculée depuis le base64 : un `fileSize` fourni
 * par le renderer ne peut pas contourner la limite de 10 Mo.
 */
export function validateAttachmentInput(input: AttachmentInput): ValidatedAttachment {
  const fileName = input.fileName?.trim()
  if (!fileName) throw new Error('Le nom du fichier est requis')
  if (fileName.length > 255) throw new Error('Le nom du fichier ne doit pas dépasser 255 caractères')

  const fileType = input.fileType?.trim().toLowerCase()
  if (!fileType) throw new Error('Le type du fichier est requis')
  if (!isAllowedMimeType(fileType)) {
    throw new Error('Type de fichier non autorisé (PDF, JPEG, PNG ou WebP attendu)')
  }

  const extension = fileName.includes('.') ? fileName.split('.').pop()!.toLowerCase() : ''
  const extensionMime = EXTENSION_TO_MIME[extension]
  if (!extensionMime) {
    throw new Error('Extension de fichier non autorisée (PDF, JPEG, PNG ou WebP attendu)')
  }
  if (extensionMime !== fileType) {
    throw new Error('L’extension du fichier ne correspond pas au type déclaré')
  }

  const match = DATA_URI_RE.exec(input.fileData ?? '')
  if (!match) throw new Error('Format de fichier invalide (data URI base64 attendu)')
  const declaredMime = match[1].toLowerCase()
  if (declaredMime !== fileType) {
    throw new Error('Le type déclaré ne correspond pas au contenu du fichier')
  }

  const fileSize = getBase64DecodedSize(input.fileData)
  if (input.fileSize != null && input.fileSize > MAX_ATTACHMENT_SIZE) {
    throw new Error('La taille du fichier ne doit pas dépasser 10 Mo')
  }
  if (fileSize > MAX_ATTACHMENT_SIZE) {
    throw new Error('La taille du fichier décodé ne doit pas dépasser 10 Mo')
  }

  const decoded = Buffer.from(match[2], 'base64')
  if (!hasExpectedMagicBytes(decoded, fileType)) {
    throw new Error('Le contenu du fichier ne correspond pas au type déclaré')
  }

  return { fileName, fileType, fileSize, fileData: input.fileData }
}
