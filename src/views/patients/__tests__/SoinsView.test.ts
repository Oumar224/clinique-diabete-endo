// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import SoinsView from '../SoinsView.vue'

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------
vi.mock('vue-router', () => ({
  useRoute: vi.fn(() => ({ params: { id: '42' } })),
}))

vi.mock('@/api/vitalSigns', () => ({
  getVitalSigns: vi.fn().mockResolvedValue(null),
  saveVitalSigns: vi.fn().mockResolvedValue({ id: 1, patientId: 42 }),
}))

// ---------------------------------------------------------------------------
// Stubs for child components and Element Plus
// ---------------------------------------------------------------------------
const stubs = {
  'el-tabs': {
    template: '<div class="el-tabs"><slot /></div>',
    props: ['modelValue'],
    emits: ['update:modelValue'],
  },
  'el-tab-pane': {
    template: '<div class="el-tab-pane"><slot /><div class="el-tab-pane__label">{{ label }}</div></div>',
    props: ['label', 'name'],
  },
  PlanDistributionTab: {
    template: '<div class="tab-plan-distribution">Plan Distribution Content</div>',
  },
  VitalCheckTab: {
    template: '<div class="tab-vital-check">Vital Check Content</div>',
  },
  DispositifsAccesTab: {
    template: '<div class="tab-dispositifs">Dispositifs Content</div>',
  },
  DiagrammeSyntheseTab: {
    template: '<div class="tab-diagramme">Diagramme Content</div>',
  },
}

// ---------------------------------------------------------------------------
// SoinsView
// ---------------------------------------------------------------------------
describe('SoinsView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // -----------------------------------------------------------------------
  // Tab panes
  // -----------------------------------------------------------------------
  describe('tab panes', () => {
    it('renders 4 tab panes', () => {
      const wrapper = mount(SoinsView, { global: { stubs } })
      expect(wrapper.findAll('.el-tab-pane').length).toBe(4)
    })

    it('renders correct tab labels', () => {
      const wrapper = mount(SoinsView, { global: { stubs } })
      const labels = wrapper.findAll('.el-tab-pane__label').map(l => l.text())
      expect(labels).toContain('Plan Distribution')
      expect(labels).toContain('Vital Check')
      expect(labels).toContain('Dispositifs & Accès')
      expect(labels).toContain('Diagramme de Synthèse')
    })

    it('renders all four child component stubs', () => {
      const wrapper = mount(SoinsView, { global: { stubs } })
      expect(wrapper.find('.tab-plan-distribution').exists()).toBe(true)
      expect(wrapper.find('.tab-vital-check').exists()).toBe(true)
      expect(wrapper.find('.tab-dispositifs').exists()).toBe(true)
      expect(wrapper.find('.tab-diagramme').exists()).toBe(true)
    })
  })

  // -----------------------------------------------------------------------
  // Default active tab
  // -----------------------------------------------------------------------
  describe('default active tab', () => {
    it('defaults to "distribution" tab', () => {
      const wrapper = mount(SoinsView, { global: { stubs } })
      expect(wrapper.text()).toContain('Plan Distribution')
    })
  })
})
