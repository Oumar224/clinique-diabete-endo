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
  const comp = (await import('../ChampLocalisationFormDialog.vue')).default
  return mount(comp, {
    global: { stubs: EL_STUBS },
    attachTo: document.body,
  })
}

describe('ChampLocalisationFormDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ''
    mockInvoke.mockResolvedValue({ success: true, data: {} })
  })

  it('affiche "Nouveau champ" en mode création', async () => {
    const wrapper = await createWrapper()
    const vm = wrapper.vm as any
    vm.open()
    await wrapper.vm.$nextTick()
    expect(vm.editingId).toBeNull()
    expect(vm.visible).toBe(true)
  })

  it('affiche "Modifier le champ" en mode édition', async () => {
    const wrapper = await createWrapper()
    const vm = wrapper.vm as any
    vm.open({ id: 1, stockage_id: 1, cle: 'etagere', label: 'Étagère', type: 'texte', sort_order: 1 })
    await wrapper.vm.$nextTick()
    expect(vm.editingId).toBe(1)
  })

  it('remplit le formulaire avec les données en mode édition', async () => {
    const wrapper = await createWrapper()
    const vm = wrapper.vm as any
    vm.open({ id: 1, stockage_id: 1, cle: 'etagere', label: 'Étagère', type: 'texte', sort_order: 1 })
    await wrapper.vm.$nextTick()
    expect(vm.form.cle).toBe('etagere')
    expect(vm.form.label).toBe('Étagère')
    expect(vm.form.type).toBe('texte')
  })

  it('valide les champs requis (Clé)', async () => {
    const wrapper = await createWrapper()
    const vm = wrapper.vm as any
    vm.open(null, 1)
    await wrapper.vm.$nextTick()

    vm.form.cle = ''
    vm.form.label = 'Test'
    vm.formRef = { validate: vi.fn(() => Promise.resolve(false)), resetFields: vi.fn() }

    await vm.submit()
    const createCalls = mockInvoke.mock.calls.filter(c => c[0] === 'conservateurs:champs-create')
    expect(createCalls.length).toBe(0)
  })

  it('valide les champs requis (Label)', async () => {
    const wrapper = await createWrapper()
    const vm = wrapper.vm as any
    vm.open(null, 1)
    await wrapper.vm.$nextTick()

    vm.form.cle = 'test'
    vm.form.label = ''
    vm.formRef = { validate: vi.fn(() => Promise.resolve(false)), resetFields: vi.fn() }

    await vm.submit()
    const createCalls = mockInvoke.mock.calls.filter(c => c[0] === 'conservateurs:champs-create')
    expect(createCalls.length).toBe(0)
  })

  it('appelle createChamp et émet saved en mode création', async () => {
    mockInvoke
      .mockResolvedValueOnce({ success: true, data: { id: 3 } })
      .mockResolvedValueOnce({ success: true, data: [] })

    const wrapper = await createWrapper()
    const vm = wrapper.vm as any
    vm.open(null, 1)
    await wrapper.vm.$nextTick()

    vm.form.cle = 'tiroir'
    vm.form.label = 'Tiroir'
    vm.formRef = { validate: vi.fn(() => Promise.resolve(true)), resetFields: vi.fn() }

    await vm.submit()

    const createCalls = mockInvoke.mock.calls.filter(c => c[0] === 'conservateurs:champs-create')
    expect(createCalls.length).toBeGreaterThanOrEqual(1)
    expect(wrapper.emitted('saved')).toBeTruthy()
  })

  it('appelle updateChamp et émet saved en mode édition', async () => {
    mockInvoke
      .mockResolvedValueOnce({ success: true, data: { id: 1 } })
      .mockResolvedValueOnce({ success: true, data: [] })

    const wrapper = await createWrapper()
    const vm = wrapper.vm as any
    vm.open({ id: 1, stockage_id: 1, cle: 'etagere', label: 'Étagère', type: 'texte', sort_order: 1 })
    await wrapper.vm.$nextTick()

    vm.form.label = 'Étagère modifiée'
    vm.formRef = { validate: vi.fn(() => Promise.resolve(true)), resetFields: vi.fn() }

    await vm.submit()

    const updateCalls = mockInvoke.mock.calls.filter(c => c[0] === 'conservateurs:champs-update')
    expect(updateCalls.length).toBeGreaterThanOrEqual(1)
    expect(wrapper.emitted('saved')).toBeTruthy()
  })

  it('reset le formulaire à la fermeture', async () => {
    const wrapper = await createWrapper()
    const vm = wrapper.vm as any
    vm.open({ id: 1, stockage_id: 1, cle: 'etagere', label: 'Étagère', type: 'texte', sort_order: 1 })
    await wrapper.vm.$nextTick()
    expect(vm.form.cle).toBe('etagere')

    vm.formRef = { validate: vi.fn(), resetFields: vi.fn() }
    vm.onClosed()
    expect(vm.editingId).toBeNull()
  })
})
