// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import DispositifsAccesTab from '../DispositifsAccesTab.vue'

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------
const mockIpcInvoke = vi.hoisted(() => vi.fn())

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------
vi.mock('vue-router', () => ({
  useRoute: vi.fn(() => ({ params: { id: '42' } })),
}))

vi.mock('@/utils/ipc', () => ({
  ipcInvoke: mockIpcInvoke,
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

const DEFAULT_DISPOSITIFS = [
  { id: 1, patientId: 42, type: 'Cathéter périphérique', datePose: '26/06/2026', aspect: 'Sain', volumeMl: null },
  { id: 2, patientId: 42, type: 'Sonde urinaire', datePose: '26/06/2026', aspect: 'Sain', volumeMl: 350 },
]

// ---------------------------------------------------------------------------
// DispositifsAccesTab
// ---------------------------------------------------------------------------
describe('DispositifsAccesTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIpcInvoke.mockImplementation(async (channel: string, params?: any) => {
      if (channel === 'dispositifs:list') return DEFAULT_DISPOSITIFS
      if (channel === 'dispositifs:create') return { id: 3, patientId: params?.patientId, ...params }
      if (channel === 'dispositifs:delete') return null
      return null
    })
  })

  // -----------------------------------------------------------------------
  // Initialization
  // -----------------------------------------------------------------------
  describe('initialization', () => {
    it('fetches dispositifs on mount', async () => {
      mount(DispositifsAccesTab, { global: { stubs } })
      await new Promise(r => setTimeout(r, 0))
      expect(mockIpcInvoke).toHaveBeenCalledWith('dispositifs:list', { patientId: 42 })
    })
  })

  // -----------------------------------------------------------------------
  // Header
  // -----------------------------------------------------------------------
  describe('header', () => {
    it('renders the Ajouter button without a page title', async () => {
      const wrapper = mount(DispositifsAccesTab, { global: { stubs } })
      await new Promise(r => setTimeout(r, 0))
      expect(wrapper.find('.cde-page-title').exists()).toBe(false)
      expect(wrapper.findAll('h1')).toHaveLength(0)
      const btn = wrapper.find('button.el-button')
      expect(btn.exists()).toBe(true)
      expect(btn.text().trim()).toBe('Ajouter')
    })
  })

  // -----------------------------------------------------------------------
  // Empty state
  // -----------------------------------------------------------------------
  describe('empty state', () => {
    it('renders table with no data when dispositifs list is empty after fetch', async () => {
      mockIpcInvoke.mockImplementation(async (channel: string) => {
        if (channel === 'dispositifs:list') return []
        return null
      })
      const wrapper = mount(DispositifsAccesTab, { global: { stubs } })
      await new Promise(r => setTimeout(r, 0))
      expect(wrapper.find('.el-table').exists()).toBe(true)
      expect(wrapper.findAll('.el-table-column').length).toBe(5)
    })

    it('does not show el-empty when dispositifs exist', async () => {
      const wrapper = mount(DispositifsAccesTab, { global: { stubs } })
      await new Promise(r => setTimeout(r, 0))
      expect(wrapper.find('.el-empty').exists()).toBe(false)
    })
  })
})
