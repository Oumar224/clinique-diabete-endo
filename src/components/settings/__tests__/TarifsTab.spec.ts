// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------
const { mockInvoke, mockElMessage, mockElMessageBox } = vi.hoisted(() => ({
  mockInvoke: vi.fn(),
  mockElMessage: { success: vi.fn(), error: vi.fn() },
  mockElMessageBox: { confirm: vi.fn(() => Promise.resolve()) },
}))

vi.stubGlobal('electronAPI', { invoke: mockInvoke })

vi.mock('element-plus', () => ({
  ElMessage: mockElMessage,
  ElMessageBox: mockElMessageBox,
}))

vi.mock('@element-plus/icons-vue', () => ({
  Plus: {}, Edit: {}, Delete: {}, Search: {}, Histogram: {},
}))

// ---------------------------------------------------------------------------
// Mock composables used by TarifsTab
// ---------------------------------------------------------------------------
const mockTarifs = [
  { id: 1, acte_id: 1, code_tarif: 'TARIF.STANDARD', prix_unitaire: 50000, date_application: '2025-01-01', acte_code: 'CONS-GEN-001', acte_label: 'Consultation générale', service_name: 'Consultation Générale' },
  { id: 2, acte_id: 2, code_tarif: 'TARIF.STANDARD', prix_unitaire: 75000, date_application: '2025-01-01', acte_code: 'CONS-ENDO-001', acte_label: 'Consultation endocrinologie', service_name: 'Endocrinologie' },
]

const mockActs = [
  { id: 1, code: 'CONS-GEN-001', label: 'Consultation générale', service_id: 1, service_name: 'Consultation Générale', is_active: true },
  { id: 2, code: 'CONS-ENDO-001', label: 'Consultation endocrinologie', service_id: 2, service_name: 'Endocrinologie', is_active: true },
]

const mockCurrencies = [
  { code: 'GNF', name: 'Franc Guinéen', symbol: 'FG', decimals: 0, is_active: true },
  { code: 'EUR', name: 'Euro', symbol: '€', decimals: 2, is_active: true },
]

vi.mock('@/composables/useCurrencies', () => ({
  useCurrencies: () => ({
    currencies: ref(Object.values(mockCurrencies)),
    defaultCurrency: ref('GNF'),
    loading: ref(false),
    fetchCurrencies: vi.fn().mockResolvedValue(undefined),
    setDefault: vi.fn().mockResolvedValue(undefined),
    deleteCurrency: vi.fn().mockResolvedValue(true),
    formatCurrency: vi.fn().mockReturnValue('50 000 FG'),
  }),
}))

vi.mock('@/composables/useMedicalActs', () => ({
  useMedicalActs: () => ({
    acts: ref(mockActs),
    loading: ref(false),
    fetchActs: vi.fn().mockResolvedValue(undefined),
  }),
}))

vi.mock('@/composables/useConfigTarifs', () => ({
  useConfigTarifs: () => ({
    tarifs: ref(mockTarifs),
    loading: ref(false),
    fetchTarifs: vi.fn().mockResolvedValue(undefined),
    bulkUpdateTarifs: vi.fn().mockResolvedValue(true),
    fetchPriceHistory: vi.fn().mockResolvedValue([]),
  }),
}))

vi.mock('@/composables/useMedicalServices', () => ({
  useMedicalServices: () => ({
    services: ref([]),
    fetchServices: vi.fn().mockResolvedValue(undefined),
  }),
}))

// ---------------------------------------------------------------------------
// Stubs
// ---------------------------------------------------------------------------
const EL_STUBS: Record<string, any> = {
  'el-select': { template: '<div class="el-select"><slot /></div>', props: ['modelValue', 'loading'], emits: ['change', 'update:modelValue'] },
  'el-option': { template: '<div class="el-option"><slot /></div>', props: ['label', 'value'] },
  'el-divider': { template: '<hr class="el-divider" />' },
  'el-button': { template: '<button class="el-button" :disabled="disabled" :loading="loading" @click="$emit(\'click\')"><slot /></button>', props: ['disabled', 'loading', 'type', 'size', 'icon', 'text'], emits: ['click'] },
  'el-table': { template: '<div class="el-table"><slot /></div>', props: ['data', 'loading'] },
  'el-table-column': { template: '<div class="el-table-column"><slot :row="{ id: 1, code: \'CONS-GEN-001\', label: \'Test\', service_name: \'Svc\' }" /></div>', props: ['prop', 'label', 'width', 'minWidth', 'align'] },
  'el-input': { template: '<input class="el-input" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />', props: ['modelValue', 'placeholder', 'clearable'], emits: ['update:modelValue'] },
  'el-input-number': { template: '<input class="el-input-number" :value="modelValue" @input="$emit(\'update:modelValue\', Number($event.target.value))" />', props: ['modelValue', 'min', 'step', 'size', 'controlsPosition'], emits: ['update:modelValue'] },
  'el-icon': { template: '<i class="el-icon"><slot /></i>' },
  'el-badge': { template: '<div class="el-badge"><slot /></div>', props: ['value', 'hidden'] },
  'el-empty': { template: '<div class="el-empty"><slot /></div>', props: ['description'] },
  'el-pagination': { template: '<div class="el-pagination" />', props: ['total'] },
  'el-row': { template: '<div class="el-row"><slot /></div>', props: ['justify'] },
  'el-tag': { template: '<span class="el-tag"><slot /></span>', props: ['type'] },
}

// ---------------------------------------------------------------------------
// Lazy import so hoisted mocks are in place first
// ---------------------------------------------------------------------------
async function mountComponent() {
  const TarifsTab = (await import('@/components/settings/TarifsTab.vue')).default
  return mount(TarifsTab, {
    global: { stubs: EL_STUBS },
  })
}

describe('TarifsTab', () => {
  beforeEach(() => {
    mockInvoke.mockReset()
    mockInvoke.mockResolvedValue({ success: true, data: [] })
  })

  it('renders without error', async () => {
    const wrapper = await mountComponent()
    expect(wrapper.exists()).toBe(true)
  })

  it('shows the currency section', async () => {
    const wrapper = await mountComponent()
    expect(wrapper.text()).toContain('Devise par défaut')
    expect(wrapper.text()).toContain('Toutes les devises')
  })

  it('shows the tariff manager section', async () => {
    const wrapper = await mountComponent()
    expect(wrapper.text()).toContain('Gestion des tarifs')
    expect(wrapper.text()).toContain('Définir les prix unitaires')
  })

  it('shows the bulk save button', async () => {
    const wrapper = await mountComponent()
    const buttons = wrapper.findAll('.el-button')
    const saveButton = buttons.find(b => b.text().includes('Appliquer les nouveaux tarifs'))
    expect(saveButton).toBeDefined()
  })

  it('disables bulk save when no pending edits', async () => {
    const wrapper = await mountComponent()
    const buttons = wrapper.findAll('.el-button')
    const saveButton = buttons.find(b => b.text().includes('Appliquer les nouveaux tarifs'))
    expect(saveButton!.attributes('disabled')).toBeDefined()
  })
})
