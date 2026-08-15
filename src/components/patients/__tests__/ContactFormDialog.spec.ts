// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

// ─── Mock Electron IPC ─────────────────────────────────────────────────────

const mockIpcInvoke = vi.hoisted(() => vi.fn())
const mockCreateEncounter = vi.hoisted(() => vi.fn())
const mockUpdateEncounter = vi.hoisted(() => vi.fn())

vi.mock('@/utils/ipc', () => ({
  ipcInvoke: mockIpcInvoke,
}))

// ─── Mock Element Plus ─────────────────────────────────────────────────────

vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), warning: vi.fn(), error: vi.fn() },
  ElMessageBox: { confirm: vi.fn() },
}))

// ─── Mock Element Plus Icons ───────────────────────────────────────────────

vi.mock('@element-plus/icons-vue', () => ({
  Search: { name: 'Search', render: () => null },
}))

// ─── Mock composables ──────────────────────────────────────────────────────

vi.mock('@/composables/useContactFormLogic', async () => {
  const { ref, computed } = await import('vue')

  function createFormState() {
    return {
      contact_type: '',
      contact_type_precision: '',
      start_date: '2026-08-02 10:00',
      end_date: '',
      service_id: null,
      service_name: '',
      medecin_id: null,
      medecin_name: '',
      responsable_id: null,
      responsable_name: '',
      origin: '',
      origin_precision: '',
      zone_situation: '',
      zone_precision: '',
      prise_en_charge: '',
      prise_en_charge_precision: '',
      sinistre_info: '',
      notes: '',
      assurance_id: null,
      care_unit_id: null,
    }
  }

  const mockForm = ref(createFormState())

  return {
    CONTACT_TYPE_OPTIONS: [
      { value: 'consultation', label: 'Consultation' },
      { value: 'hospitalisation', label: 'Hospitalisation' },
    ],
    PRISE_EN_CHARGE_OPTIONS: [
      { value: 'individuel', label: 'Individuel' },
      { value: 'assurance', label: 'Assurance' },
    ],
    originOptions: ref([]),
    insuranceOptions: ref([]),
    fetchOriginOptions: vi.fn().mockResolvedValue([]),
    fetchInsuranceOptions: vi.fn().mockResolvedValue([]),
    useContactFormLogic: () => ({
      form: mockForm,
      endDateFormatted: computed(() => ''),
      showOriginPrecision: computed(() => false),
      showAssuranceField: computed(() => false),
      patchForm: vi.fn((data: Record<string, unknown>) => Object.assign(mockForm.value, data)),
      resetForm: vi.fn(() => {
        mockForm.value = createFormState()
      }),
    }),
    __resetFormState: () => {
      mockForm.value = createFormState()
    },
  }
})

vi.mock('@/composables/useEncounters', () => ({
  useEncounters: () => ({
    createEncounter: mockCreateEncounter,
    updateEncounter: mockUpdateEncounter,
  }),
}))

vi.mock('@/composables/useMedicalStaff', () => ({
  useMedicalStaff: () => ({
    fetchMedicalStaff: vi.fn().mockResolvedValue([]),
    searchMedicalStaff: vi.fn(() => []),
  }),
  formatMedecinName: (user: { nom?: string; prenom?: string }) =>
    [user.nom ?? '', user.prenom ?? ''].filter(Boolean).join(' '),
}))

vi.mock('@/composables/useUsers', () => ({
  roleLabel: (role: string) => role,
}))

// ─── Stubs for all Element Plus components ─────────────────────────────────

const ElDialogStub = {
  name: 'ElDialog',
  template: `
    <div class="el-dialog" v-if="modelValue">
      <div class="el-dialog__body"><slot /></div>
      <div class="el-dialog__footer"><slot name="footer" /></div>
    </div>
  `,
  props: ['modelValue', 'title', 'width', 'top', 'closeOnClickModal'],
  emits: ['update:modelValue', 'closed'],
}

const ElFormStub = {
  name: 'ElForm',
  template: '<form class="el-form"><slot /></form>',
  props: ['model', 'rules', 'labelWidth', 'labelPosition'],
  methods: {
    resetFields: () => {},
    validate: () => Promise.resolve(true),
  },
}

