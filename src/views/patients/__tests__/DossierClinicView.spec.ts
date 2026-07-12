// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import DossierClinicView from '../DossierClinicView.vue'

// ===========================================================================
// Hoisted mocks — available before any vi.mock() call
// ===========================================================================
const {
  mockFetchDocumentTypes,
  mockFetchDocumentTypesWithPricing,
  mockFetchDocumentsByPatient,
  mockCreateDocumentWithActe,
  mockDeleteDocument,
  mockCheckContactExpired,
  mockListEncountersByPatient,
  mockElMessage,
  mockElMessageBox,
  // State containers for composable refs (plain objects that the mock
  // composable returns directly — NOT wrapped in React refs, so Vue's
  // template uses them as-is without auto-unwrapping).
  state,
} = vi.hoisted(() => ({
  mockFetchDocumentTypes: vi.fn(),
  mockFetchDocumentTypesWithPricing: vi.fn(),
  mockFetchDocumentsByPatient: vi.fn(),
  mockCreateDocumentWithActe: vi.fn(),
  mockDeleteDocument: vi.fn(),
  mockCheckContactExpired: vi.fn(),
  mockListEncountersByPatient: vi.fn(),
  mockElMessage: { success: vi.fn(), warning: vi.fn(), info: vi.fn(), error: vi.fn() },
  mockElMessageBox: { confirm: vi.fn(() => Promise.resolve()), alert: vi.fn(() => Promise.resolve()) },
  state: {
    documents: [] as any[],
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
  Plus: { render: () => {} },
  Delete: { render: () => {} },
}))

vi.mock('@/composables/usePatientContext', () => ({
  usePatientContext: vi.fn(() => ({
    activePatient: { value: { id: 1, nom: 'Doe', prenom: 'John' } },
  })),
}))

vi.mock('@/composables/useClinicalDocuments', () => ({
  useClinicalDocuments: vi.fn(() => ({
    // These are plain arrays / booleans (not refs). The component's
    // `<script setup>` destructures them directly, and the template
    // accesses `.length` / boolean truthiness without ref unwrapping.
    documents: state.documents,
    loading: state.loading,
    fetchDocumentTypes: mockFetchDocumentTypes,
    fetchDocumentTypesWithPricing: mockFetchDocumentTypesWithPricing,
    fetchDocumentsByPatient: mockFetchDocumentsByPatient,
    createDocumentWithActe: mockCreateDocumentWithActe,
    deleteDocument: mockDeleteDocument,
    checkContactExpired: mockCheckContactExpired,
  })),
}))

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
  listEncountersByPatient: mockListEncountersByPatient,
}))

// ===========================================================================
// Flush micro-tasks and Vue updates
// ===========================================================================
function waitForData() {
  return new Promise(resolve => setTimeout(resolve, 0))
}

