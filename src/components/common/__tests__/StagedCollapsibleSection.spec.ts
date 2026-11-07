// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { reactive, defineComponent, h, nextTick } from 'vue'
import StagedCollapsibleSection from '../StagedCollapsibleSection.vue'

// ─── Mock @element-plus/icons-vue ──────────────────────────────────

vi.mock('@element-plus/icons-vue', () => ({
  Plus: { template: '<span />' },
  Minus: { template: '<span />' },
  ArrowDown: { template: '<span />' },
}))

// ─── Mock Element Plus ─────────────────────────────────────────────

const mockConfirm = vi.fn()

vi.mock('element-plus', () => ({
  ElMessageBox: {
    confirm: (...args: unknown[]) => mockConfirm(...args),
  },
}))

// ─── EL Stubs ──────────────────────────────────────────────────────

const EL_STUBS: Record<string, any> = {
  'el-icon': {
    template: '<span class="el-icon"><slot /></span>',
  },
  'el-badge': {
    template: '<span class="el-badge" :value="value"><slot /></span>',
    props: ['value'],
  },
  'el-button': {
    template: '<button type="button" class="el-button" :disabled="disabled" @click="$emit(\'click\', $event)"><slot /></button>',
    props: ['disabled', 'type', 'size'],
    emits: ['click'],
  },
}

// ─── Mount helper ──────────────────────────────────────────────────

function mountSection(options: {
  modelValue?: Record<string, any>
  keys?: string[]
  props?: Record<string, any>
  defaultSlot?: (ctx: { draft: Record<string, any>; dirty: boolean }) => unknown
} = {}) {
  const modelValue = options.modelValue ?? { nom: '', age: null }
  const keys = options.keys ?? ['nom', 'age']
  const host = defineComponent({
    setup() {
      return () =>
        h(StagedCollapsibleSection as any, {
          title: 'Section test',
          keys,
          modelValue,
          ...(options.props ?? {}),
        }, {
          default: options.defaultSlot
            ? options.defaultSlot
            : (scope: { draft: Record<string, any> }) =>
                h('input', {
                  class: 'draft-input',
                  value: scope.draft.nom,
                  onInput: (e: Event) => {
                    scope.draft.nom = (e.target as HTMLInputElement).value
                  },
                }),
        })
    },
  })
  const wrapper = mount(host, { global: { stubs: EL_STUBS } })
  return {
    wrapper,
    section: () => wrapper.findComponent(StagedCollapsibleSection),
    modelValue,
  }
}

