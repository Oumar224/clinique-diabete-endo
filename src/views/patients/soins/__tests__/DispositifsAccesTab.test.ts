// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import DispositifsAccesTab from '../DispositifsAccesTab.vue'

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------
const { mockGetDispositifs, mockAjouterDispositif, mockSupprimerDispositif } = vi.hoisted(() => ({
  mockGetDispositifs: vi.fn(),
  mockAjouterDispositif: vi.fn(),
  mockSupprimerDispositif: vi.fn(),
}))

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------
vi.mock('vue-router', () => ({
  useRoute: vi.fn(() => ({ params: { id: '42' } })),
}))

vi.mock('@/api/dispositifs', () => ({
  getDispositifs: mockGetDispositifs,
  ajouterDispositif: mockAjouterDispositif,
  supprimerDispositif: mockSupprimerDispositif,
}))

vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), warning: vi.fn(), info: vi.fn(), error: vi.fn() },
  ElMessageBox: {
    prompt: vi.fn(() => Promise.resolve({ value: 'Cathéter' })),
    confirm: vi.fn(() => Promise.resolve()),
  },
}))

vi.mock('@element-plus/icons-vue', () => ({
  Plus: { render: () => {} },
  Edit: { render: () => {} },
  Delete: { render: () => {} },
}))

// ---------------------------------------------------------------------------
// Stubs
// ---------------------------------------------------------------------------
const stubs = {
  'el-button': {
    template: '<button class="el-button" :disabled="disabled" @click="$emit(\'click\', $event)"><slot /></button>',
    props: ['disabled', 'type', 'size', 'icon'],
    emits: ['click'],
  },
  'el-table': {
    template: '<div class="el-table"><slot /></div>',
    props: ['data', 'size', 'style'],
  },
  'el-table-column': {
    template: '<div class="el-table-column"><slot :row="row" :column="{}" :\$index="0" /></div>',
    props: ['prop', 'label', 'width', 'align'],
    data() {
      return { row: { id: 0, type: '', datePose: '', aspect: 'Sain', volumeMl: null } }
    },
  },
  'el-tag': {
    template: '<span class="el-tag" :class="`el-tag--${type}`"><slot /></span>',
    props: ['type', 'size'],
  },
  'el-empty': {
    template: '<div class="el-empty"><p class="el-empty__description">{{ description }}</p></div>',
    props: ['description', 'imageSize'],
  },
}

// ---------------------------------------------------------------------------
// DispositifsAccesTab
// ---------------------------------------------------------------------------
describe('DispositifsAccesTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetDispositifs.mockResolvedValue([
      { id: 1, patientId: 42, type: 'Cathéter périphérique', datePose: '26/06/2026', aspect: 'Sain', volumeMl: null },
      { id: 2, patientId: 42, type: 'Sonde urinaire', datePose: '26/06/2026', aspect: 'Sain', volumeMl: 350 },
    ])
  })

  // -----------------------------------------------------------------------
  // Initialization
  // -----------------------------------------------------------------------
  describe('initialization', () => {
    it('fetches dispositifs on mount', async () => {
      mount(DispositifsAccesTab, { global: { stubs } })
      await new Promise(r => setTimeout(r, 0))
      expect(mockGetDispositifs).toHaveBeenCalledWith(42)
    })
  })

  // -----------------------------------------------------------------------
  // Header
  // -----------------------------------------------------------------------
  describe('header', () => {
    it('renders title and Ajouter button', async () => {
      const wrapper = mount(DispositifsAccesTab, { global: { stubs } })
      await new Promise(r => setTimeout(r, 0))
      expect(wrapper.text()).toContain('Dispositifs et voies')
      const btn = wrapper.find('button.el-button')
      expect(btn.exists()).toBe(true)
      expect(btn.text().trim()).toBe('Ajouter')
    })
  })

  // -----------------------------------------------------------------------
  // Empty state
  // -----------------------------------------------------------------------
  describe('empty state', () => {
    it('shows el-empty when dispositifs list is empty after fetch', async () => {
      mockGetDispositifs.mockResolvedValue([])
      const wrapper = mount(DispositifsAccesTab, { global: { stubs } })
      await new Promise(r => setTimeout(r, 0))
      expect(wrapper.find('.el-empty').exists()).toBe(true)
      expect(wrapper.text()).toContain('Aucun dispositif')
    })

    it('does not show el-empty when dispositifs exist', async () => {
      const wrapper = mount(DispositifsAccesTab, { global: { stubs } })
      await new Promise(r => setTimeout(r, 0))
      expect(wrapper.find('.el-empty').exists()).toBe(false)
    })
  })
})
