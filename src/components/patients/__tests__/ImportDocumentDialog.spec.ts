// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import type { ClinicalDocumentTypeDTO } from '@/composables/useClinicalDocuments'

// ─── Mock Element Plus ─────────────────────────────────────────────

vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), warning: vi.fn(), error: vi.fn() },
  ElMessageBox: { confirm: vi.fn() },
}))

// ─── Mock Element Plus Icons ────────────────────────────────────────

vi.mock('@element-plus/icons-vue', () => ({
  UploadFilled: { name: 'UploadFilled', template: '<span />' },
  Document: { name: 'Document', template: '<span />' },
  Delete: { name: 'Delete', template: '<span />' },
}))

// ─── Stubs for all Element Plus components ─────────────────────────

const EL_STUBS: Record<string, any> = {
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
  'el-select': {
    template: `
      <div class="el-select" :disabled="disabled">
        <slot />
      </div>
    `,
    props: ['modelValue', 'placeholder', 'disabled', 'filterable', 'style'],
    emits: ['update:modelValue'],
  },
  'el-option': {
    template: `
      <div class="el-option" :class="{ 'is-disabled': disabled }" @click="!disabled && $emit('click')">
        <slot>{{ label }}</slot>
      </div>
    `,
    props: ['key', 'label', 'value', 'disabled'],
    emits: ['click'],
  },
  'el-input': {
    template: '<input class="el-input" :value="modelValue" :disabled="disabled" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'placeholder', 'disabled', 'maxlength', 'showWordLimit'],
    emits: ['update:modelValue'],
  },
  'el-button': {
    template: `<button class="el-button" :disabled="disabled" :type="type" :loading="loading" @click="$emit('click', $event)"><slot /></button>`,
    props: ['disabled', 'type', 'size', 'text', 'loading', 'icon', 'circle'],
    emits: ['click'],
  },
  'el-icon': {
    template: '<span class="el-icon"><slot /></span>',
    props: ['size', 'color'],
  },
}

import ImportDocumentDialog from '../ImportDocumentDialog.vue'

// ─── Test fixtures ─────────────────────────────────────────────────

const CONSULT_TYPE_ID = '11111111-1111-4111-1111-111111111111'
const LAB_TYPE_ID = '22222222-2222-4222-2222-222222222222'

