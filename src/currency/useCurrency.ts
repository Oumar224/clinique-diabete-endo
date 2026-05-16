import { ref, computed } from 'vue'
import { getCurrencyDef, type CurrencyDef } from './currency.config'

const currencyCode = ref('GNF')
const loaded = ref(false)

function formatWithIntl(amount: number, def: CurrencyDef): string {
  try {
    return new Intl.NumberFormat(def.locale, {
      style: 'currency',
      currency: def.code,
      minimumFractionDigits: def.decimals,
      maximumFractionDigits: def.decimals,
    }).format(amount)
  } catch {
    return `${amount.toFixed(def.decimals)} ${def.symbol}`
  }
}

export function useCurrency() {
  const currencyDef = computed<CurrencyDef>(() => getCurrencyDef(currencyCode.value))

  async function loadCurrency(): Promise<void> {
    if (loaded.value) return
    try {
      const result = await window.electronAPI?.invoke('settings:get', { key: 'currency' }) as { value?: string }
      if (result?.value) {
        currencyCode.value = result.value
      }
    } catch {
      // fallback to default GNF
    }
    loaded.value = true
  }

  async function setCurrency(code: string): Promise<void> {
    try {
      await window.electronAPI?.invoke('settings:set', { key: 'currency', value: code })
      currencyCode.value = code
    } catch {
      // silently fail
    }
  }

  function formatCurrency(amount: number): string {
    return formatWithIntl(amount, currencyDef.value)
  }

  return {
    currencyCode,
    currencyDef,
    loadCurrency,
    setCurrency,
    formatCurrency,
  }
}
