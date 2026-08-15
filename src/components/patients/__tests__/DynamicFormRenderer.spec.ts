// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import type { FormFieldSchema } from '@/composables/useClinicalDocuments'

// ─── Stubs for all Element Plus components used by DynamicFormRenderer ──────

const EL_STUBS: Record<string, any> = {
  'el-form': {
    template: '<form class="el-form" :disabled="disabled"><slot /></form>',
    props: ['model', 'disabled', 'labelPosition'],
    methods: { validate: vi.fn(), clearValidate: vi.fn() },
  },
  'el-form-item': {
    template: '<div class="el-form-item" :required="required"><label>{{ label }}</label><slot /></div>',
    props: ['label', 'required', 'prop', 'rules'],
  },
  'el-row': { template: '<div class="el-row"><slot /></div>', props: ['gutter'] },
  'el-col': { template: '<div class="el-col" :class="`el-col-${span}`"><slot /></div>', props: ['span', 'xs'] },
  'el-input': {
    template: '<input class="el-input" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'placeholder', 'clearable', 'type', 'rows'],
    emits: ['update:modelValue'],
  },
  'el-input-number': {
    template: '<input class="el-input-number" :value="modelValue" @input="$emit(\'update:modelValue\', Number($event.target.value))" />',
    props: ['modelValue', 'placeholder', 'min', 'max', 'controlsPosition'],
    emits: ['update:modelValue'],
  },
  'el-date-picker': {
    template: '<input class="el-date-picker" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'type', 'valueFormat', 'placeholder', 'clearable', 'style'],
    emits: ['update:modelValue'],
  },
  'el-select': {
    template: '<div class="el-select"><slot /></div>',
    props: ['modelValue', 'placeholder', 'clearable', 'style'],
    emits: ['update:modelValue'],
  },
  'el-option': {
    template: '<div class="el-option" :data-value="value">{{ label }}</div>',
    props: ['label', 'value'],
  },
  'el-radio-group': {
    template: '<div class="el-radio-group"><slot /></div>',
    props: ['modelValue'],
    emits: ['update:modelValue'],
  },
  'el-radio': {
    template: '<label class="el-radio"><input type="radio" :value="value" />{{ label }}</label>',
    props: ['value', 'label'],
  },
  'el-checkbox-group': {
    template: '<div class="el-checkbox-group"><slot /></div>',
    props: ['modelValue'],
    emits: ['update:modelValue'],
  },
  'el-checkbox': {
    template: '<label class="el-checkbox"><input type="checkbox" :value="value" /><slot /></label>',
    props: ['label', 'value'],
  },
  'el-autocomplete': {
    template: '<input class="el-autocomplete" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'fetchSuggestions', 'placeholder', 'clearable', 'style'],
    emits: ['update:modelValue'],
  },
}

vi.mock('element-plus', () => ({
  ElForm: {
    template: '<form class="el-form" :disabled="disabled"><slot /></form>',
    props: ['model', 'disabled', 'labelPosition'],
    methods: {
      validate(cb: any) { if (cb) cb(true); return Promise.resolve(true) },
      clearValidate() {},
    },
  },
}))

import DynamicFormRenderer from '../DynamicFormRenderer.vue'

