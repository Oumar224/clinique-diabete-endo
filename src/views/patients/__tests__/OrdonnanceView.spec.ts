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
  mockCreateFromDocument,
  mockElMessage,
  mockElMessageBox,
  state,
} = vi.hoisted(() => ({
  mockFetchOrdonnances: vi.fn(),
  mockDeleteOrdonnance: vi.fn(),
  mockCreateFromDocument: vi.fn(),
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

vi.mock('@/composables/useDispensations', () => ({
  useDispensations: vi.fn(() => ({
    file: { value: [] },
    fetchFile: vi.fn(),
    getDelivrance: vi.fn(),
    createFromDocument: mockCreateFromDocument,
    servirDelivrance: vi.fn(),
    annulerDelivrance: vi.fn(),
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
      '  <div v-if="!data || data.length === 0" class="el-table__empty">',
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
    hasMedicamentLines: true,
    dejaTransferee: false,
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
    hasMedicamentLines: false,
    dejaTransferee: false,
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
  // Page head
  // -----------------------------------------------------------------------
  describe('page head', () => {
    it('does not render its own page title and keeps the refresh action', async () => {
      mockFetchOrdonnances.mockImplementation(async () => {
        state.ordonnances = mockOrdonnances
        return mockOrdonnances
      })

      const wrapper = mount(OrdonnanceView, { global: { stubs } })

      await nextTick()
      await waitForData()
      await nextTick()

      expect(wrapper.find('.cde-page-title').exists()).toBe(false)
      expect(wrapper.findAll('h1')).toHaveLength(0)
      expect(wrapper.text()).toContain('Rafraîchir')
      expect(wrapper.find('.cde-footer').text()).toContain('2 ordonnance(s)')
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

      expect(wrapper.find('.cde-empty').exists()).toBe(true)
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

    it('sets ordonnanceItems from fd.items for a CRH/CRC generated ordonnance', async () => {
      const crhRow: OrdonnanceLibreRecord = {
        id: 50,
        contact_id: '1',
        document_type_id: 'type-1',
        title: 'CRH - 05/09/2026',
        status: 'draft',
        form_data: JSON.stringify({
          source: 'crh',
          categorie: 'soins',
          sourceDocumentId: 'doc-abc',
          items: [{ categorie: 'soins', medicament: 'Pansement quotidien' }],
        }),
        created_at: '2026-09-05T10:00:00Z',
        updated_at: null,
      }
      mockFetchOrdonnances.mockResolvedValue([crhRow])

      const wrapper = mount(OrdonnanceView, { global: { stubs } })

      await nextTick()
      await waitForData()
      await nextTick()

      await (wrapper.vm as any).viewPdf(crhRow)

      expect((wrapper.vm as any).previewOrdonnanceItems).toEqual([
        { categorie: 'soins', medicament: 'Pansement quotidien' },
      ])
      expect((wrapper.vm as any).previewPrescriptionIds).toEqual([])
      expect((wrapper.vm as any).previewInlinePrescriptions).toEqual([])
    })

    it('sets ordonnanceItems from fd.ordonnanceSortie for new-style documents', async () => {
      const sortieRow: OrdonnanceLibreRecord = {
        id: 51,
        contact_id: '1',
        document_type_id: 'type-1',
        title: 'Ordonnance Libre',
        status: 'draft',
        form_data: JSON.stringify({
          ordonnanceSortie: [
            { categorie: 'medicament', medicament: 'Metformine 500 mg', dosage: '500' },
            { categorie: 'examen', examen: 'NFS' },
          ],
        }),
        created_at: '2026-09-05T10:00:00Z',
        updated_at: null,
      }
      mockFetchOrdonnances.mockResolvedValue([sortieRow])

      const wrapper = mount(OrdonnanceView, { global: { stubs } })

      await nextTick()
      await waitForData()
      await nextTick()

      await (wrapper.vm as any).viewPdf(sortieRow)

      expect((wrapper.vm as any).previewOrdonnanceItems).toHaveLength(2)
      expect((wrapper.vm as any).previewOrdonnanceItems![0].medicament).toBe('Metformine 500 mg')
      expect((wrapper.vm as any).previewPrescriptionIds).toEqual([])
    })
  })

  // -----------------------------------------------------------------------
  // Groupe column (getFormGroups)
  // -----------------------------------------------------------------------
  describe('groupe column (getFormGroups)', () => {
    it('returns the CRH categorie label for documents generated from a CRH/CRC group', async () => {
      const crhRow: OrdonnanceLibreRecord = {
        id: 60,
        contact_id: '1',
        document_type_id: 'type-1',
        title: 'CRH - 05/09/2026',
        status: 'draft',
        form_data: JSON.stringify({ source: 'crh', categorie: 'avis', items: [] }),
        created_at: null,
        updated_at: null,
      }
      mockFetchOrdonnances.mockResolvedValue([crhRow])

      const wrapper = mount(OrdonnanceView, { global: { stubs } })
      await nextTick()
      await waitForData()
      await nextTick()

      expect((wrapper.vm as any).getFormGroups(crhRow)).toBe('Avis spécialisés')
    })

    it('lists the deduped groups of an ordonnanceSortie document in canonical order', async () => {
      const sortieRow: OrdonnanceLibreRecord = {
        id: 61,
        contact_id: '1',
        document_type_id: 'type-1',
        title: 'Ordonnance Libre',
        status: 'draft',
        form_data: JSON.stringify({
          ordonnanceSortie: [
            { categorie: 'avis', specialite: 'Cardiologue' },
            { categorie: 'medicament', medicament: 'Metformine 500 mg' },
            { categorie: 'avis', specialite: 'Dermatologue' },
          ],
        }),
        created_at: null,
        updated_at: null,
      }
      mockFetchOrdonnances.mockResolvedValue([sortieRow])

      const wrapper = mount(OrdonnanceView, { global: { stubs } })
      await nextTick()
      await waitForData()
      await nextTick()

      // Ordre canonique : médicaments d'abord, puis avis ; avis dédupliqué
      expect((wrapper.vm as any).getFormGroups(sortieRow)).toBe("Médicaments, Avis spécialisés")
    })

    it('returns "Médicaments" for legacy inline/linked documents', async () => {
      mockFetchOrdonnances.mockResolvedValue([mockOrdonnances[0]])

      const wrapper = mount(OrdonnanceView, { global: { stubs } })
      await nextTick()
      await waitForData()
      await nextTick()

      expect((wrapper.vm as any).getFormGroups(mockOrdonnances[0])).toBe('Médicaments')
    })

    it('returns "—" for documents without form_data or with an empty ordonnanceSortie', async () => {
      const noFd: OrdonnanceLibreRecord = {
        id: 62,
        contact_id: '1',
        document_type_id: 'type-1',
        title: 'x',
        status: 'draft',
        form_data: null,
        created_at: null,
        updated_at: null,
      }
      const emptySortie: OrdonnanceLibreRecord = {
        id: 63,
        contact_id: '1',
        document_type_id: 'type-1',
        title: 'x',
        status: 'draft',
        form_data: JSON.stringify({ ordonnanceSortie: [] }),
        created_at: null,
        updated_at: null,
      }
      mockFetchOrdonnances.mockResolvedValue([noFd, emptySortie])

      const wrapper = mount(OrdonnanceView, { global: { stubs } })
      await nextTick()
      await waitForData()
      await nextTick()

      expect((wrapper.vm as any).getFormGroups(noFd)).toBe('—')
      expect((wrapper.vm as any).getFormGroups(emptySortie)).toBe('—')
    })
  })

  // -----------------------------------------------------------------------
  // Collecteur examens laboratoire (examens[] join)
  // -----------------------------------------------------------------------
  describe('collecteur examens laboratoire', () => {
    it('getFormMeds joint examens[] pour les items laboratoire', async () => {
      const laboRow: OrdonnanceLibreRecord = {
        id: 70,
        contact_id: '1',
        document_type_id: 'type-1',
        title: 'Ordonnance Libre',
        status: 'draft',
        form_data: JSON.stringify({
          ordonnanceSortie: [
            { categorie: 'examen', examenType: 'laboratoire', examen: 'NFS, Ionogramme', examens: ['NFS', 'Ionogramme'] },
            { categorie: 'examen', examenType: 'imagerie', examen: 'Scanner cérébral', examens: [] },
          ],
        }),
        created_at: null,
        updated_at: null,
      }
      mockFetchOrdonnances.mockResolvedValue([laboRow])

      const wrapper = mount(OrdonnanceView, { global: { stubs } })
      await nextTick()
      await waitForData()
      await nextTick()

      expect((wrapper.vm as any).getFormMeds(laboRow)).toEqual(['NFS, Ionogramme', 'Scanner cérébral'])
    })
  })

  // -----------------------------------------------------------------------
  // Transfert pharmacie
  // -----------------------------------------------------------------------
  describe('transfert pharmacie', () => {
    // Table stub qui rend les vrais templates de cellules (bouton Transférer)
    // avec la ligne liée via boîte réactive par instance de table.
    const TransferTableStub = {
      template: [
        '<div class="el-table">',
        '  <div v-if="!data || data.length === 0"><slot name="empty" /></div>',
        '  <div v-for="(item, idx) in (data || [])" :key="idx" class="el-table__row">',
        '    {{ setRow(item) }}<slot :row="item" />',
        '  </div>',
        '</div>',
      ].join(''),
      props: ['data', 'highlightCurrentRow'],
      emits: ['row-click', 'delete'],
      data: () => ({ rowBox: { current: null as any } }),
      provide(this: any) {
        return { rowBox: this.rowBox }
      },
      methods: {
        setRow(this: any, item: any) {
          this.rowBox.current = item
          return ''
        },
      },
    }
    const TransferColumnStub = {
      template: '<div class="el-table-column"><slot :row="rowBox ? rowBox.current : null" /></div>',
      props: ['label', 'width', 'align', 'minWidth'],
      inject: { rowBox: { from: 'rowBox', default: null } },
    }

    async function mountWithTransfer(row: OrdonnanceLibreRecord = mockOrdonnances[0]) {
      mockFetchOrdonnances.mockResolvedValue([{ ...row }])
      const wrapper = mount(OrdonnanceView, {
        global: {
          stubs: { ...stubs, 'el-table': TransferTableStub, 'el-table-column': TransferColumnStub },
        },
      })
      await nextTick()
      await waitForData()
      await nextTick()
      return wrapper
    }

    function transferButton(wrapper: ReturnType<typeof mount>) {
      return wrapper.findAll('.el-button').find((b) => b.text() === 'Transférer')
    }

    it('transfers an ordonnance with medication lines and announces success', async () => {
      mockCreateFromDocument.mockResolvedValue({
        delivrance: { id: 5, createdAt: new Date().toISOString() },
        lignes: [],
      })
      const wrapper = await mountWithTransfer()

      const transferBtn = transferButton(wrapper)!
      expect(transferBtn).toBeDefined()
      await transferBtn.trigger('click')
      await nextTick()
      await waitForData()

      expect(mockCreateFromDocument).toHaveBeenCalledWith('1')
      expect(mockElMessage.success).toHaveBeenCalledWith('Ordonnance transférée à la pharmacie')
    })

    it('hides the transfer button and shows a neutral badge for an already transferred ordonnance', async () => {
      const wrapper = await mountWithTransfer({ ...mockOrdonnances[0], dejaTransferee: true })

      expect(transferButton(wrapper)).toBeUndefined()
      expect(wrapper.text()).toContain('Transférée à la pharmacie')
      expect(mockCreateFromDocument).not.toHaveBeenCalled()
    })

    it('hides the transfer button when the ordonnance has no medication lines', async () => {
      const wrapper = await mountWithTransfer({ ...mockOrdonnances[0], hasMedicamentLines: false })

      expect(transferButton(wrapper)).toBeUndefined()
      expect(wrapper.text()).not.toContain('Transférée à la pharmacie')
      expect(mockCreateFromDocument).not.toHaveBeenCalled()
    })

    it('does not call the transfer IPC for an ineligible row (defensive guard)', async () => {
      const wrapper = await mountWithTransfer({ ...mockOrdonnances[0], hasMedicamentLines: false })

      await (wrapper.vm as any).onTransfer({ ...mockOrdonnances[0], hasMedicamentLines: false })
      await waitForData()

      expect(mockCreateFromDocument).not.toHaveBeenCalled()
    })

    it('announces an already transferred ordonnance when the transfer races', async () => {
      mockCreateFromDocument.mockResolvedValue({
        delivrance: { id: 5, createdAt: new Date(Date.now() - 3600_000).toISOString() },
        lignes: [],
        created: false,
      })
      const wrapper = await mountWithTransfer()
      const row = (wrapper.vm as any).ordonnances[0]

      await (wrapper.vm as any).onTransfer(row)
      await waitForData()
      await nextTick()

      expect(row.dejaTransferee).toBe(true)
      expect(mockElMessage.info).toHaveBeenCalledWith('Ordonnance déjà transférée à la pharmacie')
      expect(mockElMessage.success).not.toHaveBeenCalled()
      expect(transferButton(wrapper)).toBeUndefined()
    })

    it('shows an error when the transfer fails', async () => {
      mockCreateFromDocument.mockRejectedValue(new Error('Stock insuffisant'))
      const wrapper = await mountWithTransfer()

      const transferBtn = transferButton(wrapper)!
      await transferBtn.trigger('click')
      await nextTick()
      await waitForData()

      expect(mockElMessage.error).toHaveBeenCalledWith('Stock insuffisant')
    })
  })
})
