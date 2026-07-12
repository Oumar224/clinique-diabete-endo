// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, nextTick } from 'vue'

// ---------------------------------------------------------------------------
// Mock IPC & Element Plus
// ---------------------------------------------------------------------------
const { mockInvoke, mockElMessage, mockElMessageBox } = vi.hoisted(() => {
  const msg: any = (_opts: any) => {}
  msg.success = vi.fn()
  msg.error = vi.fn()
  return {
    mockInvoke: vi.fn(),
    mockElMessage: msg,
    mockElMessageBox: { confirm: vi.fn(() => Promise.resolve()) },
  }
})

vi.stubGlobal('electronAPI', { invoke: mockInvoke })

vi.mock('element-plus', () => ({
  ElMessage: mockElMessage,
  ElMessageBox: mockElMessageBox,
}))

// ---------------------------------------------------------------------------
// Mock composables
// ---------------------------------------------------------------------------
const mockCreateUnit = vi.fn()
const mockUpdateUnit = vi.fn()

// Shared mutable services ref so the dialog can read it
const servicesRef = ref<Array<{ id: number; name: string; duration: number; sort_order: number; is_active: boolean; category: string }>>([])

vi.mock('@/composables/useCareUnits', () => ({
  useCareUnits: () => ({
    createUnit: mockCreateUnit,
    updateUnit: mockUpdateUnit,
  }),
}))

vi.mock('@/composables/useMedicalServices', () => ({
  useMedicalServices: () => ({
    services: servicesRef,
  }),
}))

// ---------------------------------------------------------------------------
// Stubs — Element Plus components
// ---------------------------------------------------------------------------
const EL_STUBS: Record<string, any> = {
  'el-dialog': {
    template: '<div class="el-dialog" v-if="modelValue || visible"><slot /><slot name="footer" /></div>',
    props: ['modelValue', 'visible'],
    emits: ['update:modelValue', 'closed'],
  },
  'el-form': { template: '<form class="el-form"><slot /></form>', props: ['model', 'rules'] },
  'el-form-item': { template: '<div class="el-form-item"><slot /></div>', props: ['label', 'prop'] },
  'el-input': {
    template: '<input class="el-input" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'placeholder', 'maxlength'], emits: ['update:modelValue'],
  },
  'el-button': {
    template: '<button class="el-button" :disabled="loading" @click="$emit(\'click\')"><slot /></button>',
    props: ['loading', 'type'], emits: ['click'],
  },
  'el-select': {
    template: `
      <select class="el-select" :value="modelValue" @change="$emit('update:modelValue', Number($event.target.value))">
        <option value="">Sélectionnez</option>
        <option v-for="item in data || []" :key="item.id" :value="item.id">
          {{ item.name || item.label }}
        </option>
      </select>
    `,
    props: ['modelValue', 'data', 'placeholder', 'filterable', 'multiple'],
    emits: ['update:modelValue'],
  },
  'el-option': { template: '<option class="el-option" :value="value" />', props: ['value', 'label'] },
}

// ---------------------------------------------------------------------------
// Lazy import
// ---------------------------------------------------------------------------
async function createWrapper() {
  const comp = (await import('@/components/settings/CareUnitFormDialog.vue')).default
  return mount(comp, {
    global: { stubs: EL_STUBS },
    attachTo: document.body,
  })
}

