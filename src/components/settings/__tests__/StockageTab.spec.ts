// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------
const { mockInvoke, mockElMessage, mockElMessageBox } = vi.hoisted(() => ({
  mockInvoke: vi.fn(),
  mockElMessage: { success: vi.fn(), error: vi.fn() },
  mockElMessageBox: { confirm: vi.fn(() => Promise.resolve()) },
}))

// Stub electronAPI — do NOT replace the entire window object
vi.stubGlobal('electronAPI', { invoke: mockInvoke })

vi.mock('element-plus', () => ({
  ElMessage: mockElMessage,
  ElMessageBox: mockElMessageBox,
}))

vi.mock('@element-plus/icons-vue', () => ({
  Plus: {}, Edit: {}, Delete: {}, Search: {}, FolderOpened: {},
}))

// ---------------------------------------------------------------------------
// Real composable import
// ---------------------------------------------------------------------------
import { useConservateurs } from '@/composables/useConservateurs'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const mockStockages = [
  { id: 1, code: 'stk_01', name: 'Réfrigérateur (2°C - 8°C)', description: 'Stockage standard', sort_order: 1, champs_count: 2, is_active: true },
  { id: 2, code: 'stk_02', name: 'Congélateur Standard (-20°C)', description: 'Pour la conservation', sort_order: 2, champs_count: 3, is_active: true },
  { id: 3, code: 'stk_06', name: 'Température Ambiante', description: 'Ancien', sort_order: 6, champs_count: 0, is_active: false },
]

const mockChamps = [
  { id: 1, stockage_id: 1, cle: 'etagere', label: 'Étagère', type: 'texte', sort_order: 1 },
  { id: 2, stockage_id: 1, cle: 'bac', label: 'Bac / Casier', type: 'texte', sort_order: 2 },
]

// ---------------------------------------------------------------------------
// Stubs
// ---------------------------------------------------------------------------
const EL_STUBS: Record<string, any> = {
  'el-alert': { template: '<div class="el-alert" v-if="title"><slot /></div>', props: ['type', 'title', 'closable'], emits: ['close'] },
  'el-input': { template: '<input class="el-input" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />', props: ['modelValue', 'clearable', 'size', 'placeholder'], emits: ['update:modelValue'] },
  'el-button': { template: '<button class="el-button" :disabled="loading" @click="$emit(\'click\')"><slot /></button>', props: ['loading', 'type', 'text', 'size', 'icon', 'circle'], emits: ['click'] },
  'el-switch': { template: '<input class="el-switch" type="checkbox" :checked="modelValue" @change="$emit(\'change\', $event.target.checked)" />', props: ['modelValue', 'size'], emits: ['change'] },
  'el-icon': { template: '<i class="el-icon"><slot /></i>' },
  'el-table': { template: '<div class="el-table"><slot /></div>', props: ['data'] },
  'el-table-column': {
    template: '<div class="el-table-column"><slot :row="{ id: 1, stockage_id: 1, cle: \'etagere\', label: \'Étagère\', type: \'texte\', sort_order: 1 }" /></div>',
  },
  'el-empty': { template: '<div class="el-empty"><slot /></div>', props: ['description'] },
  'el-row': { template: '<div class="el-row"><slot /></div>', props: ['justify'] },
  'el-radio-group': { template: '<div class="el-radio-group"><slot /></div>', props: ['modelValue'], emits: ['update:modelValue'] },
  'el-radio-button': { template: '<label class="el-radio-button"><slot /></label>', props: ['label'] },
  'el-tag': { template: '<span class="el-tag"><slot /></span>', props: ['closable', 'size'] },
  'StockageFormDialog': { template: '<div class="stk-dialog" />' },
  'ChampLocalisationFormDialog': { template: '<div class="champ-dialog" />' },
}

import StockageTab from '../StockageTab.vue'

/**
 * Helper: wait for async Vue updates and pending promises to settle.
 */
async function waitAsync() {
  await nextTick()
  await nextTick()
  await nextTick()
}

