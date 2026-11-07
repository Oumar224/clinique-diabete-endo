// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import RichTextEditor from '../RichTextEditor.vue'

vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), warning: vi.fn(), info: vi.fn(), error: vi.fn() },
}))

const stubs = {
  'el-select': {
    template: '<select class="el-select" :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><slot /></select>',
    props: ['modelValue', 'placeholder', 'filterable', 'style', 'disabled', 'clearable'],
    emits: ['update:modelValue'],
  },
  'el-option': {
    template: '<option class="el-option" :value="value">{{ label }}</option>',
    props: ['value', 'label'],
  },
}

function mountEditor(props: Record<string, unknown> = {}) {
  return mount(RichTextEditor, {
    props: { modelValue: '', ...props },
    global: { stubs },
  })
}

async function setText(wrapper: ReturnType<typeof mount>, html: string, selectAll = true) {
  const vm = wrapper.vm as any
  vm.editor.commands.setContent(html)
  await nextTick()
  if (selectAll) {
    vm.editor.commands.selectAll()
    await nextTick()
  }
}

describe('RichTextEditor — couleurs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('monte avec un vrai éditeur tiptap', async () => {
    const wrapper = mountEditor()
    await nextTick()
    await flushPromises()
    const vm = wrapper.vm as any
    expect(vm.editor).toBeTruthy()
    expect(wrapper.find('.rich-editor__toolbar').exists()).toBe(true)
  })

  it('affiche 38 nuances dans chaque palette + entrées Auto/Aucun/Personnalisé', async () => {
    const wrapper = mountEditor()
    await nextTick()
    const vm = wrapper.vm as any
    expect(vm.TEXT_COLORS.length).toBe(37)
    expect(vm.HIGHLIGHT_COLORS.length).toBe(37)
    expect(vm.TEXT_COLORS).toEqual(vm.HIGHLIGHT_COLORS)
    // Ouvre le dropdown texte
    const textBtn = wrapper.findAll('button').find(b => b.attributes('aria-label') === 'Couleur du texte')!
    await textBtn.trigger('click')
    const textSwatches = wrapper.findAll('.color-dropdown .color-swatch')
    expect(textSwatches.length).toBeGreaterThanOrEqual(30)
    expect(wrapper.text()).toContain('Auto')
    expect(wrapper.find('input[type="color"]').exists()).toBe(true)
    await textBtn.trigger('click')

    // Ouvre le dropdown surlignage
    const hlBtn = wrapper.findAll('button').find(b => b.attributes('aria-label') === 'Couleur de surlignage')!
    await hlBtn.trigger('click')
    expect(wrapper.text()).toContain('Aucun')
    expect(wrapper.findAll('.color-dropdown .color-swatch').length).toBeGreaterThanOrEqual(30)
  })

  it('applique la couleur du texte et émet change', async () => {
    const wrapper = mountEditor()
    await nextTick()
    await flushPromises()
    await setText(wrapper, '<p>bonjour</p>')
    const vm = wrapper.vm as any

    const textBtn = wrapper.findAll('button').find(b => b.attributes('aria-label') === 'Couleur du texte')!
    await textBtn.trigger('click')
    const swatch = wrapper.findAll('.color-dropdown .color-swatch').find(s => s.attributes('title') === 'Rouge')!
    await swatch.trigger('click')

    expect(vm.editor.getHTML()).toContain('color')
    // 'Rouge' = #EF4444 ; le DOM sérialise en rgb(...)
    expect(vm.editor.getHTML()).toContain('rgb(239, 68, 68)')
    expect(wrapper.emitted('change')).toBeTruthy()
  })

  it('le bouton Auto retire la couleur du texte', async () => {
    const wrapper = mountEditor()
    await nextTick()
    await flushPromises()
    await setText(wrapper, '<p><span style="color: #FF0000">rouge</span></p>')
    const vm = wrapper.vm as any
    expect(vm.editor.getHTML()).toContain('rgb(255, 0, 0)')

    const textBtn = wrapper.findAll('button').find(b => b.attributes('aria-label') === 'Couleur du texte')!
    await textBtn.trigger('click')
    const auto = wrapper.findAll('.color-dropdown button').find(b => b.text() === 'Auto')!
    await auto.trigger('click')

    expect(vm.editor.getHTML()).not.toContain('#FF0000')
    expect(vm.editor.getHTML()).toContain('rouge')
  })

  it('applique la couleur de surlignage (mark) et émet change', async () => {
    const wrapper = mountEditor()
    await nextTick()
    await flushPromises()
    await setText(wrapper, '<p>important</p>')
    const vm = wrapper.vm as any

    const hlBtn = wrapper.findAll('button').find(b => b.attributes('aria-label') === 'Couleur de surlignage')!
    await hlBtn.trigger('click')
    const swatch = wrapper.findAll('.color-dropdown .color-swatch').find(s => s.attributes('title') === 'Jaune')!
    await swatch.trigger('click')

    const html = vm.editor.getHTML()
    expect(html).toContain('<mark')
    expect(html).toContain('background-color')
    expect(wrapper.emitted('change')).toBeTruthy()
  })

  it('le bouton Aucun retire le surlignage', async () => {
    const wrapper = mountEditor()
    await nextTick()
    await flushPromises()
    await setText(wrapper, '<p><mark>marqué</mark></p>')
    const vm = wrapper.vm as any
    expect(vm.editor.getHTML()).toContain('<mark')

    const hlBtn = wrapper.findAll('button').find(b => b.attributes('aria-label') === 'Couleur de surlignage')!
    await hlBtn.trigger('click')
    const none = wrapper.findAll('.color-dropdown button').find(b => b.text() === 'Aucun')!
    await none.trigger('click')

    expect(vm.editor.getHTML()).not.toContain('<mark')
    expect(vm.editor.getHTML()).toContain('marqué')
  })

  it('le sélecteur natif applique une couleur personnalisée', async () => {
    const wrapper = mountEditor()
    await nextTick()
    await flushPromises()
    await setText(wrapper, '<p>custom</p>')

    const textBtn = wrapper.findAll('button').find(b => b.attributes('aria-label') === 'Couleur du texte')!
    await textBtn.trigger('click')
    const native = wrapper.find('.color-dropdown input[type="color"]')
    await native.setValue('#123456')

    const vm = wrapper.vm as any
    expect(vm.editor.getHTML().toLowerCase()).toContain('rgb(18, 52, 86)')
  })

  it('la barre du bouton reflète la couleur courante', async () => {
    const wrapper = mountEditor({ modelValue: '<p><span style="color: #2563EB">bleu</span></p>' })
    await nextTick()
    await flushPromises()
    await setText(wrapper, '<p><span style="color: #2563EB">bleu</span></p>', false)
    const vm = wrapper.vm as any
    vm.editor.commands.selectAll()
    await nextTick()

    const textBtn = wrapper.findAll('button').find(b => b.attributes('aria-label') === 'Couleur du texte')!
    const bar = textBtn.find('.color-bar')
    expect(bar.attributes('style')).toContain('rgb(37, 99, 235)')
  })

  it('la nuance appliquée est marquée sélectionnée (normalisation rgb→hex)', async () => {
    const wrapper = mountEditor()
    await nextTick()
    await flushPromises()
    await setText(wrapper, '<p>bonjour</p>')

    const textBtn = wrapper.findAll('button').find(b => b.attributes('aria-label') === 'Couleur du texte')!
    await textBtn.trigger('click')
    const swatch = wrapper.findAll('.color-dropdown .color-swatch').find(s => s.attributes('title') === 'Rouge')!
    await swatch.trigger('click')

    // Ré-ouvre : la nuance Rouge doit être marquée malgré la forme rgb() du DOM
    await textBtn.trigger('click')
    const reopened = wrapper.findAll('.color-dropdown .color-swatch').find(s => s.attributes('title') === 'Rouge')!
    expect(reopened.classes()).toContain('is-selected')
  })

  it('en readonly, la toolbar est masquée', async () => {
    const wrapper = mountEditor({ readonly: true })
    await nextTick()
    expect(wrapper.find('.rich-editor__toolbar').exists()).toBe(false)
  })
})
