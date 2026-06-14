import { ref } from 'vue'
import { ipcInvoke } from '@/utils/ipc'

export interface CurrencyDto {
  code: string
  symbol: string
  name: string
  decimals: number
}

const CURRENCY_LOCALE: Record<string, string> = {
  GNF: 'fr-FR',
  EUR: 'fr-FR',
  XOF: 'fr-FR',
  USD: 'en-US',
}

const currencies = ref<CurrencyDto[]>([])
const defaultCurrency = ref('GNF')
const loading = ref(false)
const loaded = ref(false)

const currencyMap = ref<Record<string, CurrencyDto>>({})

function buildCurrencyMap() {
  const map: Record<string, CurrencyDto> = {}
  for (const c of currencies.value) {
    map[c.code] = c
  }
  currencyMap.value = map
}

export function useCurrencies() {
  async function fetchCurrencies(): Promise<void> {
    loading.value = true
    try {
      currencies.value = await ipcInvoke<CurrencyDto[]>('currency:list')
      buildCurrencyMap()
      await loadDefault()
    } catch {
      // fallback to hardcoded defaults
      currencies.value = [
        { code: 'GNF', symbol: 'GNF', name: 'Franc Guinéen', decimals: 0 },
        { code: 'EUR', symbol: '€', name: 'Euro', decimals: 2 },
        { code: 'USD', symbol: '$', name: 'Dollar US', decimals: 2 },
        { code: 'XOF', symbol: 'CFA', name: 'Franc CFA', decimals: 0 },
      ]
      buildCurrencyMap()
    } finally {
      loading.value = false
      loaded.value = true
    }
  }

  async function loadDefault(): Promise<void> {
    try {
      const result = await ipcInvoke<{ value?: string }>('settings:get', { key: 'currency' })
      if (result?.value) {
        defaultCurrency.value = result.value
      }
    } catch {
      defaultCurrency.value = 'GNF'
    }
  }

  async function createCurrency(dto: { code: string; name: string; symbol: string; decimals?: number }): Promise<CurrencyDto | null> {
    try {
      const created = await ipcInvoke<CurrencyDto>('currencies:create', dto)
      currencies.value.push(created)
      buildCurrencyMap()
      return created
    } catch {
      return null
    }
  }

  async function updateCurrency(code: string, dto: Partial<CurrencyDto>): Promise<CurrencyDto | null> {
    try {
      const updated = await ipcInvoke<CurrencyDto>('currencies:update', { code, ...dto })
      const idx = currencies.value.findIndex(c => c.code === code)
      if (idx !== -1) currencies.value[idx] = updated
      buildCurrencyMap()
      return updated
    } catch {
      return null
    }
  }

  async function deleteCurrency(code: string): Promise<boolean> {
    try {
      await ipcInvoke('currencies:delete', { code })
      currencies.value = currencies.value.filter(c => c.code !== code)
      buildCurrencyMap()
      return true
    } catch {
      return false
    }
  }

  async function setDefault(code: string): Promise<boolean> {
    try {
      await ipcInvoke('currencies:set-default', { code })
      defaultCurrency.value = code
      return true
    } catch {
      return false
    }
  }

  function formatCurrency(amount: number, code?: string): string {
    const c = currencyMap.value[code || defaultCurrency.value]
    if (!c) return `${amount.toFixed(2)} ${code || defaultCurrency.value}`
    const locale = CURRENCY_LOCALE[c.code] || 'fr-FR'
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: c.code,
        minimumFractionDigits: c.decimals,
        maximumFractionDigits: c.decimals,
      }).format(amount)
    } catch {
      return `${amount.toFixed(c.decimals)} ${c.symbol}`
    }
  }

  return {
    currencies,
    defaultCurrency,
    loading,
    loaded,
    fetchCurrencies,
    createCurrency,
    updateCurrency,
    deleteCurrency,
    setDefault,
    loadDefault,
    formatCurrency,
  }
}
