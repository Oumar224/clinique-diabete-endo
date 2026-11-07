// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, nextTick } from 'vue'

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
  Plus: {}, Edit: {}, Delete: {}, Search: {},
}))

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const mockUnits = [
  { id: 1, service_id: 1, name: 'Hospitalisation', code: 'HOSP', description: null, sort_order: 1, is_active: true, service_name: 'Médecine Générale' },
  { id: 2, service_id: 2, name: 'Consultation', code: 'CONS', description: 'Consultation externe', sort_order: 2, is_active: true, service_name: 'Endocrinologie' },
  { id: 3, service_id: 1, name: 'Soins Intensifs', code: 'SI', description: null, sort_order: 3, is_active: false, service_name: 'Médecine Générale' },
  { id: 4, service_id: 3, name: 'Rééducation', code: 'REED', description: null, sort_order: 4, is_active: true, service_name: 'Kinésithérapie' },
]

const mockServices = [
  { id: 1, name: 'Médecine Générale', duration: 30, sort_order: 1, is_active: true, category: 'Consultation' },
  { id: 2, name: 'Endocrinologie', duration: 30, sort_order: 2, is_active: true, category: 'Consultation' },
  { id: 3, name: 'Kinésithérapie', duration: 30, sort_order: 3, is_active: true, category: 'Rééducation' },
]

// ---------------------------------------------------------------------------
// Mock composables used by CareUnitsTab
// ---------------------------------------------------------------------------
const mockFetchUnits = vi.fn()
const mockDeleteUnit = vi.fn()
const mockToggleUnit = vi.fn()
const unitsRef = ref<typeof mockUnits>([])

vi.mock('@/composables/useCareUnits', () => ({
  useCareUnits: () => ({
    units: unitsRef,
    loading: ref(false),
    error: ref<string | null>(null),
    fetchUnits: mockFetchUnits,
    deleteUnit: mockDeleteUnit,
    toggleUnit: mockToggleUnit,
  }),
}))

const mockFetchServices = vi.fn()
const servicesRef = ref<typeof mockServices>([])

vi.mock('@/composables/useMedicalServices', () => ({
  useMedicalServices: () => ({
    services: servicesRef,
    fetchServices: mockFetchServices,
  }),
}))

// ---------------------------------------------------------------------------
// Stubs — Element Plus components
// ---------------------------------------------------------------------------
const EL_STUBS: Record<string, any> = {
  'el-select': { template: '<div class="el-select"><slot /></div>', props: ['modelValue', 'clearable', 'placeholder'], emits: ['change'] },
  'el-option': { template: '<div class="el-option"><slot /></div>', props: ['label', 'value'] },
  'el-input': { template: '<input class="el-input" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />', props: ['modelValue', 'clearable', 'placeholder'], emits: ['update:modelValue'] },
  'el-button': { template: '<button class="el-button" :disabled="loading" @click="$emit(\'click\')"><slot /></button>', props: ['loading', 'type', 'icon', 'size', 'text'], emits: ['click'] },
  'el-icon': { template: '<i class="el-icon"><slot /></i>' },
  'el-table': { template: '<div class="el-table"><slot /></div>', props: ['data', 'loading'] },
  'el-table-column': {
    template: '<div class="el-table-column"><slot :row="{ id: 1, service_id: 1, name: \'Test\', code: \'TST\', is_active: true, service_name: \'Svc\', sort_order: 1 }" /></div>',
    props: ['prop', 'label', 'width', 'minWidth', 'align'],
  },
  'el-switch': { template: '<input class="el-switch" type="checkbox" :checked="modelValue" @change="$emit(\'change\', $event.target.checked)" />', props: ['modelValue', 'size'], emits: ['change'] },
  'el-empty': { template: '<div class="el-empty"><slot /></div>', props: ['description'] },
  'el-pagination': { template: '<div class="el-pagination" />', props: ['total', 'pageSizes'] },
  'el-row': { template: '<div class="el-row"><slot /></div>', props: ['justify'] },
  'el-alert': { template: '<div class="el-alert" v-if="title"><slot /></div>', props: ['type', 'title', 'closable'], emits: ['close'] },
  'CareUnitFormDialog': { template: '<div class="cufd-dialog" />' },
}

// ---------------------------------------------------------------------------
// Lazy import so hoisted mocks are in place first
// ---------------------------------------------------------------------------
async function mountComponent() {
  const CareUnitsTab = (await import('@/components/settings/CareUnitsTab.vue')).default
  return mount(CareUnitsTab, {
    global: {
      stubs: EL_STUBS,
      directives: { loading: {} },
    },
    attachTo: document.body,
  })
}

