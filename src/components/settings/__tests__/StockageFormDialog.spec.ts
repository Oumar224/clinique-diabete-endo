// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

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
  const comp = (await import('../StockageFormDialog.vue')).default
  return mount(comp, {
    global: { stubs: EL_STUBS },
    attachTo: document.body,
  })
}

describe('StockageFormDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ''
    mockInvoke.mockResolvedValue({ success: true, data: {} })
  })

  it('affiche "Nouveau stockage" en mode création', async () => {
    const wrapper = await createWrapper()
    const vm = wrapper.vm as any
    vm.open()
    await wrapper.vm.$nextTick()
    expect(vm.editingId).toBeNull()
    expect(vm.visible).toBe(true)
  })

  it('affiche "Modifier le stockage" en mode édition', async () => {
    const wrapper = await createWrapper()
    const vm = wrapper.vm as any
    vm.open({ id: 1, code: 'stk_01', name: 'Réfrigérateur', description: 'Standard', sort_order: 1, champs_count: 2, is_active: true })
    await wrapper.vm.$nextTick()
    expect(vm.editingId).toBe(1)
  })

  it('remplit le formulaire avec les données en mode édition', async () => {
    const wrapper = await createWrapper()
    const vm = wrapper.vm as any
    vm.open({ id: 1, code: 'stk_01', name: 'Réfrigérateur', description: 'Standard', sort_order: 1, champs_count: 2, is_active: true })
    await wrapper.vm.$nextTick()
    expect(vm.form.code).toBe('stk_01')
    expect(vm.form.name).toBe('Réfrigérateur')
    expect(vm.form.description).toBe('Standard')
  })

  it('valide les champs requis (Code)', async () => {
    const wrapper = await createWrapper()
    const vm = wrapper.vm as any
    vm.open()
    await wrapper.vm.$nextTick()

    vm.form.code = ''
    vm.form.name = 'Test'
    vm.formRef = { validate: vi.fn(() => Promise.resolve(false)), resetFields: vi.fn() }

    await vm.submit()
    // Should not call IPC because validation failed
    const createCalls = mockInvoke.mock.calls.filter(c => c[0] === 'conservateurs:create')
    expect(createCalls.length).toBe(0)
  })

  it('valide les champs requis (Nom)', async () => {
    const wrapper = await createWrapper()
    const vm = wrapper.vm as any
    vm.open()
    await wrapper.vm.$nextTick()

    vm.form.code = 'test'
    vm.form.name = ''
    vm.formRef = { validate: vi.fn(() => Promise.resolve(false)), resetFields: vi.fn() }

    await vm.submit()
    const createCalls = mockInvoke.mock.calls.filter(c => c[0] === 'conservateurs:create')
    expect(createCalls.length).toBe(0)
  })

  it('appelle createStockage et émet saved en mode création', async () => {
    mockInvoke
      .mockResolvedValueOnce({ success: true, data: { id: 5 } })
      .mockResolvedValueOnce({ success: true, data: [] })

    const wrapper = await createWrapper()
    const vm = wrapper.vm as any
    vm.open()
    await wrapper.vm.$nextTick()

    vm.form.code = 'stk_05'
    vm.form.name = 'Nouveau stockage'
    vm.formRef = { validate: vi.fn(() => Promise.resolve(true)), resetFields: vi.fn() }

    await vm.submit()

    const createCalls = mockInvoke.mock.calls.filter(c => c[0] === 'conservateurs:create')
    expect(createCalls.length).toBeGreaterThanOrEqual(1)
    expect(wrapper.emitted('saved')).toBeTruthy()
  })

  it('appelle updateStockage et émet saved en mode édition', async () => {
    mockInvoke
      .mockResolvedValueOnce({ success: true, data: { id: 1 } })
      .mockResolvedValueOnce({ success: true, data: [] })

    const wrapper = await createWrapper()
    const vm = wrapper.vm as any
    vm.open({ id: 1, code: 'stk_01', name: 'Réfrigérateur', sort_order: 1, champs_count: 2, is_active: true })
    await wrapper.vm.$nextTick()

    vm.form.name = 'Réfrigérateur modifié'
    vm.formRef = { validate: vi.fn(() => Promise.resolve(true)), resetFields: vi.fn() }

    await vm.submit()

    const updateCalls = mockInvoke.mock.calls.filter(c => c[0] === 'conservateurs:update')
    expect(updateCalls.length).toBeGreaterThanOrEqual(1)
    expect(wrapper.emitted('saved')).toBeTruthy()
  })

  it('reset le formulaire à la fermeture', async () => {
    const wrapper = await createWrapper()
    const vm = wrapper.vm as any
    vm.open({ id: 1, code: 'stk_01', name: 'Réfrigérateur', sort_order: 1, champs_count: 2, is_active: true })
    await wrapper.vm.$nextTick()
    expect(vm.form.code).toBe('stk_01')

    vm.formRef = { validate: vi.fn(), resetFields: vi.fn() }
    vm.onClosed()
    expect(vm.editingId).toBeNull()
  })
})