// ===========================================================================
// Stubs for Element Plus components
// ===========================================================================
const stubs = {
  // ── Table ────────────────────────────────────────────────────────────
  'el-table': {
    template: [
      '<div class="el-table">',
      '  <div v-for="(item, idx) in (data || [])" :key="idx" class="el-table__row" @click="$emit(\'row-click\', item)">',
      '    <div class="el-table__cell-doc">',
      '      <span class="el-table__label">{{ item.documentType?.label || item.title }}</span>',
      '      <span v-if="item.documentType?.acteLabel" class="el-table__acte">{{ item.documentType.acteLabel }}</span>',
      '    </div>',
      '    <span class="el-table__contact">#{{ item.contactId }}</span>',
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

  // ── Buttons ──────────────────────────────────────────────────────────
  'el-button': {
    template:
      '<button class="el-button" :disabled="disabled" @click="$emit(\'click\', $event)"><slot /></button>',
    props: ['disabled', 'type', 'size', 'icon', 'text', 'loading'],
    emits: ['click'],
  },

  // ── Tags ─────────────────────────────────────────────────────────────
  'el-tag': {
    template: '<span class="el-tag" :class="`el-tag--${type}`"><slot /></span>',
    props: ['type', 'size', 'effect'],
  },

  // ── Empty state ──────────────────────────────────────────────────────
  'el-empty': {
    template: '<div class="el-empty"><p class="el-empty__description">{{ description }}</p><slot /></div>',
    props: ['description', 'imageSize'],
  },

  // ── Dialog ───────────────────────────────────────────────────────────
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

  // ── Select ───────────────────────────────────────────────────────────
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

  // ── Collapse / Catalog ───────────────────────────────────────────────
  'el-collapse': {
    template: '<div class="el-collapse"><slot /></div>',
    props: ['modelValue'],
    emits: ['update:modelValue'],
  },
  'el-collapse-item': {
    template: [
      '<div class="el-collapse-item">',
      '  <div class="el-collapse-item__title"><slot name="title" /></div>',
      '  <div class="el-collapse-item__content"><slot /></div>',
      '</div>',
    ].join(''),
    props: ['name'],
  },

  // ── Misc ─────────────────────────────────────────────────────────────
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
  'el-divider': {
    template: '<hr class="el-divider" />',
  },
}

// ===========================================================================
// Factory: default test data
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
    contact_type: 'consultation',
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

    // Reset shared mock state
    state.documents = []
    state.loading = false

    // Default mock implementations for happy-path tests
    mockFetchDocumentTypes.mockResolvedValue(undefined)
    mockFetchDocumentTypesWithPricing.mockResolvedValue([])
    mockFetchDocumentsByPatient.mockResolvedValue(undefined)
    mockListEncountersByPatient.mockResolvedValue([])
    mockDeleteDocument.mockResolvedValue(true)
    mockCheckContactExpired.mockResolvedValue(false)
  })

  // -----------------------------------------------------------------------
  // Document list — empty state & data loading
  // -----------------------------------------------------------------------
  describe('document list', () => {
    it('shows empty state when no documents exist', async () => {
      state.documents = []
      state.loading = false

      const wrapper = mount(DossierClinicView, { global: { stubs } })

      await nextTick()
      await waitForData()
      await nextTick()

      // el-empty should show when documents is empty and not loading
      expect(wrapper.find('.el-empty').exists()).toBe(true)
      expect(wrapper.find('.el-empty__description').text()).toContain('Aucun document clinique')
    })

    it('loads and displays documents on mount', async () => {
      const docs = [
        makeDocument({ id: 'doc-1', documentType: makeDocumentType({ label: 'Compte rendu' }) }),
        makeDocument({ id: 'doc-2', documentType: makeDocumentType({ label: 'Ordonnance', category: 'Prescription' }) }),
      ]
      state.documents = docs
      state.loading = false

      const wrapper = mount(DossierClinicView, { global: { stubs } })

      await nextTick()
      await waitForData()
      await nextTick()

      // Verify data fetching
      expect(mockFetchDocumentsByPatient).toHaveBeenCalledTimes(1)
      expect(mockFetchDocumentsByPatient).toHaveBeenCalledWith(1)

      // Verify table renders document labels
      expect(wrapper.find('.el-table').exists()).toBe(true)
      expect(wrapper.text()).toContain('Compte rendu')
      expect(wrapper.text()).toContain('Ordonnance')
    })

    it('calls fetchDocumentTypes and listEncountersByPatient on mount', async () => {
      state.documents = [makeDocument()]
      mockFetchDocumentTypesWithPricing.mockResolvedValue([makeDocumentType()])
      mockListEncountersByPatient.mockResolvedValue([makeEncounter()])

      mount(DossierClinicView, { global: { stubs } })

      await nextTick()
      await waitForData()
      await nextTick()

      expect(mockFetchDocumentTypes).toHaveBeenCalledTimes(1)
      expect(mockFetchDocumentTypesWithPricing).toHaveBeenCalledTimes(1)
      expect(mockFetchDocumentsByPatient).toHaveBeenCalledWith(1)
      expect(mockListEncountersByPatient).toHaveBeenCalledWith(1, 'active')
    })

    it('renders loading indicator when loading is true', async () => {
      state.loading = true
      state.documents = []

      const wrapper = mount(DossierClinicView, { global: { stubs } })

      await nextTick()
      await waitForData()
      await nextTick()

      expect(wrapper.text()).toContain('Chargement des documents')
    })
  })

  // -----------------------------------------------------------------------
  // "Nouveau document" button opens the creation dialog
  // -----------------------------------------------------------------------
  describe('"Nouveau document" button', () => {
    it('opens the new document dialog when clicked', async () => {
      state.documents = []
      mockFetchDocumentTypesWithPricing.mockResolvedValue([makeDocumentType()])
      mockListEncountersByPatient.mockResolvedValue([makeEncounter()])

      const wrapper = mount(DossierClinicView, { global: { stubs } })

      await nextTick()
      await waitForData()
      await nextTick()

      // Dialog should initially be hidden
      expect(wrapper.find('.el-dialog').exists()).toBe(false)

      // Click "Nouveau document" button
      const newBtn = wrapper.findAll('button.el-button').find(b => b.text().trim() === 'Nouveau document')
      expect(newBtn).toBeTruthy()
      await newBtn!.trigger('click')
      await nextTick()

      // Dialog should now be visible
      expect(wrapper.find('.el-dialog').exists()).toBe(true)
      expect(wrapper.find('.el-dialog').isVisible()).toBe(true)
    })
  })

  // -----------------------------------------------------------------------
  // Dialog step 1: contact selection
  // -----------------------------------------------------------------------
  describe('dialog step 1 — contact selection', () => {
    it('shows contact selector when dialog opens', async () => {
      const encounters = [
        makeEncounter({ id: 42, contact_type: 'consultation', start_date: '2026-07-01T08:00:00.000Z', service_name: 'Médecine générale' }),
        makeEncounter({ id: 43, contact_type: 'urgence', start_date: '2026-06-28T14:00:00.000Z', service_name: 'Urgences' }),
      ]
      state.documents = []
      mockListEncountersByPatient.mockResolvedValue(encounters)

      const wrapper = mount(DossierClinicView, { global: { stubs } })

      await nextTick()
      await waitForData()
      await nextTick()

      // Open dialog
      const newBtn = wrapper.findAll('button.el-button').find(b => b.text().trim() === 'Nouveau document')
      await newBtn!.trigger('click')
      await nextTick()

      // Dialog should show the contact selection step
      const dialog = wrapper.find('.el-dialog')
      expect(dialog.text()).toContain('Sélectionnez le contact')

      // Select should have options matching encounters
      const options = wrapper.findAll('.el-option')
      expect(options.length).toBe(2)
    })

    it('advances to catalog step when a contact is selected', async () => {
      const encounters = [makeEncounter({ id: 42 })]
      state.documents = []
      mockListEncountersByPatient.mockResolvedValue(encounters)
      mockFetchDocumentTypesWithPricing.mockResolvedValue([makeDocumentType()])

      const wrapper = mount(DossierClinicView, { global: { stubs } })

      await nextTick()
      await waitForData()
      await nextTick()

      // Open dialog
      const newBtn = wrapper.findAll('button.el-button').find(b => b.text().trim() === 'Nouveau document')
      await newBtn!.trigger('click')
      await nextTick()

      // Before selecting a contact, catalog step should not be shown
      expect(dialogText(wrapper)).not.toContain('Type de document')

      // Select a contact
      const select = wrapper.find('.el-select')
      await select.setValue('42')
      await nextTick()

      // After selection, the catalog step should appear
      expect(dialogText(wrapper)).toContain('Type de document')
    })
  })

  // -----------------------------------------------------------------------
  // Dialog step 2: catalog rendering
  // -----------------------------------------------------------------------
  describe('dialog step 2 — catalog rendering', () => {
    it('renders document types grouped by category', async () => {
      const docTypes = [
        makeDocumentType({ id: 'dt-1', label: 'Compte rendu', category: 'Consultation' }),
        makeDocumentType({ id: 'dt-2', label: 'Certificat médical', category: 'Consultation' }),
        makeDocumentType({ id: 'dt-3', label: 'Ordonnance', category: 'Prescription', acteLabel: 'Prescription médicale', prixUnitaire: 5000 }),
      ]
      const encounters = [makeEncounter({ id: 42 })]

      state.documents = []
      mockFetchDocumentTypesWithPricing.mockResolvedValue(docTypes)
      mockListEncountersByPatient.mockResolvedValue(encounters)

      const wrapper = mount(DossierClinicView, { global: { stubs } })

      await nextTick()
      await waitForData()
      await nextTick()

      // Open dialog and select contact
      const newBtn = wrapper.findAll('button.el-button').find(b => b.text().trim() === 'Nouveau document')
      await newBtn!.trigger('click')
      await nextTick()

      const select = wrapper.find('.el-select')
      await select.setValue('42')
      await nextTick()

      // The catalog step should show categories
      const dialogBody = wrapper.find('.el-dialog__body')
      expect(dialogBody.text()).toContain('Consultation')
      expect(dialogBody.text()).toContain('Prescription')

      // Should show document type items
      expect(dialogBody.text()).toContain('Compte rendu')
      expect(dialogBody.text()).toContain('Certificat médical')
      expect(dialogBody.text()).toContain('Ordonnance')
      expect(dialogBody.text()).toContain('Prescription médicale')

      // Should show "Créer" buttons for each type
      const createButtons = wrapper.findAll('button.el-button').filter(b => b.text().trim() === 'Créer')
      expect(createButtons.length).toBe(3)
    })

    it('shows empty catalog message when no document types available', async () => {
      const encounters = [makeEncounter({ id: 42 })]

      state.documents = []
      mockFetchDocumentTypesWithPricing.mockResolvedValue([])
      mockListEncountersByPatient.mockResolvedValue(encounters)

      const wrapper = mount(DossierClinicView, { global: { stubs } })

      await nextTick()
      await waitForData()
      await nextTick()

      // Open dialog and select contact
      const newBtn = wrapper.findAll('button.el-button').find(b => b.text().trim() === 'Nouveau document')
      await newBtn!.trigger('click')
      await nextTick()

      const select = wrapper.find('.el-select')
      await select.setValue('42')
      await nextTick()

      expect(wrapper.find('.el-dialog__body').text()).toContain('Aucun type de document disponible')
    })
  })

  // -----------------------------------------------------------------------
  // Creating a document
  // -----------------------------------------------------------------------
  describe('creating a document', () => {
    it('calls createDocumentWithActe when a catalog item is clicked', async () => {
      const docTypes = [
        makeDocumentType({
          id: 'dt-1',
          label: 'Compte rendu',
          category: 'Consultation',
          acteIdDeclenche: 10,
          acteLabel: 'Consultation',
          prixUnitaire: 10000,
        }),
      ]
      const encounters = [makeEncounter({ id: 42, service_id: 5 })]

      state.documents = []
      mockFetchDocumentTypesWithPricing.mockResolvedValue(docTypes)
      mockListEncountersByPatient.mockResolvedValue(encounters)
      mockCreateDocumentWithActe.mockResolvedValue({
        document: makeDocument(),
        acteId: 100,
        prixUnitaire: 10000,
      })

      const wrapper = mount(DossierClinicView, { global: { stubs } })

      await nextTick()
      await waitForData()
      await nextTick()

      // Open dialog
      const newBtn = wrapper.findAll('button.el-button').find(b => b.text().trim() === 'Nouveau document')
      await newBtn!.trigger('click')
      await nextTick()

      // Select contact
      const select = wrapper.find('.el-select')
      await select.setValue('42')
      await nextTick()

      // Click "Créer" button on the first catalog item
      const createBtn = wrapper.findAll('button.el-button').find(b => b.text().trim() === 'Créer')
      expect(createBtn).toBeTruthy()
      await createBtn!.trigger('click')

      // Wait for async creation flow
      await waitForData()
      await nextTick()

      // Verify API was called with correct params
      expect(mockCheckContactExpired).toHaveBeenCalledWith('42')
      expect(mockCreateDocumentWithActe).toHaveBeenCalledTimes(1)
      expect(mockCreateDocumentWithActe).toHaveBeenCalledWith('dt-1', '42', '5', '1')

      // Success message should be shown
      expect(mockElMessage.success).toHaveBeenCalledWith(
        expect.stringContaining('Compte rendu'),
      )

      // Dialog should close after successful creation
      expect(wrapper.find('.el-dialog').exists()).toBe(false)

      // Documents should be refreshed
      expect(mockFetchDocumentsByPatient).toHaveBeenCalledWith(1)
    })

    it('shows warning when no contact is selected', async () => {
      const docTypes = [makeDocumentType({ id: 'dt-1', label: 'Compte rendu' })]
      state.documents = []
      mockFetchDocumentTypesWithPricing.mockResolvedValue(docTypes)
      mockListEncountersByPatient.mockResolvedValue([makeEncounter({ id: 42 })])

      const wrapper = mount(DossierClinicView, { global: { stubs } })

      await nextTick()
      await waitForData()
      await nextTick()

      // Call handleCreateDoc via component instance with no contact selected
      // (wrapper.vm exposes <script setup> bindings used in the template)
      await wrapper.vm.handleCreateDoc(docTypes[0])
      await nextTick()

      expect(mockElMessage.warning).toHaveBeenCalledWith(
        expect.stringContaining('Sélectionnez d\'abord un contact'),
      )
      expect(mockCreateDocumentWithActe).not.toHaveBeenCalled()
    })

    it('prevents creation when contact is expired', async () => {
      mockCheckContactExpired.mockResolvedValue(true)
      const docTypes = [makeDocumentType({ id: 'dt-1', label: 'Compte rendu' })]
      const encounters = [makeEncounter({ id: 42 })]

      state.documents = []
      mockFetchDocumentTypesWithPricing.mockResolvedValue(docTypes)
      mockListEncountersByPatient.mockResolvedValue(encounters)

      const wrapper = mount(DossierClinicView, { global: { stubs } })

      await nextTick()
      await waitForData()
      await nextTick()

      // Open dialog
      const newBtn = wrapper.findAll('button.el-button').find(b => b.text().trim() === 'Nouveau document')
      await newBtn!.trigger('click')
      await nextTick()

      // Select contact
      const select = wrapper.find('.el-select')
      await select.setValue('42')
      await nextTick()

      // Click "Créer"
      const createBtn = wrapper.findAll('button.el-button').find(b => b.text().trim() === 'Créer')
      await createBtn!.trigger('click')

      await waitForData()
      await nextTick()

      expect(mockCheckContactExpired).toHaveBeenCalledWith('42')
      expect(mockCreateDocumentWithActe).not.toHaveBeenCalled()
      expect(mockElMessageBox.alert).toHaveBeenCalledWith(
        expect.stringContaining('expiré'),
        'Contact expiré',
        expect.any(Object),
      )
    })
  })

  // -----------------------------------------------------------------------
  // Row click — opens detail dialog
  // -----------------------------------------------------------------------
  describe('row click — detail dialog', () => {
    it('opens detail dialog when a table row is clicked', async () => {
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

      // Click the table row
      const row = wrapper.find('.el-table__row')
      expect(row.exists()).toBe(true)
      await row.trigger('click')
      await nextTick()

      // Detail dialog should be visible
      const detailDialog = wrapper.findAll('.el-dialog').find(d => d.text().includes('Document'))
      expect(detailDialog).toBeTruthy()
      expect(detailDialog!.isVisible()).toBe(true)
    })

    it('displays document information in the detail dialog', async () => {
      const docs = [
        makeDocument({
          id: 'doc-1',
          documentType: makeDocumentType({ label: 'Compte rendu', acteLabel: 'Consultation' }),
          contactId: '42',
          status: 'draft',
          createdAt: '2026-07-03T10:00:00.000Z',
        }),
      ]
      state.documents = docs

      const wrapper = mount(DossierClinicView, { global: { stubs } })

      await nextTick()
      await waitForData()
      await nextTick()

      // Click the table row
      const row = wrapper.find('.el-table__row')
      await row.trigger('click')
      await nextTick()

      // Detail dialog shows document info
      const detailDialog = wrapper.findAll('.el-dialog').find(d => d.text().includes('Document'))
      expect(detailDialog).toBeTruthy()
      expect(detailDialog!.text()).toContain('Compte rendu')
      expect(detailDialog!.text()).toContain('Brouillon')
      expect(detailDialog!.text()).toContain('#42')
    })

    it('shows signed status badge in detail dialog', async () => {
      const docs = [
        makeDocument({
          id: 'doc-1',
          status: 'signed',
          signedAt: '2026-07-04T10:00:00.000Z',
          documentType: makeDocumentType({ label: 'Compte rendu' }),
        }),
      ]
      state.documents = docs

      const wrapper = mount(DossierClinicView, { global: { stubs } })

      await nextTick()
      await waitForData()
      await nextTick()

      const row = wrapper.find('.el-table__row')
      await row.trigger('click')
      await nextTick()

      const detailDialog = wrapper.findAll('.el-dialog').find(d => d.text().includes('Document'))
      expect(detailDialog!.text()).toContain('Signé')
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

      // Invoke onDelete directly via component instance. The delete button
      // is nested inside el-table → el-table-column → el-tooltip → el-button
      // stubs, so native DOM click propagation does not reach the handler.
      await wrapper.vm.onDelete(doc)

      await waitForData()
      await nextTick()

      // ElMessageBox.confirm should have been called
      expect(mockElMessageBox.confirm).toHaveBeenCalledWith(
        expect.stringContaining('Compte rendu'),
        'Confirmation',
        expect.objectContaining({ type: 'warning' }),
      )

      // deleteDocument should have been called with the document ID
      expect(mockDeleteDocument).toHaveBeenCalledWith('doc-1')

      // Documents should be refreshed after deletion
      expect(mockFetchDocumentsByPatient).toHaveBeenCalled()
    })

    it('does not delete when confirmation is cancelled', async () => {
      // Make ElMessageBox.confirm reject (user cancels)
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

      // deleteDocument should NOT have been called
      expect(mockDeleteDocument).not.toHaveBeenCalled()
    })
  })

  // -----------------------------------------------------------------------
  // Dialog close resets state
  // -----------------------------------------------------------------------
  describe('dialog close resets state', () => {
    it('resets createStep and newContactId when dialog is closed', async () => {
      const encounters = [makeEncounter({ id: 42 })]
      state.documents = []
      mockListEncountersByPatient.mockResolvedValue(encounters)
      mockFetchDocumentTypesWithPricing.mockResolvedValue([makeDocumentType()])

      const wrapper = mount(DossierClinicView, { global: { stubs } })

      await nextTick()
      await waitForData()
      await nextTick()

      // Open dialog
      const newBtn = wrapper.findAll('button.el-button').find(b => b.text().trim() === 'Nouveau document')
      await newBtn!.trigger('click')
      await nextTick()

      // Select contact to advance to catalog step
      const select = wrapper.find('.el-select')
      await select.setValue('42')
      await nextTick()

      expect(wrapper.vm.createStep).toBe('catalog')
      expect(wrapper.vm.newContactId).toBe('42')

      // Close dialog — set showNewDialog to false
      wrapper.vm.showNewDialog = false
      await nextTick()

      // State should be reset by the watch
      expect(wrapper.vm.createStep).toBe('contact')
      expect(wrapper.vm.newContactId).toBe('')
      expect(wrapper.vm.openCats).toEqual([])
    })
  })
})

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Extract text from the visible dialog body (ignores hidden dialogs). */
function dialogText(wrapper: ReturnType<typeof mount>): string {
  const visible = wrapper.findAll('.el-dialog').filter(d => d.isVisible())
  return visible.length > 0 ? visible[0].text() : ''
}
