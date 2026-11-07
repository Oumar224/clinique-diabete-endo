// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import AjustementStockDialog from '../AjustementStockDialog.vue'

const { mockIpcInvoke, mockElMessage } = vi.hoisted(() => ({
  mockIpcInvoke: vi.fn(),
  mockElMessage: { success: vi.fn(), warning: vi.fn(), info: vi.fn(), error: vi.fn() },
}))

vi.mock('@/utils/ipc', () => ({
  ipcInvoke: mockIpcInvoke,
}))

vi.mock('element-plus', () => ({
  ElMessage: mockElMessage,
}))

vi.mock('@/composables/useAuth', () => ({
  useAuth: () => ({
    user: { value: { id: 7, nom: 'Pharma', prenom: 'Test', role: 'PHARMACIEN' } },
  }),
}))

const STUBS: Record<string, any> = {
  'el-dialog': {
    template: '<div v-if="modelValue" class="el-dialog"><slot /><slot name="footer" /></div>',
    props: ['modelValue'],
  },
  'el-form': {
    template: '<form class="el-form"><slot /></form>',
    props: ['model', 'rules', 'labelPosition'],
    methods: {
      validate: () => Promise.resolve(true),
    },
  },
  'el-form-item': {
    template: '<div class="el-form-item"><label>{{ label }}</label><slot /></div>',
    props: ['label', 'prop'],
  },
  'el-select': {
    name: 'ElSelect',
    template: '<select class="el-select" :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><slot /></select>',
    props: ['modelValue'],
    emits: ['update:modelValue'],
  },
  'el-option': {
    template: '<option :value="value">{{ label }}</option>',
    props: ['label', 'value'],
  },
  'el-input-number': {
    template: '<input class="el-input-number" type="number" :value="modelValue" @input="$emit(\'update:modelValue\', Number($event.target.value))" />',
    props: ['modelValue', 'min'],
    emits: ['update:modelValue'],
  },
  'el-input': {
    template: '<input class="el-input" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue'],
    emits: ['update:modelValue'],
  },
  'el-button': {
    template: '<button class="el-button" :disabled="disabled" @click="$emit(\'click\', $event)"><slot /></button>',
    props: ['disabled', 'type', 'loading'],
    emits: ['click'],
  },
}

const LOTS = [
  { id: 11, medicamentId: 1, numeroLot: 'A', quantite: 5 },
  { id: 12, medicamentId: 1, numeroLot: 'B', quantite: 3 },
]

describe('AjustementStockDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIpcInvoke.mockImplementation(async (channel: string) => {
      if (channel === 'stock:ajustement') return { id: 11, medicamentId: 1, quantite: 12 }
      if (channel === 'stock:niveaux') return []
      if (channel === 'stock:alertes') {
        return { ruptures: [], sousSeuil: [], perimes: [], peremptionProche: [] }
      }
      return undefined
    })
  })

  function createWrapper() {
    return mount(AjustementStockDialog, { global: { stubs: STUBS } })
  }

  async function openDialog(wrapper: ReturnType<typeof createWrapper>, lots: any[] = LOTS) {
    await (wrapper.vm as any).open({ medicamentId: 1, label: 'Metformine', lots })
    await flushPromises()
    await nextTick()
  }

  function confirmerButton(wrapper: ReturnType<typeof createWrapper>) {
    return wrapper.findAll('.el-button').find((b) => b.text() === 'Confirmer')!
  }

  function setQuantiteMotif(wrapper: ReturnType<typeof createWrapper>, quantite: string, motif: string) {
    return (async () => {
      await wrapper.find('.el-input-number').setValue(quantite)
      const motifInput = wrapper.findAll('.el-input')
        .find((i) => (i.attributes('placeholder') ?? '').includes('Motif'))!
      await motifInput.setValue(motif)
      await nextTick()
    })()
  }

  it('requires a lot choice when several lots are active (hint + disabled submit)', async () => {
    const wrapper = createWrapper()
    await openDialog(wrapper)

    expect(wrapper.text()).toContain('Plusieurs lots actifs')
    expect(confirmerButton(wrapper).attributes('disabled')).toBeDefined()

    const lotSelect = wrapper.findComponent({ name: 'ElSelect' })
    await lotSelect.vm.$emit('update:modelValue', 11)
    await nextTick()
    expect(confirmerButton(wrapper).attributes('disabled')).toBeUndefined()
  })

  it('submits the ajustement with lotId, quantite and motif, then emits saved', async () => {
    const wrapper = createWrapper()
    await openDialog(wrapper)

    await wrapper.findComponent({ name: 'ElSelect' }).vm.$emit('update:modelValue', 11)
    await setQuantiteMotif(wrapper, '12', 'Inventaire')
    await confirmerButton(wrapper).trigger('click')
    await flushPromises()

    expect(mockIpcInvoke).toHaveBeenCalledWith('stock:ajustement', {
      medicamentId: 1,
      lotId: 11,
      quantiteNouvelle: 12,
      motif: 'Inventaire',
      userId: 7,
    })
    expect(mockElMessage.success).toHaveBeenCalledWith('Ajustement enregistré')
    expect(wrapper.emitted('saved')).toBeTruthy()
  })

  it('allows a global ajustement without lotId when a single lot is active', async () => {
    const wrapper = createWrapper()
    await openDialog(wrapper, [{ id: 21, medicamentId: 1, numeroLot: 'UNIQUE', quantite: 5 }])

    expect(wrapper.text()).not.toContain('Plusieurs lots actifs')
    expect(confirmerButton(wrapper).attributes('disabled')).toBeUndefined()

    await setQuantiteMotif(wrapper, '8', 'Casse')
    await confirmerButton(wrapper).trigger('click')
    await flushPromises()

    expect(mockIpcInvoke).toHaveBeenCalledWith('stock:ajustement', expect.objectContaining({
      medicamentId: 1,
      quantiteNouvelle: 8,
      motif: 'Casse',
    }))
  })
})
