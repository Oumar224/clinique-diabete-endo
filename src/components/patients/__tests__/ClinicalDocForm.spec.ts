// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import type { ClinicalDocumentDTO, ClinicalDocumentTypeDTO } from '@/composables/useClinicalDocuments'

// ─── Mock Element Plus ─────────────────────────────────────────────

const mockConfirm = vi.fn()
vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), warning: vi.fn(), error: vi.fn() },
  ElMessageBox: { confirm: mockConfirm },
}))

// ─── Stubs ─────────────────────────────────────────────────────────

const DynamicFormRendererStub = {
  name: 'DynamicFormRenderer',
  template: '<div class="dynamic-form-renderer-stub"><slot /></div>',
  props: ['schema', 'modelValue', 'disabled'],
  emits: ['update:modelValue'],
  methods: {
    validate: vi.fn().mockResolvedValue(true),
    resetValidation: vi.fn(),
  },
}

const EL_STUBS: Record<string, any> = {
  'el-empty': {
    template: '<div class="el-empty" :description="description"><slot /></div>',
    props: ['description', 'imageSize'],
  },
  'el-alert': {
    template: '<div class="el-alert" :title="title" :type="type"><slot /></div>',
    props: ['title', 'type', 'showIcon', 'closable'],
  },
  'el-tag': {
    template: '<span class="el-tag" :type="type"><slot /></span>',
    props: ['type', 'size', 'effect'],
  },
  'el-button': {
    template: '<button class="el-button" :disabled="disabled" :type="type" :loading="loading" @click="$emit(\'click\', $event)"><slot /></button>',
    props: ['disabled', 'type', 'size', 'text', 'loading'],
    emits: ['click'],
  },
}

import ClinicalDocForm from '../ClinicalDocForm.vue'

// ─── Test fixtures ─────────────────────────────────────────────────

const CONSULT_TYPE_ID = '11111111-1111-4111-1111-111111111111'

const documentType: ClinicalDocumentTypeDTO = {
  id: CONSULT_TYPE_ID,
  code: 'CONSULTATION_NOTE',
  label: 'Compte rendu de consultation',
  description: 'Compte rendu détaillé d\'une consultation médicale',
  formSchema: [
    { key: 'reason', type: 'textarea', label: 'Motif', required: true },
    { key: 'diagnosis', type: 'textarea', label: 'Diagnostic', required: true },
  ],
  category: 'consultation',
}

const draftDocument: ClinicalDocumentDTO = {
  id: 'doc-001',
  contactId: '1',
  patientId: '42',
  serviceId: '5',
  documentTypeId: CONSULT_TYPE_ID,
  title: 'Compte rendu de consultation',
  status: 'draft',
  formData: { reason: 'Douleur thoracique', diagnosis: '' },
  createdBy: 'Dr. Diallo',
  createdAt: '2024-06-15T10:00:00.000Z',
  updatedAt: '2024-06-15T10:00:00.000Z',
}

const signedDocument: ClinicalDocumentDTO = {
  ...draftDocument,
  id: 'doc-002',
  status: 'signed',
  formData: { reason: 'Douleur thoracique', diagnosis: 'Angine de poitrine' },
  signedAt: '2024-06-15T11:00:00.000Z',
  signedBy: 'Dr. Diallo',
}