describe('StockageTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ''

    // Reset module-level composable state
    const s = useConservateurs()
    s.stockages.value = []
    s.champs.value = []
    s.loading.value = false
    s.error.value = null

    // Default IPC: return empty arrays
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === 'conservateurs:list') {
        return Promise.resolve({ success: true, data: [] })
      }
      if (channel === 'conservateurs:champs-list') {
        return Promise.resolve({ success: true, data: [] })
      }
      return Promise.resolve({ success: true, data: null })
    })
  })

  function createWrapper() {
    return mount(StockageTab, {
      global: {
        stubs: EL_STUBS,
        directives: {
          // Stub v-loading to prevent "Failed to resolve directive" warnings
          loading: {},
        },
      },
      attachTo: document.body,
    })
  }

  it('affiche la sidebar avec la liste des stockages', async () => {
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === 'conservateurs:list') {
        return Promise.resolve({ success: true, data: mockStockages })
      }
      return Promise.resolve({ success: true, data: null })
    })

    const wrapper = createWrapper()
    await waitAsync()
    // Extra tick to let Vue flush the list rendering
    await nextTick()
    await nextTick()

    const vm = wrapper.vm as any

    // Default filter is 'active' so only active stockages are visible by default
    expect(vm.filteredStockages.length).toBe(2)

    // Switch to "Tous" to see all stockages (3 items)
    vm.filterActive = ''
    await nextTick()
    await nextTick()

    expect(vm.filteredStockages.length).toBe(3)
    expect(wrapper.text()).toContain('Réfrigérateur')
    expect(wrapper.text()).toContain('Congélateur')
    expect(wrapper.text()).toContain('Température Ambiante')
  })

  it('affiche "Sélectionnez un stockage" quand aucun n\'est sélectionné', async () => {
    const wrapper = createWrapper()
    await waitAsync()
    expect(wrapper.text()).toContain('Sélectionnez')
  })

  it('charge les stockages au montage', async () => {
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === 'conservateurs:list') {
        return Promise.resolve({ success: true, data: mockStockages })
      }
      return Promise.resolve({ success: true, data: null })
    })

    createWrapper()
    await waitAsync()

    expect(mockInvoke).toHaveBeenCalledWith('conservateurs:list', undefined)
  })

  it('filtre les stockages par statut actif/inactif', async () => {
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === 'conservateurs:list') {
        return Promise.resolve({ success: true, data: mockStockages })
      }
      return Promise.resolve({ success: true, data: null })
    })

    const wrapper = createWrapper()
    await waitAsync()

    const vm = wrapper.vm as any
    // Default filterActive is 'active' -> 2 active stockages
    expect(vm.filteredStockages.length).toBe(2)

    vm.filterActive = 'inactive'
    await nextTick()
    expect(vm.filteredStockages.length).toBe(1)
    expect(vm.filteredStockages[0].name).toBe('Température Ambiante')
  })

  it('filtre les stockages par texte de recherche', async () => {
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === 'conservateurs:list') {
        return Promise.resolve({ success: true, data: mockStockages })
      }
      return Promise.resolve({ success: true, data: null })
    })

    const wrapper = createWrapper()
    await waitAsync()

    const vm = wrapper.vm as any
    expect(vm.filteredStockages.length).toBe(2)

    vm.stockageSearch = 'Congélateur'
    await nextTick()
    expect(vm.filteredStockages.length).toBe(1)
    expect(vm.filteredStockages[0].name).toBe('Congélateur Standard (-20°C)')
  })

  it('sélectionne un stockage', async () => {
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === 'conservateurs:list') {
        return Promise.resolve({ success: true, data: mockStockages })
      }
      if (channel === 'conservateurs:champs-list') {
        return Promise.resolve({ success: true, data: mockChamps })
      }
      return Promise.resolve({ success: true, data: null })
    })

    const wrapper = createWrapper()
    await waitAsync()

    const vm = wrapper.vm as any
    await vm.selectStockage(mockStockages[0])

    // selectStockage calls fetchChampsByStockage which is async
    await waitAsync()

    expect(vm.selectedStockage).toEqual(mockStockages[0])
  })

  it('affiche les champs de localisation après sélection', async () => {
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === 'conservateurs:list') {
        return Promise.resolve({ success: true, data: mockStockages })
      }
      if (channel === 'conservateurs:champs-list') {
        return Promise.resolve({ success: true, data: mockChamps })
      }
      return Promise.resolve({ success: true, data: null })
    })

    const wrapper = createWrapper()
    await waitAsync()

    const vm = wrapper.vm as any
    await vm.selectStockage(mockStockages[0])
    await waitAsync()

    // Champs should be loaded
    expect(vm.champs.length).toBe(2)
    expect(vm.champs[0].label).toBe('Étagère')
    expect(vm.champs[1].label).toBe('Bac / Casier')
  })

  it('affiche une confirmation avant de supprimer un stockage', async () => {
    const wrapper = createWrapper()
    await waitAsync()

    const vm = wrapper.vm as any
    vm.selectedStockage = mockStockages[0]

    mockElMessageBox.confirm.mockResolvedValueOnce(undefined)
    await vm.handleDeleteStockage()

    expect(mockElMessageBox.confirm).toHaveBeenCalled()
  })

  it('annule la suppression si l\'utilisateur clique sur Annuler', async () => {
    const wrapper = createWrapper()
    await waitAsync()

    const vm = wrapper.vm as any
    vm.selectedStockage = mockStockages[0]
    mockElMessageBox.confirm.mockRejectedValueOnce(new Error('cancel'))

    const result = await vm.handleDeleteStockage()
    expect(result).toBeUndefined()
  })

  it('affiche une confirmation avant de supprimer un champ', async () => {
    const wrapper = createWrapper()
    await waitAsync()

    const vm = wrapper.vm as any
    vm.selectedStockage = mockStockages[0]

    mockElMessageBox.confirm.mockResolvedValueOnce(undefined)
    await vm.handleDeleteChamp(mockChamps[0])

    expect(mockElMessageBox.confirm).toHaveBeenCalled()
  })
})