describe('CareUnitFormDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ''
    mockInvoke.mockResolvedValue({ success: true, data: {} })
    mockCreateUnit.mockResolvedValue({ id: 5, service_id: 1, name: 'Unit', is_active: true, sort_order: 1 })
    mockUpdateUnit.mockResolvedValue({ id: 1, service_id: 1, name: 'Updated', is_active: true, sort_order: 1 })

    servicesRef.value = [
      { id: 1, name: 'Médecine Générale', duration: 30, sort_order: 1, is_active: true, category: 'Consultation' },
      { id: 2, name: 'Endocrinologie', duration: 30, sort_order: 2, is_active: true, category: 'Consultation' },
    ]
  })

  // ── Dialog open / close ─────────────────────────────────────────

  it('shows "Nouvelle unité de soins" title in create mode', async () => {
    const wrapper = await createWrapper()
    const vm = wrapper.vm as any
    vm.open()
    await nextTick()
    expect(vm.visible).toBe(true)
    expect(vm.editingId).toBeNull()
  })

  it('shows "Modifier l\'unité de soins" title in edit mode', async () => {
    const wrapper = await createWrapper()
    const vm = wrapper.vm as any
    vm.open({ id: 1, service_id: 1, name: 'Hospitalisation', code: 'HOSP', description: 'Descr', is_active: true, sort_order: 1 })
    await nextTick()
    expect(vm.editingId).toBe(1)
  })

  it('populates form fields in edit mode', async () => {
    const wrapper = await createWrapper()
    const vm = wrapper.vm as any
    vm.open({ id: 1, service_id: 2, name: 'Consultation', code: 'CONS', description: 'Externe', is_active: true, sort_order: 2 })
    await nextTick()

    expect(vm.form.service_id).toBe(2)
    expect(vm.form.name).toBe('Consultation')
    expect(vm.form.code).toBe('CONS')
    expect(vm.form.description).toBe('Externe')
  })

  it('resets form fields in create mode', async () => {
    const wrapper = await createWrapper()
    const vm = wrapper.vm as any
    vm.open({ id: 1, service_id: 1, name: 'Old', code: 'OLD', description: 'Old desc', is_active: true, sort_order: 1 })
    await nextTick()
    expect(vm.form.name).toBe('Old')

    // Open again without data (create mode)
    vm.open()
    await nextTick()
    expect(vm.form.service_id).toBeNull()
    expect(vm.form.name).toBe('')
    expect(vm.form.code).toBe('')
    expect(vm.form.description).toBe('')
    expect(vm.editingId).toBeNull()
  })

  // ── Validation ──────────────────────────────────────────────────

  it('does not submit when service_id is missing', async () => {
    const wrapper = await createWrapper()
    const vm = wrapper.vm as any
    vm.open()
    await nextTick()

    vm.form.service_id = null
    vm.form.name = 'Test'
    vm.formRef = { validate: vi.fn(() => Promise.resolve(false)), resetFields: vi.fn() }

    await vm.submit()
    const createCalls = mockCreateUnit.mock.calls
    expect(createCalls.length).toBe(0)
  })

  it('does not submit when name is empty', async () => {
    const wrapper = await createWrapper()
    const vm = wrapper.vm as any
    vm.open()
    await nextTick()

    vm.form.service_id = 1
    vm.form.name = ''
    vm.formRef = { validate: vi.fn(() => Promise.resolve(false)), resetFields: vi.fn() }

    await vm.submit()
    const createCalls = mockCreateUnit.mock.calls
    expect(createCalls.length).toBe(0)
  })

  // ── Create mode ─────────────────────────────────────────────────

  it('calls createUnit and emits saved on successful create', async () => {
    mockCreateUnit.mockResolvedValue({ id: 10, service_id: 1, name: 'New Unit', is_active: true, sort_order: 1 })

    const wrapper = await createWrapper()
    const vm = wrapper.vm as any
    vm.open()
    await nextTick()

    vm.form.service_id = 1
    vm.form.name = 'New Unit'
    vm.form.code = 'NEW'
    vm.formRef = { validate: vi.fn(() => Promise.resolve(true)), resetFields: vi.fn() }

    await vm.submit()

    expect(mockCreateUnit).toHaveBeenCalledWith({
      service_id: 1, name: 'New Unit', code: 'NEW', description: null,
    })
    expect(wrapper.emitted('saved')).toBeTruthy()
    expect(mockElMessage.success).toHaveBeenCalled()
  })

  it('calls createUnit with null code and description when empty', async () => {
    mockCreateUnit.mockResolvedValue({ id: 11, service_id: 1, name: 'Minimal', is_active: true, sort_order: 1 })

    const wrapper = await createWrapper()
    const vm = wrapper.vm as any
    vm.open()
    await nextTick()

    vm.form.service_id = 1
    vm.form.name = 'Minimal'
    vm.form.code = ''
    vm.form.description = ''
    vm.formRef = { validate: vi.fn(() => Promise.resolve(true)), resetFields: vi.fn() }

    await vm.submit()

    expect(mockCreateUnit).toHaveBeenCalledWith({
      service_id: 1, name: 'Minimal', code: null, description: null,
    })
  })

  // ── Edit mode ───────────────────────────────────────────────────

  it('calls updateUnit and emits saved on successful update', async () => {
    mockUpdateUnit.mockResolvedValue({ id: 1, service_id: 1, name: 'Updated name', is_active: true, sort_order: 1 })

    const wrapper = await createWrapper()
    const vm = wrapper.vm as any
    vm.open({ id: 1, service_id: 1, name: 'Original', code: 'ORIG', description: 'Orig desc', is_active: true, sort_order: 1 })
    await nextTick()

    vm.form.name = 'Updated name'
    vm.formRef = { validate: vi.fn(() => Promise.resolve(true)), resetFields: vi.fn() }

    await vm.submit()

    expect(mockUpdateUnit).toHaveBeenCalledWith(1, {
      service_id: 1, name: 'Updated name', code: 'ORIG', description: 'Orig desc',
    })
    expect(wrapper.emitted('saved')).toBeTruthy()
  })

  it('closes the dialog after successful submit', async () => {
    const wrapper = await createWrapper()
    const vm = wrapper.vm as any
    vm.open()
    await nextTick()

    vm.form.service_id = 1
    vm.form.name = 'Close Test'
    vm.formRef = { validate: vi.fn(() => Promise.resolve(true)), resetFields: vi.fn() }

    await vm.submit()

    expect(vm.visible).toBe(false)
  })

  // ── Close / Reset ───────────────────────────────────────────────

  it('closes the dialog on cancel button', async () => {
    const wrapper = await createWrapper()
    const vm = wrapper.vm as any
    vm.open()
    await nextTick()
    expect(vm.visible).toBe(true)

    vm.close()
    await nextTick()
    expect(vm.visible).toBe(false)
  })

  it('resets editingId and calls resetFields on close', async () => {
    const wrapper = await createWrapper()
    const vm = wrapper.vm as any
    vm.open({ id: 1, service_id: 1, name: 'Test', code: 'TST', description: 'Desc', is_active: true, sort_order: 1 })
    await nextTick()

    expect(vm.form.name).toBe('Test')

    const resetFields = vi.fn()
    vm.formRef = { validate: vi.fn(), resetFields }
    vm.onClosed()

    expect(vm.editingId).toBeNull()
    expect(resetFields).toHaveBeenCalledOnce()
  })

  // ── Error handling ──────────────────────────────────────────────

  it('shows error message when createUnit returns null', async () => {
    mockCreateUnit.mockResolvedValue(null)

    const wrapper = await createWrapper()
    const vm = wrapper.vm as any
    vm.open()
    await nextTick()

    vm.form.service_id = 1
    vm.form.name = 'Fail Create'
    vm.formRef = { validate: vi.fn(() => Promise.resolve(true)), resetFields: vi.fn() }

    await vm.submit()

    // Should NOT emit saved if result is null
    expect(wrapper.emitted('saved')).toBeFalsy()
    // Dialog stays open
    expect(vm.visible).toBe(true)
  })

  it('shows error message when updateUnit returns null', async () => {
    mockUpdateUnit.mockResolvedValue(null)

    const wrapper = await createWrapper()
    const vm = wrapper.vm as any
    vm.open({ id: 1, service_id: 1, name: 'Existing', is_active: true, sort_order: 1 })
    await nextTick()

    vm.formRef = { validate: vi.fn(() => Promise.resolve(true)), resetFields: vi.fn() }

    await vm.submit()

    expect(wrapper.emitted('saved')).toBeFalsy()
    expect(vm.visible).toBe(true)
  })
})
