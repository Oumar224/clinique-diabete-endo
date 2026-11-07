const UNITS = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf']
const TENS = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt']

function under100(n: number): string {
  if (n < 20) return UNITS[n]
  const t = Math.floor(n / 10)
  const r = n % 10
  if (t === 7 || t === 9) {
    const base = t === 7 ? 'soixante' : 'quatre-vingt'
    const rest = n - (t === 7 ? 60 : 80)
    if (rest === 11 && t === 7) return `${base}-et-onze`
    return `${base}-${UNITS[rest]}`
  }
  if (r === 0) return t === 8 ? 'quatre-vingts' : TENS[t]
  if (r === 1 && t !== 8) return `${TENS[t]}-et-un`
  if (t === 8) return `${TENS[t]}-${UNITS[r]}`
  return `${TENS[t]}-${UNITS[r]}`
}

function under1000(n: number): string {
  const h = Math.floor(n / 100)
  const rest = n % 100
  if (h > 0) {
    const head = h === 1 ? 'cent' : `${UNITS[h]} cent${rest === 0 ? 's' : ''}`
    return rest > 0 ? `${head} ${under100(rest)}` : head
  }
  return under100(rest)
}

export function nombreEnLettres(n: number): string {
  const v = Math.round(Math.abs(n))
  if (v === 0) return UNITS[0]
  if (v < 1000) return under1000(v)
  const parts: string[] = []
  const milliards = Math.floor(v / 1_000_000_000)
  const millions = Math.floor((v % 1_000_000_000) / 1_000_000)
  const milliers = Math.floor((v % 1_000_000) / 1000)
  const reste = v % 1000
  if (milliards > 0) parts.push(milliards === 1 ? 'un milliard' : `${under1000(milliards)} milliards`)
  if (millions > 0) parts.push(millions === 1 ? 'un million' : `${under1000(millions)} millions`)
  if (milliers > 0) parts.push(milliers === 1 ? 'mille' : `${under1000(milliers)} mille`)
  if (reste > 0) parts.push(under1000(reste))
  return parts.join(' ')
}

const DEVISE_LETTRES: Record<string, string> = {
  GNF: 'francs guinéens',
  XOF: 'francs CFA',
  EUR: 'euros',
  USD: 'dollars américains',
}

export function montantEnLettres(montant: number, codeDevise = 'GNF'): string {
  const devise = DEVISE_LETTRES[codeDevise] ?? 'francs guinéens'
  return `${nombreEnLettres(montant)} ${devise}`.trim()
}
