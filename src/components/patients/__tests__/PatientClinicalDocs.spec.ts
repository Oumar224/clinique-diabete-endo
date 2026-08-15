// @vitest-environment jsdom
import { ref } from 'vue'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import type { ClinicalDocumentDTO, ClinicalDocumentTypeDTO } from '@/composables/useClinicalDocuments'

// ─── Mock useClinicalDocuments ──────────────────────────────────────

const mockImportFile = vi.fn()
const mockFetchDocumentTypes = vi.fn()
const mockFetchDocuments = vi.fn()
const mockCreateDocument = vi.fn()
const mockUpdateDocumentData = vi.fn()
const mockSignDocument = vi.fn()
const mockDeleteDocument = vi.fn()
const mockCheckContactExpired = vi.fn()
const mockGetDocumentType = vi.fn()
const mockSelectDocument = vi.fn()

const mockDocumentTypes = ref<ClinicalDocumentTypeDTO[]>([])
const mockDocuments = ref<ClinicalDocumentDTO[]>([])
const mockSelectedDocument = ref<ClinicalDocumentDTO | null>(null)
const mockLoading = ref(false)
const mockIsContactExpired = ref(false)

vi.mock('@/composables/useClinicalDocuments', () => ({
  useClinicalDocuments: () => ({
    documentTypes: mockDocumentTypes,
    documents: mockDocuments,
    selectedDocument: mockSelectedDocument,
    loading: mockLoading,
    isContactExpired: mockIsContactExpired,
    fetchDocumentTypes: mockFetchDocumentTypes,
    fetchDocuments: mockFetchDocuments,
    createDocument: mockCreateDocument,
    updateDocumentData: mockUpdateDocumentData,
    signDocument: mockSignDocument,
    deleteDocument: mockDeleteDocument,
    checkContactExpired: mockCheckContactExpired,
    getDocumentType: mockGetDocumentType,
    selectDocument: mockSelectDocument,
    importFile: mockImportFile,
  }),
}))

// ─── Mock usePatientContext ──────────────────────────────────────────

vi.mock('@/composables/usePatientContext', () => ({
  usePatientContext: () => ({
    activePatient: { value: { id: 42 } },
  }),
}))

// ─── Mock useAuth ────────────────────────────────────────────────────

vi.mock('@/composables/useAuth', () => ({
  useAuth: () => ({
    user: { value: { id: 'user-1', name: 'Dr. Diallo' } },
  }),
}))

// ─── Mock Element Plus ─────────────────────────────────────────────

vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), warning: vi.fn(), error: vi.fn() },
  ElMessageBox: { confirm: vi.fn() },
}))

// ─── Stubs for Element Plus and child components ────────────────────

