// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import type { ClinicalDocumentDTO, ClinicalDocumentTypeDTO } from '@/composables/useClinicalDocuments'

// ─── Mock Element Plus ─────────────────────────────────────────────

const { mockConfirm } = vi.hoisted(() => ({
  mockConfirm: vi.fn(),
}))
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

const importedDocument: ClinicalDocumentDTO = {
  id: 'doc-003',
  contactId: '1',
  patientId: '42',
  serviceId: '5',
  documentTypeId: CONSULT_TYPE_ID,
  title: 'Compte rendu importé',
  status: 'draft',
  formData: {},
  source: 'imported',
  pdfPath: '/path/to/imported-doc.pdf',
  createdBy: 'Dr. Diallo',
  createdAt: '2024-06-15T10:00:00.000Z',
  updatedAt: '2024-06-15T12:00:00.000Z',
}

const importedDocumentNoPdf: ClinicalDocumentDTO = {
  id: 'doc-004',
  contactId: '1',
  patientId: '42',
  serviceId: '5',
  documentTypeId: CONSULT_TYPE_ID,
  title: 'Image importée',
  status: 'draft',
  formData: {},
  source: 'imported',
  createdBy: 'Dr. Diallo',
  createdAt: '2024-06-15T10:00:00.000Z',
  updatedAt: '2024-06-15T12:00:00.000Z',
}

const importedPdfDoc: ClinicalDocumentDTO = {
  id: 'doc-imported-pdf',
  contactId: '1',
  patientId: '42',
  serviceId: '5',
  documentTypeId: '',
  title: 'rapport.pdf',
  status: 'draft',
  formData: {},
  source: 'imported',
  pdfPath: '/path/to/rapport.pdf',
  createdBy: 'Dr. Test',
  createdAt: '2024-06-15T10:00:00.000Z',
  updatedAt: '2024-06-15T10:00:00.000Z',
}

const importedImageDoc: ClinicalDocumentDTO = {
  id: 'doc-imported-img',
  contactId: '1',
  patientId: '42',
  serviceId: '5',
  documentTypeId: '',
  title: 'radio.jpg',
  status: 'draft',
  formData: {},
  source: 'imported',
  pdfPath: '/path/to/radio.jpg',
  createdBy: 'Dr. Test',
  createdAt: '2024-06-15T10:00:00.000Z',
  updatedAt: '2024-06-15T10:00:00.000Z',
}

const importedDocDoc: ClinicalDocumentDTO = {
  id: 'doc-imported-doc',
  contactId: '1',
  patientId: '42',
  serviceId: '5',
  documentTypeId: '',
  title: 'compte-rendu.docx',
  status: 'draft',
  formData: {},
  source: 'imported',
  pdfPath: '/path/to/compte-rendu.docx',
  createdBy: 'Dr. Test',
  createdAt: '2024-06-15T10:00:00.000Z',
  updatedAt: '2024-06-15T10:00:00.000Z',
}

