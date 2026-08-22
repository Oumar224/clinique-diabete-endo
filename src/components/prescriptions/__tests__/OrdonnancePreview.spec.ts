// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

// ---------------------------------------------------------------------------
// Mock IPC & Element Plus
// ---------------------------------------------------------------------------
const { mockInvoke, mockElMessage } = vi.hoisted(() => {
  const msg: any = (_opts: any) => {}
  msg.success = vi.fn()
  msg.error = vi.fn()
  return {
    mockInvoke: vi.fn(),
    mockElMessage: msg,
  }
})

vi.stubGlobal('electronAPI', { invoke: mockInvoke })

vi.mock('element-plus', () => ({
  ElMessage: mockElMessage,
}))

vi.mock('@element-plus/icons-vue', () => ({
  Download: { name: 'Download', render: () => null },
  Printer: { name: 'Printer', render: () => null },
  Close: { name: 'Close', render: () => null },
  ZoomIn: { name: 'ZoomIn', render: () => null },
  ZoomOut: { name: 'ZoomOut', render: () => null },
}))

// ---------------------------------------------------------------------------
// Stubs
// ---------------------------------------------------------------------------
const EL_STUBS: Record<string, any> = {
  'el-dialog': {
    template: '<div class="el-dialog" v-if="modelValue ?? visible"><slot /></div>',
    props: ['modelValue', 'visible'],
    emits: ['update:modelValue', 'opened', 'closed'],
    watch: {
      modelValue(v: any) {
        if (v) this.$emit('opened')
      },
    },
  },
  'el-button': {
    template: '<button class="el-button" :disabled="disabled || loading" @click="$emit(\'click\')"><slot /></button>',
    props: ['disabled', 'loading', 'type', 'text'],
    emits: ['click'],
  },
}

import OrdonnancePreview from '../OrdonnancePreview.vue'

const PREVIEW_HTML = '<html><body>ordonnance</body></html>'

function createWrapper(overrides: Record<string, any> = {}) {
  return mount(OrdonnancePreview, {
    props: {
      patientId: 42,
      ...overrides,
    },
    global: { stubs: EL_STUBS },
  })
}

async function openPreview(wrapper: ReturnType<typeof createWrapper>) {
  const vm = wrapper.vm as any
  vm.open()
  await wrapper.vm.$nextTick()
  await flushPromises()
}

function zoomInBtn(wrapper: ReturnType<typeof createWrapper>) {
  return wrapper.find('button[title="Zoom avant"]')
}

function zoomOutBtn(wrapper: ReturnType<typeof createWrapper>) {
  return wrapper.find('button[title="Zoom arrière"]')
}

describe('OrdonnancePreview', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockInvoke.mockResolvedValue({ success: true, data: PREVIEW_HTML })
  })

  it('affiche 100 % par défaut à l\'ouverture', async () => {
    const wrapper = createWrapper()
    await openPreview(wrapper)
    const vm = wrapper.vm as any

    expect(vm.htmlContent).toBe(PREVIEW_HTML)
    expect(vm.zoom).toBe(1)
    expect(wrapper.find('.zoom-value').text()).toBe('100%')
    expect(zoomInBtn(wrapper).attributes('disabled')).toBeUndefined()
    expect(zoomOutBtn(wrapper).attributes('disabled')).toBeUndefined()
  })

  it('clic « Zoom avant » → zoom 1.25 et affichage « 125 % »', async () => {
    const wrapper = createWrapper()
    await openPreview(wrapper)

    await zoomInBtn(wrapper).trigger('click')

    expect((wrapper.vm as any).zoom).toBe(1.25)
    expect(wrapper.find('.zoom-value').text()).toBe('125%')
  })

  it('clamp MAX : zoom === 2, bouton Zoom avant désactivé, clic no-op', async () => {
    const wrapper = createWrapper()
    await openPreview(wrapper)
    const zoomIn = zoomInBtn(wrapper)

    for (let i = 0; i < 4; i++) await zoomIn.trigger('click')

    expect((wrapper.vm as any).zoom).toBe(2)
    expect(wrapper.find('.zoom-value').text()).toBe('200%')
    expect(zoomIn.attributes('disabled')).toBeDefined()
    expect(zoomOutBtn(wrapper).attributes('disabled')).toBeUndefined()

    await zoomIn.trigger('click')
    expect((wrapper.vm as any).zoom).toBe(2)
    expect(wrapper.find('.zoom-value').text()).toBe('200%')
  })

  it('clamp MIN : zoom === 0.5, bouton Zoom arrière désactivé, clic no-op', async () => {
    const wrapper = createWrapper()
    await openPreview(wrapper)
    const zoomOut = zoomOutBtn(wrapper)

    for (let i = 0; i < 2; i++) await zoomOut.trigger('click')

    expect((wrapper.vm as any).zoom).toBe(0.5)
    expect(wrapper.find('.zoom-value').text()).toBe('50%')
    expect(zoomOut.attributes('disabled')).toBeDefined()
    expect(zoomInBtn(wrapper).attributes('disabled')).toBeUndefined()

    await zoomOut.trigger('click')
    expect((wrapper.vm as any).zoom).toBe(0.5)
  })

  it('boutons zoom désactivés tant que le contenu n\'est pas chargé (loading puis vide)', async () => {
    mockInvoke.mockResolvedValue({ success: false, message: 'ordonnance introuvable' })
    const wrapper = createWrapper()
    const vm = wrapper.vm as any

    vm.open()
    await wrapper.vm.$nextTick()

    expect(vm.loading).toBe(true)
    expect(vm.htmlContent).toBeNull()
    expect(zoomInBtn(wrapper).attributes('disabled')).toBeDefined()
    expect(zoomOutBtn(wrapper).attributes('disabled')).toBeDefined()

    await flushPromises()

    expect(vm.loading).toBe(false)
    expect(vm.htmlContent).toBeNull()
    expect(zoomInBtn(wrapper).attributes('disabled')).toBeDefined()
    expect(zoomOutBtn(wrapper).attributes('disabled')).toBeDefined()
  })

  it('expose des titres accessibles et la valeur en pourcentage mise à jour', async () => {
    const wrapper = createWrapper()
    await openPreview(wrapper)

    expect(zoomInBtn(wrapper).attributes('title')).toBe('Zoom avant')
    expect(zoomOutBtn(wrapper).attributes('title')).toBe('Zoom arrière')

    await zoomInBtn(wrapper).trigger('click')
    expect(wrapper.find('.zoom-value').text()).toBe('125%')
  })

  it('les boutons zoom ne déclenchent ni téléchargement, ni impression, ni fermeture', async () => {
    const wrapper = createWrapper()
    await openPreview(wrapper)
    const vm = wrapper.vm as any

    const callsBefore = mockInvoke.mock.calls.length

    await zoomInBtn(wrapper).trigger('click')
    await zoomOutBtn(wrapper).trigger('click')

    expect(mockInvoke.mock.calls.length).toBe(callsBefore)
    expect(wrapper.emitted('close')).toBeUndefined()
    expect(vm.visible).toBe(true)
  })
})
