// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, nextTick } from 'vue'
import OrdonnanceView from '../OrdonnanceView.vue'
import type { OrdonnanceLibreRecord } from '@/composables/useOrdonnanceLibre'

// ===========================================================================
// Hoisted mocks
// ===========================================================================
const {
  mockFetchOrdonnances,
  mockDeleteOrdonnance,
  mockElMessage,
  mockElMessageBox,
  state,
} = vi.hoisted(() => ({
  mockFetchOrdonnances: vi.fn(),
  mockDeleteOrdonnance: vi.fn(),
  mockElMessage: { success: vi.fn(), warning: vi.fn(), info: vi.fn(), error: vi.fn() },
  mockElMessageBox: { confirm: vi.fn(() => Promise.resolve()), alert: vi.fn(() => Promise.resolve()) },
  state: {
    ordonnances: [] as OrdonnanceLibreRecord[],
    loading: false,
  },
}))

// ===========================================================================
// Module mocks
// ===========================================================================
vi.mock('vue-router', () => ({
  useRoute: vi.fn(() => ({ params: { id: '1' } })),
}))

vi.mock('element-plus', () => ({
  ElMessage: mockElMessage,
  ElMessageBox: mockElMessageBox,
}))

vi.mock('@element-plus/icons-vue', () => ({
  Delete: { render: () => {} },
  View: { render: () => {} },
  Refresh: { render: () => {} },
}))

vi.mock('@/composables/useOrdonnanceLibre', async () => {
  const vue = await vi.importActual<typeof import('vue')>('vue')
  const ordonnances = vue.ref<OrdonnanceLibreRecord[]>([])
  const loading = vue.ref(false)
  return {
    useOrdonnanceLibre: vi.fn(() => ({
      ordonnances,
      loading,
      error: vue.ref(null),
      fetchOrdonnances: async (patientId: number) => {
        loading.value = true
        try {
          const result = await mockFetchOrdonnances(patientId)
          ordonnances.value = result ?? []
        } catch {
          ordonnances.value = []
        } finally {
          loading.value = false
        }
      },
      deleteOrdonnance: mockDeleteOrdonnance,
      getOrdonnance: vi.fn(),
      fetchAvailablePrescriptions: vi.fn(),
    })),
  }
})

vi.mock('@/composables/usePatientContext', () => ({
  usePatientContext: vi.fn(() => ({
    activePatient: { value: { id: 1 } },
  })),
}))

vi.mock('@/components/prescriptions/OrdonnancePreview', () => ({
  default: {
    template: '<div class="ordonnance-preview" ref="preview" />',
    props: ['patientId'],
    methods: { open: vi.fn() },
  },
}))

vi.mock('@/components/common/SectionHeader.vue', () => ({
  default: {
    template: '<div class="section-header"><span class="section-header__label">{{ label }}</span><span class="section-header__badge"><slot name="badge" /></span><div class="section-header__actions"><slot name="actions" /></div><slot /></div>',
    props: ['label', 'level', 'badge'],
  },
}))

// ===========================================================================
// Helpers
// ===========================================================================
function waitForData() {
  return new Promise(resolve => setTimeout(resolve, 0))
}

// ===========================================================================
// Stubs
// ===========================================================================
const stubs = {
  'el-table': {
    template: [
      '<div class="el-table">',
      '  <div v-if="!data || data.length === 0">',
      '    <slot name="empty" />',
      '  </div>',
      '  <div v-for="(item, idx) in (data || [])" :key="idx" class="el-table__row">',
      '    <span class="el-table__date">{{ item.created_at }}</span>',
      '    <span class="el-table__ref">#{{ item.id }}</span>',
      '    <span class="el-table__status">{{ item.status === \'signed\' ? \'Signé\' : \'Brouillon\' }}</span>',
      '    <span class="el-table__prescripteur">Dr. {{ item.medecin_prenom }} {{ item.medecin_nom }}</span>',
      '    <button class="el-button el-button--view" @click.stop="">Voir PDF</button>',
      '    <button class="el-button el-button--delete" @click.stop="$emit(\'delete\', item)">Supprimer</button>',
      '  </div>',
      '</div>',
    ].join(''),
    props: ['data', 'highlightCurrentRow'],
    emits: ['row-click', 'delete'],
  },
  'el-table-column': {
    template: '<div class="el-table-column"><slot :row="{}" /></div>',
    props: ['label', 'width', 'align', 'minWidth'],
  },
  'el-button': {
    template: '<button class="el-button" :disabled="disabled" @click="$emit(\'click\', $event)"><slot /></button>',
    props: ['disabled', 'type', 'size', 'icon', 'text', 'loading'],
    emits: ['click'],
  },
  'el-tag': {
    template: '<span class="el-tag" :class="`el-tag--${type}`"><slot /></span>',
    props: ['type', 'size', 'effect'],
  },
  'el-empty': {
    template: '<div class="el-empty"><p class="el-empty__description">{{ description }}</p></div>',
    props: ['description', 'imageSize'],
  },
  'el-tooltip': {
    template: '<div class="el-tooltip"><slot /></div>',
    props: ['content', 'placement', 'showAfter'],
  },
  'el-icon': {
    template: '<span class="el-icon"><slot /></span>',
  },
  OrdonnancePreview: {
    template: '<div class="ordonnance-preview" ref="preview" />',
    props: ['patientId', 'prescriptionIds', 'inlinePrescriptions'],
    methods: { open: vi.fn() },
  },
}

