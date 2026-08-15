// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, nextTick } from 'vue'
import DossierClinicView from '../DossierClinicView.vue'

// ===========================================================================
// Hoisted mocks
// ===========================================================================
const {
  mockFetchDocumentTypes,
  mockFetchDocumentsByPatient,
  mockCreateDocument,
  mockDeleteDocument,
  mockListEncountersByPatient,
  mockElMessage,
  mockElMessageBox,
  mockSelectDocument,
  state,
} = vi.hoisted(() => ({
  mockFetchDocumentTypes: vi.fn(),
  mockFetchDocumentsByPatient: vi.fn(),
  mockCreateDocument: vi.fn(),
  mockDeleteDocument: vi.fn(),
  mockListEncountersByPatient: vi.fn(),
  mockElMessage: { success: vi.fn(), warning: vi.fn(), info: vi.fn(), error: vi.fn() },
  mockElMessageBox: { confirm: vi.fn(() => Promise.resolve()), alert: vi.fn(() => Promise.resolve()) },
  mockSelectDocument: vi.fn(),
  state: {
    documents: [] as any[],
    selectedDocument: null as any,
    loading: false,
    documentTypes: [] as any[],
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
  Plus: { render: () => {} },
  Delete: { render: () => {} },
  Upload: { render: () => {} },
  User: { render: () => {} },
  View: { render: () => {} },
  ArrowLeft: { render: () => {} },
  DocumentChecked: { render: () => {} },
  Lock: { render: () => {} },
}))

vi.mock('@/composables/usePatientContext', () => ({
  usePatientContext: vi.fn(() => ({
    activePatient: { value: { id: 1, nom: 'Doe', prenom: 'John' } },
  })),
}))

vi.mock('@/composables/useClinicalDocuments', async () => {
  const { ref: vueRef } = await import('vue')
  const docsRef = vueRef<any[]>([])
  const docTypesRef = vueRef<any[]>([])
  const loadingRef = vueRef(false)

  return {
    useClinicalDocuments: vi.fn(() => {
      const selectedDocument = vueRef(state.selectedDocument)
      // Sync refs with state on each call (called per mount)
      docsRef.value = [...state.documents]
      docTypesRef.value = [...state.documentTypes]
      loadingRef.value = state.loading

      return {
        documentTypes: docTypesRef,
        documents: docsRef,
        selectedDocument,
        loading: loadingRef,
        fetchDocumentTypes: mockFetchDocumentTypes,
        fetchDocumentsByPatient: mockFetchDocumentsByPatient,
        createDocument: mockCreateDocument,
        importFile: vi.fn(),
        openPdf: vi.fn(),
        updateDocumentData: vi.fn(),
        signDocument: vi.fn(),
        deleteDocument: mockDeleteDocument,
        getDocumentType: (typeId: string) => state.documentTypes.find((t: any) => t.id === typeId) ?? null,
        selectDocument: (doc: any) => { selectedDocument.value = doc; mockSelectDocument(doc) },
      }
    }),
  }
})

vi.mock('@/composables/useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: { value: { id: 1, prenom: 'Test', nom: 'User', role: 'MEDECIN' } },
  })),
}))

vi.mock('@/composables/useCurrencies', () => ({
  useCurrencies: vi.fn(() => ({
    formatCurrency: vi.fn((amount: number) => `${amount} GNF`),
  })),
}))

