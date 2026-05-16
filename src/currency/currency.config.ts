export interface CurrencyDef {
  code: string
  symbol: string
  locale: string
  decimals: number
}

export const CURRENCIES: Record<string, CurrencyDef> = {
  GNF: {
    code: 'GNF',
    symbol: 'GNF',
    locale: 'fr-FR',
    decimals: 0,
  },
  EUR: {
    code: 'EUR',
    symbol: '\u20AC',
    locale: 'fr-FR',
    decimals: 2,
  },
}

export function getCurrencyDef(code: string): CurrencyDef {
  return CURRENCIES[code] ?? CURRENCIES.GNF
}