describe('DynamicFormRenderer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function createWrapper(schema: FormFieldSchema[], modelValue: Record<string, any> = {}, disabled = false) {
    return mount(DynamicFormRenderer, {
      props: {
        schema,
        modelValue,
        disabled,
      },
      global: {
        stubs: EL_STUBS,
      },
      attachTo: document.body,
    })
  }

  // ─── Renders text field ──────────────────────────────────────────

  describe('text field', () => {
    it('renders a text input for a text type field', () => {
      const schema: FormFieldSchema[] = [
        { key: 'patient_name', type: 'text', label: 'Nom du patient', required: true, placeholder: 'Entrez le nom' },
      ]
      const wrapper = createWrapper(schema, { patient_name: 'Diallo' })

      const input = wrapper.find('.el-input')
      expect(input.exists()).toBe(true)
      expect(wrapper.text()).toContain('Nom du patient')
    })

    it('renders a textarea when type is textarea', () => {
      const schema: FormFieldSchema[] = [
        { key: 'notes', type: 'textarea', label: 'Notes', placeholder: 'Entrez vos notes' },
      ]
      const wrapper = createWrapper(schema)

      const textarea = wrapper.find('.el-input')
      expect(textarea.exists()).toBe(true)
      expect(wrapper.text()).toContain('Notes')
    })
  })

  // ─── Renders select with options ─────────────────────────────────

  describe('select field', () => {
    it('renders a select with the given options', () => {
      const schema: FormFieldSchema[] = [
        {
          key: 'exam_type',
          type: 'select',
          label: "Type d'examen",
          required: true,
          options: [
            { label: 'Bilan glycémique', value: 'glycemic' },
            { label: 'Bilan lipidique', value: 'lipid' },
            { label: 'HbA1c', value: 'hba1c' },
          ],
        },
      ]
      const wrapper = createWrapper(schema)

      expect(wrapper.find('.el-select').exists()).toBe(true)
      // Options should be rendered inside the select
      const options = wrapper.findAll('.el-option')
      expect(options).toHaveLength(3)
      expect(options[0].text()).toContain('Bilan glycémique')
      expect(options[2].text()).toContain('HbA1c')
    })
  })

  // ─── Renders date picker ─────────────────────────────────────────

  describe('date picker', () => {
    it('renders a date picker for a date type field', () => {
      const schema: FormFieldSchema[] = [
        { key: 'delivery_date', type: 'date', label: 'Date de remise', required: true },
      ]
      const wrapper = createWrapper(schema)

      const datePicker = wrapper.find('.el-date-picker')
      expect(datePicker.exists()).toBe(true)
      expect(wrapper.text()).toContain('Date de remise')
    })
  })

  // ─── Renders radio group ─────────────────────────────────────────

  describe('radio group', () => {
    it('renders radio buttons for a radio type field', () => {
      const schema: FormFieldSchema[] = [
        {
          key: 'priority',
          type: 'radio',
          label: 'Priorité',
          options: [
            { label: 'Normale', value: 'normal' },
            { label: 'Urgente', value: 'urgent' },
          ],
        },
      ]
      const wrapper = createWrapper(schema)

      const radios = wrapper.findAll('.el-radio')
      expect(radios).toHaveLength(2)
      expect(radios[0].text()).toContain('Normale')
    })
  })

  // ─── Renders checkbox group ──────────────────────────────────────

  describe('checkbox group', () => {
    it('renders checkboxes for a checkbox type field', () => {
      const schema: FormFieldSchema[] = [
        {
          key: 'symptoms',
          type: 'checkbox',
          label: 'Symptômes',
          options: [
            { label: 'Fièvre', value: 'fever' },
            { label: 'Toux', value: 'cough' },
          ],
        },
      ]
      const wrapper = createWrapper(schema, { symptoms: ['fever'] })

      const checkboxes = wrapper.findAll('.el-checkbox')
      expect(checkboxes).toHaveLength(2)
      expect(checkboxes[0].text()).toContain('Fièvre')
    })
  })

  // ─── Applies validation rules ────────────────────────────────────

  describe('validation rules', () => {
    it('creates a required rule for required fields', async () => {
      const schema: FormFieldSchema[] = [
        { key: 'diagnosis', type: 'text', label: 'Diagnostic', required: true },
      ]
      const wrapper = createWrapper(schema)

      const formItem = wrapper.find('.el-form-item')
      expect(formItem.exists()).toBe(true)
      // The required prop should be forwarded
      expect(formItem.attributes('required')).toBeDefined()
    })

    it('applies email validator rule', () => {
      const schema: FormFieldSchema[] = [
        {
          key: 'email',
          type: 'text',
          label: 'Email',
          validators: [{ type: 'email' }],
        },
      ]
      // Should not throw; the rule is built internally
      expect(() => createWrapper(schema)).not.toThrow()
    })

    it('applies minLength and maxLength validators', () => {
      const schema: FormFieldSchema[] = [
        {
          key: 'code',
          type: 'text',
          label: 'Code',
          validators: [
            { type: 'minLength', params: 3 },
            { type: 'maxLength', params: 10 },
          ],
        },
      ]
      expect(() => createWrapper(schema)).not.toThrow()
    })

    it('applies pattern validator', () => {
      const schema: FormFieldSchema[] = [
        {
          key: 'phone',
          type: 'text',
          label: 'Téléphone',
          validators: [{ type: 'pattern', params: '^\\+?[0-9]{8,15}$' }],
        },
      ]
      expect(() => createWrapper(schema)).not.toThrow()
    })
  })

  // ─── Handles conditional visibility ──────────────────────────────

  describe('conditional visibility', () => {
    it('shows a conditional field when its condition is met', async () => {
      const schema: FormFieldSchema[] = [
        { key: 'has_allergy', type: 'radio', label: 'Allergie ?', options: [{ label: 'Oui', value: 'yes' }, { label: 'Non', value: 'no' }] },
        {
          key: 'allergy_details',
          type: 'textarea',
          label: 'Détails allergie',
          conditional: { field: 'has_allergy', value: 'yes' },
        },
      ]
      const wrapper = createWrapper(schema, { has_allergy: 'yes' })

      const formItems = wrapper.findAll('.el-form-item')
      // Both items should be visible
      expect(formItems.length).toBeGreaterThanOrEqual(2)
    })

    it('hides a conditional field when its condition is not met', async () => {
      const schema: FormFieldSchema[] = [
        { key: 'has_allergy', type: 'radio', label: 'Allergie ?', options: [{ label: 'Oui', value: 'yes' }, { label: 'Non', value: 'no' }] },
        {
          key: 'allergy_details',
          type: 'textarea',
          label: 'Détails allergie',
          conditional: { field: 'has_allergy', value: 'yes' },
        },
      ]
      const wrapper = createWrapper(schema, { has_allergy: 'no' })

      // Second field should not be visible (conditional hides it)
      const fields = wrapper.findAll('.el-form-item')
      // The conditional field is filtered out in visibleSchema computed
      // We expect only 1 form item rendered (the has_allergy one)
      expect(fields).toHaveLength(1)
    })

    it('shows a conditional field when condition value changes', async () => {
      const schema: FormFieldSchema[] = [
        { key: 'has_allergy', type: 'radio', label: 'Allergie ?', options: [{ label: 'Oui', value: 'yes' }, { label: 'Non', value: 'no' }] },
        {
          key: 'allergy_details',
          type: 'textarea',
          label: 'Détails allergie',
          conditional: { field: 'has_allergy', value: 'yes' },
        },
      ]
      const wrapper = createWrapper(schema, { has_allergy: 'no' })

      expect(wrapper.findAll('.el-form-item')).toHaveLength(1)

      // Update modelValue to trigger condition
      await wrapper.setProps({ modelValue: { has_allergy: 'yes' } })

      // Now both items should show
      const itemsAfter = wrapper.findAll('.el-form-item')
      expect(itemsAfter.length).toBeGreaterThanOrEqual(2)
    })
  })

  // ─── Disabled state ──────────────────────────────────────────────

  describe('disabled state', () => {
    it('disables the form when disabled prop is true', () => {
      const schema: FormFieldSchema[] = [
        { key: 'name', type: 'text', label: 'Nom' },
      ]
      const wrapper = createWrapper(schema, { name: 'Test' }, true)

      const form = wrapper.find('.el-form')
      expect(form.attributes('disabled')).toBeDefined()
    })
  })

  // ─── Help text ───────────────────────────────────────────────────

  describe('help text', () => {
    it('renders helpText below the input when provided', () => {
      const schema: FormFieldSchema[] = [
        { key: 'treatment', type: 'text', label: 'Traitement', helpText: 'Indiquez le dosage et la fréquence' },
      ]
      const wrapper = createWrapper(schema)

      expect(wrapper.text()).toContain('Indiquez le dosage et la fréquence')
    })
  })
})