vi.mock('@/composables/useEncounters', () => ({
  useEncounters: vi.fn(() => ({
    listEncountersByPatient: mockListEncountersByPatient,
  })),
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
      '  <div v-for="(item, idx) in (data || [])" :key="idx" class="el-table__row" @click="$emit(\'row-click\', item)">',
      '    <div class="el-table__cell-doc">',
      '      <span class="el-table__label">{{ item.documentType?.label || item.title }}</span>',
      '    </div>',
      '    <span class="el-table__status">{{ item.status === \'signed\' ? \'Signé\' : \'Brouillon\' }}</span>',
      '    <span class="el-table__date">{{ item.createdAt }}</span>',
      '  </div>',
      '</div>',
    ].join(''),
    props: ['data', 'highlightCurrentRow'],
    emits: ['row-click'],
  },
  'el-table-column': {
    template: '<div class="el-table-column"><slot :row="row" /></div>',
    props: ['prop', 'label', 'width', 'align'],
  },
  'el-button': {
    template:
      '<button class="el-button" :disabled="disabled" :title="title || \'\'" @click="$emit(\'click\', $event)"><slot /></button>',
    props: ['disabled', 'type', 'size', 'icon', 'text', 'loading', 'title'],
    emits: ['click'],
  },
  'el-tag': {
    template: '<span class="el-tag" :class="`el-tag--${type}`"><slot /></span>',
    props: ['type', 'size', 'effect'],
  },
  'el-empty': {
    template: '<div class="el-empty"><p class="el-empty__description">{{ description }}</p><slot /></div>',
    props: ['description', 'imageSize'],
  },
  'el-dialog': {
    template: [
      '<div v-if="modelValue" class="el-dialog">',
      '  <div class="el-dialog__header">{{ title }}<slot name="header" /></div>',
      '  <div class="el-dialog__body"><slot /></div>',
      '  <div v-if="$slots.footer" class="el-dialog__footer"><slot name="footer" /></div>',
      '</div>',
    ].join(''),
    props: ['modelValue', 'title', 'width', 'top'],
    emits: ['update:modelValue'],
  },
  'el-select': {
    template: [
      '<select class="el-select" :value="modelValue" @change="onChange">',
      '  <slot />',
      '</select>',
    ].join(''),
    props: ['modelValue', 'filterable', 'placeholder', 'style'],
    emits: ['update:modelValue', 'change'],
    methods: {
      onChange(e: Event) {
        const val = (e.target as HTMLSelectElement).value
        this.$emit('update:modelValue', val)
        this.$emit('change', val)
      },
    },
  },
  'el-option': {
    template: '<option class="el-option" :value="value">{{ label }}</option>',
    props: ['value', 'label'],
  },
  'el-skeleton': {
    template: '<div class="el-skeleton"><slot /></div>',
    props: ['rows', 'animated'],
  },
  'el-tooltip': {
    template: '<div class="el-tooltip"><slot /></div>',
    props: ['content', 'placement', 'showAfter'],
  },
  'el-icon': {
    template: '<span class="el-icon"><slot /></span>',
  },
  'el-alert': {
    template: '<div class="el-alert" :class="`el-alert--${type}`">{{ title }}<slot /></div>',
    props: ['type', 'title', 'closable', 'showIcon'],
  },
  'el-form': {
    template: '<form class="el-form"><slot /></form>',
    props: ['model', 'rules', 'labelPosition'],
    methods: {
      validate() { return Promise.resolve(true) },
      clearValidate() {},
      resetFields() {},
    },
  },
  'el-form-item': {
    template: '<div class="el-form-item"><label>{{ label }}</label><slot /></div>',
    props: ['label', 'prop'],
  },
  'el-popconfirm': {
    template: '<div class="el-popconfirm"><slot /></div>',
    props: ['title'],
  },
  'el-segmented': {
    template: `
      <div class="el-segmented">
        <button
          v-for="opt in options"
          :key="opt.value"
          class="el-segmented__item"
          :class="{ 'is-active': modelValue === opt.value }"
          @click="$emit('update:modelValue', opt.value)"
        >{{ opt.label }}</button>
      </div>
    `,
    props: ['modelValue', 'options', 'size'],
    emits: ['update:modelValue'],
  },
  'el-date-picker': {
    template: '<div class="el-date-picker" :value="modelValue" />',
    props: ['modelValue', 'type', 'rangeSeparator', 'startLabel', 'endLabel', 'startPlaceholder', 'endPlaceholder', 'valueFormat', 'size', 'style'],
    emits: ['update:modelValue'],
  },
  ImportDocumentDialog: {
    template: '<div class="import-document-dialog-stub" v-if="visible"><slot /></div>',
    props: ['visible', 'documentTypes', 'disabled'],
    emits: ['update:visible', 'import'],
  },
  ClinicalDocForm: {
    name: 'ClinicalDocForm',
    template: '<div class="clinical-doc-form"><slot /></div>',
    props: ['document', 'documentType', 'readonly', 'contactDisplay'],
    emits: ['save', 'sign', 'close'],
  },
}

