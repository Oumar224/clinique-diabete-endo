// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, nextTick } from 'vue'
import OrdonnanceLibreForm from '@/components/patients/OrdonnanceLibreForm.vue'

// ===========================================================================
// Hoisted mocks
// ===========================================================================
const {
  mockFetchAvailablePrescriptions,
  mockElMessage,
  mockElMessageBox,
  state,
} = vi.hoisted(() => ({
  mockFetchAvailablePrescriptions: vi.fn(),
  mockElMessage: { success: vi.fn(), warning: vi.fn(), info: vi.fn(), error: vi.fn() },
  mockElMessageBox: { confirm: vi.fn(() => Promise.resolve()), alert: vi.fn(() => Promise.resolve()) },
  state: {
    activePatient: { id: 1 } as any,
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
}))

vi.mock('@/composables/usePatientContext', () => ({
  usePatientContext: vi.fn(() => ({
    activePatient: { value: state.activePatient },
  })),
}))

vi.mock('@/composables/useOrdonnanceLibre', async () => {
  const vue = await vi.importActual<typeof import('vue')>('vue')
  return {
    useOrdonnanceLibre: vi.fn(() => ({
      fetchAvailablePrescriptions: mockFetchAvailablePrescriptions,
      ordonnances: vue.ref([]),
      loading: vue.ref(false),
      error: vue.ref(null),
      fetchOrdonnances: vi.fn(),
      deleteOrdonnance: vi.fn(),
    })),
  }
})

vi.mock('@/utils/constants', () => ({
  MOMENTS_OPTIONS: [
    { value: 'Matin', label: 'Matin' },
    { value: 'Midi', label: 'Midi' },
    { value: 'Soir', label: 'Soir' },
    { value: 'Nuit', label: 'Nuit' },
  ],
  FIXED_TIMES_OPTIONS: ['08h00', '12h00', '18h00'],
  INTERVAL_OPTIONS: [4, 6, 8, 12, 24],
}))

vi.mock('@/components/patients/RichTextEditor.vue', () => ({
  default: {
    name: 'RichTextEditor',
    template: '<div class="rich-editor-mock" />',
    props: ['modelValue', 'readonly', 'rows', 'placeholder'],
    emits: ['update:modelValue', 'change'],
  },
}))

// ===========================================================================
// Helpers
// ===========================================================================
function waitForData() {
  return new Promise(resolve => setTimeout(resolve, 0))
}

// handleSign waits ~100ms before emitting 'sign'
function waitForSign() {
  return new Promise(resolve => setTimeout(resolve, 150))
}

// ===========================================================================
// Stubs
// ===========================================================================
const stubs = {
  SectionHeader: {
    template: '<div class="section-header"><slot /><slot name="badge" /><slot name="actions" /></div>',
    props: ['label', 'level', 'badge'],
  },
  'el-table': {
    template: [
      '<div class="el-table">',
      '  <div v-for="(item, idx) in (data || [])" :key="idx" class="el-table__row">',
      '    <label class="el-checkbox"><input type="checkbox" :checked="false" /></label>',
      '    <span class="el-table__meds">{{ item.medicament }} \u2014 {{ item.dosage }}</span>',
      '  </div>',
      '</div>',
    ].join(''),
    props: ['data', 'highlightCurrentRow', 'maxHeight', 'style'],
  },
  'el-table-column': {
    template: '<div class="el-table-column"><slot :row="{}" /></div>',
    props: ['prop', 'label', 'width', 'align', 'minWidth'],
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
  'el-alert': {
    template: '<div class="el-alert" :class="`el-alert--${type}`">{{ title }}<slot /></div>',
    props: ['type', 'title', 'closable', 'showIcon'],
  },
  'el-form': {
    template: '<form class="el-form"><slot /></form>',
    props: ['model', 'rules', 'labelPosition', 'ref'],
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
  'el-row': {
    template: '<div class="el-row"><slot /></div>',
    props: ['gutter'],
  },
  'el-col': {
    template: '<div class="el-col"><slot /></div>',
    props: ['span'],
  },
  'el-select': {
    template: '<select class="el-select" :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><slot /></select>',
    props: ['modelValue', 'filterable', 'placeholder', 'style', 'multiple', 'collapseTags', 'collapseTagsTooltip'],
    emits: ['update:modelValue'],
  },
  'el-option': {
    template: '<option class="el-option" :value="value">{{ label }}</option>',
    props: ['value', 'label'],
  },
  'el-input': {
    template: '<input class="el-input" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" :placeholder="placeholder" />',
    props: ['modelValue', 'placeholder', 'type', 'rows'],
    emits: ['update:modelValue'],
  },
  'el-input-number': {
    template: '<input class="el-input-number" type="number" :value="modelValue" @input="$emit(\'update:modelValue\', Number($event.target.value))" :min="min" :max="max" />',
    props: ['modelValue', 'min', 'max'],
    emits: ['update:modelValue'],
  },
  'el-checkbox': {
    template: '<label class="el-checkbox"><input type="checkbox" :checked="modelValue" @change="$emit(\'change\', $event.target.checked)" /></label>',
    props: ['modelValue', 'disabled', 'label'],
    emits: ['change'],
  },
  'el-switch': {
    template: '<input class="el-switch" type="checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)" />',
    props: ['modelValue'],
    emits: ['update:modelValue'],
  },
  'el-radio-group': {
    template: '<div class="el-radio-group"><slot :modelValue="modelValue" /></div>',
    props: ['modelValue', 'size'],
    emits: ['update:modelValue'],
  },
  'el-radio': {
    template: '<label class="el-radio"><input type="radio" :value="value" :checked="modelValue === value" @change="$emit(\'update:modelValue\', value)" />{{ label }}<slot /></label>',
    props: ['value', 'label', 'modelValue'],
    emits: ['update:modelValue'],
  },
}

// ===========================================================================
// Factory helpers
// ===========================================================================
const defaultProps = {
  document: { id: 'doc-1', contactId: '1', status: 'draft', formData: null },
  documentType: { id: 'type-1', code: 'ORDONNANCE_LIBRE', label: 'Ordonnance Libre' },
  readonly: false,
  contactDisplay: 'Hospitalisation - 01/01/2024',
}

function makeAvailablePrescription(overrides: Record<string, any> = {}) {
  return {
    id: 1,
    medicament: 'Metformine 500 mg',
    dosage: '500 mg',
    voie: 'PO',
    frequence: ['Matin', 'Midi', 'Soir'],
    statut: 'active',
    ...overrides,
  }
}

// ===========================================================================
// Tests
// ===========================================================================
describe('OrdonnanceLibreForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    state.activePatient = { id: 1 }
    mockFetchAvailablePrescriptions.mockResolvedValue([])
  })

  // -----------------------------------------------------------------------
  // Document header
  // -----------------------------------------------------------------------
  describe('document header', () => {
    it('renders document header with title and status tag', async () => {
      const wrapper = mount(OrdonnanceLibreForm, {
        props: defaultProps,
        global: { stubs },
      })

      await nextTick()
      await waitForData()
      await nextTick()

      expect(wrapper.find('.ordonnance-libre-form__title').text()).toBe('Ordonnance Libre')
      expect(wrapper.find('.el-tag').text()).toBe('Brouillon')
    })

    it('shows Signé tag for signed documents', async () => {
      const props = {
        ...defaultProps,
        document: { ...defaultProps.document, status: 'signed' },
      }
      const wrapper = mount(OrdonnanceLibreForm, {
        props,
        global: { stubs },
      })

      await nextTick()
      await waitForData()
      await nextTick()

      expect(wrapper.find('.el-tag').text()).toBe('Signé')
    })
  })

  // -----------------------------------------------------------------------
  // Available prescriptions loading
  // -----------------------------------------------------------------------
  describe('available prescriptions', () => {
    it('loads available prescriptions on mount', async () => {
      mount(OrdonnanceLibreForm, {
        props: defaultProps,
        global: { stubs },
      })

      await nextTick()
      await waitForData()
      await nextTick()

      expect(mockFetchAvailablePrescriptions).toHaveBeenCalledTimes(1)
      expect(mockFetchAvailablePrescriptions).toHaveBeenCalledWith(1)
    })

    it('renders existing prescriptions table', async () => {
      const prescriptions = [
        makeAvailablePrescription(),
        makeAvailablePrescription({ id: 2, medicament: 'Amlodipine 5 mg', dosage: '5 mg' }),
      ]
      mockFetchAvailablePrescriptions.mockResolvedValue(prescriptions)

      const wrapper = mount(OrdonnanceLibreForm, {
        props: defaultProps,
        global: { stubs },
      })

      await nextTick()
      await waitForData()
      await nextTick()

      expect(wrapper.find('.el-table').exists()).toBe(true)
      expect(wrapper.text()).toContain('Metformine 500 mg')
      expect(wrapper.text()).toContain('Amlodipine 5 mg')
    })

    it('shows empty state when no prescriptions available', async () => {
      mockFetchAvailablePrescriptions.mockResolvedValue([])

      const wrapper = mount(OrdonnanceLibreForm, {
        props: defaultProps,
        global: { stubs },
      })

      await nextTick()
      await waitForData()
      await nextTick()

      expect(wrapper.find('.el-empty').exists()).toBe(true)
      expect(wrapper.text()).toContain('Aucune prescription existante')
    })
  })

  // -----------------------------------------------------------------------
  // Prescription selection
  // -----------------------------------------------------------------------
  describe('prescription selection', () => {
    it('toggles prescription selection', async () => {
      const prescriptions = [
        makeAvailablePrescription({ id: 1 }),
        makeAvailablePrescription({ id: 2, medicament: 'Amlodipine 5 mg' }),
      ]
      mockFetchAvailablePrescriptions.mockResolvedValue(prescriptions)

      const wrapper = mount(OrdonnanceLibreForm, {
        props: defaultProps,
        global: { stubs },
      })

      await nextTick()
      await waitForData()
      await nextTick()

      expect(wrapper.find('.el-table').exists()).toBe(true)

      ;(wrapper.vm as any).togglePrescription(1, true)
      await nextTick()

      expect((wrapper.vm as any).selectedPrescriptionIds).toContain(1)

      ;(wrapper.vm as any).togglePrescription(1, false)
      await nextTick()

      expect((wrapper.vm as any).selectedPrescriptionIds).not.toContain(1)
    })
  })

  // -----------------------------------------------------------------------
  // Inline prescriptions
  // -----------------------------------------------------------------------
  describe('inline prescriptions', () => {
    it('adds inline prescription', async () => {
      mockFetchAvailablePrescriptions.mockResolvedValue([])

      const wrapper = mount(OrdonnanceLibreForm, {
        props: defaultProps,
        global: { stubs },
      })

      await nextTick()
      await waitForData()
      await nextTick()

      const selects = wrapper.findAll('select.el-select')
      await selects[0].setValue('Metformine 500 mg')
      await selects[1].setValue('mg')
      await selects[2].setValue('Orale')

      const inputs = wrapper.findAll('input.el-input')
      await inputs[0].setValue('1')

      await nextTick()

      const addBtn = wrapper.findAll('button.el-button').find(b => b.text().trim() === 'Ajouter')
      expect(addBtn).toBeTruthy()
      await addBtn!.trigger('click')
      await waitForData()
      await nextTick()

      expect((wrapper.vm as any).inlinePrescriptions.length).toBe(1)
      expect((wrapper.vm as any).inlinePrescriptions[0].medicament).toBe('Metformine 500 mg')
    })

    it('removes inline prescription', async () => {
      mockFetchAvailablePrescriptions.mockResolvedValue([])

      const wrapper = mount(OrdonnanceLibreForm, {
        props: defaultProps,
        global: { stubs },
      })

      await nextTick()
      await waitForData()
      await nextTick()

      const selects = wrapper.findAll('select.el-select')
      await selects[0].setValue('Metformine 500 mg')
      await selects[1].setValue('mg')
      await selects[2].setValue('Orale')

      const inputs = wrapper.findAll('input.el-input')
      await inputs[0].setValue('1')

      await nextTick()

      const addBtn = wrapper.findAll('button.el-button').find(b => b.text().trim() === 'Ajouter')
      await addBtn!.trigger('click')
      await waitForData()
      await nextTick()

      expect((wrapper.vm as any).inlinePrescriptions.length).toBe(1)

      const inlineItem = wrapper.find('.ordonnance-libre-form__inline-item')
      expect(inlineItem.exists()).toBe(true)
      const deleteBtn = inlineItem.find('button.el-button')
      expect(deleteBtn.exists()).toBe(true)
      await deleteBtn.trigger('click')
      await nextTick()

      expect((wrapper.vm as any).inlinePrescriptions.length).toBe(0)
    })
  })

  // -----------------------------------------------------------------------
  // Save / emit
  // -----------------------------------------------------------------------
  describe('save actions', () => {
    it('emits save with correct formData on handleSaveDraft', async () => {
      mockFetchAvailablePrescriptions.mockResolvedValue([])

      const wrapper = mount(OrdonnanceLibreForm, {
        props: defaultProps,
        global: { stubs },
      })

      await nextTick()
      await waitForData()
      await nextTick()

      const saveBtn = wrapper.findAll('button.el-button').find(b => b.text().trim() === 'Enregistrer Brouillon')
      expect(saveBtn).toBeTruthy()
      await saveBtn!.trigger('click')
      await waitForData()
      await nextTick()

      expect(wrapper.emitted('save')).toBeTruthy()
      expect(wrapper.emitted('save')![0]).toEqual([
        expect.objectContaining({
          linkedPrescriptionIds: [],
          inlinePrescriptions: [],
          title: 'Ordonnance Libre',
        }),
      ])
    })
  })

  // -----------------------------------------------------------------------
  // Readonly mode
  // -----------------------------------------------------------------------
  describe('readonly mode', () => {
    it('does not show form when readonly', async () => {
      mockFetchAvailablePrescriptions.mockResolvedValue([
        makeAvailablePrescription(),
      ])

      const wrapper = mount(OrdonnanceLibreForm, {
        props: { ...defaultProps, readonly: true },
        global: { stubs },
      })

      await nextTick()
      await waitForData()
      await nextTick()

      expect(wrapper.find('.ordonnance-libre-form__inline-form').exists()).toBe(false)
      expect(wrapper.find('.ordonnance-libre-form__footer').exists()).toBe(false)
      expect(wrapper.find('.el-alert').exists()).toBe(true)
      expect(wrapper.text()).toContain('Ce document est verrouillé en lecture seule.')
    })
  })

  // -----------------------------------------------------------------------
  // Preview section
  // -----------------------------------------------------------------------
  describe('preview section', () => {
    it('shows empty preview when no prescriptions', async () => {
      mockFetchAvailablePrescriptions.mockResolvedValue([])

      const wrapper = mount(OrdonnanceLibreForm, {
        props: defaultProps,
        global: { stubs },
      })

      await nextTick()
      await waitForData()
      await nextTick()

      expect(wrapper.find('.ordonnance-libre-form__preview-empty').exists()).toBe(true)
      expect(wrapper.text()).toContain('Aucune prescription sélectionnée ou ajoutée')
    })
  })

  // -----------------------------------------------------------------------
  // Sign / re-sign
  // -----------------------------------------------------------------------
  describe('sign / re-sign', () => {
    it('shows "Signer" label and confirms before signing a draft document', async () => {
      mockFetchAvailablePrescriptions.mockResolvedValue([])
      const wrapper = mount(OrdonnanceLibreForm, {
        props: defaultProps,
        global: { stubs },
      })

      await nextTick()
      await waitForData()
      await nextTick()

      const signBtn = wrapper.findAll('button.el-button').find(b => b.text().includes('Signer'))
      expect(signBtn).toBeDefined()
      await signBtn!.trigger('click')
      await waitForSign()
      await nextTick()

      expect(mockElMessageBox.confirm).toHaveBeenCalledWith(
        'Êtes-vous sûr de vouloir signer et verrouiller ce document ? Cette action est irréversible.',
        'Confirmation de signature',
        expect.objectContaining({ type: 'warning', confirmButtonText: 'Signer' }),
      )
      expect(wrapper.emitted('save')).toBeDefined()
      expect(wrapper.emitted('sign')).toBeDefined()
    })

    it('shows "Resigner" label and warns the old signature will be overwritten for a signed document', async () => {
      mockFetchAvailablePrescriptions.mockResolvedValue([])
      const wrapper = mount(OrdonnanceLibreForm, {
        props: {
          ...defaultProps,
          document: { ...defaultProps.document, status: 'signed' },
        },
        global: { stubs },
      })

      await nextTick()
      await waitForData()
      await nextTick()

      const signBtn = wrapper.findAll('button.el-button').find(b => b.text().includes('Resigner'))
      expect(signBtn).toBeDefined()
      await signBtn!.trigger('click')
      await waitForSign()
      await nextTick()

      expect(mockElMessageBox.confirm).toHaveBeenCalledWith(
        'Resigner ce document ? L\'ancienne signature sera écrasée.',
        'Re-signature',
        expect.objectContaining({ type: 'warning', confirmButtonText: 'Resigner' }),
      )
      expect(wrapper.emitted('sign')).toBeDefined()
    })

    it('does not emit sign when confirmation is cancelled', async () => {
      mockFetchAvailablePrescriptions.mockResolvedValue([])
      mockElMessageBox.confirm.mockRejectedValueOnce(new Error('cancel'))
      const wrapper = mount(OrdonnanceLibreForm, {
        props: {
          ...defaultProps,
          document: { ...defaultProps.document, status: 'signed' },
        },
        global: { stubs },
      })

      await nextTick()
      await waitForData()
      await nextTick()

      const signBtn = wrapper.findAll('button.el-button').find(b => b.text().includes('Resigner'))
      await signBtn!.trigger('click')
      await waitForSign()
      await nextTick()

      expect(wrapper.emitted('sign')).toBeUndefined()
    })
  })
})