const documentTypes: ClinicalDocumentTypeDTO[] = [
  {
    id: CONSULT_TYPE_ID,
    code: 'CONSULTATION_NOTE',
    label: 'Compte rendu de consultation',
    description: 'Compte rendu détaillé',
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
]

describe('ImportDocumentDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock alert for file validation tests
    vi.spyOn(window, 'alert').mockImplementation(() => {})
  })

  function createWrapper({
    visible = true,
    types = documentTypes,
    disabled = false,
  } = {}) {
    return mount(ImportDocumentDialog, {
      props: {
        visible,
        documentTypes: types,
        disabled,
      },
      global: { stubs: EL_STUBS },
      attachTo: document.body,
    })
  }

  // ─── Rendering ────────────────────────────────────────────────────

  describe('rendering', () => {
    it('renders dialog title "Importer un document"', () => {
      const wrapper = createWrapper()
      expect(wrapper.text()).toContain('Importer un document')
    })

    it('renders document type selector dropdown', () => {
      const wrapper = createWrapper()
      const select = wrapper.find('.el-select')
      expect(select.exists()).toBe(true)
    })

    it('shows all document types in the dropdown', () => {
      const wrapper = createWrapper()
      const options = wrapper.findAll('.el-option')
      expect(options).toHaveLength(2)
      expect(options[0].text()).toContain('Compte rendu de consultation')
      expect(options[1].text()).toContain('Demande d\'examen de laboratoire')
    })

    it('shows disabled option when no document types available', () => {
      const wrapper = createWrapper({ types: [] })
      const options = wrapper.findAll('.el-option')
      expect(options).toHaveLength(1)
      expect(options[0].text()).toContain('Aucun type disponible')
    })

    it('renders dropzone with upload prompt text', () => {
      const wrapper = createWrapper()
      expect(wrapper.text()).toContain('Glissez un fichier ici ou cliquez pour sélectionner')
      expect(wrapper.text()).toContain('PDF, images')
    })


  })

  // ─── Disabled state ───────────────────────────────────────────────

  describe('disabled state', () => {
    it('disables interactions when disabled prop is true', () => {
      const wrapper = createWrapper({ disabled: true })
      const select = wrapper.find('.el-select')
      expect(select.attributes('disabled')).toBeDefined()

      const dropzone = wrapper.find('.import-dialog__dropzone')
      expect(dropzone.classes()).toContain('import-dialog__dropzone--disabled')
    })

    it('does not disable interactions when disabled prop is false', () => {
      const wrapper = createWrapper({ disabled: false })
      const dropzone = wrapper.find('.import-dialog__dropzone')
      expect(dropzone.classes()).not.toContain('import-dialog__dropzone--disabled')
    })

    it('disables the import button when disabled prop is true', () => {
      const wrapper = createWrapper({ disabled: true })
      const importBtn = wrapper.findAll('.el-button').find(b => b.text().includes('Importer'))
      expect(importBtn).toBeDefined()
      expect(importBtn!.attributes('disabled')).toBeDefined()
    })
  })

  // ─── Cancel action ────────────────────────────────────────────────

  describe('cancel', () => {
    it('emits update:visible with false when cancel is clicked', async () => {
      const wrapper = createWrapper()
      const cancelBtn = wrapper.findAll('.el-button').find(b => b.text().includes('Annuler'))
      expect(cancelBtn).toBeDefined()
      await cancelBtn!.trigger('click')

      expect(wrapper.emitted('update:visible')).toBeDefined()
      expect(wrapper.emitted('update:visible')![0]).toEqual([false])
    })
  })

  // ─── File selection ───────────────────────────────────────────────

  describe('file selection', () => {
    it('shows file info after file selection via drop', async () => {
      const wrapper = createWrapper()
      const dropzone = wrapper.find('.import-dialog__dropzone')

      const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' })
      const dataTransfer = { files: [file] }

      await dropzone.trigger('drop', { dataTransfer })

      expect(wrapper.text()).toContain('test.pdf')
      expect(wrapper.text()).toContain('PDF')
    })

    it('validates file type and rejects invalid files', async () => {
      const wrapper = createWrapper()
      const dropzone = wrapper.find('.import-dialog__dropzone')

      const file = new File(['test'], 'test.exe', { type: 'application/x-executable' })
      const dataTransfer = { files: [file] }

      await dropzone.trigger('drop', { dataTransfer })

      expect(window.alert).toHaveBeenCalled()
      expect(wrapper.text()).not.toContain('test.exe')
    })


  })

  // ─── Import button state ──────────────────────────────────────────

  describe('import button state', () => {
    it('shows import button disabled when no file or no type selected', () => {
      const wrapper = createWrapper()
      const importBtn = wrapper.findAll('.el-button').find(b => b.text().includes('Importer'))
      expect(importBtn).toBeDefined()
      expect(importBtn!.attributes('disabled')).toBeDefined()
    })

    it('enables import button when both file and type are selected', async () => {
      const wrapper = createWrapper()

      // Simulate selecting a type via the select component
      const select = wrapper.findComponent('.el-select')
      // We need to set the v-model value on the component
      // Since our stub doesn't fully wire v-model, set it via the VM
      const vm = wrapper.vm as any
      vm.selectedTypeId = CONSULT_TYPE_ID

      // Simulate file drop
      const dropzone = wrapper.find('.import-dialog__dropzone')
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      const dataTransfer = { files: [file] }
      await dropzone.trigger('drop', { dataTransfer })

      await wrapper.vm.$nextTick()

      const importBtn = wrapper.findAll('.el-button').find(b => b.text().includes('Importer'))
      expect(importBtn!.attributes('disabled')).toBeUndefined()
    })

    it('shows import button disabled when only file is selected (no type)', async () => {
      const wrapper = createWrapper()

      // Simulate file drop without selecting a type
      const dropzone = wrapper.find('.import-dialog__dropzone')
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      const dataTransfer = { files: [file] }
      await dropzone.trigger('drop', { dataTransfer })

      await wrapper.vm.$nextTick()

      const importBtn = wrapper.findAll('.el-button').find(b => b.text().includes('Importer'))
      expect(importBtn!.attributes('disabled')).toBeDefined()
    })
  })

  // ─── Import action ────────────────────────────────────────────────

  describe('import', () => {
    it('emits import event with file, documentTypeId, and title', async () => {
      const wrapper = createWrapper()

      // Set type
      const vm = wrapper.vm as any
      vm.selectedTypeId = CONSULT_TYPE_ID

      // Set file
      const dropzone = wrapper.find('.import-dialog__dropzone')
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      const dataTransfer = { files: [file] }
      await dropzone.trigger('drop', { dataTransfer })

      await wrapper.vm.$nextTick()

      // Click import button
      const importBtn = wrapper.findAll('.el-button').find(b => b.text().includes('Importer'))
      await importBtn!.trigger('click')

      expect(wrapper.emitted('import')).toBeDefined()
      const emitted = wrapper.emitted('import')![0][0] as any
      expect(emitted.file).toBe(file)
      expect(emitted.documentTypeId).toBe(CONSULT_TYPE_ID)
      expect(emitted.title).toBe('Compte rendu de consultation')
    })

    it('uses selected type label as title', async () => {
      const wrapper = createWrapper()

      const vm = wrapper.vm as any
      vm.selectedTypeId = LAB_TYPE_ID

      const dropzone = wrapper.find('.import-dialog__dropzone')
      const file = new File(['content'], 'resultats.pdf', { type: 'application/pdf' })
      const dataTransfer = { files: [file] }
      await dropzone.trigger('drop', { dataTransfer })

      await wrapper.vm.$nextTick()

      const importBtn = wrapper.findAll('.el-button').find(b => b.text().includes('Importer'))
      await importBtn!.trigger('click')

      const emitted = wrapper.emitted('import')![0][0] as any
      expect(emitted.title).toBe('Demande d\'examen de laboratoire')
    })



    it('emits update:visible with false after import', async () => {
      const wrapper = createWrapper()

      const vm = wrapper.vm as any
      vm.selectedTypeId = CONSULT_TYPE_ID

      const dropzone = wrapper.find('.import-dialog__dropzone')
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      const dataTransfer = { files: [file] }
      await dropzone.trigger('drop', { dataTransfer })

      await wrapper.vm.$nextTick()

      const importBtn = wrapper.findAll('.el-button').find(b => b.text().includes('Importer'))
      await importBtn!.trigger('click')

      expect(wrapper.emitted('update:visible')).toBeDefined()
      const visibleEvents = wrapper.emitted('update:visible')!
      expect(visibleEvents.some(e => e[0] === false)).toBe(true)
    })

    it('does not emit import when no file is selected', async () => {
      const wrapper = createWrapper()

      const vm = wrapper.vm as any
      vm.selectedTypeId = CONSULT_TYPE_ID

      const importBtn = wrapper.findAll('.el-button').find(b => b.text().includes('Importer'))
      await importBtn!.trigger('click')

      expect(wrapper.emitted('import')).toBeUndefined()
    })

    it('does not emit import when no type is selected', async () => {
      const wrapper = createWrapper()

      const dropzone = wrapper.find('.import-dialog__dropzone')
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      const dataTransfer = { files: [file] }
      await dropzone.trigger('drop', { dataTransfer })

      await wrapper.vm.$nextTick()

      const importBtn = wrapper.findAll('.el-button').find(b => b.text().includes('Importer'))
      await importBtn!.trigger('click')

      expect(wrapper.emitted('import')).toBeUndefined()
    })
  })

  // ─── State reset on close ─────────────────────────────────────────

  describe('state reset', () => {
    it('resets state when dialog reopens via visible prop', async () => {
      // Start with dialog closed
      const wrapper = createWrapper({ visible: false })

      const vm = wrapper.vm as any

      // Open the dialog first to set some state
      await wrapper.setProps({ visible: true })
      await wrapper.vm.$nextTick()

      // Manually set state as if a previous interaction occurred
      vm.selectedTypeId = CONSULT_TYPE_ID

      // Close the dialog
      await wrapper.setProps({ visible: false })
      await wrapper.vm.$nextTick()

      // Reopen the dialog — the watch on visible should reset state
      await wrapper.setProps({ visible: true })
      await wrapper.vm.$nextTick()

      expect(vm.selectedTypeId).toBe('')
      expect(vm.selectedFile).toBeNull()
    })
  })

  // ─── File remove ──────────────────────────────────────────────────

  describe('file remove', () => {
    it('removes selected file and clears preview when remove button is clicked', async () => {
      const wrapper = createWrapper()

      // Select a file first
      const dropzone = wrapper.find('.import-dialog__dropzone')
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      const dataTransfer = { files: [file] }
      await dropzone.trigger('drop', { dataTransfer })

      await wrapper.vm.$nextTick()

      // Verify file info is shown
      expect(wrapper.text()).toContain('test.pdf')

      // Click remove button
      const removeBtn = wrapper.find('.import-dialog__file-remove')
      await removeBtn.trigger('click')

      await wrapper.vm.$nextTick()

      // Verify file info is gone and upload prompt is back
      expect(wrapper.text()).not.toContain('test.pdf')
      expect(wrapper.text()).toContain('Glissez un fichier ici ou cliquez pour sélectionner')
    })
  })
})
