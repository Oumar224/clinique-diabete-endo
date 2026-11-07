// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, nextTick } from 'vue'
import DossierOrdonnanceTab from '../DossierOrdonnanceTab.vue'

// ===========================================================================
// Hoisted mocks
// ===========================================================================
const {
  mockFetchOrdonnances,
  state,
} = vi.hoisted(() => ({
  mockFetchOrdonnances: vi.fn(),
  state: {
    ordonnances: [] as any[],
    loading: false,
  },
}))

// ===========================================================================
// Module mocks
// ===========================================================================
vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('@element-plus/icons-vue', () => ({
  Refresh: { render: () => {} },
}))

vi.mock('@/composables/usePatientContext', () => ({
  usePatientContext: vi.fn(() => ({
    activePatient: { value: { id: 1, nom: 'Test', prenom: 'Patient' } },
  })),
}))

vi.mock('@/composables/useOrdonnanceLibre', async () => {
  const { ref: vueRef } = await import('vue')
  return {
    useOrdonnanceLibre: vi.fn(() => {
      const ordonnances = vueRef(state.ordonnances)
      const loading = vueRef(state.loading)
      return {
        ordonnances,
        loading,
        error: vueRef(null),
        fetchOrdonnances: mockFetchOrdonnances.mockImplementation(async () => {
          loading.value = false
        }),
        getOrdonnance: vi.fn(),
        fetchAvailablePrescriptions: vi.fn(),
        deleteOrdonnance: vi.fn(),
      }
    }),
  }
})

// ===========================================================================
// Stubs
// ===========================================================================
const stubs = {
  SectionHeader: {
    template: [
      '<div class="section-header">',
      '  <div class="section-header__bar">',
      '    <span class="section-header__label">{{ label }}</span>',
      '    <span class="section-header__badge">{{ badge }}</span>',
      '    <slot name="actions" />',
      '  </div>',
      '  <div class="section-header__content">',
      '    <slot />',
      '  </div>',
      '</div>',
    ].join(''),
    props: ['label', 'level', 'collapsible', 'badge'],
  },
  'el-table': {
    template: [
      '<div class="el-table">',
      '  <slot />',
      '  <div v-if="!data || data.length === 0" class="el-table__empty"><slot name="empty" /></div>',
      '</div>',
    ].join(''),
    props: ['data', 'size', 'style', 'vLoading', 'elementLoadingText'],
    provide() { return { tableData: this.data || [] } },
  },
  'el-table-column': {
    template: '<div class="el-table-column"><div v-for="(item, idx) in tableData" :key="idx"><slot :row="item" /></div></div>',
    props: ['label', 'width', 'align'],
    inject: { tableData: { default: () => [] } },
  },
  'el-button': {
    template: '<button class="el-button" @click="$emit(\'click\')"><slot /></button>',
    props: ['size', 'icon', 'loading'],
    emits: ['click'],
  },
  'el-tag': {
    template: '<span class="el-tag" :class="`el-tag--${type || \'\'}`"><slot /></span>',
    props: ['type', 'size', 'effect'],
  },
  'el-empty': {
    template: '<div class="el-empty"><p>{{ description }}</p></div>',
    props: ['description', 'imageSize'],
  },
}

// ===========================================================================
// Helpers
// ===========================================================================
function waitForData() {
  return new Promise(resolve => setTimeout(resolve, 0))
}

function createWrapper(options: any = {}) {
  return mount(DossierOrdonnanceTab, {
    global: { stubs },
    ...options,
  })
}