const ElFormItemStub = {
  name: 'ElFormItem',
  template: '<div class="el-form-item"><label class="el-form-item__label">{{ label }}</label><slot /></div>',
  props: ['label', 'prop', 'required'],
}

const ElSelectStub = {
  name: 'ElSelect',
  template: '<div class="el-select" :disabled="disabled"><slot /></div>',
  props: ['modelValue', 'placeholder', 'disabled', 'filterable', 'clearable', 'style'],
  emits: ['update:modelValue'],
}

const ElOptionStub = {
  name: 'ElOption',
  template: '<div class="el-option"><slot>{{ label }}</slot></div>',
  props: ['label', 'value', 'disabled'],
}

const ElAutocompleteStub = {
  name: 'ElAutocomplete',
  template: '<div class="el-autocomplete"><slot name="prefix" /><slot name="default" :item="{}" /></div>',
  props: ['modelValue', 'fetchSuggestions', 'triggerOnFocus', 'placeholder', 'clearable', 'disabled'],
  emits: ['select', 'clear', 'update:modelValue'],
}

const ElInputStub = {
  name: 'ElInput',
  template: '<input class="el-input" :value="modelValue" :disabled="disabled" />',
  props: ['modelValue', 'placeholder', 'disabled', 'type', 'rows'],
  emits: ['update:modelValue'],
}

const ElDatePickerStub = {
  name: 'ElDatePicker',
  template: '<input class="el-date-picker" :value="modelValue" :disabled="disabled" />',
  props: ['modelValue', 'type', 'format', 'valueFormat', 'placeholder', 'style', 'disabled'],
  emits: ['update:modelValue'],
}

const ElTooltipStub = {
  name: 'ElTooltip',
  template: '<span class="el-tooltip"><slot /></span>',
  props: ['content', 'placement', 'disabled'],
}

const ElButtonStub = {
  name: 'ElButton',
  template: '<button class="el-button" :disabled="disabled" @click="$emit(\'click\', $event)"><slot /></button>',
  props: ['disabled', 'type', 'size', 'loading'],
  emits: ['click'],
}

const ElTagStub = {
  name: 'ElTag',
  template: '<span class="el-tag"><slot /></span>',
  props: ['type', 'size'],
}

const ElIconStub = {
  name: 'ElIcon',
  template: '<span class="el-icon"><slot /></span>',
  props: ['size', 'color'],
}

const ElRowStub = {
  name: 'ElRow',
  template: '<div class="el-row"><slot /></div>',
  props: ['gutter'],
}

const ElColStub = {
  name: 'ElCol',
  template: '<div class="el-col"><slot /></div>',
  props: ['span'],
}

const EL_STUBS: Record<string, any> = {
  'el-dialog': ElDialogStub,
  'el-form': ElFormStub,
  'el-form-item': ElFormItemStub,
  'el-select': ElSelectStub,
  'el-option': ElOptionStub,
  'el-autocomplete': ElAutocompleteStub,
  'el-input': ElInputStub,
  'el-date-picker': ElDatePickerStub,
  'el-tooltip': ElTooltipStub,
  'el-button': ElButtonStub,
  'el-tag': ElTagStub,
  'el-icon': ElIconStub,
  'el-row': ElRowStub,
  'el-col': ElColStub,
}

import ContactFormDialog from '../ContactFormDialog.vue'

// ─── Test fixtures ─────────────────────────────────────────────────────────

const editEncounter = {
  id: 42,
  patient_id: 1,
  contact_type: 'consultation',
  start_date: '2026-08-02 10:00',
  service_id: 5,
  service_name: 'Cardiologie',
  origin: 'consultation',
  zone_situation: 'individuel',
  prise_en_charge: 'individuel',
  status: 'active',
}

