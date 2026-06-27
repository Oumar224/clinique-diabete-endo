export function generateNip(
  genre: 'M' | 'Mme' | 'Mlle',
  birthDate: string,
  lieuNaissance: string,
): string {
  if (!lieuNaissance) return ''
  const genreCode = genre === 'M' ? '1' : '2'
  const year = birthDate.substring(2, 4)
  const code = lieuNaissance.toUpperCase().substring(0, 2)
  const random = Array.from({ length: 5 }, () =>
    String.fromCharCode(65 + Math.floor(Math.random() * 26)),
  ).join('')
  return `${genreCode}${year}${code}${random}`
}
