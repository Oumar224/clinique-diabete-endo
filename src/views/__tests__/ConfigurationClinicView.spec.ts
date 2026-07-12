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
// Component under test
// ---------------------------------------------------------------------------
import ConfigurationClinicView from '@/views/ConfigurationClinicView.vue'

// ---------------------------------------------------------------------------
// Stubs — components enfants simulés pour isoler le test du rendu interne
// ---------------------------------------------------------------------------
const EL_STUBS: Record<string, any> = {
  // Tabs
  'el-tabs': {
    template: '<div class="el-tabs"><div class="el-tabs__content"><slot /></div></div>',
    props: ['modelValue'],
    emits: ['update:modelValue', 'tab-click'],
  },
  'el-tab-pane': {
    template: '<div class="el-tab-pane"><slot /></div>',
    props: ['label', 'name'],
  },
  // Composants enfants simulés
  'DispositifVoieTab': {
    template: '<div class="dispositif-voie-tab"><p>Dispositifs &amp; Voies content</p></div>',
  },
  'ExamTypeTab': {
    template: '<div class="exam-type-tab"><p>Examens content</p></div>',
  },
  'StockageTab': {
    template: '<div class="stockage-tab"><p>Stockages / Conservateurs content</p></div>',
  },
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function waitAsync() {
  await nextTick()
  await nextTick()
  await nextTick()
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('ConfigurationClinicView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ''
  })

  function createWrapper() {
    return mount(ConfigurationClinicView, {
      global: { stubs: EL_STUBS },
      attachTo: document.body,
    })
  }

  it('affiche le titre "Configuration Clinic"', async () => {
    const wrapper = createWrapper()
    await waitAsync()
    expect(wrapper.text()).toContain('Configuration Clinic')
  })

  it('rend les onglets avec leurs composants respectifs', async () => {
    const wrapper = createWrapper()
    await waitAsync()
    expect(wrapper.find('.exam-type-tab').exists()).toBe(true)
    expect(wrapper.find('.stockage-tab').exists()).toBe(true)
  })

  it('démarre avec l\'onglet "stockages" actif par défaut', async () => {
    const wrapper = createWrapper()
    await waitAsync()
    const vm = wrapper.vm as any
    expect(vm.activeTab).toBe('stockages')
  })

  it('change d\'onglet quand activeTab est modifié', async () => {
    const wrapper = createWrapper()
    await waitAsync()
    const vm = wrapper.vm as any
    vm.activeTab = 'examens'
    await nextTick()
    expect(vm.activeTab).toBe('examens')
  })

  it('affiche le contenu des onglets', async () => {
    const wrapper = createWrapper()
    await waitAsync()
    expect(wrapper.text()).toContain('Examens content')
    expect(wrapper.text()).toContain('Stockages / Conservateurs content')
  })

  it('a la classe CSS clinic-config sur le conteneur', () => {
    const wrapper = createWrapper()
    expect(wrapper.classes()).toContain('clinic-config')
  })
})