describe('ContactFormDialog', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    mockIpcInvoke.mockReset()
    mockIpcInvoke.mockResolvedValue(0)
    mockCreateEncounter.mockReset()
    mockUpdateEncounter.mockReset()
    mockCreateEncounter.mockResolvedValue(null)
    mockUpdateEncounter.mockResolvedValue(null)
    const { __resetFormState } = await import('@/composables/useContactFormLogic')
    __resetFormState()
    document.body.innerHTML = ''
  })

  function createWrapper(encounter: unknown = null) {
    return mount(ContactFormDialog, {
      props: {
        patientId: 1,
        patientName: 'Test Patient',
        visible: true,
        encounter: encounter as never,
      },
      global: { stubs: EL_STUBS },
      attachTo: document.body,
    })
  }

  function typeSelect(wrapper: ReturnType<typeof createWrapper>) {
    return wrapper.findAllComponents(ElSelectStub)[0]
  }

  // ─── Mode création ───────────────────────────────────────────────────

  describe('mode création', () => {
    it('ne désactive pas le select « Type de contact »', async () => {
      const wrapper = createWrapper()
      await flushPromises()

      expect(typeSelect(wrapper).exists()).toBe(true)
      expect(typeSelect(wrapper).props('disabled')).toBe(false)
      expect(mockIpcInvoke).not.toHaveBeenCalledWith('clinical-documents:count', expect.anything())
    })
  })

  // ─── Mode édition ────────────────────────────────────────────────────

  describe('mode édition', () => {
    it('appelle le canal clinical-documents:count avec le bon contactId', async () => {
      mockIpcInvoke.mockResolvedValue(0)
      createWrapper(editEncounter)
      await flushPromises()

      expect(mockIpcInvoke).toHaveBeenCalledWith('clinical-documents:count', { contactId: '42' })
    })

    it('désactive le select « Type de contact » quand le contact a des documents', async () => {
      mockIpcInvoke.mockResolvedValue(1)
      const wrapper = createWrapper(editEncounter)
      await flushPromises()

      const select = typeSelect(wrapper)
      expect(select.props('disabled')).toBe(true)

      const tooltip = wrapper.findComponent(ElTooltipStub)
      expect(tooltip.props('content')).toContain('Type verrouillé')
      expect(tooltip.props('disabled')).toBe(false)
    })

    it('laisse le select modifiable quand le contact n\'a aucun document', async () => {
      mockIpcInvoke.mockResolvedValue(0)
      const wrapper = createWrapper(editEncounter)
      await flushPromises()

      expect(typeSelect(wrapper).props('disabled')).toBe(false)

      const tooltip = wrapper.findComponent(ElTooltipStub)
      expect(tooltip.props('disabled')).toBe(true)
    })

    it('laisse le select modifiable quand le comptage IPC échoue', async () => {
      mockIpcInvoke.mockRejectedValue(new Error('IPC failure'))
      const wrapper = createWrapper(editEncounter)
      await flushPromises()

      expect(typeSelect(wrapper).props('disabled')).toBe(false)
    })

    it('conserve le type verrouillé dans le payload du submit', async () => {
      mockIpcInvoke.mockResolvedValue(1)
      const wrapper = createWrapper(editEncounter)
      await flushPromises()

      expect(typeSelect(wrapper).props('disabled')).toBe(true)

      const saveButton = wrapper.findAllComponents(ElButtonStub).at(-1)!
      await saveButton.trigger('click')
      await flushPromises()

      expect(mockUpdateEncounter).toHaveBeenCalledTimes(1)
      const [id, payload] = mockUpdateEncounter.mock.calls[0] as [number, Record<string, unknown>]
      expect(id).toBe(42)
      expect(payload.contact_type).toBe('consultation')
    })
  })

  // ─── Fermeture du dialogue ───────────────────────────────────────────

  describe('fermeture du dialogue', () => {
    it('déverrouille le type de contact après fermeture', async () => {
      mockIpcInvoke.mockResolvedValue(1)
      const wrapper = createWrapper(editEncounter)
      await flushPromises()

      expect(typeSelect(wrapper).props('disabled')).toBe(true)

      const dialog = wrapper.findComponent(ElDialogStub)
      dialog.vm.$emit('closed')
      await flushPromises()

      expect(typeSelect(wrapper).props('disabled')).toBe(false)
    })
  })
})
