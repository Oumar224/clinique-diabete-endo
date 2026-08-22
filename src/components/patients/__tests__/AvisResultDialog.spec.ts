// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import AvisResultDialog from '../AvisResultDialog.vue'

// ─── Mock Element Plus ─────────────────────────────────────────────────────

vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), warning: vi.fn(), error: vi.fn() },
  ElMessageBox: { confirm: vi.fn(() => Promise.resolve()) },
}))

// ─── Mock Element Plus Icons ───────────────────────────────────────────────

vi.mock('@element-plus/icons-vue', () => ({
  Delete: { name: 'Delete', template: '<span />' },
  Paperclip: { name: 'Paperclip', template: '<span />' },
}))

// ─── Mock RichTextEditor ───────────────────────────────────────────────────

vi.mock('@/components/patients/RichTextEditor.vue', () => ({
  default: {
    name: 'RichTextEditor',
    template:
      '<textarea class="rich-text-editor" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'rows', 'placeholder'],
    emits: ['update:modelValue'],
  },
}))

// ─── Mock useExamRequests ──────────────────────────────────────────────────

const { mockRealize, mockListAttachments, mockCreateAttachment, mockDeleteAttachment } = vi.hoisted(() => ({
  mockRealize: vi.fn(),
  mockListAttachments: vi.fn(),
  mockCreateAttachment: vi.fn(),
  mockDeleteAttachment: vi.fn(),
}))