// ===========================================================================
// Factory helpers
// ===========================================================================
function makeDocumentType(overrides: Record<string, any> = {}) {
  return {
    id: 'dt-consult',
    code: 'CONSULT',
    label: 'Compte rendu de consultation',
    category: 'Consultation',
    formSchema: [],
    acteLabel: null,
    acteIdDeclenche: null,
    prixUnitaire: null,
    ...overrides,
  }
}

function makeDocument(overrides: Record<string, any> = {}) {
  return {
    id: 'doc-1',
    contactId: '42',
    documentTypeId: 'dt-consult',
    title: null,
    status: 'draft',
    formData: {},
    signedAt: null,
    signedBy: null,
    createdBy: '1',
    createdAt: '2026-07-03T10:00:00.000Z',
    updatedAt: '2026-07-03T10:00:00.000Z',
    documentType: makeDocumentType(),
    ...overrides,
  }
}

function makeEncounter(overrides: Record<string, any> = {}) {
  return {
    id: 42,
    patient_id: 1,
    contact_type: 'hospitalisation',
    contact_type_precision: null,
    start_date: '2026-07-01T08:00:00.000Z',
    end_date: '2026-07-01T09:00:00.000Z',
    service_id: 5,
    service_name: 'Médecine générale',
    status: 'active',
    origin: 'direct',
    zone_situation: 'ambulatoire',
    prise_en_charge: 'classique',
    ...overrides,
  }
}

