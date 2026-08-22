// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import ExamRequestDetailDialog from '../ExamRequestDetailDialog.vue'

// ─── Mock Element Plus ─────────────────────────────────────────────────────

vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), warning: vi.fn(), error: vi.fn() },
  ElMessageBox: { confirm: vi.fn(() => Promise.resolve('confirm')) },
}))

// ─── Mock Element Plus Icons ───────────────────────────────────────────────

vi.mock('@element-plus/icons-vue', () => ({
  Paperclip: { name: 'Paperclip', template: '<span />' },
}))

// ─── Mock composables ──────────────────────────────────────────────────────

const { mockListAttachments, mockFetchByRequest } = vi.hoisted(() => ({
  mockListAttachments: vi.fn(),
  mockFetchByRequest: vi.fn(),
}))

vi.mock('@/composables/useExamRequests', () => ({
  useExamRequests: () => ({
    listAttachments: mockListAttachments,
  }),
}))

vi.mock('@/composables/useExamResults', () => ({
  useExamResults: () => ({
    results: [],
    loading: false,
    fetchByRequest: mockFetchByRequest,
  }),
}))

// ─── Stubs for all Element Plus components ─────────────────────────────────

const stubs: Record<string, any> = {
  'el-dialog': {
    template: `
      <div class="el-dialog" v-if="modelValue">
        <div class="el-dialog__header"><span class="el-dialog__title">{{ title }}</span></div>
        <div class="el-dialog__body"><slot /></div>
        <div class="el-dialog__footer"><slot name="footer" /></div>
      </div>
    `,
    props: ['modelValue', 'title', 'width', 'closeOnClickModal'],
    emits: ['update:modelValue', 'closed'],
  },
  'el-descriptions': {
    template: '<div class="el-descriptions"><slot /></div>',
    props: ['column', 'border', 'size'],
  },
  'el-descriptions-item': {
    template: [
      '<div class="el-descriptions-item" :data-label="label">',
      '  <span class="el-descriptions-item__label">{{ label }}</span>',
      '  <span class="el-descriptions-item__content"><slot /></span>',
      '</div>',
    ].join(''),
    props: ['label', 'span'],
  },
  'el-button': {
    template: '<button class="el-button" :disabled="disabled" @click="$emit(\'click\', $event)"><slot /></button>',
    props: ['disabled', 'type', 'size', 'text', 'link', 'icon'],
    emits: ['click'],
  },
  'el-icon': {
    template: '<span class="el-icon"><slot /></span>',
    props: ['size', 'color'],
  },
  'el-table': {
    template: '<div class="el-table"><slot /></div>',
    props: ['data', 'size', 'emptyText'],
  },
  'el-table-column': {
    template: '<div class="el-table-column" :data-label="label"><slot :row="row" /></div>',
    props: ['prop', 'label', 'minWidth', 'width'],
    data() {
      return { row: { parameterName: 'Glycémie', value: '1.05', parameterUnit: 'g/L', isNormal: true } }
    },
  },
  'el-tag': {
    template: '<span class="el-tag" :class="`el-tag--${type}`"><slot /></span>',
    props: ['type', 'size'],
  },
}

// ─── Test fixtures ─────────────────────────────────────────────────────────

function makeRequest(overrides: Record<string, any> = {}) {
  return {
    id: 10,
    patientId: 1,
    type: 'avis',
    statut: 'en_attente',
    prescripteurNom: 'Dr. Camara',
    motif: '<p>Contrôle trimestriel</p>',
    createdAt: '2026-07-01T08:00:00.000Z',
    plannedDate: '2026-07-03',
    plannedHour: 9,
    realizedAt: null,
    validatedAt: null,
    specialtyName: 'Endocrinologie',
    resultat: null,
    ...overrides,
  }
}

function makeAttachment(overrides: Record<string, any> = {}) {
  return {
    id: 1,
    examRequestId: 10,
    displayName: 'CR.pdf',
    fileName: 'CR.pdf',
    mimeType: 'application/pdf',
    fileSize: 2048,
    ...overrides,
  }
}