describe('ClinicalDocForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockConfirm.mockResolvedValue(true)
    DynamicFormRendererStub.methods.validate.mockResolvedValue(true)
    DynamicFormRendererStub.methods.resetValidation.mockReset()
  })

  function createWrapper({
    document: doc = null,
    docType = null,
    readonly = false,
  }: {
    document?: ClinicalDocumentDTO | null
    docType?: ClinicalDocumentTypeDTO | null
    readonly?: boolean
  } = {}) {
    return mount(ClinicalDocForm, {
      props: {
        document: doc,
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
    it('forwards readonly as disabled to the dynamic form renderer', () => {
      const wrapper = createWrapper({ document: signedDocument, docType: documentType, readonly: true })
      const renderer = wrapper.findComponent(DynamicFormRendererStub)
      expect(renderer.exists()).toBe(true)
      expect(renderer.props('disabled')).toBe(true)
    })

    it('does not disable the dynamic form renderer when not readonly', () => {
      const wrapper = createWrapper({ document: draftDocument, docType: documentType, readonly: false })
      const renderer = wrapper.findComponent(DynamicFormRendererStub)
      expect(renderer.exists()).toBe(true)
      expect(renderer.props('disabled')).toBe(false)
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

    it('shows "Resigner" on the sign button for a signed document', () => {
      const wrapper = createWrapper({ document: signedDocument, docType: documentType })
      const buttons = wrapper.findAll('.el-button')
      const signBtn = buttons.find(b => b.text().includes('Resigner'))
      expect(signBtn).toBeDefined()
    })

    it('asks for confirmation and re-signs a signed document, warning the old signature will be overwritten', async () => {
      const wrapper = createWrapper({ document: signedDocument, docType: documentType })

      const signBtn = wrapper.findAll('.el-button').find(b => b.text().includes('Resigner'))
      expect(signBtn).toBeDefined()
      await signBtn!.trigger('click')

      await new Promise(r => setTimeout(r, 0))

      expect(mockConfirm).toHaveBeenCalledWith(
        'Resigner ce document ? L\'ancienne signature sera écrasée.',
        'Re-signature',
        expect.objectContaining({ confirmButtonText: 'Resigner', type: 'warning' }),
      )
      expect(wrapper.emitted('save')).toBeDefined()
      expect(wrapper.emitted('sign')).toBeDefined()
    })

    it('does not emit sign when re-sign confirmation is cancelled', async () => {
      mockConfirm.mockRejectedValue(new Error('Cancel'))
      const wrapper = createWrapper({ document: signedDocument, docType: documentType })

      const signBtn = wrapper.findAll('.el-button').find(b => b.text().includes('Resigner'))
      await signBtn!.trigger('click')

      await new Promise(r => setTimeout(r, 0))

      expect(wrapper.emitted('sign')).toBeUndefined()
    })

    it('delegates signing of ORDONNANCE_LIBRE to the dedicated form without a local confirmation', async () => {
      const ordonnanceDocType: ClinicalDocumentTypeDTO = {
        ...documentType,
        id: 'ordinance-type-id',
        code: 'ORDONNANCE_LIBRE',
        label: 'Ordonnance libre',
      }
      const wrapper = mount(ClinicalDocForm, {
        props: {
          document: draftDocument,
          documentType: ordonnanceDocType,
          readonly: false,
        },
        global: {
          stubs: {
            ...EL_STUBS,
            DynamicFormRenderer: DynamicFormRendererStub,
            OrdonnanceLibreForm: {
              template: '<div class="ord-libre-stub" />',
              emits: ['save', 'sign', 'close'],
            },
          },
        },
        attachTo: document.body,
      })

      await wrapper.vm.handleSign()

      await new Promise(r => setTimeout(r, 0))

      expect(mockConfirm).not.toHaveBeenCalled()
      expect(wrapper.emitted('sign')).toBeDefined()
    })
  })

  // ─── Close behavior ──────────────────────────────────────────────

  describe('close', () => {
    it('does not render a close button in non-CRH form (parent handles navigation)', () => {
      const wrapper = createWrapper({ document: draftDocument, docType: documentType })
      const buttons = wrapper.findAll('.el-button')
      const closeBtn = buttons.find(b => b.text().includes('Fermer'))
      expect(closeBtn).toBeUndefined()
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

  // ─── Imported document viewer ─────────────────────────────────────

  describe('imported document viewer', () => {
    it('shows "Importé" tag when document.source is "imported"', () => {
      const wrapper = createWrapper({ document: importedDocument, docType: documentType })
      const tags = wrapper.findAll('.el-tag')
      const importedTag = tags.find(t => t.text().includes('Importé'))
      expect(importedTag).toBeDefined()
    })

    it('shows document title for imported documents', () => {
      const wrapper = createWrapper({ document: importedDocument, docType: documentType })
      expect(wrapper.text()).toContain('Compte rendu importé')
    })

    it('shows "Ouvrir dans le visionneuse système" button when pdfPath exists', () => {
      const wrapper = createWrapper({ document: importedDocument, docType: documentType })
      const buttons = wrapper.findAll('.el-button')
      const openBtn = buttons.find(b => b.text().includes('Ouvrir dans le visionneuse système'))
      expect(openBtn).toBeDefined()
    })

    it('does not show "Ouvrir dans le visionneuse système" button when pdfPath is absent', () => {
      const wrapper = createWrapper({ document: importedDocumentNoPdf, docType: documentType })
      const buttons = wrapper.findAll('.el-button')
      const openBtn = buttons.find(b => b.text().includes('Ouvrir dans le visionneuse système'))
      expect(openBtn).toBeUndefined()
    })

    it('shows metadata (created by, created date) for imported documents', () => {
      const wrapper = createWrapper({ document: importedDocument, docType: documentType })
      expect(wrapper.text()).toContain('Créé par')
      expect(wrapper.text()).toContain('Dr. Diallo')
      expect(wrapper.text()).toContain('Créé le')
      expect(wrapper.text()).toContain('Importé le')
    })

    it('does NOT show the DynamicFormRenderer for imported documents', () => {
      const wrapper = createWrapper({ document: importedDocument, docType: documentType })
      const renderer = wrapper.findComponent({ name: 'DynamicFormRenderer' })
      expect(renderer.exists()).toBe(false)
    })

    it('does NOT show the "Type de document introuvable" empty state for imported documents', () => {
      const wrapper = createWrapper({ document: importedDocument, docType: null })
      // The imported document viewer block renders its own content (title, tag, etc.)
      // and should NOT fall through to the "Type de document introuvable" v-else block
      expect(wrapper.text()).not.toContain('Type de document introuvable')
      expect(wrapper.text()).toContain('Importé')
    })

    it('does NOT show save or sign buttons for imported documents', () => {
      const wrapper = createWrapper({ document: importedDocument, docType: documentType })
      expect(wrapper.text()).not.toContain('Enregistrer')
      expect(wrapper.text()).not.toContain('Signer')
    })

    it('uses "Document importé" as fallback title when document.title is empty', () => {
      const docNoTitle: ClinicalDocumentDTO = {
        ...importedDocument,
        title: undefined,
      }
      const wrapper = createWrapper({ document: docNoTitle, docType: documentType })
      expect(wrapper.text()).toContain('Document importé')
    })

    it('renders an iframe for PDF imported documents', () => {
      const wrapper = createWrapper({ document: importedPdfDoc, docType: null })
      const iframe = wrapper.find('iframe.doc-form__pdf-viewer')
      expect(iframe.exists()).toBe(true)
    })

    it('renders an img for image imported documents', () => {
      const wrapper = createWrapper({ document: importedImageDoc, docType: null })
      const img = wrapper.find('img.doc-form__image-viewer')
      expect(img.exists()).toBe(true)
    })

    it('shows fallback for doc imported documents', () => {
      const wrapper = createWrapper({ document: importedDocDoc, docType: null })
      const empty = wrapper.find('.el-empty')
      expect(empty.exists()).toBe(true)
      expect(empty.attributes('description')).toBe('Document importé')
    })

    it('sets iframe src to file:// protocol path for PDFs', () => {
      const wrapper = createWrapper({ document: importedPdfDoc, docType: null })
      const iframe = wrapper.find('iframe.doc-form__pdf-viewer')
      expect(iframe.attributes('src')).toBe('file:///path/to/rapport.pdf')
    })

    it('sets img src to file:// protocol path for images', () => {
      const wrapper = createWrapper({ document: importedImageDoc, docType: null })
      const img = wrapper.find('img.doc-form__image-viewer')
      expect(img.attributes('src')).toBe('file:///path/to/radio.jpg')
    })
  })
})
