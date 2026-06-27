/**
 * Decode a base64 string (optionally with a data URI prefix) and return the
 * decoded size in bytes.
 *
 * Uses a padding-agnostic approximation (ceil(length * 3 / 4)) which is
 * within 2 bytes of the true size — more than adequate for size-limit checks.
 */
export function getBase64DecodedSize(base64Str: string): number {
  const raw = base64Str.replace(/^data:[^;]+;base64,/, '')
  return Math.ceil((raw.length * 3) / 4)
}