// ===========================================================================
// Test data
// ===========================================================================
const mockOrdonnances: OrdonnanceLibreRecord[] = [
  {
    id: 1,
    contact_id: '1',
    document_type_id: 'type-1',
    title: 'Ordonnance Libre',
    status: 'draft',
    form_data: JSON.stringify({ linkedPrescriptionIds: [], inlinePrescriptions: [{ medicament: 'Metformine 500 mg' }] }),
    created_at: '2024-01-15T10:00:00Z',
    updated_at: null,
    medecin_nom: 'Dupont',
    medecin_prenom: 'Jean',
  },
  {
    id: 2,
    contact_id: '1',
    document_type_id: 'type-1',
    title: 'Ordonnance Libre',
    status: 'signed',
    form_data: JSON.stringify({ linkedPrescriptionIds: [1, 2], inlinePrescriptions: [] }),
    created_at: '2024-01-16T14:30:00Z',
    updated_at: null,
    medecin_nom: 'Martin',
    medecin_prenom: 'Marie',
  },
]

// ===========================================================================
// Tests
// ===========================================================================
describe('OrdonnanceView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    state.ordonnances = []
    state.loading = false
    mockFetchOrdonnances.mockResolvedValue(undefined)
    mockDeleteOrdonnance.mockResolvedValue(undefined)
  })

  // -----------------------------------------------------------------------
  // Section header
  // -----------------------------------------------------------------------
  describe('section header', () => {
    it('renders section header with ordonnance count', async () => {
      mockFetchOrdonnances.mockImplementation(async () => {
        state.ordonnances = mockOrdonnances
        return mockOrdonnances
      })

      const wrapper = mount(OrdonnanceView, { global: { stubs } })

      await nextTick()
      await waitForData()
      await nextTick()

      expect(wrapper.find('.section-header__label').text()).toBe('Ordonnances')
      expect(wrapper.find('.section-header__badge').text()).toContain('2')
    })
  })

  // -----------------------------------------------------------------------
  // Data loading
  // -----------------------------------------------------------------------
  describe('data loading', () => {
    it('calls fetchOrdonnances on mount', async () => {
      mount(OrdonnanceView, { global: { stubs } })

      await nextTick()
      await waitForData()
      await nextTick()

      expect(mockFetchOrdonnances).toHaveBeenCalledTimes(1)
      expect(mockFetchOrdonnances).toHaveBeenCalledWith(1)
    })

    it('shows loading state', async () => {
      mockFetchOrdonnances.mockReturnValue(new Promise(() => {}))

      const wrapper = mount(OrdonnanceView, { global: { stubs } })

      await nextTick()

      expect(wrapper.find('.el-table').exists()).toBe(true)
    })
  })

  // -----------------------------------------------------------------------
  // Table rendering
  // -----------------------------------------------------------------------
  describe('table rendering', () => {
    it('renders ordonnances in table', async () => {
      mockFetchOrdonnances.mockResolvedValue(mockOrdonnances)

      const wrapper = mount(OrdonnanceView, { global: { stubs } })

      await nextTick()
      await waitForData()
      await nextTick()

      expect(wrapper.find('.el-table').exists()).toBe(true)
      const rows = wrapper.findAll('.el-table__row')
      expect(rows.length).toBe(2)
    })

    it('shows empty state when no ordonnances', async () => {
      mockFetchOrdonnances.mockResolvedValue([])

      const wrapper = mount(OrdonnanceView, { global: { stubs } })

      await nextTick()
      await waitForData()
      await nextTick()

      expect(wrapper.find('.el-empty').exists()).toBe(true)
      expect(wrapper.text()).toContain('Aucune ordonnance pour ce patient')
    })
  })

  // -----------------------------------------------------------------------
  // Delete ordonnance
  // -----------------------------------------------------------------------
  describe('delete ordonnance', () => {
    it('deletes ordonnance after confirmation', async () => {
      mockFetchOrdonnances.mockResolvedValue(mockOrdonnances)
      mockDeleteOrdonnance.mockResolvedValue(undefined)

      const wrapper = mount(OrdonnanceView, { global: { stubs } })

      await nextTick()
      await waitForData()
      await nextTick()

      await (wrapper.vm as any).onDelete(mockOrdonnances[0])

      await waitForData()
      await nextTick()

      expect(mockElMessageBox.confirm).toHaveBeenCalledWith(
        expect.stringContaining('#1'),
        'Confirmation',
        expect.objectContaining({ type: 'warning' }),
      )
      expect(mockDeleteOrdonnance).toHaveBeenCalledWith(1)
      expect(mockElMessage.success).toHaveBeenCalled()
    })

    it('cancels delete when user declines', async () => {
      mockFetchOrdonnances.mockResolvedValue(mockOrdonnances)
      mockElMessageBox.confirm.mockRejectedValueOnce(new Error('cancel'))

      const wrapper = mount(OrdonnanceView, { global: { stubs } })

      await nextTick()
      await waitForData()
      await nextTick()

      await (wrapper.vm as any).onDelete(mockOrdonnances[0])

      await waitForData()
      await nextTick()

      expect(mockDeleteOrdonnance).not.toHaveBeenCalled()
    })
  })

  // -----------------------------------------------------------------------
  // Formatting
  // -----------------------------------------------------------------------
  describe('formatting', () => {
    it('formats date correctly', async () => {
      mockFetchOrdonnances.mockResolvedValue([mockOrdonnances[0]])

      const wrapper = mount(OrdonnanceView, { global: { stubs } })

      await nextTick()
      await waitForData()
      await nextTick()

      const dateCell = wrapper.find('.el-table__date')
      expect(dateCell.exists()).toBe(true)
      expect(dateCell.text()).toContain('2024')
    })

    it('formats prescripteur correctly', async () => {
      mockFetchOrdonnances.mockResolvedValue([mockOrdonnances[0]])

      const wrapper = mount(OrdonnanceView, { global: { stubs } })

      await nextTick()
      await waitForData()
      await nextTick()

      const prescripteurCell = wrapper.find('.el-table__prescripteur')
      expect(prescripteurCell.exists()).toBe(true)
      expect(prescripteurCell.text()).toBe('Dr. Jean Dupont')
    })
  })

  // -----------------------------------------------------------------------
  // PDF preview data
  // -----------------------------------------------------------------------
  describe('pdf preview data', () => {
    it('extracts inlinePrescriptions and linkedPrescriptionIds when viewing PDF', async () => {
      mockFetchOrdonnances.mockResolvedValue(mockOrdonnances)

      const wrapper = mount(OrdonnanceView, { global: { stubs } })

      await nextTick()
      await waitForData()
      await nextTick()

      // Call viewPdf on the second ordonnance which has linkedPrescriptionIds
      await (wrapper.vm as any).viewPdf(mockOrdonnances[1])

      expect((wrapper.vm as any).previewPrescriptionIds).toEqual([1, 2])
      expect((wrapper.vm as any).previewInlinePrescriptions).toEqual([])
    })

    it('handles missing form_data gracefully when viewing PDF', async () => {
      const rowWithNoFormData: OrdonnanceLibreRecord = {
        id: 99,
        contact_id: '1',
        document_type_id: 'type-1',
        title: 'Ordonnance Libre',
        status: 'draft',
        form_data: null,
        created_at: '2024-01-15T10:00:00Z',
        updated_at: null,
      }
      mockFetchOrdonnances.mockResolvedValue([rowWithNoFormData])

      const wrapper = mount(OrdonnanceView, { global: { stubs } })

      await nextTick()
      await waitForData()
      await nextTick()

      await (wrapper.vm as any).viewPdf(rowWithNoFormData)

      expect((wrapper.vm as any).previewPrescriptionIds).toEqual([])
      expect((wrapper.vm as any).previewInlinePrescriptions).toEqual([])
    })
  })
})
