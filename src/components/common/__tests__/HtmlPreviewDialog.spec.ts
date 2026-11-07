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

import HtmlPreviewDialog from '../HtmlPreviewDialog.vue'

function createWrapper(overrides: Record<string, any> = {}) {
  return mount(HtmlPreviewDialog, {
    props: {
      title: 'Aperçu du document',
      channel: 'export:crh-diabete-preview',
      downloadChannel: 'export:crh-diabete-pdf',
      params: { documentId: 'doc-1', formData: { motifHospitalisation: '<p>motif</p>' } },
      ...overrides,
    },
    global: { stubs: EL_STUBS },
  })
}

describe('HtmlPreviewDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockInvoke.mockResolvedValue({ success: true, data: '<html><body>aperçu</body></html>' })
  })

  it('appelle le canal de prévisualisation à l\'ouverture et affiche le HTML', async () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as any
    vm.open()
    await wrapper.vm.$nextTick()
    await flushPromises()

    expect(mockInvoke).toHaveBeenCalledWith(
      'export:crh-diabete-preview',
      expect.objectContaining({ documentId: 'doc-1', formData: expect.any(Object) }),
    )
    expect(vm.htmlContent).toBe('<html><body>aperçu</body></html>')
  })

  it('garde-fou régression : l\'iframe d\'aperçu conserve sandbox="allow-same-origin" (mitigation XSS)', async () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as any
    vm.open()
    await wrapper.vm.$nextTick()
    await flushPromises()

    expect(vm.htmlContent).toBeTruthy()
    expect(vm.loading).toBe(false)
    expect(wrapper.find('iframe').attributes('sandbox')).toBe('allow-same-origin')
  })

  it('clone les params réactifs avant l\'appel IPC', async () => {
    const wrapper = createWrapper({ params: { documentId: 'doc-reactif' } })
    const vm = wrapper.vm as any
    vm.open()
    await wrapper.vm.$nextTick()
    await flushPromises()

    const callParams = mockInvoke.mock.calls[0][1]
    expect(callParams).toEqual({ documentId: 'doc-reactif' })
    expect(callParams).not.toBe(wrapper.props('params'))
  })

  it('montre une erreur et garde le contenu vide si le chargement échoue', async () => {
    mockInvoke.mockResolvedValue({ success: false, message: 'document introuvable' })
    const wrapper = createWrapper()
    const vm = wrapper.vm as any
    vm.open()
    await wrapper.vm.$nextTick()
    await flushPromises()

    expect(mockElMessage.error).toHaveBeenCalledWith('document introuvable')
    expect(vm.htmlContent).toBeNull()
  })

  it('appelle le canal de téléchargement via le bouton Télécharger PDF', async () => {
    mockInvoke.mockResolvedValueOnce({ success: true, data: '<html>aperçu</html>' })
    mockInvoke.mockResolvedValueOnce({ success: true, data: '/tmp/crh-doc.pdf' })

    const wrapper = createWrapper()
    const vm = wrapper.vm as any
    vm.open()
    await wrapper.vm.$nextTick()
    await flushPromises()

    const downloadButton = wrapper.findAll('button').find(b => b.text().includes('Télécharger PDF'))
    expect(downloadButton).toBeTruthy()
    await downloadButton!.trigger('click')
    await flushPromises()

    expect(mockInvoke).toHaveBeenCalledWith(
      'export:crh-diabete-pdf',
      expect.objectContaining({ documentId: 'doc-1', formData: expect.any(Object) }),
    )
    expect(mockElMessage.success).toHaveBeenCalledWith('Fichier enregistré : /tmp/crh-doc.pdf')
  })

  it('réinitialise le contenu à la fermeture', async () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as any
    vm.open()
    await wrapper.vm.$nextTick()
    await flushPromises()
    expect(vm.htmlContent).not.toBeNull()

    vm.handleClosed()
    expect(vm.htmlContent).toBeNull()
  })

  it('adapte l’aperçu au format paysage, légèrement réduit', async () => {
    const wrapper = createWrapper({ orientation: 'landscape' })
    const vm = wrapper.vm as any
    vm.open()
    await wrapper.vm.$nextTick()
    await flushPromises()

    const iframe = wrapper.find('iframe')
    // La page garde sa largeur A4 paysage (pas de recompaction du contenu)…
    expect(iframe.attributes('style')).toContain('width: 1123px')
    expect(iframe.attributes('style')).toContain('height: 794px')
    // …mais est affichée à 90 % pour ne pas paraître étirée.
    expect(iframe.attributes('style')).toContain('scale(0.9)')
  })

  it('ne grossit pas l’aperçu au-delà de 100 % lors de l’ajustement', async () => {
    const wrapper = createWrapper({ orientation: 'landscape' })
    const vm = wrapper.vm as any
    vm.open()
    await wrapper.vm.$nextTick()
    await flushPromises()

    // Simule un grand écran : l'ajustement ne doit pas dépasser 90 %.
    Object.defineProperty(vm.contentRef, 'clientWidth', { value: 2400, configurable: true })
    window.dispatchEvent(new Event('resize'))

    expect(vm.zoom).toBe(0.9)
  })

  it('ignore les réponses obsolètes quand un second chargement démarre', async () => {
    let resolveFirst: (value: unknown) => void = () => {}
    mockInvoke
      .mockImplementationOnce(() => new Promise((resolve) => {
        resolveFirst = resolve
      }))
      .mockResolvedValueOnce({ success: true, data: '<html>second</html>' })

    const wrapper = createWrapper()
    const vm = wrapper.vm as any
    vm.open()
    await wrapper.vm.$nextTick()

    const firstPromise = vm.loadPreview()
    await flushPromises()

    expect(vm.htmlContent).toBe('<html>second</html>')

    resolveFirst({ success: true, data: '<html>premier</html>' })
    await firstPromise
    await flushPromises()

    expect(vm.htmlContent).toBe('<html>second</html>')
  })
})
