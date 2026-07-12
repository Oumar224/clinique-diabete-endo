// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

// ---------------------------------------------------------------------------
// Mock IPC & Element Plus — ALWAYS use vi.hoisted for module-level vars
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

vi.stubGlobal('window', {
  electronAPI: { invoke: mockInvoke },
})

vi.mock('element-plus', () => ({
  ElMessage: mockElMessage,
  ElMessageBox: mockElMessageBox,
}))

// ---------------------------------------------------------------------------
// Stubs
// ---------------------------------------------------------------------------
const EL_STUBS: Record<string, any> = {
  'el-dialog': {
    template: '<div class="el-dialog" v-if="modelValue ?? visible"><slot /><slot name="footer" /></div>',
    props: ['modelValue', 'visible'],
    emits: ['update:modelValue', 'closed'],
  },
  'el-form': { template: '<form class="el-form"><slot /></form>', props: ['model', 'rules'] },
  'el-form-item': { template: '<div class="el-form-item"><slot /></div>', props: ['label', 'prop'] },
  'el-input': {
    template: '<input class="el-input" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue'], emits: ['update:modelValue'],
  },
  'el-input-number': {
    template: '<input class="el-input-number" :value="modelValue" @input="$emit(\'update:modelValue\', Number($event.target.value))" />',
    props: ['modelValue', 'min', 'max'], emits: ['update:modelValue'],
  },
  'el-button': {
    template: '<button class="el-button" :disabled="loading" @click="$emit(\'click\')"><slot /></button>',
    props: ['loading', 'type', 'text'], emits: ['click'],
  },
  'el-icon': { template: '<i class="el-icon"><slot /></i>' },
}

async function createWrapper() {
  const comp = (await import('../CategoryFormDialog.vue')).default
  return mount(comp, {
    global: { stubs: EL_STUBS },
    attachTo: document.body,
  })
}

describe('CategoryFormDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ''
    // Par défaut: succès IPC
    mockInvoke.mockResolvedValue({ success: true, data: {} })
  })

  it('affiche "Nouvelle catégorie" en mode création', async () => {
    const wrapper = await createWrapper()
    const vm = wrapper.vm as any
    vm.open()
    await wrapper.vm.$nextTick()
    expect(vm.editingId).toBeNull()
  })

  it('affiche "Modifier la catégorie" en mode édition', async () => {
    const wrapper = await createWrapper()
    const vm = wrapper.vm as any
    vm.open({ id: 1, code: 'h', name: 'H', description: 'T', sort_order: 1, exam_count: 5, is_active: true })
    await wrapper.vm.$nextTick()
    expect(vm.editingId).toBe(1)
  })

  it('remplit le formulaire avec les données passées en mode édition', async () => {
    const wrapper = await createWrapper()
    const vm = wrapper.vm as any
    vm.open({ id: 2, code: 'bio', name: 'Biochimie', description: 'Descr', sort_order: 3, exam_count: 0, is_active: true })
    await wrapper.vm.$nextTick()
    expect(vm.form.code).toBe('bio')
    expect(vm.form.name).toBe('Biochimie')
    expect(vm.form.description).toBe('Descr')
  })

  it('appelle createCategory et émet saved en mode création', async () => {
    mockInvoke
      .mockResolvedValueOnce({ success: true, data: { id: 5 } })
      .mockResolvedValueOnce({ success: true, data: [] })

    const wrapper = await createWrapper()
    const vm = wrapper.vm as any
    vm.open()
    await wrapper.vm.$nextTick()

    vm.form.code = 'new'
    vm.form.name = 'New Category'
    // Provide a mock formRef that passes validation
    vm.formRef = { validate: vi.fn(() => Promise.resolve(true)), resetFields: vi.fn() }

    await vm.submit()

    expect(mockInvoke).toHaveBeenCalled()
    expect(wrapper.emitted('saved')).toBeTruthy()
  })

  it('appelle updateCategory et émet saved en mode édition', async () => {
    mockInvoke
      .mockResolvedValueOnce({ success: true, data: { id: 1 } })
      .mockResolvedValueOnce({ success: true, data: [] })

    const wrapper = await createWrapper()
    const vm = wrapper.vm as any
    vm.open({ id: 1, code: 'h', name: 'H', sort_order: 1, exam_count: 8, is_active: true })
    await wrapper.vm.$nextTick()

    vm.form.name = 'H modifié'
    vm.formRef = { validate: vi.fn(() => Promise.resolve(true)), resetFields: vi.fn() }

    await vm.submit()

    expect(mockInvoke).toHaveBeenCalled()
    expect(wrapper.emitted('saved')).toBeTruthy()
  })

  it('reset le formulaire à la fermeture', async () => {
    const wrapper = await createWrapper()
    const vm = wrapper.vm as any
    vm.open({ id: 1, code: 'h', name: 'H', sort_order: 2, exam_count: 5, is_active: true })
    await wrapper.vm.$nextTick()
    expect(vm.form.code).toBe('h')

    vm.formRef = { validate: vi.fn(), resetFields: vi.fn() }
    vm.onClosed()
    expect(vm.editingId).toBeNull()
  })

  it('ferme le dialogue avec close()', async () => {
    const wrapper = await createWrapper()
    const vm = wrapper.vm as any
    vm.open()
    await wrapper.vm.$nextTick()
    expect(vm.visible).toBe(true)
    vm.close()
    expect(vm.visible).toBe(false)
  })
})
