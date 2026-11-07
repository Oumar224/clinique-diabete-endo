// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import DiagrammeSyntheseTab from '../DiagrammeSyntheseTab.vue'

// ---------------------------------------------------------------------------
// Helper: minimal VitalSignsRecord factory
// ---------------------------------------------------------------------------
function vitalSign(
  overrides: Partial<{
    id: number
    patientId: number
    createdBy: number
    createdAt: string
    updatedAt: string
    date: string
    dateLabel: string
    sortKey: string
    temperature: number | null
    taSystolique: number | null
    taDiastolique: number | null
    frequenceCardiaque: number | null
    glycemie: number | null
  }> = {},
) {
  const createdAt = overrides.createdAt ?? '2026-07-04T10:30:00'
  const date = overrides.date ?? '2026-07-04'
  const dateLabel = createdAt
    ? (() => { const d = new Date(createdAt); return d.toLocaleDateString('fr-FR') + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) })()
    : date
  return {
    id: 1,
    patientId: 42,
    createdBy: 1,
    createdAt,
    updatedAt: '2026-07-04T10:30:00',
    date,
    dateLabel,
    sortKey: createdAt || date + 'T00:00',
    temperature: null,
    taSystolique: null,
    taDiastolique: null,
    frequenceCardiaque: null,
    glycemie: null,
    ...overrides,
  }
}

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

// Mock IPC layer — return resolved empty arrays so fetchData completes
vi.mock('@/utils/ipc', () => ({
  ipcInvoke: vi.fn().mockResolvedValue([]),
}))

