import { computed } from 'vue'
import { useCurrencies } from '@/composables/useCurrencies'

const {
  currencies,
  defaultCurrency,
  formatCurrency,
  setDefault,
  loadDefault,
  fetchCurrencies,
} = useCurrencies()

const currencyCode = computed(() => defaultCurrency.value)

const CURRENCY_LOCALE: Record<string, string> = {
  GNF: 'fr-FR',
  EUR: 'fr-FR',
  XOF: 'fr-FR',
  USD: 'en-US',
}

const currencyDef = computed(() => {
  const found = currencies.value.find(c => c.code === currencyCode.value)
  if (found) {
    return { code: found.code, symbol: found.symbol, locale: CURRENCY_LOCALE[found.code] || 'fr-FR', decimals: found.decimals }
  }
  return { code: 'GNF', symbol: 'GNF', locale: 'fr-FR', decimals: 0 }
})

export function useCurrency() {
  async function loadCurrency(): Promise<void> {
    await loadDefault()
    if (currencies.value.length === 0) {
      await fetchCurrencies()
    }
  }

  async function setCurrency(code: string): Promise<void> {
    await setDefault(code)
  }

  return {
    currencyCode,
    currencyDef,
    loadCurrency,
    setCurrency,
    formatCurrency: (amount: number) => formatCurrency(amount),
  }
}
