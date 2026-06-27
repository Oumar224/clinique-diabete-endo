// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import DiagrammeSyntheseTab from '../DiagrammeSyntheseTab.vue'

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------
vi.mock('chart.js', () => ({
  Chart: { register: vi.fn() },
  CategoryScale: vi.fn(),
  LinearScale: vi.fn(),
  PointElement: vi.fn(),
  LineElement: vi.fn(),
  Title: vi.fn(),
  Tooltip: vi.fn(),
  Filler: vi.fn(),
}))

// Mock vue-chartjs Line component as a stub
vi.mock('vue-chartjs', () => ({
  Line: {
    name: 'Line',
    props: ['data', 'options'],
    template: '<div class="chart-line" />',
  },
}))

// ---------------------------------------------------------------------------
// Stubs for Element Plus template components
// ---------------------------------------------------------------------------
const stubs = {
  'el-card': {
    template:
      '<div class="el-card"><slot name="header" /><slot /></div>',
  },
  'el-divider': {
    template: '<hr class="el-divider" />',
  },
  'el-tag': {
    template: '<span class="el-tag"><slot /></span>',
    props: ['type', 'size'],
  },
  'el-empty': {
    template:
      '<div class="el-empty"><p class="el-empty__description">{{ description }}</p></div>',
    props: ['description', 'imageSize'],
  },
  'el-timeline': {
    template: '<div class="el-timeline"><slot /></div>',
  },
  'el-timeline-item': {
    template:
      '<div class="el-timeline-item"><span class="el-timeline-item__timestamp">{{ timestamp }}</span><slot /></div>',
    props: ['timestamp', 'type', 'size', 'placement', 'hideTimestamp', 'color', 'icon', 'hollow'],
  },
}

// ---------------------------------------------------------------------------
// DiagrammeSyntheseTab
// ---------------------------------------------------------------------------
describe('DiagrammeSyntheseTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // -----------------------------------------------------------------------
  // Structure
  // -----------------------------------------------------------------------
  describe('structure', () => {
    it('renders the title "Diagramme de synthèse — 24h"', () => {
      const wrapper = mount(DiagrammeSyntheseTab, { global: { stubs } })
      expect(wrapper.text()).toContain('Diagramme de synthèse')
      expect(wrapper.text()).toContain('24h')
    })

    it('renders the chart wrapper with a Line chart component', () => {
      const wrapper = mount(DiagrammeSyntheseTab, { global: { stubs } })
      expect(wrapper.find('.diagramme__chart-wrapper').exists()).toBe(true)
      expect(wrapper.find('.chart-line').exists()).toBe(true)
    })

    it('renders the legend section', () => {
      const wrapper = mount(DiagrammeSyntheseTab, { global: { stubs } })
      expect(wrapper.text()).toContain('Légende')
      expect(wrapper.text()).toContain('Température (°C)')
      expect(wrapper.text()).toContain('Médicament validé')
    })

    it('renders the "Administrations validées (24h)" section', () => {
      const wrapper = mount(DiagrammeSyntheseTab, { global: { stubs } })
      expect(wrapper.text()).toContain('Administrations validées')
    })
  })

  // -----------------------------------------------------------------------
  // Medication timeline
  // -----------------------------------------------------------------------
  describe('medication timeline', () => {
    it('renders all 3 medication timeline items', () => {
      const wrapper = mount(DiagrammeSyntheseTab, { global: { stubs } })
      const items = wrapper.findAll('.el-timeline-item')
      expect(items.length).toBe(3)
    })

    it('displays medication names (Furosémide, Metformine) in timeline', () => {
      const wrapper = mount(DiagrammeSyntheseTab, { global: { stubs } })
      expect(wrapper.text()).toContain('Furosémide')
      expect(wrapper.text()).toContain('Metformine')
    })

    it('displays soignant name (IDE Diallo) in timeline', () => {
      const wrapper = mount(DiagrammeSyntheseTab, { global: { stubs } })
      expect(wrapper.text()).toContain('IDE Diallo')
    })

    it('displays timestamps on timeline items', () => {
      const wrapper = mount(DiagrammeSyntheseTab, { global: { stubs } })
      const items = wrapper.findAll('.el-timeline-item')
      const firstTimestamp = items[0].find('.el-timeline-item__timestamp')
      expect(firstTimestamp.exists()).toBe(true)
      expect(firstTimestamp.text()).toBe('08:15')
    })
  })

  // -----------------------------------------------------------------------
  // Chart data computed
  // -----------------------------------------------------------------------
  describe('chart data computed', () => {
    it('exposes chartData with 24 labels (00h–23h) and 24 data points', () => {
      const wrapper = mount(DiagrammeSyntheseTab, { global: { stubs } })
      const vm = wrapper.vm as any
      const data = vm.chartData
      expect(data).toBeDefined()
      expect(data.labels).toBeDefined()
      expect(data.labels.length).toBe(24)
      expect(data.labels[0]).toBe('00h')
      expect(data.labels[23]).toBe('23h')
    })

    it('has exactly one dataset with correct label, borderColor and backgroundColor', () => {
      const wrapper = mount(DiagrammeSyntheseTab, { global: { stubs } })
      const vm = wrapper.vm as any
      const ds = vm.chartData.datasets
      expect(ds.length).toBe(1)
      expect(ds[0].label).toBe('Température (°C)')
      expect(ds[0].borderColor).toBe('#FF3131')
      expect(ds[0].backgroundColor).toBe('rgba(255, 49, 49, 0.08)')
    })

    it('has fill enabled and tension 0.4 on the dataset', () => {
      const wrapper = mount(DiagrammeSyntheseTab, { global: { stubs } })
      const vm = wrapper.vm as any
      const ds = vm.chartData.datasets[0]
      expect(ds.fill).toBe(true)
      expect(ds.tension).toBe(0.4)
    })
  })

  // -----------------------------------------------------------------------
  // Chart options
  // -----------------------------------------------------------------------
  describe('chart options', () => {
    it('has responsive enabled and legend hidden', () => {
      const wrapper = mount(DiagrammeSyntheseTab, { global: { stubs } })
      const vm = wrapper.vm as any
      const opts = vm.chartOptions
      expect(opts.responsive).toBe(true)
      expect(opts.plugins.legend.display).toBe(false)
    })

    it('has tooltip callback that formats label as "{{y}} °C"', () => {
      const wrapper = mount(DiagrammeSyntheseTab, { global: { stubs } })
      const vm = wrapper.vm as any
      const tooltipLabel = vm.chartOptions.plugins.tooltip.callbacks.label
      const result = tooltipLabel({ parsed: { y: 37.5 } })
      expect(result).toBe('37.5 °C')
    })

    it('has y-axis title "°C"', () => {
      const wrapper = mount(DiagrammeSyntheseTab, { global: { stubs } })
      const vm = wrapper.vm as any
      const yTitle = vm.chartOptions.scales.y.title
      expect(yTitle.text).toBe('°C')
    })
  })

  // -----------------------------------------------------------------------
  // Legend items
  // -----------------------------------------------------------------------
  describe('legend items', () => {
    it('renders legend dot with --temp class for temperature', () => {
      const wrapper = mount(DiagrammeSyntheseTab, { global: { stubs } })
      const dot = wrapper.find('.diagramme__legend-dot--temp')
      expect(dot.exists()).toBe(true)
    })

    it('renders both legend items (temp + medication)', () => {
      const wrapper = mount(DiagrammeSyntheseTab, { global: { stubs } })
      const items = wrapper.findAll('.diagramme__legend-item')
      expect(items.length).toBe(2)
    })
  })
})
