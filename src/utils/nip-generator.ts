function buildLieuCode(lieuNaissance: string): string {
  // Sanitisation : diacritiques d'abord (« É » → « E », « ñ » → « n »),
  // puis on ne garde que [A-Z0-9] (apostrophes, espaces, tirets supprimés).
  const clean = lieuNaissance
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
  // Padde avec 'X' si moins de 2 caractères valides pour garder un code stable.
  return (clean + 'XX').substring(0, 2)
}

export function generateNip(
  genre: 'M' | 'Mme' | 'Mlle',
  birthDate: string,
  lieuNaissance: string,
): string {
  if (!lieuNaissance) return ''
  const genreCode = genre === 'M' ? '1' : '2'
  const year = birthDate.substring(2, 4)
  const code = buildLieuCode(lieuNaissance)
  const random = Array.from({ length: 5 }, () =>
    String.fromCharCode(65 + Math.floor(Math.random() * 26)),
  ).join('')
  return `${genreCode}${year}${code}${random}`
}
