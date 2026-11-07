/**
 * Minimal Element Plus stubs for the comptabilité dialog specs.
 *
 * They intentionally keep the real template structure (`el-dialog` default +
 * footer slots, `el-form` expose `validate`) so the `v-if` / `v-else-if`
 * guards in the dialogs decide whether an input exists in the rendered tree.
 * Nothing here simulates a form: a missing `.el-input-number` means the
 * production guard rendered nothing.
 */
export const elementPlusStubs = {
  'el-dialog': {
    name: 'ElDialog',
    props: ['modelValue', 'title', 'width', 'class'],
    emits: ['update:modelValue', 'closed'],
    template: `<div v-if="modelValue" class="el-dialog">
      <div class="el-dialog__title">{{ title }}</div>
      <div class="el-dialog__body"><slot /></div>
      <div class="el-dialog__footer"><slot name="footer" /></div>
    </div>`,
  },
  'el-form': {
    name: 'ElForm',
    props: ['model', 'rules', 'labelWidth', 'labelPosition'],
    methods: {
      validate() {
        return Promise.resolve(true)
      },
    },
    template: '<form class="el-form" @submit.prevent><slot /></form>',
  },
  'el-form-item': {
    name: 'ElFormItem',
    props: ['label', 'required', 'prop', 'error'],
    template: `<div class="el-form-item">
      <label class="el-form-item__label">{{ label }}</label>
      <slot />
      <div v-if="error" class="el-form-item__error">{{ error }}</div>
    </div>`,
  },
  'el-input-number': {
    name: 'ElInputNumber',
    props: ['modelValue', 'min', 'max', 'step', 'precision', 'controlsPosition'],
    emits: ['update:modelValue'],
    template: `<input
      class="el-input-number"
      type="number"
      :value="modelValue"
      :min="min"
      :max="max"
      @input="$emit('update:modelValue', Number($event.target.value))"
    />`,
  },
  'el-input': {
    name: 'ElInput',
    props: ['modelValue', 'placeholder', 'maxlength', 'type', 'rows', 'showWordLimit'],
    emits: ['update:modelValue'],
    template: `<input
      class="el-input"
      :value="modelValue"
      :placeholder="placeholder"
      @input="$emit('update:modelValue', $event.target.value)"
    />`,
  },
  'el-select': {
    name: 'ElSelect',
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template: '<select class="el-select"><slot /></select>',
  },
  'el-option': {
    name: 'ElOption',
    props: ['label', 'value'],
    template: '<option :value="value">{{ label }}</option>',
  },
  'el-date-picker': {
    name: 'ElDatePicker',
    props: ['modelValue', 'type', 'valueFormat', 'clearable'],
    emits: ['update:modelValue'],
    template: '<input class="el-date-picker" :value="modelValue" />',
  },
  'el-alert': {
    name: 'ElAlert',
    props: ['title', 'type', 'closable', 'showIcon'],
    template: `<div class="el-alert" :data-type="type">
      <span class="el-alert__title"><slot name="title">{{ title }}</slot></span>
      <slot />
    </div>`,
  },
  'el-button': {
    name: 'ElButton',
    props: ['type', 'text', 'size', 'icon', 'loading', 'disabled', 'title'],
    emits: ['click'],
    template: `<button
      class="el-button"
      :disabled="disabled"
      @click="$emit('click', $event)"
    ><slot /></button>`,
  },
  'el-row': {
    name: 'ElRow',
    template: '<div class="el-row"><slot /></div>',
  },
  'el-col': {
    name: 'ElCol',
    props: ['span', 'xs', 'sm'],
    template: '<div class="el-col"><slot /></div>',
  },
}