async function waitAsync() {
  await nextTick()
  await nextTick()
  await nextTick()
}

describe('CareUnitsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ''

    // Reset refs
    unitsRef.value = []
    servicesRef.value = []

    // Default mock implementations
    mockFetchUnits.mockResolvedValue(undefined)
    mockFetchServices.mockResolvedValue(undefined)
    mockDeleteUnit.mockResolvedValue(true)
    mockToggleUnit.mockResolvedValue(null)
  })

  it('renders without error', async () => {
    const wrapper = await mountComponent()
    expect(wrapper.exists()).toBe(true)
  })

  it('calls fetchUnits and fetchServices on mount', async () => {
    await mountComponent()
    await waitAsync()

    expect(mockFetchUnits).toHaveBeenCalledOnce()
    expect(mockFetchServices).toHaveBeenCalledOnce()
  })

  it('displays care units in the table', async () => {
    unitsRef.value = mockUnits
    servicesRef.value = mockServices

    const wrapper = await mountComponent()
    await waitAsync()

    // The table should render all 4 units (no filter = Tous)
    const vm = wrapper.vm as any
    expect(vm.filteredList.length).toBe(4)
  })

  it('filters units by search text', async () => {
    unitsRef.value = mockUnits
    servicesRef.value = mockServices

    const wrapper = await mountComponent()
    await waitAsync()

    const vm = wrapper.vm as any
    vm.searchQuery = 'Hospitalisation'
    await nextTick()
    await nextTick()

    expect(vm.filteredList.length).toBe(1)
    expect(vm.filteredList[0].name).toBe('Hospitalisation')
  })

  it('filters units by service', async () => {
    unitsRef.value = mockUnits
    servicesRef.value = mockServices

    const wrapper = await mountComponent()
    await waitAsync()

    const vm = wrapper.vm as any
    vm.serviceFilter = 1
    await nextTick()
    await nextTick()

    expect(vm.filteredList.length).toBe(2)
    expect(vm.filteredList.every(u => u.service_id === 1)).toBe(true)
  })

  it('shows empty state when no units', async () => {
    unitsRef.value = []

    const wrapper = await mountComponent()
    await waitAsync()

    expect(wrapper.find('.cde-empty').exists()).toBe(true)
  })

  it('calls toggleUnit when switch is toggled', async () => {
    unitsRef.value = [mockUnits[0]]
    servicesRef.value = mockServices

    const wrapper = await mountComponent()
    await waitAsync()

    const toggleInput = wrapper.find('.el-switch')
    await toggleInput.trigger('change')

    expect(mockToggleUnit).toHaveBeenCalledWith(1, false)
  })

  it('shows confirmation before deleting and calls deleteUnit', async () => {
    unitsRef.value = [mockUnits[0]]
    servicesRef.value = mockServices

    const wrapper = await mountComponent()
    await waitAsync()

    const vm = wrapper.vm as any
    await vm.handleDelete(mockUnits[0])

    expect(mockElMessageBox.confirm).toHaveBeenCalled()
    expect(mockDeleteUnit).toHaveBeenCalledWith(1)
    expect(mockElMessage.success).toHaveBeenCalledWith('Unité de soins supprimée')
  })

  it('does not delete if user cancels confirmation', async () => {
    mockElMessageBox.confirm.mockRejectedValueOnce(new Error('cancel'))

    unitsRef.value = [mockUnits[0]]
    servicesRef.value = mockServices

    const wrapper = await mountComponent()
    await waitAsync()

    const vm = wrapper.vm as any
    await vm.handleDelete(mockUnits[0])

    expect(mockDeleteUnit).not.toHaveBeenCalled()
  })

  it('resets paginator to page 1 on filter change', async () => {
    unitsRef.value = mockUnits
    servicesRef.value = mockServices

    const wrapper = await mountComponent()
    await waitAsync()

    const vm = wrapper.vm as any
    vm.paginator.currPage = 3

    vm.onFilterChange()
    await nextTick()

    expect(vm.paginator.currPage).toBe(1)
  })

  it('resets paginator to page 1 on search', async () => {
    unitsRef.value = mockUnits
    servicesRef.value = mockServices

    const wrapper = await mountComponent()
    await waitAsync()

    const vm = wrapper.vm as any
    vm.paginator.currPage = 3

    vm.onSearch()
    await nextTick()

    expect(vm.paginator.currPage).toBe(1)
  })
})