vi.mock('@/composables/useExamRequests', () => ({
  useExamRequests: () => ({
    realize: mockRealize,
    listAttachments: mockListAttachments,
    createAttachment: mockCreateAttachment,
    deleteAttachment: mockDeleteAttachment,
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
  'el-form': {
    template: '<form class="el-form"><slot /></form>',
    props: ['labelPosition'],
  },
  'el-form-item': {
    template: '<div class="el-form-item"><label class="el-form-item__label">{{ label }}</label><slot /></div>',
    props: ['label', 'required'],
  },
  'el-button': {
    template: '<button class="el-button" :disabled="disabled" :loading="loading" @click="$emit(\'click\', $event)"><slot /></button>',
    props: ['disabled', 'type', 'size', 'text', 'loading', 'icon', 'circle'],
    emits: ['click'],
  },
  'el-icon': {
    template: '<span class="el-icon"><slot /></span>',
    props: ['size', 'color'],
  },
}

// ─── Test fixtures ─────────────────────────────────────────────────────────

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

describe('AvisResultDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRealize.mockResolvedValue(true)
    mockListAttachments.mockResolvedValue([])
    mockCreateAttachment.mockResolvedValue(makeAttachment({ id: 99 }))
    mockDeleteAttachment.mockResolvedValue(true)
  })

  function createWrapper({ visible = true, examRequestId = 10, title = 'Avis endocrinologie' } = {}) {
    return mount(AvisResultDialog, {
      props: { visible, examRequestId, title },
      global: { stubs },
      attachTo: document.body,
    })
  }

  /** Mount hidden, then flip `visible` so the component's watch fires. */
  async function openWrapper(props: Record<string, any> = {}) {
    const wrapper = createWrapper({ visible: false, ...props })
    await wrapper.setProps({ visible: true })
    await flushPromises()
    return wrapper
  }

  // ─── Rendering ────────────────────────────────────────────────────

  describe('rendering', () => {
    it('renders the RichTextEditor for the resultat field', () => {
      const wrapper = createWrapper()
      expect(wrapper.find('.rich-text-editor').exists()).toBe(true)
    })

    it('loads existing attachments when opened with an examRequestId', async () => {
      mockListAttachments.mockResolvedValue([
        makeAttachment({ id: 1, displayName: 'CR.pdf', fileName: 'CR.pdf', fileSize: 2048 }),
        makeAttachment({ id: 2, displayName: 'Image.jpg', fileName: 'Image.jpg', fileSize: 4096 }),
      ])
      const wrapper = await openWrapper()

      expect(mockListAttachments).toHaveBeenCalledWith(10)
      expect(wrapper.findAll('.avis-result__attachment')).toHaveLength(2)
      expect(wrapper.text()).toContain('CR.pdf')
      expect(wrapper.text()).toContain('Image.jpg')
      expect(wrapper.text()).toContain('2 Ko')
    })

    it('shows an empty message when there are no attachments', async () => {
      const wrapper = await openWrapper()

      expect(wrapper.text()).toContain('Aucune pièce jointe.')
    })
  })

  // ─── Attachment upload ────────────────────────────────────────────

  describe('attachment upload', () => {
    it('calls exam-request-attachments:create (via createAttachment) with the base64 file data', async () => {
      const wrapper = await openWrapper()

      // Simulate choosing a file through the hidden input
      const file = new File(['pdf-bytes'], 'resultat.pdf', { type: 'application/pdf' })
      const input = wrapper.find('input[type="file"]')
      Object.defineProperty(input.element, 'files', { value: [file], configurable: true })
      await input.trigger('change')
      await flushPromises()
      // FileReader.readAsDataURL resolves on a macrotask (jsdom event loop)
      await new Promise(resolve => setTimeout(resolve, 0))
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain('resultat.pdf')

      const addBtn = wrapper.findAll('.el-button').find(b => b.text().includes('Ajouter'))
      expect(addBtn!.attributes('disabled')).toBeUndefined()
      await addBtn!.trigger('click')
      await flushPromises()

      expect(mockCreateAttachment).toHaveBeenCalledTimes(1)
      const payload = mockCreateAttachment.mock.calls[0][0]
      expect(payload.examRequestId).toBe(10)
      expect(payload.displayName).toBe('resultat.pdf')
      expect(payload.fileName).toBe('resultat.pdf')
      expect(payload.mimeType).toBe('application/pdf')
      expect(payload.fileSize).toBe(9)
      // FileReader.readAsDataURL produces a base64 data-uri
      expect(payload.fileData).toMatch(/^data:application\/pdf;base64,/)
    })

    it('keeps the Ajouter button disabled until a file is selected and read', async () => {
      const wrapper = createWrapper()
      const addBtn = wrapper.findAll('.el-button').find(b => b.text().includes('Ajouter'))
      expect(addBtn!.attributes('disabled')).toBeDefined()
    })
  })

  // ─── Save (realize) ───────────────────────────────────────────────

  describe('save', () => {
    it('calls realize(examRequestId, resultat) and emits realized + closes', async () => {
      const wrapper = createWrapper()

      await wrapper.find('.rich-text-editor').setValue('<p>Résultat normal</p>')
      await wrapper.vm.$nextTick()

      const saveBtn = wrapper.findAll('.el-button').find(b => b.text().includes('Enregistrer'))
      await saveBtn!.trigger('click')
      await flushPromises()

      expect(mockRealize).toHaveBeenCalledWith(10, '<p>Résultat normal</p>')
      expect(wrapper.emitted('realized')).toBeDefined()
      const visibleEvents = wrapper.emitted('update:visible')!
      expect(visibleEvents.some(e => e[0] === false)).toBe(true)
    })

    it('calls realize with undefined resultat when the editor is empty', async () => {
      const wrapper = createWrapper()

      const saveBtn = wrapper.findAll('.el-button').find(b => b.text().includes('Enregistrer'))
      await saveBtn!.trigger('click')
      await flushPromises()

      expect(mockRealize).toHaveBeenCalledWith(10, undefined)
    })

    it('does not emit realized when realize fails', async () => {
      mockRealize.mockResolvedValue(false)
      const wrapper = createWrapper()

      const saveBtn = wrapper.findAll('.el-button').find(b => b.text().includes('Enregistrer'))
      await saveBtn!.trigger('click')
      await flushPromises()

      expect(wrapper.emitted('realized')).toBeUndefined()
    })
  })

  // ─── Cancel ───────────────────────────────────────────────────────

  describe('cancel', () => {
    it('emits update:visible false when Annuler is clicked', async () => {
      const wrapper = createWrapper()

      const cancelBtn = wrapper.findAll('.el-button').find(b => b.text().includes('Annuler'))
      await cancelBtn!.trigger('click')

      expect(wrapper.emitted('update:visible')).toBeDefined()
      expect(wrapper.emitted('update:visible')![0]).toEqual([false])
    })
  })
})