describe('StagedCollapsibleSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockConfirm.mockReset()
    mockConfirm.mockResolvedValue('confirm')
  })

  it('is collapsed by default (body hidden)', () => {
    const { wrapper } = mountSection()
    expect(wrapper.find('.collapsible-section__body').isVisible()).toBe(false)
  })

  it('respects defaultOpen: true', () => {
    const { wrapper } = mountSection({ props: { defaultOpen: true } })
    expect(wrapper.find('.collapsible-section__body').isVisible()).toBe(true)
  })

  it('renders the title', () => {
    const { wrapper } = mountSection()
    expect(wrapper.find('.collapsible-section__title').text()).toBe('Section test')
  })

  it('opens on header click when collapsed', async () => {
    const { wrapper } = mountSection()
    await wrapper.find('.collapsible-section__header').trigger('click')
    expect(wrapper.find('.collapsible-section__body').isVisible()).toBe(true)
  })

  it('keeps edits local to the draft (modelValue not mutated until save)', async () => {
    const { wrapper, modelValue } = mountSection()
    await wrapper.find('.collapsible-section__header').trigger('click')
    const input = wrapper.find('.draft-input')
    await input.setValue('Jean')
    expect(modelValue.nom).toBe('')
  })

  it('enables Enregistrer when dirty', async () => {
    const { wrapper } = mountSection()
    await wrapper.find('.collapsible-section__header').trigger('click')
    const saveBtn = wrapper.findAll('.el-button')[0]
    expect(saveBtn.attributes('disabled')).toBeDefined()
    await wrapper.find('.draft-input').setValue('Jean')
    await vi.waitFor(() => {
      expect(wrapper.findAll('.el-button')[0].attributes('disabled')).toBeUndefined()
    })
  })

  it('commits draft into modelValue, emits save, and closes on Enregistrer', async () => {
    const { wrapper, section, modelValue } = mountSection()
    await wrapper.find('.collapsible-section__header').trigger('click')
    await wrapper.find('.draft-input').setValue('Jean')
    await wrapper.findAll('.el-button')[0].trigger('click')
    expect(modelValue.nom).toBe('Jean')
    expect(section().emitted('save')).toBeTruthy()
    expect(section().vm.isOpen()).toBe(false)
  })

  it('does not emit save when draft is unchanged', async () => {
    const { wrapper, section } = mountSection()
    await wrapper.find('.collapsible-section__header').trigger('click')
    await wrapper.findAll('.el-button')[0].trigger('click')
    expect(section().emitted('save')).toBeFalsy()
  })

  it('reverts draft and closes on Annuler', async () => {
    const { wrapper, modelValue } = mountSection()
    await wrapper.find('.collapsible-section__header').trigger('click')
    await wrapper.find('.draft-input').setValue('Jean')
    await wrapper.findAll('.el-button')[1].trigger('click')
    expect(modelValue.nom).toBe('')
    expect(wrapper.find('.collapsible-section__body').isVisible()).toBe(false)
  })

  it('asks for confirmation when closing a dirty section via the header', async () => {
    const { wrapper, section, modelValue } = mountSection()
    await wrapper.find('.collapsible-section__header').trigger('click')
    await wrapper.find('.draft-input').setValue('Jean')
    await wrapper.find('.collapsible-section__header').trigger('click')
    expect(mockConfirm).toHaveBeenCalled()
    expect(modelValue.nom).toBe('')
    expect(section().vm.isOpen()).toBe(false)
  })

  it('keeps the section open and the draft intact when confirmation is refused', async () => {
    mockConfirm.mockRejectedValue('cancel')
    const { wrapper, modelValue } = mountSection()
    await wrapper.find('.collapsible-section__header').trigger('click')
    await wrapper.find('.draft-input').setValue('Jean')
    await wrapper.find('.collapsible-section__header').trigger('click')
    expect(mockConfirm).toHaveBeenCalled()
    expect(wrapper.find('.collapsible-section__body').isVisible()).toBe(true)
    expect(wrapper.find('.draft-input').element as HTMLInputElement).toBeTruthy()
    expect(modelValue.nom).toBe('')
  })

  it('closes without confirmation when not dirty', async () => {
    const { wrapper, section } = mountSection()
    await wrapper.find('.collapsible-section__header').trigger('click')
    expect(section().vm.isOpen()).toBe(true)
    await wrapper.find('.collapsible-section__header').trigger('click')
    expect(mockConfirm).not.toHaveBeenCalled()
    expect(section().vm.isOpen()).toBe(false)
  })

  it('re-syncs the draft from modelValue on open()', async () => {
    const modelValue = reactive({ nom: '', age: null })
    const { wrapper } = mountSection({ modelValue })
    await wrapper.find('.collapsible-section__header').trigger('click')
    modelValue.nom = 'Jean'
    await wrapper.vm.$nextTick()
    await wrapper.find('.collapsible-section__header').trigger('click')
    await wrapper.find('.collapsible-section__header').trigger('click')
    const input = wrapper.find('.draft-input').element as HTMLInputElement
    expect(input.value).toBe('Jean')
  })

  it('disables Enregistrer and Annuler in readonly mode', async () => {
    const { wrapper } = mountSection({ props: { readonly: true } })
    await wrapper.find('.collapsible-section__header').trigger('click')
    await wrapper.find('.draft-input').setValue('Jean')
    const [saveBtn, cancelBtn] = wrapper.findAll('.el-button')
    expect(saveBtn.attributes('disabled')).toBeDefined()
    expect(cancelBtn.attributes('disabled')).toBeDefined()
  })

  it('exposes open/close/toggle/isOpen/save/cancel/syncDraft/removeFromDraft', () => {
    const { wrapper } = mountSection()
    const section = wrapper.findComponent(StagedCollapsibleSection)
    expect(typeof section.vm.open).toBe('function')
    expect(typeof section.vm.close).toBe('function')
    expect(typeof section.vm.toggle).toBe('function')
    expect(typeof section.vm.isOpen).toBe('function')
    expect(typeof section.vm.save).toBe('function')
    expect(typeof section.vm.cancel).toBe('function')
    expect(typeof section.vm.syncDraft).toBe('function')
    expect(typeof section.vm.removeFromDraft).toBe('function')
  })

  // ─── removeFromDraft (targeted in-draft deletion) ────────────────

  it('removeFromDraft removes only the item whose _key matches, in place', async () => {
    const modelValue = {
      items: [
        { _key: 'a', v: 1 },
        { _key: 'b', v: 2 },
        { _key: 'c', v: 3 },
      ],
    }
    const { wrapper, section } = mountSection({ modelValue, keys: ['items'] })
    await wrapper.find('.collapsible-section__header').trigger('click')
    const sectionVm = section().vm as any
    sectionVm.removeFromDraft('items', 'b')
    expect(sectionVm.draft.items.map((i: { _key: string }) => i._key)).toEqual(['a', 'c'])
    // The other items are untouched (deep-preserved), not rebuilt from the model
    expect(sectionVm.draft.items[0]).toEqual({ _key: 'a', v: 1 })
    expect(sectionVm.draft.items[1]).toEqual({ _key: 'c', v: 3 })
  })

  it('removeFromDraft is a no-op for a missing key', async () => {
    const modelValue = {
      items: [
        { _key: 'a', v: 1 },
        { _key: 'b', v: 2 },
      ],
    }
    const { wrapper, section } = mountSection({ modelValue, keys: ['items'] })
    await wrapper.find('.collapsible-section__header').trigger('click')
    const sectionVm = section().vm as any
    sectionVm.removeFromDraft('items', 'does-not-exist')
    expect(sectionVm.draft.items.map((i: { _key: string }) => i._key)).toEqual(['a', 'b'])
  })

  it('removeFromDraft is a no-op when the draft value is not an array', async () => {
    const modelValue = { items: 'not-an-array' }
    const { wrapper, section } = mountSection({ modelValue, keys: ['items'] })
    await wrapper.find('.collapsible-section__header').trigger('click')
    const sectionVm = section().vm as any
    sectionVm.removeFromDraft('items', 'a')
    expect(sectionVm.draft.items).toBe('not-an-array')
  })

  // ─── pending prop (unsaved-changes guard even when not dirty) ─────

  it('with pending=true and dirty=false shows the confirm on collapse, then closes and emits cancel on confirm', async () => {
    const { wrapper, section } = mountSection({ props: { pending: true } })
    await wrapper.find('.collapsible-section__header').trigger('click') // open
    expect(section().vm.isOpen()).toBe(true)
    await wrapper.find('.collapsible-section__header').trigger('click') // close → confirm
    expect(mockConfirm).toHaveBeenCalled()
    await nextTick()
    expect(section().vm.isOpen()).toBe(false)
    expect(section().emitted('cancel')).toBeTruthy()
  })

  it('with pending=true and dirty=false aborts the close when confirmation is dismissed', async () => {
    mockConfirm.mockRejectedValue('cancel')
    const { wrapper, section } = mountSection({ props: { pending: true } })
    await wrapper.find('.collapsible-section__header').trigger('click') // open
    await wrapper.find('.collapsible-section__header').trigger('click') // close → confirm rejected
    expect(mockConfirm).toHaveBeenCalled()
    expect(section().vm.isOpen()).toBe(true)
    expect(section().emitted('cancel')).toBeFalsy()
  })

  it('with pending=false and dirty=false closes without confirmation (behavior unchanged)', async () => {
    const { wrapper, section } = mountSection({ props: { pending: false } })
    await wrapper.find('.collapsible-section__header').trigger('click') // open
    await wrapper.find('.collapsible-section__header').trigger('click') // close
    expect(mockConfirm).not.toHaveBeenCalled()
    expect(section().vm.isOpen()).toBe(false)
    expect(section().emitted('cancel')).toBeTruthy()
  })

  it('renders the footer (Enregistrer/Annuler) by default', async () => {
    const { wrapper } = mountSection()
    await wrapper.find('.collapsible-section__header').trigger('click')
    expect(wrapper.find('.staged-section__footer').exists()).toBe(true)
  })

  it('hides the footer when hideFooter is true', async () => {
    const { wrapper } = mountSection({ props: { hideFooter: true } })
    await wrapper.find('.collapsible-section__header').trigger('click')
    expect(wrapper.find('.staged-section__footer').exists()).toBe(false)
  })
})
