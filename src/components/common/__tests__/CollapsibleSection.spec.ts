// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import CollapsibleSection from '../CollapsibleSection.vue'

// ─── Mock @element-plus/icons-vue ──────────────────────────────────

vi.mock('@element-plus/icons-vue', () => ({
  Plus: { template: '<span />' },
  Minus: { template: '<span />' },
  ArrowDown: { template: '<span />' },
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
}

// ─── Mount helper ──────────────────────────────────────────────────

function mountSection(options: { props?: Record<string, any> } = {}) {
  return mount(CollapsibleSection, {
    props: { title: 'Section test', ...(options.props ?? {}) },
    slots: { default: '<div class="body-content">Contenu de la section</div>' },
    global: { stubs: EL_STUBS },
  })
}

// ─── Test suite ────────────────────────────────────────────────────

describe('CollapsibleSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('is collapsed by default (body hidden)', () => {
    const wrapper = mountSection()
    expect(wrapper.find('.collapsible-section__body').isVisible()).toBe(false)
  })

  it('renders the title', () => {
    const wrapper = mountSection({ props: { title: 'Antécédents' } })
    expect(wrapper.find('.collapsible-section__title').text()).toBe('Antécédents')
  })

  it('renders the body slot content', () => {
    const wrapper = mountSection()
    expect(wrapper.find('.body-content').exists()).toBe(true)
  })

  it('expands on header click', async () => {
    const wrapper = mountSection()
    await wrapper.find('.collapsible-section__header').trigger('click')
    expect(wrapper.find('.collapsible-section__body').isVisible()).toBe(true)
  })

  it('collapses again on second click', async () => {
    const wrapper = mountSection()
    const header = wrapper.find('.collapsible-section__header')
    await header.trigger('click')
    await header.trigger('click')
    expect(wrapper.find('.collapsible-section__body').isVisible()).toBe(false)
  })

  it('renders a badge when provided', () => {
    const wrapper = mountSection({ props: { badge: 3 } })
    const badge = wrapper.find('.el-badge')
    expect(badge.exists()).toBe(true)
    expect(badge.attributes('value')).toBe('3')
  })

  it('does not render a badge when not provided', () => {
    const wrapper = mountSection()
    expect(wrapper.find('.el-badge').exists()).toBe(false)
  })

  it('respects defaultOpen: true', () => {
    const wrapper = mountSection({ props: { defaultOpen: true } })
    expect(wrapper.find('.collapsible-section__body').isVisible()).toBe(true)
  })

  it('header has role="button" and aria-expanded reflects the open state (regression F6)', () => {
    const wrapper = mountSection({ props: { defaultOpen: true } })
    const header = wrapper.find('.collapsible-section__header')
    expect(header.attributes('role')).toBe('button')
    expect(header.attributes('aria-expanded')).toBe('true')
    // tabindex keeps the header keyboard-focusable
    expect(header.attributes('tabindex')).toBe('0')
  })

  it('aria-expanded is false when collapsed', () => {
    const wrapper = mountSection()
    expect(wrapper.find('.collapsible-section__header').attributes('aria-expanded')).toBe('false')
  })

  it('toggles when pressing Enter on the header (regression F6)', async () => {
    const wrapper = mountSection()
    const header = wrapper.find('.collapsible-section__header')
    expect(header.attributes('aria-expanded')).toBe('false')
    await header.trigger('keydown.enter')
    expect(wrapper.find('.collapsible-section__body').isVisible()).toBe(true)
    expect(header.attributes('aria-expanded')).toBe('true')
  })

  it('toggles when pressing Space on the header (regression F6)', async () => {
    const wrapper = mountSection()
    const header = wrapper.find('.collapsible-section__header')
    await header.trigger('keydown.space')
    expect(wrapper.find('.collapsible-section__body').isVisible()).toBe(true)
    expect(header.attributes('aria-expanded')).toBe('true')
  })
})