const EL_STUBS: Record<string, any> = {
  'el-row': {
    template: '<div class="el-row"><slot /></div>',
    props: ['gutter'],
  },
  'el-col': {
    template: '<div class="el-col" :class="`el-col-${span}`"><slot /></div>',
    props: ['span'],
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
  'el-select': {
    template: `
      <div class="el-select" :disabled="disabled">
        <input class="el-select__input" :value="modelValue" :placeholder="placeholder" readonly />
        <slot />
      </div>
    `,
    props: ['modelValue', 'placeholder', 'clearable', 'size', 'disabled', 'style'],
    emits: ['update:modelValue'],
  },
  'el-option': {
    template: '<div class="el-option"><slot /></div>',
    props: ['key', 'label', 'value'],
  },
  'el-button': {
    template: '<button class="el-button" :disabled="disabled" :type="type" @click="$emit(\'click\', $event)"><slot /></button>',
    props: ['disabled', 'type', 'size', 'text'],
    emits: ['click'],
  },
  'el-date-picker': {
    template: '<div class="el-date-picker" :value="modelValue" /><input class="el-date-picker__input" />',
    props: ['modelValue', 'type', 'rangeSeparator', 'startPlaceholder', 'endPlaceholder', 'valueFormat', 'size', 'style'],
    emits: ['update:modelValue'],
  },
}

// ─── Stub child components ──────────────────────────────────────────

const ClinicalDocListStub = {
  name: 'ClinicalDocList',
  template: '<div class="clinical-doc-list-stub"><slot /></div>',
  props: ['documents', 'documentTypes', 'selectedId', 'loading', 'disabled'],
  emits: ['select', 'create', 'delete-document'],
}

const ClinicalDocFormStub = {
  name: 'ClinicalDocForm',
  template: '<div class="clinical-doc-form-stub"><slot /></div>',
  props: ['document', 'documentType', 'readonly'],
  emits: ['save', 'sign', 'close'],
}

const ImportDocumentDialogStub = {
  name: 'ImportDocumentDialog',
  template: '<div class="import-dialog-stub" v-if="visible"><slot /></div>',
  props: ['visible', 'documentTypes', 'disabled'],
  emits: ['update:visible', 'import'],
}

import PatientClinicalDocs from '../PatientClinicalDocs.vue'

// ─── Test fixtures ─────────────────────────────────────────────────

const CONSULT_TYPE_ID = '11111111-1111-4111-1111-111111111111'
const LAB_TYPE_ID = '22222222-2222-4222-2222-222222222222'
const DELIVERY_TYPE_ID = '33333333-3333-4333-3333-333333333333'

const documentTypes: ClinicalDocumentTypeDTO[] = [
  {
    id: CONSULT_TYPE_ID,
    code: 'CONSULTATION_NOTE',
    label: 'Compte rendu de consultation',
    description: null,
    formSchema: [],
    category: 'consultation',
    isActive: true,
  },
  {
    id: LAB_TYPE_ID,
    code: 'LAB_REQUEST',
    label: 'Demande d\'examen de laboratoire',
    description: null,
    formSchema: [],
    category: 'lab',
    isActive: true,
  },
  {
    id: DELIVERY_TYPE_ID,
    code: 'DELIVERY_NOTE',
    label: 'Bon de livraison',
    description: null,
    formSchema: [],
    category: 'delivery',
    isActive: true,
  },
]

const createdDocument: ClinicalDocumentDTO = {
  id: 'doc-001',
  contactId: '1',
  patientId: '42',
  serviceId: '5',
  documentTypeId: CONSULT_TYPE_ID,
  title: 'Compte rendu de consultation',
  status: 'draft',
  formData: {},
  source: 'created',
  createdBy: 'Dr. Diallo',
  createdAt: '2024-06-15T10:00:00.000Z',
  updatedAt: '2024-06-15T10:00:00.000Z',
  documentType: documentTypes[0],
}

const importedDocument: ClinicalDocumentDTO = {
  id: 'doc-002',
  contactId: '1',
  patientId: '42',
  serviceId: '5',
  documentTypeId: LAB_TYPE_ID,
  title: 'Document importé',
  status: 'draft',
  formData: {},
  source: 'imported',
  createdBy: 'Dr. Diallo',
  createdAt: '2024-06-15T09:00:00.000Z',
  updatedAt: '2024-06-15T11:00:00.000Z',
  documentType: documentTypes[1],
}

const signedDocument: ClinicalDocumentDTO = {
  id: 'doc-003',
  contactId: '1',
  patientId: '42',
  serviceId: '5',
  documentTypeId: CONSULT_TYPE_ID,
  title: 'Compte rendu signé',
  status: 'signed',
  formData: {},
  source: 'created',
  signedAt: '2024-06-15T11:00:00.000Z',
  signedBy: 'Dr. Diallo',
  createdBy: 'Dr. Diallo',
  createdAt: '2024-06-15T08:00:00.000Z',
  updatedAt: '2024-06-15T11:00:00.000Z',
  documentType: documentTypes[0],
}

const deliveryDocument: ClinicalDocumentDTO = {
  id: 'doc-004',
  contactId: '1',
  patientId: '42',
  serviceId: '5',
  documentTypeId: DELIVERY_TYPE_ID,
  title: 'Bon de livraison',
  status: 'draft',
  formData: {},
  source: 'created',
  createdBy: 'Dr. Diallo',
  createdAt: '2024-07-10T14:00:00.000Z',
  updatedAt: '2024-07-10T14:00:00.000Z',
  documentType: documentTypes[2],
}

const oldImportedDocument: ClinicalDocumentDTO = {
  id: 'doc-005',
  contactId: '1',
  patientId: '42',
  serviceId: '5',
  documentTypeId: LAB_TYPE_ID,
  title: 'Ancien document importé',
  status: 'draft',
  formData: {},
  source: 'imported',
  createdBy: 'Dr. Diallo',
  createdAt: '2024-03-01T09:00:00.000Z',
  updatedAt: '2024-03-01T09:00:00.000Z',
  documentType: documentTypes[1],
}

describe('PatientClinicalDocs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDocumentTypes.value = [...documentTypes]
    mockDocuments.value = [createdDocument, importedDocument, signedDocument, deliveryDocument, oldImportedDocument]
    mockSelectedDocument.value = null
    mockLoading.value = false
    mockIsContactExpired.value = false
    mockFetchDocumentTypes.mockResolvedValue(undefined)
    mockFetchDocuments.mockResolvedValue(undefined)
    mockCheckContactExpired.mockResolvedValue(false)
    mockGetDocumentType.mockImplementation((typeId: string) => {
      return documentTypes.find(t => t.id === typeId)
    })
  })

  function createWrapper({
    contactId = '1',
    serviceId = '5',
  } = {}) {
    return mount(PatientClinicalDocs, {
      props: { contactId, serviceId },
      global: {
        stubs: {
          ...EL_STUBS,
          ClinicalDocList: ClinicalDocListStub,
          ClinicalDocForm: ClinicalDocFormStub,
          ImportDocumentDialog: ImportDocumentDialogStub,
        },
      },
      attachTo: document.body,
    })
  }

  // ─── Rendering ────────────────────────────────────────────────────

  describe('rendering', () => {
    it('renders filter bar with source segmented control', async () => {
      const wrapper = createWrapper()
      await flushPromises()

      const segmented = wrapper.find('.el-segmented')
      expect(segmented.exists()).toBe(true)

      const items = wrapper.findAll('.el-segmented__item')
      expect(items).toHaveLength(3)
      expect(items[0].text()).toBe('Tous')
      expect(items[1].text()).toBe('Créés')
      expect(items[2].text()).toBe('Importés')
    })

    it('renders type filter dropdown', async () => {
      const wrapper = createWrapper()
      await flushPromises()

      const select = wrapper.find('.el-select')
      expect(select.exists()).toBe(true)
    })

    it('shows "Importer" button', async () => {
      const wrapper = createWrapper()
      await flushPromises()

      const importBtn = wrapper.findAll('.el-button').find(b => b.text().includes('Importer'))
      expect(importBtn).toBeDefined()
    })

    it('calls fetchDocumentTypes and fetchDocuments on mount', async () => {
      createWrapper()
      await flushPromises()

      expect(mockFetchDocumentTypes).toHaveBeenCalled()
      expect(mockFetchDocuments).toHaveBeenCalledWith('1')
      expect(mockCheckContactExpired).toHaveBeenCalledWith('1')
    })
  })

  // ─── Source filter ────────────────────────────────────────────────

  describe('source filter', () => {
    it('filters by source: "created" shows only non-imported documents', async () => {
      const wrapper = createWrapper()
      await flushPromises()

      // Verify initial state shows all documents (5)
      const docList = wrapper.findComponent({ name: 'ClinicalDocList' })
      expect(docList.props('documents')).toHaveLength(5)

      // Click "Créés" segmented item
      const createdBtn = wrapper.findAll('.el-segmented__item').find(b => b.text() === 'Créés')
      await createdBtn!.trigger('click')
      await wrapper.vm.$nextTick()

      expect(docList.props('documents')).toHaveLength(3)
      expect(docList.props('documents').every((d: ClinicalDocumentDTO) => d.source !== 'imported')).toBe(true)
    })

    it('filters by source: "imported" shows only imported documents', async () => {
      const wrapper = createWrapper()
      await flushPromises()

      const docList = wrapper.findComponent({ name: 'ClinicalDocList' })

      // Click "Importés" segmented item
      const importedBtn = wrapper.findAll('.el-segmented__item').find(b => b.text() === 'Importés')
      await importedBtn!.trigger('click')
      await wrapper.vm.$nextTick()

      expect(docList.props('documents')).toHaveLength(2)
      expect(docList.props('documents').every((d: ClinicalDocumentDTO) => d.source === 'imported')).toBe(true)
    })

    it('filters by source: "all" shows all documents', async () => {
      const wrapper = createWrapper()
      await flushPromises()

      const docList = wrapper.findComponent({ name: 'ClinicalDocList' })

      // First filter to "created"
      const createdBtn = wrapper.findAll('.el-segmented__item').find(b => b.text() === 'Créés')
      await createdBtn!.trigger('click')
      await wrapper.vm.$nextTick()
      expect(docList.props('documents')).toHaveLength(3)

      // Switch back to "all"
      const allBtn = wrapper.findAll('.el-segmented__item').find(b => b.text() === 'Tous')
      await allBtn!.trigger('click')
      await wrapper.vm.$nextTick()
      expect(docList.props('documents')).toHaveLength(5)
    })
  })

  // ─── Type filter ──────────────────────────────────────────────────

  describe('type filter', () => {
    it('filters by type when type is selected', async () => {
      const wrapper = createWrapper()
      await flushPromises()

      const docList = wrapper.findComponent({ name: 'ClinicalDocList' })

      // Set filter type via VM
      const vm = wrapper.vm as any
      vm.filterTypeId = CONSULT_TYPE_ID
      await wrapper.vm.$nextTick()

      expect(docList.props('documents')).toHaveLength(2) // Two docs with CONSULT_TYPE_ID
    })
  })

  // ─── Combined filters ─────────────────────────────────────────────

  describe('combined filters', () => {
    it('combines source and type filters', async () => {
      const wrapper = createWrapper()
      await flushPromises()

      const docList = wrapper.findComponent({ name: 'ClinicalDocList' })

      // Filter to "created" source
      const createdBtn = wrapper.findAll('.el-segmented__item').find(b => b.text() === 'Créés')
      await createdBtn!.trigger('click')
      await wrapper.vm.$nextTick()

      // Also filter by LAB_TYPE_ID (which is only in imported docs)
      const vm = wrapper.vm as any
      vm.filterTypeId = LAB_TYPE_ID
      await wrapper.vm.$nextTick()

      // No documents match both "created" source AND LAB_TYPE_ID
      expect(docList.props('documents')).toHaveLength(0)
    })

    it('combines all 4 filters: source + type + category + date', async () => {
      const wrapper = createWrapper()
      await flushPromises()

      const docList = wrapper.findComponent({ name: 'ClinicalDocList' })
      const vm = wrapper.vm as any

      // Filter: source=created, type=CONSULT_TYPE_ID, category=consultation, date includes June 15
      vm.filterTypeId = CONSULT_TYPE_ID
      vm.filterCategory = 'consultation'
      vm.filterDateRange = ['2024-06-01', '2024-06-30']
      await wrapper.vm.$nextTick()

      // createdDocument and signedDocument match all criteria
      expect(docList.props('documents')).toHaveLength(2)
    })

    it('returns empty when combined filters match nothing', async () => {
      const wrapper = createWrapper()
      await flushPromises()

      const docList = wrapper.findComponent({ name: 'ClinicalDocList' })
      const vm = wrapper.vm as any

      // Filter: source=imported, category=consultation (no imported docs are consultation)
      const importedBtn = wrapper.findAll('.el-segmented__item').find(b => b.text() === 'Importés')
      await importedBtn!.trigger('click')
      vm.filterCategory = 'consultation'
      await wrapper.vm.$nextTick()

      expect(docList.props('documents')).toHaveLength(0)
    })
  })

  // ─── Category filter ──────────────────────────────────────────────

  describe('category filter', () => {
    it('filters by document type category', async () => {
      const wrapper = createWrapper()
      await flushPromises()

      const docList = wrapper.findComponent({ name: 'ClinicalDocList' })
      const vm = wrapper.vm as any

      // Set category to "lab" — only importedDocument and oldImportedDocument
      vm.filterCategory = 'lab'
      await wrapper.vm.$nextTick()

      expect(docList.props('documents')).toHaveLength(2)
      expect(docList.props('documents').every((d: ClinicalDocumentDTO) => d.documentType?.category === 'lab')).toBe(true)
    })

    it('filters by "consultation" category', async () => {
      const wrapper = createWrapper()
      await flushPromises()

      const docList = wrapper.findComponent({ name: 'ClinicalDocList' })
      const vm = wrapper.vm as any

      vm.filterCategory = 'consultation'
      await wrapper.vm.$nextTick()

      // createdDocument and signedDocument are consultation
      expect(docList.props('documents')).toHaveLength(2)
      expect(docList.props('documents').every((d: ClinicalDocumentDTO) => d.documentType?.category === 'consultation')).toBe(true)
    })

    it('filters by "delivery" category', async () => {
      const wrapper = createWrapper()
      await flushPromises()

      const docList = wrapper.findComponent({ name: 'ClinicalDocList' })
      const vm = wrapper.vm as any

      vm.filterCategory = 'delivery'
      await wrapper.vm.$nextTick()

      expect(docList.props('documents')).toHaveLength(1)
      expect(docList.props('documents')[0].documentType?.category).toBe('delivery')
    })

    it('shows all documents when category is cleared', async () => {
      const wrapper = createWrapper()
      await flushPromises()

      const docList = wrapper.findComponent({ name: 'ClinicalDocList' })
      const vm = wrapper.vm as any

      // Set then clear category
      vm.filterCategory = 'lab'
      await wrapper.vm.$nextTick()
      expect(docList.props('documents')).toHaveLength(2)

      vm.filterCategory = null
      await wrapper.vm.$nextTick()
      expect(docList.props('documents')).toHaveLength(5)
    })
  })

  // ─── Date range filter ────────────────────────────────────────────

  describe('date range filter', () => {
    it('filters documents by createdAt within date range', async () => {
      const wrapper = createWrapper()
      await flushPromises()

      const docList = wrapper.findComponent({ name: 'ClinicalDocList' })
      const vm = wrapper.vm as any

      // June 2024 range — createdDocument, importedDocument, signedDocument (all June 15)
      vm.filterDateRange = ['2024-06-01', '2024-06-30']
      await wrapper.vm.$nextTick()

      expect(docList.props('documents')).toHaveLength(3)
    })

    it('excludes documents outside the date range', async () => {
      const wrapper = createWrapper()
      await flushPromises()

      const docList = wrapper.findComponent({ name: 'ClinicalDocList' })
      const vm = wrapper.vm as any

      // Only July 2024 — only deliveryDocument (July 10)
      vm.filterDateRange = ['2024-07-01', '2024-07-31']
      await wrapper.vm.$nextTick()

      expect(docList.props('documents')).toHaveLength(1)
      expect(docList.props('documents')[0].id).toBe('doc-004')
    })

    it('excludes old documents when date range is narrow', async () => {
      const wrapper = createWrapper()
      await flushPromises()

      const docList = wrapper.findComponent({ name: 'ClinicalDocList' })
      const vm = wrapper.vm as any

      // March 2024 — only oldImportedDocument (March 1)
      vm.filterDateRange = ['2024-03-01', '2024-03-31']
      await wrapper.vm.$nextTick()

      expect(docList.props('documents')).toHaveLength(1)
      expect(docList.props('documents')[0].id).toBe('doc-005')
    })

    it('shows all documents when date range is cleared', async () => {
      const wrapper = createWrapper()
      await flushPromises()

      const docList = wrapper.findComponent({ name: 'ClinicalDocList' })
      const vm = wrapper.vm as any

      // Set then clear
      vm.filterDateRange = ['2024-07-01', '2024-07-31']
      await wrapper.vm.$nextTick()
      expect(docList.props('documents')).toHaveLength(1)

      vm.filterDateRange = null
      await wrapper.vm.$nextTick()
      expect(docList.props('documents')).toHaveLength(5)
    })
  })

  // ─── Import dialog ────────────────────────────────────────────────

  describe('import dialog', () => {
    it('opens import dialog when Importer button is clicked', async () => {
      const wrapper = createWrapper()
      await flushPromises()

      const importBtn = wrapper.findAll('.el-button').find(b => b.text().includes('Importer'))
      await importBtn!.trigger('click')

      await wrapper.vm.$nextTick()

      const dialog = wrapper.findComponent({ name: 'ImportDocumentDialog' })
      expect(dialog.exists()).toBe(true)
      expect(dialog.props('visible')).toBe(true)
    })

    it('passes documentTypes to import dialog', async () => {
      const wrapper = createWrapper()
      await flushPromises()

      const dialog = wrapper.findComponent({ name: 'ImportDocumentDialog' })
      expect(dialog.props('documentTypes')).toEqual(documentTypes)
    })

    it('passes disabled state to import dialog when contact is expired', async () => {
      mockIsContactExpired.value = true

      const wrapper = createWrapper()
      await flushPromises()

      const dialog = wrapper.findComponent({ name: 'ImportDocumentDialog' })
      expect(dialog.props('disabled')).toBe(true)
    })

    it('disables importer button when contact is expired', async () => {
      mockIsContactExpired.value = true

      const wrapper = createWrapper()
      await flushPromises()

      const importBtn = wrapper.findAll('.el-button').find(b => b.text().includes('Importer'))
      expect(importBtn!.attributes('disabled')).toBeDefined()
    })
  })

  // ─── Passes filtered documents to ClinicalDocList ──────────────────

  describe('documents passed to list', () => {
    it('passes all documents by default', async () => {
      const wrapper = createWrapper()
      await flushPromises()

      const docList = wrapper.findComponent({ name: 'ClinicalDocList' })
      expect(docList.props('documents')).toHaveLength(5)
    })

    it('passes documentTypes to ClinicalDocList', async () => {
      const wrapper = createWrapper()
      await flushPromises()

      const docList = wrapper.findComponent({ name: 'ClinicalDocList' })
      expect(docList.props('documentTypes')).toEqual(documentTypes)
    })

    it('passes selectedDocument id to ClinicalDocList', async () => {
      mockSelectedDocument.value = createdDocument

      const wrapper = createWrapper()
      await flushPromises()

      const docList = wrapper.findComponent({ name: 'ClinicalDocList' })
      expect(docList.props('selectedId')).toBe('doc-001')
    })

    it('passes loading state to ClinicalDocList', async () => {
      mockLoading.value = true

      const wrapper = createWrapper()
      await flushPromises()

      const docList = wrapper.findComponent({ name: 'ClinicalDocList' })
      expect(docList.props('loading')).toBe(true)
    })
  })
})
