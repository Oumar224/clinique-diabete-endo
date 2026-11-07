/**
 * Decode a base64 string (optionally with a data URI prefix) and return the
 * exact decoded size in bytes.
 *
 * Strips data-URI prefixes and whitespace, then removes base64 padding from
 * the mathematical decoded length so a file of exactly N bytes is never
 * over-counted.
 */
export function getBase64DecodedSize(base64Str: string): number {
  const raw = base64Str.replace(/^data:[^;]+;base64,/, '').replace(/\s/g, '')
  const padding = raw.endsWith('==') ? 2 : raw.endsWith('=') ? 1 : 0
  return Math.floor((raw.length * 3) / 4) - padding
}
