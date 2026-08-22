// Guinea date format: DD/MM/YYYY
export function formatDate(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return '—'
  // A bare 'YYYY-MM-DD' string is parsed by JS as UTC midnight, which shifts the
  // local getters one day back in negative-offset timezones. Parse it as local
  // midnight instead (same trick as the electron dateFmt `T00:00:00`).
  const d = typeof dateStr === 'string'
    ? dateStr.length === 10
      ? new Date(`${dateStr}T00:00:00`)
      : new Date(dateStr)
    : dateStr
  if (isNaN(d.getTime())) return '—'
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}

/** Format an ISO timestamp or Date to "DD/MM/YYYY HH:mm" (French locale). */
export function formatDateTime(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return '—'
  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr
  if (isNaN(d.getTime())) return '—'
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${day}/${month}/${year} ${hours}:${minutes}`
}
