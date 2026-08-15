// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import VitalCheckTab from '../VitalCheckTab.vue'

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------
const mockIpcInvoke = vi.hoisted(() => vi.fn())

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------
vi.mock('vue-router', () => ({
  useRoute: vi.fn(() => ({ params: { id: '42' } })),
}))

vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), warning: vi.fn(), info: vi.fn(), error: vi.fn() },
}))

vi.mock('@element-plus/icons-vue', () => ({
  ArrowLeft: { render: () => {} },
  ArrowRight: { render: () => {} },
  Refresh: { render: () => {} },
}))

vi.mock('@/utils/ipc', () => ({
  ipcInvoke: mockIpcInvoke,
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format a Date as YYYY-MM-DD using local time. */
function fmtDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Compute Monday 00:00:00 of the week containing `date`. */
function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const MONDAY = getWeekStart(new Date())
const MONDAY_STR = fmtDate(MONDAY)

const RECORD_TEMPLATE: Record<string, any> = {
  id: 1,
  patientId: 42,
  date: MONDAY_STR,
  hour: 8,
  createdBy: 1,
  createdAt: '',
  updatedAt: '',
  taSystolique: 130,
  taDiastolique: 85,
  frequenceCardiaque: 78,
  temperature: 37.2,
  glycemie: 1.2,
  cetonemie: null,
  glucosurie: null,
  cetonurie: null,
  saO2: null,
  diurese: null,
  poids: null,
}

function makeRecord(overrides: Partial<typeof RECORD_TEMPLATE>) {
  return { ...RECORD_TEMPLATE, ...overrides }
}

// ---------------------------------------------------------------------------
// Element Plus stubs (minimal for dialog + grid)
// ---------------------------------------------------------------------------
const stubs = {
  'el-alert': {
    template: '<div class="el-alert" v-if="title"><p class="el-alert__title">{{ title }}</p><slot /></div>',
    props: ['title', 'type', 'showIcon', 'closable'],
    emits: ['close'],
  },
  'el-button': {
    template: '<button class="el-button" :disabled="disabled" :loading="loading" @click="$emit(\'click\', $event)"><slot /></button>',
    props: ['disabled', 'type', 'size', 'icon', 'loading'],
    emits: ['click'],
  },
  'el-button-group': {
    template: '<div class="el-button-group"><slot /></div>',
  },
  'el-icon': {
    template: '<span class="el-icon"><slot /></span>',
  },
  'el-input': {
    template: '<input class="el-input" :value="modelValue" @input="onInput" />',
    props: ['modelValue', 'size'],
    emits: ['update:modelValue', 'change'],
    methods: {
      onInput(this: any, e: Event) {
        const val = (e.target as HTMLInputElement).value
        this.$emit('update:modelValue', val)
        this.$emit('change', val)
      },
    },
  },
  'el-input-number': {
    template:
      '<input class="el-input-number" :value="modelValue" @change="onChange" :min="min" :max="max" :step="step" :precision="precision" />',
    props: ['modelValue', 'min', 'max', 'step', 'precision', 'size', 'controls-position'],
    emits: ['update:modelValue', 'change'],
    methods: {
      onChange(this: any, e: Event) {
        const val = (e.target as HTMLInputElement).value
        const num = val === '' ? null : Number(val)
        this.$emit('update:modelValue', num)
        this.$emit('change', num)
      },
    },
  },
  'el-select': {
    template: '<select class="el-select" :value="modelValue" @change="onChange"><slot /></select>',
    props: ['modelValue', 'placeholder', 'size', 'style'],
    emits: ['update:modelValue', 'change'],
    methods: {
      onChange(this: any, e: Event) {
        const val = (e.target as HTMLSelectElement).value
        this.$emit('update:modelValue', val)
        this.$emit('change', val)
      },
    },
  },
  'el-option': {
    template: '<option class="el-option" :value="value" :label="label"><slot /></option>',
    props: ['value', 'label'],
  },
  'el-dialog': {
    template:
      '<div class="el-dialog" v-if="modelValue"><div class="el-dialog__body"><slot /></div><div class="el-dialog__footer"><slot name="footer" /></div></div>',
    props: ['modelValue', 'title', 'width', 'top'],
    emits: ['update:modelValue'],
  },
  'el-form': {
    template: '<form class="el-form"><slot /></form>',
    props: ['model', 'labelPosition', 'size'],
  },
  'el-form-item': {
    template: '<div class="el-form-item"><label v-if="label">{{ label }}</label><slot /></div>',
    props: ['label', 'prop'],
  },
  'el-row': {
    template: '<div class="el-row" :style="{ marginLeft: -gutter/2 + \'px\', marginRight: -gutter/2 + \'px\' }"><slot /></div>',
    props: ['gutter'],
  },
  'el-col': {
    template: '<div class="el-col" :style="{ paddingLeft: gutter/2 + \'px\', paddingRight: gutter/2 + \'px\' }"><slot /></div>',
    props: ['span', 'gutter'],
  },
}

function waitForData() {
  return new Promise(resolve => setTimeout(resolve, 0))
}

// ---------------------------------------------------------------------------
// VitalCheckTab — Hour-based grid layout
// ---------------------------------------------------------------------------
describe('VitalCheckTab (hour-based grid)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: return empty list
    mockIpcInvoke.mockImplementation(async (channel: string, params?: any) => {
      if (channel === 'vital-signs-items:list') return []
      if (channel === 'vital-signs-items:save') return makeRecord(params)
      return null
    })
  })

  // -----------------------------------------------------------------------
  // Week navigation
  // -----------------------------------------------------------------------
  describe('week navigation', () => {
    it('renders week navigation with prev/next buttons and week label', async () => {
      const wrapper = mount(VitalCheckTab, {
        global: { stubs, directives: { loading: vi.fn() } },
      })
      await waitForData()

      const groups = wrapper.findAll('.el-button-group')
      expect(groups.length).toBe(1)

      const buttons = groups[0].findAll('button.el-button')
      expect(buttons.length).toBe(3) // prev, label, next
    })

    it('renders week label with date range', async () => {
      const wrapper = mount(VitalCheckTab, {
        global: { stubs, directives: { loading: vi.fn() } },
      })
      await waitForData()

      const label = wrapper.find('.vital-check__week-label')
      expect(label.exists()).toBe(true)
      expect(label.text()).toMatch(/\d{2}\/\d{2}/)
    })
  })

  // -----------------------------------------------------------------------
  // Grid structure
  // -----------------------------------------------------------------------
  describe('grid structure', () => {
    it('renders 7 date headers with hour labels', async () => {
      const wrapper = mount(VitalCheckTab, {
        global: { stubs, directives: { loading: vi.fn() } },
      })
      await waitForData()

      const headers = wrapper.findAll('.vital-check__date-header')
      expect(headers.length).toBe(7)
    })

    it('highlights today column', async () => {
      const wrapper = mount(VitalCheckTab, {
        global: { stubs, directives: { loading: vi.fn() } },
      })
      await waitForData()

      const todayHeader = wrapper.find('.vital-check__date-header--today')
      expect(todayHeader.exists()).toBe(true)
    })

    it('renders the corner header with "Constantes" text', async () => {
      const wrapper = mount(VitalCheckTab, {
        global: { stubs, directives: { loading: vi.fn() } },
      })
      await waitForData()

      const corner = wrapper.find('.vital-check__const-header')
      expect(corner.exists()).toBe(true)
      expect(corner.text()).toBe('Constantes')
    })

    it('renders all 11 constant rows', async () => {
      const wrapper = mount(VitalCheckTab, {
        global: { stubs, directives: { loading: vi.fn() } },
      })
      await waitForData()

      const constCells = wrapper.findAll('.vital-check__const-cell')
      expect(constCells.length).toBe(11)

      const allText = wrapper.text()
      expect(allText).toContain('TA Systolique')
      expect(allText).toContain('FC')
      expect(allText).toContain('Glycémie')
      expect(allText).toContain('Cétonémie')
      expect(allText).toContain('Glucosurie')
      expect(allText).toContain('Cétonurie')
      expect(allText).toContain('SaO₂')
      expect(allText).toContain('Diurèse')
      expect(allText).toContain('Poids')
    })

    it('renders 17 hour labels per day header', async () => {
      const wrapper = mount(VitalCheckTab, {
        global: { stubs, directives: { loading: vi.fn() } },
      })
      await waitForData()

      const dateHours = wrapper.findAll('.vital-check__date-hour')
      // 7 days × 17 hours = 119 hour labels
      expect(dateHours.length).toBe(119)
    })

    it('renders 11 × 7 × 17 = 1309 data cells', async () => {
      const wrapper = mount(VitalCheckTab, {
        global: { stubs, directives: { loading: vi.fn() } },
      })
      await waitForData()

      const cells = wrapper.findAll('.vital-check__cell')
      expect(cells.length).toBe(1309)
    })
  })

  // -----------------------------------------------------------------------
  // Data fetching
  // -----------------------------------------------------------------------
  describe('data fetching', () => {
    it('calls vital-signs-items:list on mount with patient ID and week range', async () => {
      mount(VitalCheckTab, {
        global: { stubs, directives: { loading: vi.fn() } },
      })
      await waitForData()

      const listCalls = mockIpcInvoke.mock.calls.filter(([ch]: [string]) => ch === 'vital-signs-items:list')
      expect(listCalls).toHaveLength(1)
      const [, params] = listCalls[0]
      expect(params.patientId).toBe(42)
      expect(params.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(params.endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })

    it('re-fetches when week changes', async () => {
      const wrapper = mount(VitalCheckTab, {
        global: { stubs, directives: { loading: vi.fn() } },
      })
      await flushPromises()
      const listCallsAfterMount = mockIpcInvoke.mock.calls.filter(([ch]: [string]) => ch === 'vital-signs-items:list')
      expect(listCallsAfterMount).toHaveLength(1)

      const vm = wrapper.vm as any
      vm.nextWeek()

      await nextTick()
      await flushPromises()

      const listCallsAfterNav = mockIpcInvoke.mock.calls.filter(([ch]: [string]) => ch === 'vital-signs-items:list')
      expect(listCallsAfterNav).toHaveLength(2)
    })
  })

  // -----------------------------------------------------------------------
  // Value population
  // -----------------------------------------------------------------------
  describe('value population', () => {
    it('populates items map from fetched records', async () => {
      mockIpcInvoke.mockImplementation(async (channel: string, params?: any) => {
        if (channel === 'vital-signs-items:list') return [
          makeRecord({ date: MONDAY_STR, hour: 8, taSystolique: 140, glycemie: 2.5 }),
          makeRecord({ date: MONDAY_STR, hour: 12, taDiastolique: 90, frequency: 80 }),
        ]
        if (channel === 'vital-signs-items:save') return makeRecord(params)
        return null
      })
      const wrapper = mount(VitalCheckTab, {
        global: { stubs, directives: { loading: vi.fn() } },
      })
      await waitForData()

      const vm = wrapper.vm as any
      // getValue helper should return correct data
      expect(vm.getValue(MONDAY_STR, 8, 'taSystolique')).toBe(140)
      expect(vm.getValue(MONDAY_STR, 8, 'glycemie')).toBe(2.5)
      expect(vm.getValue(MONDAY_STR, 12, 'taDiastolique')).toBe(90)
      // Unrecorded slot should be null
      expect(vm.getValue(MONDAY_STR, 8, 'cetonemie')).toBeNull()
    })

    it('shows formatted cell values in the grid', async () => {
      mockIpcInvoke.mockImplementation(async (channel: string, params?: any) => {
        if (channel === 'vital-signs-items:list') return [
          makeRecord({ date: MONDAY_STR, hour: 8, taSystolique: 140, glycemie: 2.5 }),
        ]
        if (channel === 'vital-signs-items:save') return makeRecord(params)
        return null
      })
      const wrapper = mount(VitalCheckTab, {
        global: { stubs, directives: { loading: vi.fn() } },
      })
      await waitForData()

      // Cell values are rendered as .vital-check__cell-value spans
      const cellValues = wrapper.findAll('.vital-check__cell-value')
      expect(cellValues.length).toBeGreaterThan(0)
      // Some cells should contain "140" (taSystolique)
      const texts = cellValues.map(c => c.text())
      expect(texts.some(t => t === '140')).toBe(true)
    })
  })

  // -----------------------------------------------------------------------
  // Hour dialog
  // -----------------------------------------------------------------------
  describe('hour dialog', () => {
    it('opens the dialog when clicking a cell', async () => {
      const wrapper = mount(VitalCheckTab, {
        global: { stubs, directives: { loading: vi.fn() } },
      })
      await waitForData()

      // Click the first cell
      const cells = wrapper.findAll('.vital-check__cell')
      expect(cells.length).toBeGreaterThan(0)
      await cells[0].trigger('click')

      // Dialog should be visible
      const dialog = wrapper.find('.el-dialog')
      expect(dialog.exists()).toBe(true)
      expect(dialog.isVisible()).toBe(true)
    })

    it('opens the dialog when clicking an hour label', async () => {
      const wrapper = mount(VitalCheckTab, {
        global: { stubs, directives: { loading: vi.fn() } },
      })
      await waitForData()

      // Click the first hour label
      const hourLabels = wrapper.findAll('.vital-check__date-hour')
      expect(hourLabels.length).toBeGreaterThan(0)
      await hourLabels[0].trigger('click')

      const dialog = wrapper.find('.el-dialog')
      expect(dialog.exists()).toBe(true)
    })

    it('populates dialog fields from existing values', async () => {
      mockIpcInvoke.mockImplementation(async (channel: string, params?: any) => {
        if (channel === 'vital-signs-items:list') return [
          makeRecord({ date: MONDAY_STR, hour: 8, taSystolique: 145, glycemie: 1.8 }),
        ]
        if (channel === 'vital-signs-items:save') return makeRecord(params)
        return null
      })
      const wrapper = mount(VitalCheckTab, {
        global: { stubs, directives: { loading: vi.fn() } },
      })
      await waitForData()

      // Open dialog for Monday 08:00
      const vm = wrapper.vm as any
      vm.openHourDialog(MONDAY_STR, 8)

      await nextTick()

      // The dialog form should be pre-populated
      expect(vm.hourForm.taSystolique).toBe(145)
      expect(vm.hourForm.glycemie).toBe(1.8)
    })

    it('saves all constants when clicking Enregistrer', async () => {
      mockIpcInvoke.mockImplementation(async (channel: string, params?: any) => {
        if (channel === 'vital-signs-items:list') return []
        if (channel === 'vital-signs-items:save') return makeRecord({ date: MONDAY_STR, hour: 8, taSystolique: 135, glycemie: 1.0 })
        return null
      })

      const wrapper = mount(VitalCheckTab, {
        global: { stubs, directives: { loading: vi.fn() } },
      })
      await waitForData()

      // Open dialog for Monday 08:00
      const vm = wrapper.vm as any
      vm.openHourDialog(MONDAY_STR, 8)

      // Set some values
      vm.hourForm.taSystolique = 135
      vm.hourForm.glycemie = 1.0

      await nextTick()

      // Find save button by text
      const footer = wrapper.find('.el-dialog__footer')
      const saveBtn = footer.findAll('button.el-button').find(b => b.text() === 'Enregistrer')
      expect(saveBtn).toBeDefined()
      await saveBtn!.trigger('click')

      await flushPromises()

      const saveCalls = mockIpcInvoke.mock.calls.filter(([ch]: [string]) => ch === 'vital-signs-items:save')
      expect(saveCalls).toHaveLength(1)
      const [, data] = saveCalls[0]
      expect(data.patientId).toBe(42)
      expect(data.date).toBe(MONDAY_STR)
      expect(data.hour).toBe(8)
      expect(data.taSystolique).toBe(135)
      expect(data.glycemie).toBe(1.0)
    })
  })

  // -----------------------------------------------------------------------
  // Alert thresholds
  // -----------------------------------------------------------------------
  describe('alert thresholds', () => {
    it('returns true for glycemie above threshold', async () => {
      const wrapper = mount(VitalCheckTab, {
        global: { stubs, directives: { loading: vi.fn() } },
      })
      await waitForData()

      const vm = wrapper.vm as any
      expect(vm.isAlertValue('glycemie', 2.0)).toBe(true)
      expect(vm.isAlertValue('glycemie', 0.9)).toBe(false)
    })

    it('returns true for temperature above threshold', async () => {
      const wrapper = mount(VitalCheckTab, {
        global: { stubs, directives: { loading: vi.fn() } },
      })
      await waitForData()

      const vm = wrapper.vm as any
      expect(vm.isAlertValue('temperature', 39.0)).toBe(true)
      expect(vm.isAlertValue('temperature', 37.0)).toBe(false)
    })

    it('returns true for saO2 below 90', async () => {
      const wrapper = mount(VitalCheckTab, {
        global: { stubs, directives: { loading: vi.fn() } },
      })
      await waitForData()

      const vm = wrapper.vm as any
      expect(vm.isAlertValue('saO2', 85)).toBe(true)
      expect(vm.isAlertValue('saO2', 95)).toBe(false)
    })

    it('returns false for null or empty values', async () => {
      const wrapper = mount(VitalCheckTab, {
        global: { stubs, directives: { loading: vi.fn() } },
      })
      await waitForData()

      const vm = wrapper.vm as any
      expect(vm.isAlertValue('glycemie', null)).toBe(false)
    })
  })

  // -----------------------------------------------------------------------
  // Error state
  // -----------------------------------------------------------------------
  describe('error state', () => {
    it('shows error alert when fetch fails', async () => {
      mockIpcInvoke.mockImplementation(async (channel: string) => {
        if (channel === 'vital-signs-items:list') throw new Error('Erreur réseau')
        return null
      })
      const wrapper = mount(VitalCheckTab, {
        global: { stubs, directives: { loading: vi.fn() } },
      })
      await waitForData()

      expect(wrapper.text()).toContain('Erreur réseau')
    })
  })
})