describe('ExamRequestDetailDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockListAttachments.mockResolvedValue([])
    mockFetchByRequest.mockResolvedValue([])
  })

  function createWrapper({ visible = true, request = makeRequest() } = {}) {
    return mount(ExamRequestDetailDialog, {
      props: { visible, request },
      global: { stubs },
      attachTo: document.body,
    })
  }

  async function openWrapper(request: Record<string, any> = {}) {
    const wrapper = createWrapper({ visible: false, request: makeRequest(request) })
    await wrapper.setProps({ visible: true })
    await flushPromises()
    return wrapper
  }

  // ─── Rendering ────────────────────────────────────────────────────

  describe('rendering', () => {
    it('renders the dialog with request summary fields', () => {
      const wrapper = createWrapper()
      expect(wrapper.find('.el-dialog').exists()).toBe(true)
      expect(wrapper.find('.el-dialog__title').text()).toContain('Détail de la demande')
      expect(wrapper.text()).toContain('Avis spécialisé')
      expect(wrapper.text()).toContain('Endocrinologie')
      expect(wrapper.text()).toContain('Dr. Camara')
    })

    it('maps statut and type to their labels', () => {
      const wrapper = createWrapper()
      expect(wrapper.text()).toContain('En attente')
    })

    it('shows planned date and time when plannedHour is set', () => {
      const wrapper = createWrapper()
      expect(wrapper.text()).toContain('Planifié')
      expect(wrapper.text()).toContain('03/07/2026')
      expect(wrapper.text()).toContain('09:00')
    })

    it('renders the motif as raw HTML', () => {
      const wrapper = createWrapper()
      const motif = wrapper.find('.exam-detail__motif')
      expect(motif.exists()).toBe(true)
      expect(motif.element.innerHTML).toContain('<p>Contrôle trimestriel</p>')
    })

    it('shows an em dash when the prescripteur is missing', () => {
      const wrapper = createWrapper({ request: makeRequest({ prescripteurNom: null }) })
      expect(wrapper.text()).toContain('Prescripteur')
      expect(wrapper.text()).toContain('—')
    })

    it('shows Réalisé statut and the realization date for a realized request', () => {
      const wrapper = createWrapper({
        request: makeRequest({ statut: 'realise', realizedAt: '2026-07-02T14:30:00.000Z' }),
      })
      expect(wrapper.text()).toContain('Réalisé')
      expect(wrapper.text()).toContain('02/07/2026')
    })
  })

  // ─── Attachments (non-laboratoire) ────────────────────────────────

  describe('attachments', () => {
    it('loads attachments via listAttachments when the dialog opens', async () => {
      mockListAttachments.mockResolvedValue([
        makeAttachment({ id: 1, displayName: 'CR.pdf', fileName: 'CR.pdf', fileSize: 2048 }),
        makeAttachment({ id: 2, displayName: 'IRM.jpg', fileName: 'IRM.jpg', fileSize: 4096 }),
      ])
      const wrapper = await openWrapper()

      expect(mockListAttachments).toHaveBeenCalledWith(10)
      expect(wrapper.findAll('.exam-detail__attachment')).toHaveLength(2)
      expect(wrapper.text()).toContain('CR.pdf')
      expect(wrapper.text()).toContain('IRM.jpg')
      expect(wrapper.text()).toContain('2 Ko')
      expect(wrapper.text()).toContain('4 Ko')
    })

    it('shows a friendly message when there are no attachments', async () => {
      const wrapper = await openWrapper()
      expect(wrapper.text()).toContain('Aucune pièce jointe.')
    })

    it('does not load attachments for laboratoire requests', async () => {
      const wrapper = await openWrapper({ type: 'laboratoire' })
      expect(mockListAttachments).not.toHaveBeenCalled()
      expect(mockFetchByRequest).toHaveBeenCalledWith(10)
      // Laboratoire requests render the results table instead of attachments
      expect(wrapper.text()).toContain('Résultats')
      expect(wrapper.text()).not.toContain('Pièces jointes')
    })
  })

  // ─── Close / cancel ───────────────────────────────────────────────

  describe('close', () => {
    it('emits update:visible false when Fermer is clicked', async () => {
      const wrapper = createWrapper()
      const closeBtn = wrapper.findAll('.el-button').find(b => b.text().includes('Fermer'))
      await closeBtn!.trigger('click')

      expect(wrapper.emitted('update:visible')).toBeDefined()
      expect(wrapper.emitted('update:visible')![0]).toEqual([false])
    })
  })
})