describe('ClinicalDocForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockConfirm.mockResolvedValue(true)
  })

  function createWrapper({
    document = null,
    docType = null,
    readonly = false,
  }: {
    document?: ClinicalDocumentDTO | null
    docType?: ClinicalDocumentTypeDTO | null
    readonly?: boolean
  } = {}) {
    return mount(ClinicalDocForm, {
      props: {
        document,
        documentType: docType,
        readonly,
      },
      global: {
        stubs: {
          ...EL_STUBS,
          DynamicFormRenderer: DynamicFormRendererStub,
        },
      },
      attachTo: document.body,
    })
  }

  // ─── Empty state ─────────────────────────────────────────────────

  describe('empty state', () => {
    it('shows empty state when no document is selected', () => {
      const wrapper = createWrapper()
      const empty = wrapper.find('.el-empty')
      expect(empty.exists()).toBe(true)
      expect(empty.attributes('description')).toBe('Sélectionnez un document')
    })

    it('does not show document type not found when no document is selected', () => {
      const wrapper = createWrapper()
      // Should show the first empty, not the second
      const empties = wrapper.findAll('.el-empty')
      expect(empties).toHaveLength(1)
    })
  })

  // ─── Document type not found ─────────────────────────────────────

  describe('document type not found', () => {
    it('shows empty state when document is provided but documentType is null', () => {
      const wrapper = createWrapper({ document: draftDocument, docType: null })
      const empty = wrapper.find('.el-empty')
      expect(empty.exists()).toBe(true)
      expect(empty.attributes('description')).toBe('Type de document introuvable')
    })
  })

  // ─── Document selected (normal view) ─────────────────────────────

  describe('document selected', () => {
    it('renders the document title from documentType', () => {
      const wrapper = createWrapper({ document: draftDocument, docType: documentType })
      expect(wrapper.text()).toContain('Compte rendu de consultation')
    })

    it('renders the status tag', () => {
      const wrapper = createWrapper({ document: draftDocument, docType: documentType })
      const tag = wrapper.find('.el-tag')
      expect(tag.exists()).toBe(true)
      expect(tag.text()).toContain('Brouillon')
    })

    it('renders meta information (created by, created date)', () => {
      const wrapper = createWrapper({ document: draftDocument, docType: documentType })
      expect(wrapper.text()).toContain('Dr. Diallo')
    })

    it('renders the DynamicFormRenderer with the correct schema', () => {
      const wrapper = createWrapper({ document: draftDocument, docType: documentType })
      const renderer = wrapper.findComponent({ name: 'DynamicFormRenderer' })
      expect(renderer.exists()).toBe(true)
      expect(renderer.props('schema')).toEqual(documentType.formSchema)
      expect(renderer.props('disabled')).toBe(false)
    })

    it('shows save button for draft documents', () => {
      const wrapper = createWrapper({ document: draftDocument, docType: documentType })
      const buttons = wrapper.findAll('.el-button')
      const saveBtn = buttons.find(b => b.text().includes('Enregistrer'))
      expect(saveBtn).toBeDefined()
    })

    it('shows sign button for draft documents', () => {
      const wrapper = createWrapper({ document: draftDocument, docType: documentType })
      const buttons = wrapper.findAll('.el-button')
      const signBtn = buttons.find(b => b.text().includes('Signer'))
      expect(signBtn).toBeDefined()
    })
  })

  // ─── Read-only / lock alert ──────────────────────────────────────

  describe('readonly state', () => {
    it('shows lock alert when readonly is true', () => {
      const wrapper = createWrapper({ document: signedDocument, docType: documentType, readonly: true })
      const alert = wrapper.find('.el-alert')
      expect(alert.exists()).toBe(true)
      expect(alert.attributes('title')).toContain('Ce document est verrouillé en lecture seule')
    })

    it('does not show action buttons when readonly', () => {
      const wrapper = createWrapper({ document: signedDocument, docType: documentType, readonly: true })
      expect(wrapper.text()).not.toContain('Enregistrer')
      expect(wrapper.text()).not.toContain('Signer')
    })
  })

  // ─── Save button ─────────────────────────────────────────────────

  describe('save', () => {
    it('emits save event with form data when save button is clicked', async () => {
      const wrapper = createWrapper({ document: draftDocument, docType: documentType })

      const saveBtn = wrapper.findAll('.el-button').find(b => b.text().includes('Enregistrer'))
      expect(saveBtn).toBeDefined()
      await saveBtn!.trigger('click')

      await new Promise(r => setTimeout(r, 0))

      expect(wrapper.emitted('save')).toBeDefined()
      const emittedData = wrapper.emitted('save')![0][0] as Record<string, any>
      expect(emittedData.reason).toBe('Douleur thoracique')
    })

    it('does not emit save when validation fails', async () => {
      // Make DynamicFormRenderer.validate return false
      DynamicFormRendererStub.methods.validate.mockResolvedValue(false)

      const wrapper = createWrapper({ document: draftDocument, docType: documentType })

      const saveBtn = wrapper.findAll('.el-button').find(b => b.text().includes('Enregistrer'))
      await saveBtn!.trigger('click')

      await new Promise(r => setTimeout(r, 0))

      expect(wrapper.emitted('save')).toBeUndefined()
    })

    it('shows warning message when validation fails', async () => {
      DynamicFormRendererStub.methods.validate.mockResolvedValue(false)

      const wrapper = createWrapper({ document: draftDocument, docType: documentType })

      const saveBtn = wrapper.findAll('.el-button').find(b => b.text().includes('Enregistrer'))
      await saveBtn!.trigger('click')

      await new Promise(r => setTimeout(r, 0))

      // ElMessage.warning should have been called
      const ElMessage = (await import('element-plus')).ElMessage
      expect(ElMessage.warning).toHaveBeenCalled()
    })
  })

  // ─── Sign button ─────────────────────────────────────────────────

  describe('sign', () => {
    it('shows confirm dialog then emits sign event', async () => {
      mockConfirm.mockResolvedValue(true)
      const wrapper = createWrapper({ document: draftDocument, docType: documentType })

      const signBtn = wrapper.findAll('.el-button').find(b => b.text().includes('Signer'))
      expect(signBtn).toBeDefined()
      await signBtn!.trigger('click')

      await new Promise(r => setTimeout(r, 0))

      // Confirm dialog should have been shown
      expect(mockConfirm).toHaveBeenCalled()

      // Save should have been emitted first
      expect(wrapper.emitted('save')).toBeDefined()

      // Then sign should be emitted
      expect(wrapper.emitted('sign')).toBeDefined()
    })

    it('does not emit sign when confirm is cancelled', async () => {
      mockConfirm.mockRejectedValue(new Error('Cancel'))
      const wrapper = createWrapper({ document: draftDocument, docType: documentType })

      const signBtn = wrapper.findAll('.el-button').find(b => b.text().includes('Signer'))
      await signBtn!.trigger('click')

      await new Promise(r => setTimeout(r, 0))

      expect(wrapper.emitted('sign')).toBeUndefined()
    })

    it('does not emit sign when validation fails', async () => {
      DynamicFormRendererStub.methods.validate.mockResolvedValue(false)
      const wrapper = createWrapper({ document: draftDocument, docType: documentType })

      const signBtn = wrapper.findAll('.el-button').find(b => b.text().includes('Signer'))
      await signBtn!.trigger('click')

      await new Promise(r => setTimeout(r, 0))

      expect(mockConfirm).not.toHaveBeenCalled()
      expect(wrapper.emitted('sign')).toBeUndefined()
    })
  })

  // ─── Close button ────────────────────────────────────────────────

  describe('close', () => {
    it('emits close event when close button is clicked', async () => {
      const wrapper = createWrapper({ document: draftDocument, docType: documentType })

      const closeBtn = wrapper.findAll('.el-button').find(b => b.text().includes('Fermer'))
      expect(closeBtn).toBeDefined()
      await closeBtn!.trigger('click')

      expect(wrapper.emitted('close')).toBeDefined()
    })
  })

  // ─── Signed document meta ────────────────────────────────────────

  describe('signed document meta', () => {
    it('displays signed date and signed by for signed documents', () => {
      const wrapper = createWrapper({ document: signedDocument, docType: documentType, readonly: true })
      expect(wrapper.text()).toContain('Signé le')
      expect(wrapper.text()).toContain('Dr. Diallo')
    })

    it('does not display signed info for draft documents', () => {
      const wrapper = createWrapper({ document: draftDocument, docType: documentType })
      expect(wrapper.text()).not.toContain('Signé le')
    })
  })
})