// ===========================================================================
// Tests
// ===========================================================================
describe('DossierClinicView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    state.documents = []
    state.loading = false
    state.selectedDocument = null
    state.documentTypes = []

    mockFetchDocumentTypes.mockResolvedValue(undefined)
    mockFetchDocumentsByPatient.mockResolvedValue(undefined)
    mockListEncountersByPatient.mockResolvedValue([])
    mockDeleteDocument.mockResolvedValue(true)
    mockCreateDocument.mockResolvedValue(makeDocument())
    mockSelectDocument.mockImplementation((doc: any) => { state.selectedDocument = doc })
  })

  // -----------------------------------------------------------------------
  // Document list — empty state & data loading
  // -----------------------------------------------------------------------
  describe('document list', () => {
    it('shows empty state when no documents exist', async () => {
      state.documents = []
      const wrapper = mount(DossierClinicView, { global: { stubs } })

      await nextTick()
      await waitForData()
      await nextTick()

      expect(wrapper.find('.el-table').exists()).toBe(true)
    })

    it('loads and displays documents on mount', async () => {
      const docs = [
        makeDocument({ id: 'doc-1', documentType: makeDocumentType({ label: 'Compte rendu' }) }),
        makeDocument({ id: 'doc-2', documentType: makeDocumentType({ label: 'Ordonnance', category: 'Prescription' }) }),
      ]
      state.documents = docs

      const wrapper = mount(DossierClinicView, { global: { stubs } })

      await nextTick()
      await waitForData()
      await nextTick()

      expect(mockFetchDocumentsByPatient).toHaveBeenCalledTimes(1)
      expect(mockFetchDocumentsByPatient).toHaveBeenCalledWith(1)
      expect(wrapper.find('.el-table').exists()).toBe(true)
      expect(wrapper.text()).toContain('Compte rendu')
      expect(wrapper.text()).toContain('Ordonnance')
    })

    it('calls fetchDocumentTypes and listEncountersByPatient on mount', async () => {
      state.documents = [makeDocument()]
      mockListEncountersByPatient.mockResolvedValue([makeEncounter()])

      mount(DossierClinicView, { global: { stubs } })

      await nextTick()
      await waitForData()
      await nextTick()

      expect(mockFetchDocumentTypes).toHaveBeenCalledTimes(1)
      expect(mockFetchDocumentsByPatient).toHaveBeenCalledWith(1)
      expect(mockListEncountersByPatient).toHaveBeenCalledWith(1, 'active')
    })

    it('renders loading skeleton during initial load', async () => {
      mockFetchDocumentTypes.mockReturnValue(new Promise(() => {}))
      state.documents = []

      const wrapper = mount(DossierClinicView, { global: { stubs } })

      await nextTick()

      expect(wrapper.find('.el-skeleton').exists()).toBe(true)
    })
  })

  // -----------------------------------------------------------------------
  // "Nouveau Document" button opens the type dialog
  // -----------------------------------------------------------------------
  describe('"Nouveau Document" button', () => {
    it('opens the type selection dialog when clicked', async () => {
      state.documents = []
      mockListEncountersByPatient.mockResolvedValue([makeEncounter()])

      const wrapper = mount(DossierClinicView, { global: { stubs } })

      await nextTick()
      await waitForData()
      await nextTick()

      expect(wrapper.find('.el-dialog').exists()).toBe(false)

      const newBtn = wrapper.findAll('button.el-button').find(b => b.text().trim() === 'Nouveau Document')
      expect(newBtn).toBeTruthy()
      await newBtn!.trigger('click')
      await nextTick()

      expect(wrapper.find('.el-dialog').exists()).toBe(true)
      expect(wrapper.find('.el-dialog').isVisible()).toBe(true)
    })
  })

  // -----------------------------------------------------------------------
  // Dialog — type selection
  // -----------------------------------------------------------------------
  describe('type selection dialog', () => {
    it('shows document type dropdown when activeContact exists', async () => {
      const encounters = [makeEncounter({ id: 42 })]
      state.documents = []
      mockListEncountersByPatient.mockResolvedValue(encounters)

      const wrapper = mount(DossierClinicView, { global: { stubs } })

      await nextTick()
      await waitForData()
      await nextTick()

      const newBtn = wrapper.findAll('button.el-button').find(b => b.text().trim() === 'Nouveau Document')
      await newBtn!.trigger('click')
      await nextTick()

      const dialog = wrapper.find('.el-dialog')
      expect(dialog.exists()).toBe(true)
      expect(dialog.text()).toContain('Type de document')
    })

    it('shows empty message when no active contact', async () => {
      state.documents = []
      mockListEncountersByPatient.mockResolvedValue([])

      const wrapper = mount(DossierClinicView, { global: { stubs } })

      await nextTick()
      await waitForData()
      await nextTick()

      const newBtn = wrapper.findAll('button.el-button').find(b => b.text().trim() === 'Nouveau Document')
      await newBtn!.trigger('click')
      await nextTick()

      const dialog = wrapper.find('.el-dialog')
      expect(dialog.text()).toContain('Aucun contact actif')
    })
  })

  // -----------------------------------------------------------------------
  // Creating a document
  // -----------------------------------------------------------------------
  describe('creating a document', () => {
    it('calls createDocument when type is selected and Créer clicked', async () => {
      const docTypes = [makeDocumentType({ id: 'dt-1', label: 'Compte rendu' })]
      const encounters = [makeEncounter({ id: 42, service_id: 5 })]

      state.documents = []
      state.documentTypes = docTypes
      mockFetchDocumentTypes.mockImplementation(async () => {
        state.documents = []
      })
      mockListEncountersByPatient.mockResolvedValue(encounters)
      mockCreateDocument.mockResolvedValue(makeDocument())

      const wrapper = mount(DossierClinicView, { global: { stubs } })

      await nextTick()
      await waitForData()
      await nextTick()

      const newBtn = wrapper.findAll('button.el-button').find(b => b.text().trim() === 'Nouveau Document')
      await newBtn!.trigger('click')
      await nextTick()

      // Find the select inside the dialog (not the filter bar select)
      const dialogSelect = wrapper.find('.el-dialog .el-select')
      expect(dialogSelect.exists()).toBe(true)
      await dialogSelect.setValue('dt-1')
      await nextTick()

      const createBtn = wrapper.findAll('button.el-button').find(b => b.text().trim() === 'Créer')
      expect(createBtn).toBeTruthy()
      await createBtn!.trigger('click')

      await waitForData()
      await nextTick()

      expect(mockCreateDocument).toHaveBeenCalledTimes(1)
      expect(mockElMessage.success).toHaveBeenCalledWith(
        expect.stringContaining('Document créé'),
      )
    })

    it('disables Créer button when no type is selected', async () => {
      const encounters = [makeEncounter({ id: 42 })]
      state.documents = []
      mockListEncountersByPatient.mockResolvedValue(encounters)

      const wrapper = mount(DossierClinicView, { global: { stubs } })

      await nextTick()
      await waitForData()
      await nextTick()

      const newBtn = wrapper.findAll('button.el-button').find(b => b.text().trim() === 'Nouveau Document')
      await newBtn!.trigger('click')
      await nextTick()

      const createBtn = wrapper.findAll('button.el-button').find(b => b.text().trim() === 'Créer')
      expect(createBtn!.attributes('disabled')).toBeDefined()
    })
  })

  // -----------------------------------------------------------------------
  // Row click — opens full page form
  // -----------------------------------------------------------------------
  describe('row click — full page form', () => {
    it('enters full page mode when a table row is clicked', async () => {
      const docs = [
        makeDocument({
          id: 'doc-1',
          documentType: makeDocumentType({ label: 'Compte rendu' }),
          contactId: '42',
          status: 'draft',
        }),
      ]
      state.documents = docs

      const wrapper = mount(DossierClinicView, { global: { stubs } })

      await nextTick()
      await waitForData()
      await nextTick()

      const row = wrapper.find('.el-table__row')
      expect(row.exists()).toBe(true)
      await row.trigger('click')
      await nextTick()

      expect(mockSelectDocument).toHaveBeenCalled()
      expect(wrapper.find('.dossier-clinic__full-page').exists()).toBe(true)
    })

    it('displays document title in full page header', async () => {
      const doc = makeDocument({
        id: 'doc-1',
        documentType: makeDocumentType({ label: 'Compte rendu' }),
        status: 'draft',
      })
      state.documents = [doc]
      state.selectedDocument = doc

      const wrapper = mount(DossierClinicView, { global: { stubs } })

      await nextTick()
      await waitForData()
      await nextTick()

      wrapper.vm.fullPageMode = true
      await nextTick()

      expect(wrapper.find('.dossier-clinic__full-page').exists()).toBe(true)
      expect(wrapper.find('.dossier-clinic__full-page-doc-title').text()).toContain('Compte rendu')
    })

    it('shows signed status tag in full page header', async () => {
      const doc = makeDocument({
        id: 'doc-1',
        status: 'signed',
        documentType: makeDocumentType({ label: 'Compte rendu' }),
      })
      state.documents = [doc]
      state.selectedDocument = doc

      const wrapper = mount(DossierClinicView, { global: { stubs } })

      await nextTick()
      await waitForData()
      await nextTick()

      wrapper.vm.fullPageMode = true
      await nextTick()

      expect(wrapper.find('.dossier-clinic__full-page').exists()).toBe(true)
      expect(wrapper.find('.dossier-clinic__full-page-header-right').text()).toContain('Signé')
    })

    it('returns to list when back button is clicked', async () => {
      const doc = makeDocument({
        id: 'doc-1',
        documentType: makeDocumentType({ label: 'Compte rendu' }),
      })
      state.documents = [doc]
      state.selectedDocument = doc

      const wrapper = mount(DossierClinicView, { global: { stubs } })

      await nextTick()
      await waitForData()
      await nextTick()

      wrapper.vm.fullPageMode = true
      await nextTick()

      expect(wrapper.find('.dossier-clinic__full-page').exists()).toBe(true)

      const backBtn = wrapper.findAll('button.el-button').find(b => b.text().includes('Retour'))
      expect(backBtn).toBeTruthy()
      await backBtn!.trigger('click')
      await nextTick()

      expect(mockSelectDocument).toHaveBeenCalledWith(null)
    })
  })

  // -----------------------------------------------------------------------
  // Delete with confirmation
  // -----------------------------------------------------------------------
  describe('delete with confirmation', () => {
    it('calls deleteDocument after confirmation', async () => {
      const doc = makeDocument({
        id: 'doc-1',
        documentType: makeDocumentType({ label: 'Compte rendu' }),
        status: 'draft',
      })
      state.documents = [doc]
      mockDeleteDocument.mockResolvedValue(true)

      const wrapper = mount(DossierClinicView, { global: { stubs } })

      await nextTick()
      await waitForData()
      await nextTick()

      await wrapper.vm.onDelete(doc)

      await waitForData()
      await nextTick()

      expect(mockElMessageBox.confirm).toHaveBeenCalledWith(
        expect.stringContaining('Compte rendu'),
        'Confirmation',
        expect.objectContaining({ type: 'warning' }),
      )
      expect(mockDeleteDocument).toHaveBeenCalledWith('doc-1')
      expect(mockFetchDocumentsByPatient).toHaveBeenCalled()
    })

    it('does not delete when confirmation is cancelled', async () => {
      mockElMessageBox.confirm.mockRejectedValueOnce(new Error('cancel'))

      const doc = makeDocument({
        id: 'doc-1',
        documentType: makeDocumentType({ label: 'Compte rendu' }),
        status: 'draft',
      })
      state.documents = [doc]

      const wrapper = mount(DossierClinicView, { global: { stubs } })

      await nextTick()
      await waitForData()
      await nextTick()

      await wrapper.vm.onDelete(doc)

      await waitForData()
      await nextTick()

      expect(mockDeleteDocument).not.toHaveBeenCalled()
    })
  })

  // -----------------------------------------------------------------------
  // Dialog close resets state
  // -----------------------------------------------------------------------
  describe('dialog close resets state', () => {
    it('resets selectedTypeId when dialog is closed', async () => {
      const encounters = [makeEncounter({ id: 42 })]
      state.documents = []
      mockListEncountersByPatient.mockResolvedValue(encounters)

      const wrapper = mount(DossierClinicView, { global: { stubs } })

      await nextTick()
      await waitForData()
      await nextTick()

      const newBtn = wrapper.findAll('button.el-button').find(b => b.text().trim() === 'Nouveau Document')
      await newBtn!.trigger('click')
      await nextTick()

      expect(wrapper.find('.el-dialog').exists()).toBe(true)

      wrapper.vm.showTypeDialog = false
      await nextTick()

      expect(wrapper.vm.selectedTypeId).toBe('')
      expect(wrapper.find('.el-dialog').exists()).toBe(false)
    })
  })

  // -----------------------------------------------------------------------
  // Import document dialog
  // -----------------------------------------------------------------------
  describe('import document dialog', () => {
    it('renders "Importer Document" button (not "Importer PDF")', async () => {
      state.documents = []
      const wrapper = mount(DossierClinicView, { global: { stubs } })
      await nextTick()
      await waitForData()
      await nextTick()

      const importBtn = wrapper.findAll('button.el-button').find(b => b.text().includes('Importer Document'))
      expect(importBtn).toBeTruthy()
      // Ensure it's not "Importer PDF"
      const pdfBtn = wrapper.findAll('button.el-button').find(b => b.text().includes('Importer PDF'))
      expect(pdfBtn).toBeUndefined()
    })

    it('opens import dialog when "Importer Document" button is clicked', async () => {
      state.documents = []
      mockListEncountersByPatient.mockResolvedValue([makeEncounter()])
      const wrapper = mount(DossierClinicView, { global: { stubs } })
      await nextTick()
      await waitForData()
      await nextTick()

      const importBtn = wrapper.findAll('button.el-button').find(b => b.text().includes('Importer Document'))
      expect(importBtn).toBeTruthy()
      await importBtn!.trigger('click')
      await nextTick()

      // The ImportDocumentDialog stub should be visible
      const dialog = wrapper.find('.import-document-dialog-stub')
      expect(dialog.exists()).toBe(true)
    })

    it('disables import button when no active contact', async () => {
      state.documents = []
      mockListEncountersByPatient.mockResolvedValue([])
      const wrapper = mount(DossierClinicView, { global: { stubs } })
      await nextTick()
      await waitForData()
      await nextTick()

      const importBtn = wrapper.findAll('button.el-button').find(b => b.text().includes('Importer Document'))
      expect(importBtn!.attributes('disabled')).toBeDefined()
    })
  })

  // -----------------------------------------------------------------------
  // Source filter
  // -----------------------------------------------------------------------
  describe('source filter', () => {
    it('filters documents by source: "created" shows only non-imported', async () => {
      state.documentTypes = [
        makeDocumentType({ id: 'dt-1', label: 'Compte rendu', category: 'consultation' }),
      ]
      state.documents = [
        makeDocument({ id: 'doc-1', source: 'created', documentType: makeDocumentType({ id: 'dt-1', category: 'consultation' }) }),
        makeDocument({ id: 'doc-2', source: 'imported', documentType: makeDocumentType({ id: 'dt-1', category: 'consultation' }) }),
        makeDocument({ id: 'doc-3', source: 'created', documentType: makeDocumentType({ id: 'dt-1', category: 'consultation' }) }),
      ]
      mockListEncountersByPatient.mockResolvedValue([makeEncounter()])

      const wrapper = mount(DossierClinicView, { global: { stubs } })
      await nextTick()
      await waitForData()
      await nextTick()

      // Default shows all 3
      const rows = wrapper.findAll('.el-table__row')
      expect(rows).toHaveLength(3)

      // Click "Créés" segmented item
      const createdBtn = wrapper.findAll('.el-segmented__item').find(b => b.text() === 'Créés')
      expect(createdBtn).toBeTruthy()
      await createdBtn!.trigger('click')
      await nextTick()

      const rowsAfter = wrapper.findAll('.el-table__row')
      expect(rowsAfter).toHaveLength(2)
    })

    it('filters documents by source: "imported" shows only imported', async () => {
      state.documentTypes = [
        makeDocumentType({ id: 'dt-1', label: 'Compte rendu', category: 'consultation' }),
      ]
      state.documents = [
        makeDocument({ id: 'doc-1', source: 'created', documentType: makeDocumentType({ id: 'dt-1', category: 'consultation' }) }),
        makeDocument({ id: 'doc-2', source: 'imported', documentType: makeDocumentType({ id: 'dt-1', category: 'consultation' }) }),
      ]
      mockListEncountersByPatient.mockResolvedValue([makeEncounter()])

      const wrapper = mount(DossierClinicView, { global: { stubs } })
      await nextTick()
      await waitForData()
      await nextTick()

      const importedBtn = wrapper.findAll('.el-segmented__item').find(b => b.text() === 'Importés')
      await importedBtn!.trigger('click')
      await nextTick()

      const rows = wrapper.findAll('.el-table__row')
      expect(rows).toHaveLength(1)
    })
  })

  // -----------------------------------------------------------------------
  // Document type filter
  // -----------------------------------------------------------------------
  describe('document type filter', () => {
    it('filters documents by document type', async () => {
      state.documentTypes = [
        makeDocumentType({ id: 'dt-1', label: 'Compte rendu', category: 'consultation' }),
        makeDocumentType({ id: 'dt-2', label: 'Labo', category: 'lab' }),
      ]
      state.documents = [
        makeDocument({ id: 'doc-1', documentTypeId: 'dt-1', documentType: makeDocumentType({ id: 'dt-1', category: 'consultation' }) }),
        makeDocument({ id: 'doc-2', documentTypeId: 'dt-2', documentType: makeDocumentType({ id: 'dt-2', category: 'lab' }) }),
        makeDocument({ id: 'doc-3', documentTypeId: 'dt-1', documentType: makeDocumentType({ id: 'dt-1', category: 'consultation' }) }),
      ]
      mockListEncountersByPatient.mockResolvedValue([makeEncounter()])

      const wrapper = mount(DossierClinicView, { global: { stubs } })
      await nextTick()
      await waitForData()
      await nextTick()

      // Default: all 3
      expect(wrapper.findAll('.el-table__row')).toHaveLength(3)

      // Set type filter via VM
      const vm = wrapper.vm as any
      vm.filterTypeId = 'dt-2'
      await nextTick()

      expect(wrapper.findAll('.el-table__row')).toHaveLength(1)

      // Clear filter
      vm.filterTypeId = null
      await nextTick()
      expect(wrapper.findAll('.el-table__row')).toHaveLength(3)
    })
  })

  // -----------------------------------------------------------------------
  // Date range filter
  // -----------------------------------------------------------------------
  describe('date range filter', () => {
    it('filters documents by date range', async () => {
      state.documentTypes = [
        makeDocumentType({ id: 'dt-1', label: 'Compte rendu', category: 'consultation' }),
      ]
      state.documents = [
        makeDocument({ id: 'doc-1', createdAt: '2026-07-03T10:00:00.000Z', documentType: makeDocumentType({ id: 'dt-1', category: 'consultation' }) }),
        makeDocument({ id: 'doc-2', createdAt: '2026-08-15T10:00:00.000Z', documentType: makeDocumentType({ id: 'dt-1', category: 'consultation' }) }),
        makeDocument({ id: 'doc-3', createdAt: '2026-09-01T10:00:00.000Z', documentType: makeDocumentType({ id: 'dt-1', category: 'consultation' }) }),
      ]
      mockListEncountersByPatient.mockResolvedValue([makeEncounter()])

      const wrapper = mount(DossierClinicView, { global: { stubs } })
      await nextTick()
      await waitForData()
      await nextTick()

      // Default: all 3
      expect(wrapper.findAll('.el-table__row')).toHaveLength(3)

      // Filter to July only
      const vm = wrapper.vm as any
      vm.filterDateRange = ['2026-07-01', '2026-07-31']
      await nextTick()

      expect(wrapper.findAll('.el-table__row')).toHaveLength(1)

      // Clear filter
      vm.filterDateRange = null
      await nextTick()
      expect(wrapper.findAll('.el-table__row')).toHaveLength(3)
    })
  })

  // -----------------------------------------------------------------------
  // Combined filters
  // -----------------------------------------------------------------------
  describe('combined filters', () => {
    it('combines source + type + date filters together', async () => {
      state.documentTypes = [
        makeDocumentType({ id: 'dt-1', label: 'Compte rendu', category: 'consultation' }),
        makeDocumentType({ id: 'dt-2', label: 'Labo', category: 'lab' }),
      ]
      state.documents = [
        makeDocument({ id: 'doc-1', source: 'created', createdAt: '2026-07-03T10:00:00.000Z', documentTypeId: 'dt-1', documentType: makeDocumentType({ id: 'dt-1', category: 'consultation' }) }),
        makeDocument({ id: 'doc-2', source: 'imported', createdAt: '2026-07-10T10:00:00.000Z', documentTypeId: 'dt-2', documentType: makeDocumentType({ id: 'dt-2', category: 'lab' }) }),
        makeDocument({ id: 'doc-3', source: 'created', createdAt: '2026-08-01T10:00:00.000Z', documentTypeId: 'dt-1', documentType: makeDocumentType({ id: 'dt-1', category: 'consultation' }) }),
        makeDocument({ id: 'doc-4', source: 'created', createdAt: '2026-07-05T10:00:00.000Z', documentTypeId: 'dt-2', documentType: makeDocumentType({ id: 'dt-2', category: 'lab' }) }),
      ]
      mockListEncountersByPatient.mockResolvedValue([makeEncounter()])

      const wrapper = mount(DossierClinicView, { global: { stubs } })
      await nextTick()
      await waitForData()
      await nextTick()

      // Default: all 4
      expect(wrapper.findAll('.el-table__row')).toHaveLength(4)

      const vm = wrapper.vm as any

      // Filter: source=created, type=dt-1, date=July
      const createdBtn = wrapper.findAll('.el-segmented__item').find(b => b.text() === 'Créés')
      await createdBtn!.trigger('click')
      vm.filterTypeId = 'dt-1'
      vm.filterDateRange = ['2026-07-01', '2026-07-31']
      await nextTick()

      // Only doc-1 matches: created + dt-1 + July
      expect(wrapper.findAll('.el-table__row')).toHaveLength(1)
    })
  })

  // -----------------------------------------------------------------------
  // Row click renders ClinicalDocForm
  // -----------------------------------------------------------------------
  describe('row click renders ClinicalDocForm', () => {
    it('renders ClinicalDocForm in full page mode with correct props', async () => {
      const docType = makeDocumentType({ id: 'dt-1', label: 'Compte rendu', category: 'consultation' })
      const doc = makeDocument({
        id: 'doc-1',
        documentTypeId: 'dt-1',
        documentType: docType,
        contactId: '42',
        status: 'draft',
      })
      state.documents = [doc]
      state.documentTypes = [docType]
      mockListEncountersByPatient.mockResolvedValue([makeEncounter()])

      const wrapper = mount(DossierClinicView, { global: { stubs } })
      await nextTick()
      await waitForData()
      await nextTick()

      // Click the row
      const row = wrapper.find('.el-table__row')
      expect(row.exists()).toBe(true)
      await row.trigger('click')
      await nextTick()

      // Full page should show
      expect(wrapper.find('.dossier-clinic__full-page').exists()).toBe(true)

      // ClinicalDocForm stub should be rendered
      const form = wrapper.findComponent({ name: 'ClinicalDocForm' })
      expect(form.exists()).toBe(true)
      expect(form.props('document')).toEqual(doc)
      expect(form.props('readonly')).toBe(false)
    })
  })
})
