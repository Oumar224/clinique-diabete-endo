export function getCiviliteSymbol(civilite: string): string {
  if (civilite === 'M') return '\u2642'
  if (civilite === 'Mme' || civilite === 'Mlle') return '\u2640'
  return '\u2642\u2640'
}

export function getCiviliteLabel(civilite: string): string {
  const symbol = getCiviliteSymbol(civilite)
  const label = civilite || 'Non défini'
  return symbol ? `${symbol} ${label}` : label
}