// ===========================================================================
// Tests
// ===========================================================================
describe('DossierOrdonnanceTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    state.ordonnances = []
    state.loading = false
  })

  // ─── Data loading ──────────────────────────────────────────────

  describe('data loading', () => {
    it('calls fetchOrdonnances on mount', async () => {
      createWrapper()
      await waitForData()
      expect(mockFetchOrdonnances).toHaveBeenCalledWith(1)
    })

    it('shows ordonnances when loaded', async () => {
      state.ordonnances = [
        {
          id: 1,
          created_at: '2024-01-15T10:00:00Z',
          status: 'draft',
          form_data: JSON.stringify({ inlinePrescriptions: [{ medicament: 'Metformine' }] }),
        },
      ]
      const wrapper = createWrapper()
      await nextTick()
      expect(wrapper.text()).toContain('Metformine')
    })

    it('displays reference column with ordonnance id', async () => {
      state.ordonnances = [
        {
          id: 42,
          created_at: '2024-01-15T10:00:00Z',
          status: 'draft',
          form_data: JSON.stringify({ inlinePrescriptions: [{ medicament: 'Metformine' }] }),
        },
      ]
      const wrapper = createWrapper()
      await nextTick()
      expect(wrapper.text()).toContain('#42')
    })

    it('shows empty state when no ordonnances', async () => {
      state.ordonnances = []
      const wrapper = createWrapper()
      await nextTick()
      expect(wrapper.text()).toContain('Aucune ordonnance')
    })
  })

  // ─── Refresh button ────────────────────────────────────────────

  describe('refresh', () => {
    it('calls loadData when refresh button clicked', async () => {
      const wrapper = createWrapper()
      await waitForData()
      vi.clearAllMocks()
      const btn = wrapper.find('.el-button')
      await btn.trigger('click')
      await waitForData()
      expect(mockFetchOrdonnances).toHaveBeenCalledWith(1)
    })
  })

  // ─── Table rendering ───────────────────────────────────────────

  describe('table rendering', () => {
    it('renders ordonnances in table rows', async () => {
      state.ordonnances = [
        {
          id: 1,
          created_at: '2024-01-15T10:00:00Z',
          status: 'draft',
          form_data: JSON.stringify({ inlinePrescriptions: [{ medicament: 'Furosémide' }] }),
        },
        {
          id: 2,
          created_at: '2024-01-16T14:30:00Z',
          status: 'signed',
          form_data: JSON.stringify({ linkedPrescriptionIds: [1, 2], inlinePrescriptions: [] }),
        },
      ]
      const wrapper = createWrapper()
      await nextTick()
      expect(wrapper.text()).toContain('Furosémide')
      expect(wrapper.text()).toContain('2 prescription(s) liée(s)')
    })

    it('shows Brouillon for draft status', async () => {
      state.ordonnances = [
        { id: 1, created_at: '2024-01-15T10:00:00Z', status: 'draft', form_data: '{}' },
      ]
      const wrapper = createWrapper()
      await nextTick()
      expect(wrapper.text()).toContain('Brouillon')
    })

    it('shows Signé for signed status', async () => {
      state.ordonnances = [
        { id: 1, created_at: '2024-01-15T10:00:00Z', status: 'signed', form_data: '{}' },
      ]
      const wrapper = createWrapper()
      await nextTick()
      expect(wrapper.text()).toContain('Signé')
    })
  })

  // ─── Badge count ───────────────────────────────────────────────

  describe('badge', () => {
    it('displays ordonnance count in badge', async () => {
      state.ordonnances = [
        { id: 1, created_at: null, status: 'draft', form_data: null },
        { id: 2, created_at: null, status: 'signed', form_data: null },
      ]
      const wrapper = createWrapper()
      await nextTick()
      expect(wrapper.text()).toContain('2')
    })

    it('shows 0 in badge when no ordonnances', async () => {
      state.ordonnances = []
      const wrapper = createWrapper()
      await nextTick()
      expect(wrapper.text()).toContain('0')
    })
  })

  // ─── Edge cases ────────────────────────────────────────────────

  describe('edge cases', () => {
    it('handles null form_data gracefully', async () => {
      state.ordonnances = [
        { id: 1, created_at: '2024-01-15T10:00:00Z', status: 'draft', form_data: null },
      ]
      const wrapper = createWrapper()
      await nextTick()
      expect(wrapper.text()).toContain('—')
    })

    it('handles invalid JSON in form_data gracefully', async () => {
      state.ordonnances = [
        { id: 1, created_at: '2024-01-15T10:00:00Z', status: 'draft', form_data: 'invalid json' },
      ]
      const wrapper = createWrapper()
      await nextTick()
      expect(wrapper.text()).toContain('—')
    })
  })
})