// Mock vue-router
vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { id: '42' } }),
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
  'el-table': {
    template: '<div class="el-table"><slot name="append" /><slot /></div>',
    props: ['data', 'stripe', 'border', 'size', 'emptyText'],
  },
  'el-table-column': {
    template: '<div class="el-table-column" />',
    props: ['prop', 'label', 'width', 'minWidth', 'sortable'],
  },
  'el-date-picker': {
    template:
      '<div class="el-date-picker" />',
    props: ['modelValue', 'type', 'rangeSeparator', 'startPlaceholder', 'endPlaceholder', 'valueFormat', 'disabledDate'],
    emits: ['change', 'update:modelValue'],
  },
  'el-alert': {
    template:
      '<div class="el-alert" v-if="title"><p class="el-alert__title">{{ title }}</p><slot /></div>',
    props: ['title', 'type', 'showIcon', 'closable'],
    emits: ['close'],
  },
  'el-select': {
    template: '<div class="el-select"><slot /></div>',
    props: ['modelValue'],
    emits: ['update:modelValue', 'change'],
  },
  'el-option': {
    template: '<div class="el-option" :data-value="value">{{ label }}</div>',
    props: ['label', 'value'],
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
    it('renders the compact toolbar with date picker and no page title', () => {
      const wrapper = mount(DiagrammeSyntheseTab, { global: { stubs, directives: { loading: vi.fn() } } })
      expect(wrapper.find('.diagramme__header').exists()).toBe(true)
      expect(wrapper.find('.cde-page-title').exists()).toBe(false)
      expect(wrapper.findAll('h1')).toHaveLength(0)
      expect(wrapper.find('.el-date-picker').exists()).toBe(true)
    })

    it('renders the chart wrapper with a Line chart component', () => {
      const wrapper = mount(DiagrammeSyntheseTab, { global: { stubs, directives: { loading: vi.fn() } } })
      expect(wrapper.find('.diagramme__chart-wrapper').exists()).toBe(true)
    })

    it('renders the legend section', () => {
      const wrapper = mount(DiagrammeSyntheseTab, { global: { stubs, directives: { loading: vi.fn() } } })
      expect(wrapper.text()).toContain('Légende')
      expect(wrapper.text()).toContain('Température (°C)')
      expect(wrapper.text()).toContain('TA systolique (mmHg)')
      expect(wrapper.text()).toContain('Médicament validé')
    })

    it('renders the "Administrations validées" section', () => {
      const wrapper = mount(DiagrammeSyntheseTab, { global: { stubs, directives: { loading: vi.fn() } } })
      expect(wrapper.text()).toContain('Administrations validées')
    })
  })

  // -----------------------------------------------------------------------
  // State: date range defaults
  // -----------------------------------------------------------------------
  describe('date range', () => {
    it('defaults to today only', () => {
      const wrapper = mount(DiagrammeSyntheseTab, { global: { stubs, directives: { loading: vi.fn() } } })
      const vm = wrapper.vm as any
      expect(vm.dateRange).toBeDefined()
      expect(vm.dateRange.length).toBe(2)
      // Both entries should be today's date
      const today = new Date().toISOString().slice(0, 10)
      expect(vm.dateRange[0]).toBe(today)
      expect(vm.dateRange[1]).toBe(today)
    })

    it('allows selecting future dates (no disabled-date restriction)', () => {
      const wrapper = mount(DiagrammeSyntheseTab, { global: { stubs, directives: { loading: vi.fn() } } })
      const vm = wrapper.vm as any
      expect(vm.dateRange).toBeDefined()
      expect(vm.disableFutureDate).toBeUndefined()
    })
  })

  // -----------------------------------------------------------------------
  // Loading state
  // -----------------------------------------------------------------------
  describe('loading state', () => {
    it('finishes with loading false and no error after data fetch', async () => {
      const wrapper = mount(DiagrammeSyntheseTab, { global: { stubs, directives: { loading: vi.fn() } } })
      const vm = wrapper.vm as any
      // onMounted triggers async fetchData. flushPromises drains the microtask
      // queue so the mocked API promises resolve and loading goes back to false.
      await flushPromises()
      await nextTick()
      expect(vm.loading).toBe(false)
      expect(vm.error).toBeNull()
    })
  })

  // -----------------------------------------------------------------------
  // Chart data computed
  // -----------------------------------------------------------------------
  describe('chart data computed', () => {
    it('returns null when no vital signs data is loaded', async () => {
      const wrapper = mount(DiagrammeSyntheseTab, { global: { stubs, directives: { loading: vi.fn() } } })
      const vm = wrapper.vm as any
      await flushPromises()
      await nextTick()
      expect(vm.chartData).toBeNull()
    })
  })

  // -----------------------------------------------------------------------
  // Chart data labels — Bug fix: date+time format
  // -----------------------------------------------------------------------
  describe('chart data labels', () => {
    it('labels contain date and time (dd/mm/yyyy HH:MM) for single-day range', async () => {
      const wrapper = mount(DiagrammeSyntheseTab, { global: { stubs, directives: { loading: vi.fn() } } })
      const vm = wrapper.vm as any
      await nextTick()

      vm.points = [
        vitalSign({ id: 1, createdAt: '2026-07-04T08:15:00', temperature: 37.0 }),
        vitalSign({ id: 2, createdAt: '2026-07-04T14:45:00', temperature: 38.5 }),
      ]
      await nextTick()

      expect(vm.chartData).not.toBeNull()
      expect(vm.chartData.labels).toHaveLength(2)
      // Both labels must follow dd/mm/yyyy HH:MM
      expect(vm.chartData.labels[0]).toMatch(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/)
      expect(vm.chartData.labels[1]).toMatch(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/)
    })

    it('labels contain date and time (dd/mm/yyyy HH:MM) for multi-day range', async () => {
      const wrapper = mount(DiagrammeSyntheseTab, { global: { stubs, directives: { loading: vi.fn() } } })
      const vm = wrapper.vm as any
      await nextTick()

      vm.dateRange = ['2026-07-01', '2026-07-07']
      vm.points = [
        vitalSign({ id: 1, createdAt: '2026-07-01T08:15:00', date: '2026-07-01', temperature: 36.8 }),
        vitalSign({ id: 2, createdAt: '2026-07-03T16:30:00', date: '2026-07-03', temperature: 37.2 }),
      ]
      await nextTick()

      expect(vm.chartData).not.toBeNull()
      expect(vm.chartData.labels).toHaveLength(2)
      // Even with a multi-day range, labels must still show date+time
      expect(vm.chartData.labels[0]).toMatch(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/)
      expect(vm.chartData.labels[1]).toMatch(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/)
    })

    it('uses date fallback when createdAt is missing', async () => {
      const wrapper = mount(DiagrammeSyntheseTab, { global: { stubs, directives: { loading: vi.fn() } } })
      const vm = wrapper.vm as any
      await nextTick()

      vm.points = [
        vitalSign({ id: 1, createdAt: '', temperature: 37.5 }),
      ]
      await nextTick()

      expect(vm.chartData).not.toBeNull()
      expect(vm.chartData.labels).toHaveLength(1)
      // When createdAt is empty, the component falls back to v.date
      expect(vm.chartData.labels[0]).toBe('2026-07-04')
    })
  })

  // -----------------------------------------------------------------------
  // Glycemia Y-axis max — Bug fix: dynamic max based on data
  // -----------------------------------------------------------------------
  describe('glycemia Y-axis max', () => {
    it('computes dynamic max from data values + 20% margin, rounded to stepSize', async () => {
      const wrapper = mount(DiagrammeSyntheseTab, { global: { stubs, directives: { loading: vi.fn() } } })
      const vm = wrapper.vm as any
      await nextTick()

      vm.selectedIndicator = 'glycemie'
      vm.points = [
        vitalSign({ id: 1, createdAt: '2026-07-04T08:00:00', glycemie: 1.5 }),
        vitalSign({ id: 2, createdAt: '2026-07-04T12:00:00', glycemie: 2.8 }),
      ]
      await nextTick()

      // dataMin=1.5, dataMax=2.8, range=1.3, padding=max(0.13,0.3)=0.3
      // computedMax = ceil((2.8+0.3)/0.3)*0.3 = ceil(10.33)*0.3 = 3.3
      // max(3.3, cfg.max=3.0) = 3.3
      expect(vm.chartOptions.scales.y.max).toBeCloseTo(3.3, 5)
    })

    it('falls back to default max (3.0) when no vital signs data', async () => {
      const wrapper = mount(DiagrammeSyntheseTab, { global: { stubs, directives: { loading: vi.fn() } } })
      const vm = wrapper.vm as any
      await flushPromises()
      await nextTick()

      vm.selectedIndicator = 'glycemie'
      await nextTick()

      expect(vm.chartOptions.scales.y.max).toBe(3.0)
    })

    it('falls back to default max (3.0) when all glycemia values are null', async () => {
      const wrapper = mount(DiagrammeSyntheseTab, { global: { stubs, directives: { loading: vi.fn() } } })
      const vm = wrapper.vm as any
      await nextTick()

      vm.selectedIndicator = 'glycemie'
      vm.points = [
        vitalSign({ id: 1, createdAt: '2026-07-04T08:00:00', temperature: 37.0, glycemie: null }),
        vitalSign({ id: 2, createdAt: '2026-07-04T12:00:00', temperature: 38.0, glycemie: null }),
      ]
      await nextTick()

      expect(vm.chartOptions.scales.y.max).toBe(3.0)
    })

    it('uses static max for non-glycemia indicators', async () => {
      const wrapper = mount(DiagrammeSyntheseTab, { global: { stubs, directives: { loading: vi.fn() } } })
      const vm = wrapper.vm as any
      await nextTick()

      vm.selectedIndicator = 'taSystolique'
      vm.points = [
        vitalSign({ id: 1, createdAt: '2026-07-04T08:00:00', taSystolique: 130 }),
      ]
      await nextTick()

      // taSystolique uses static config max of 200, NOT dynamic computation
      expect(vm.chartOptions.scales.y.max).toBe(200)
    })
  })

  // -----------------------------------------------------------------------
  // Edge cases
  // -----------------------------------------------------------------------
  describe('edge cases', () => {
    it('returns null chartData when all indicator values are null', async () => {
      const wrapper = mount(DiagrammeSyntheseTab, { global: { stubs, directives: { loading: vi.fn() } } })
      const vm = wrapper.vm as any
      await nextTick()

      // All values null for the selected indicator (temperature by default)
      vm.points = [
        vitalSign({ id: 1, createdAt: '2026-07-04T08:00:00', temperature: null }),
        vitalSign({ id: 2, createdAt: '2026-07-04T12:00:00', temperature: null }),
      ]
      await nextTick()

      expect(vm.chartData).toBeNull()
    })

    it('handles very high glycemia values with appropriate dynamic max', async () => {
      const wrapper = mount(DiagrammeSyntheseTab, { global: { stubs, directives: { loading: vi.fn() } } })
      const vm = wrapper.vm as any
      await nextTick()

      vm.selectedIndicator = 'glycemie'
      vm.points = [
        vitalSign({ id: 1, createdAt: '2026-07-04T10:30:00', glycemie: 10.0 }),
      ]
      await nextTick()

      // dataMin=10.0, dataMax=10.0, range=0, padding=max(0,0.3)=0.3
      // computedMax = ceil((10.0+0.3)/0.3)*0.3 = ceil(34.33)*0.3 = 10.5
      // max(10.5, cfg.max=3.0) = 10.5
      expect(vm.chartOptions.scales.y.max).toBeCloseTo(10.5, 5)
      // A single label present
      expect(vm.chartData).not.toBeNull()
      expect(vm.chartData.labels).toHaveLength(1)
      expect(vm.chartData.labels[0]).toMatch(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/)
    })

    it('handles single data point with correct label and y-axis max', async () => {
      const wrapper = mount(DiagrammeSyntheseTab, { global: { stubs, directives: { loading: vi.fn() } } })
      const vm = wrapper.vm as any
      await nextTick()

      vm.selectedIndicator = 'glycemie'
      vm.points = [
        vitalSign({ id: 1, createdAt: '2026-07-04T18:00:00', glycemie: 1.2 }),
      ]
      await nextTick()

      expect(vm.chartData).not.toBeNull()
      expect(vm.chartData.labels).toHaveLength(1)
      expect(vm.chartData.labels[0]).toMatch(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/)

      // dataMax = 1.2 → 1.2 × 1.2 = 1.44 → ceil(1.44 / 0.3) × 0.3 = 1.5
      // The dynamic max has a floor of cfg.max (3.0), so it stays at 3.0
      expect(vm.chartOptions.scales.y.max).toBe(3.0)
    })
  })

  // -----------------------------------------------------------------------
  // Medication timeline
  // -----------------------------------------------------------------------
  describe('validated administrations table', () => {
    it('renders empty table when no valides data', () => {
      const wrapper = mount(DiagrammeSyntheseTab, { global: { stubs, directives: { loading: vi.fn() } } })
      const table = wrapper.find('.el-table')
      expect(table.exists()).toBe(true)
    })

    it('renders table with column headers', () => {
      const wrapper = mount(DiagrammeSyntheseTab, { global: { stubs, directives: { loading: vi.fn() } } })
      const columns = wrapper.findAll('.el-table-column')
      expect(columns.length).toBe(7)
    })
  })

  // -----------------------------------------------------------------------
  // Legend items
  // -----------------------------------------------------------------------
  describe('legend items', () => {
    it('renders legend dots for temp and TA', () => {
      const wrapper = mount(DiagrammeSyntheseTab, { global: { stubs, directives: { loading: vi.fn() } } })
      expect(wrapper.find('.diagramme__legend-dot--temp').exists()).toBe(true)
      expect(wrapper.find('.diagramme__legend-dot--ta').exists()).toBe(true)
    })

    it('renders legend items for all indicators', () => {
      const wrapper = mount(DiagrammeSyntheseTab, { global: { stubs, directives: { loading: vi.fn() } } })
      const items = wrapper.findAll('.diagramme__legend-item')
      // 9 vitals + 1 medication = 10
      expect(items.length).toBe(10)
    })
  })

  // -----------------------------------------------------------------------
  // Chart options
  // -----------------------------------------------------------------------
  describe('chart options', () => {
    it('has responsive enabled and legend visible at top', () => {
      const wrapper = mount(DiagrammeSyntheseTab, { global: { stubs, directives: { loading: vi.fn() } } })
      const vm = wrapper.vm as any
      const opts = vm.chartOptions
      expect(opts.responsive).toBe(true)
      expect(opts.plugins.legend.display).toBe(true)
      expect(opts.plugins.legend.position).toBe('top')
    })

    it('has tooltip callback that formats as "Label: y"', () => {
      const wrapper = mount(DiagrammeSyntheseTab, { global: { stubs, directives: { loading: vi.fn() } } })
      const vm = wrapper.vm as any
      const tooltipLabel = vm.chartOptions.plugins.tooltip.callbacks.label
      const result = tooltipLabel({ dataset: { label: 'Température (°C)' }, parsed: { y: 37.5 } })
      expect(result).toBe('Température (°C): 37.5')
    })

    it('has left y-axis with temperature config by default', () => {
      const wrapper = mount(DiagrammeSyntheseTab, { global: { stubs, directives: { loading: vi.fn() } } })
      const vm = wrapper.vm as any
      const scales = vm.chartOptions.scales
      expect(scales.y).toBeDefined()
      expect(scales.y.position).toBe('left')
      expect(scales.y.title.text).toBe('°C')
      expect(scales.y.min).toBe(35)
      expect(scales.y.max).toBe(40)
      expect(scales.y.ticks.stepSize).toBe(0.5)
    })

    it('switches Y-axis options when indicator changes', async () => {
      const wrapper = mount(DiagrammeSyntheseTab, { global: { stubs, directives: { loading: vi.fn() } } })
      const vm = wrapper.vm as any
      vm.selectedIndicator = 'taSystolique'
      await nextTick()
      const scales = vm.chartOptions.scales
      expect(scales.y).toBeDefined()
      expect(scales.y.title.text).toBe('mmHg')
      expect(scales.y.min).toBe(60)
      expect(scales.y.max).toBe(200)
    })

    it('sets X-axis title to Heure when date range is a single day', () => {
      const wrapper = mount(DiagrammeSyntheseTab, { global: { stubs, directives: { loading: vi.fn() } } })
      const vm = wrapper.vm as any
      // Default is single day (today = today)
      expect(vm.chartOptions.scales.x.title.text).toBe('Heure')
    })

    it('sets X-axis title to Date when date range spans multiple days', async () => {
      const wrapper = mount(DiagrammeSyntheseTab, { global: { stubs, directives: { loading: vi.fn() } } })
      const vm = wrapper.vm as any
      vm.dateRange = ['2026-07-01', '2026-07-07']
      await nextTick()
      expect(vm.chartOptions.scales.x.title.text).toBe('Date')
    })
  })

  // -----------------------------------------------------------------------
  // Indicator selection
  // -----------------------------------------------------------------------
  describe('indicator selection', () => {
    it('defaults to temperature', () => {
      const wrapper = mount(DiagrammeSyntheseTab, { global: { stubs, directives: { loading: vi.fn() } } })
      const vm = wrapper.vm as any
      expect(vm.selectedIndicator).toBe('temperature')
    })

    it('renders el-select with all indicator options', () => {
      const wrapper = mount(DiagrammeSyntheseTab, { global: { stubs, directives: { loading: vi.fn() } } })
      const select = wrapper.find('.el-select')
      expect(select.exists()).toBe(true)
      const options = wrapper.findAll('.el-option')
      // temperature, taSystolique, taDiastolique, frequenceCardiaque, glycemie, cetonemie, saO2, diurese, poids
      expect(options.length).toBe(9)
      expect(wrapper.text()).toContain('Température (°C)')
      expect(wrapper.text()).toContain('TA systolique (mmHg)')
      expect(wrapper.text()).toContain('TA diastolique (mmHg)')
      expect(wrapper.text()).toContain('Fréquence cardiaque (bpm)')
      expect(wrapper.text()).toContain('Glycémie (g/L)')
    })

    it('replaces indicator when a new one is selected', async () => {
      const wrapper = mount(DiagrammeSyntheseTab, { global: { stubs, directives: { loading: vi.fn() } } })
      const vm = wrapper.vm as any
      expect(vm.selectedIndicator).toBe('temperature')
      vm.selectedIndicator = 'taSystolique'
      await nextTick()
      expect(vm.selectedIndicator).toBe('taSystolique')
    })
  })
})
