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
// VitalCheckTab — rolling 7-day matrix (convention « Résultats Bio »)
// ---------------------------------------------------------------------------
describe('VitalCheckTab (rolling 7-day matrix)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIpcInvoke.mockImplementation(async (channel: string, params?: any) => {
      if (channel === 'vital-signs-items:list') return []
      if (channel === 'vital-signs-items:save') return makeRecord(params)
      return null
    })
  })

  /** ISO date (local) n days ago. */
  function dateKeyAgo(n: number): string {
    const d = new Date()
    d.setDate(d.getDate() - n)
    return fmtDate(d)
  }

  function mountTab() {
    return mount(VitalCheckTab, {
      global: { stubs, directives: { loading: vi.fn() } },
    })
  }

  function cell(wrapper: ReturnType<typeof mountTab>, row: string, dateKey: string, hour: number) {
    return wrapper.findAll('.vital-check__cell').find(c =>
      c.attributes('data-row') === row
      && c.attributes('data-date') === dateKey
      && c.attributes('data-hour') === String(hour),
    )
  }

  // -----------------------------------------------------------------------
  // Window + always-rendered grid
  // -----------------------------------------------------------------------
  describe('7-day window', () => {
    it('renders no week prev/next buttons', async () => {
      const wrapper = mountTab()
      await waitForData()

      expect(wrapper.findAll('.el-button-group').length).toBe(0)
    })

    it('renders a 7-day range label ending today', async () => {
      const wrapper = mountTab()
      await waitForData()

      const label = wrapper.find('.vital-check__range-label')
      expect(label.exists()).toBe(true)
      expect(label.text()).toContain('7 jours')
      expect(label.text()).toMatch(/\d{2}\/\d{2}\/\d{4}/)
    })

    it('renders 7 date headers, today first, descending to the left', async () => {
      const wrapper = mountTab()
      await waitForData()

      const headers = wrapper.findAll('.vital-check__date-header')
      expect(headers).toHaveLength(7)
      expect(headers[0].classes()).toContain('vital-check__date-header--today')
      expect(headers[0].attributes('data-date')).toBe(dateKeyAgo(0))

      const keys = headers.map(h => h.attributes('data-date'))
      expect(keys).toEqual([0, 1, 2, 3, 4, 5, 6].map(dateKeyAgo))
      // Most recent → oldest, left to right.
      expect([...keys].sort((a, b) => b.localeCompare(a))).toEqual(keys)
    })

    it('renders the full grid with no recorded data', async () => {
      const wrapper = mountTab()
      await waitForData()

      expect(wrapper.findAll('.vital-check__const-cell')).toHaveLength(11)
      expect(wrapper.findAll('.vital-check__date-header')).toHaveLength(7)
      // 7 days × 17 hours
      expect(wrapper.findAll('.vital-check__date-hour')).toHaveLength(119)
      // 11 rows × 7 days × 17 hours
      expect(wrapper.findAll('.vital-check__cell')).toHaveLength(1309)
      expect(wrapper.find('.vital-check__grid-wrapper').exists()).toBe(true)
    })

    it('renders all 11 constant labels with units', async () => {
      const wrapper = mountTab()
      await waitForData()

      const text = wrapper.text()
      for (const label of ['TA Systolique', 'TA Diastolique', 'FC', 'Température', 'Glycémie', 'Cétonémie', 'Glucosurie', 'Cétonurie', 'SaO₂', 'Diurèse', 'Poids']) {
        expect(text).toContain(label)
      }
      expect(text).toContain('mmHg')
      expect(text).toContain('bpm')
    })

    it('renders the corner header with "Constantes" text', async () => {
      const wrapper = mountTab()
      await waitForData()

      const corner = wrapper.find('.vital-check__const-header')
      expect(corner.exists()).toBe(true)
      expect(corner.text()).toBe('Constantes')
    })
  })

  // -----------------------------------------------------------------------
  // Data fetching — one bounded range query
  // -----------------------------------------------------------------------
  describe('data fetching', () => {
    it('fetches a single range covering the 7-day window on mount', async () => {
      mountTab()
      await waitForData()

      expect(mockIpcInvoke.mock.calls.filter(([ch]: [string]) => ch === 'vital-signs-items:dates')).toHaveLength(0)

      const listCalls = mockIpcInvoke.mock.calls.filter(([ch]: [string]) => ch === 'vital-signs-items:list')
      expect(listCalls).toHaveLength(1)
      const [, params] = listCalls[0]
      expect(params.patientId).toBe(42)
      expect(params.endDate).toBe(dateKeyAgo(0))
      expect(params.startDate).toBe(dateKeyAgo(6))
    })

    it('re-fetches the range when Actualiser is clicked', async () => {
      const wrapper = mountTab()
      await waitForData()

      const refreshBtn = wrapper.findAll('button.el-button').find(b => b.text().includes('Actualiser'))!
      await refreshBtn.trigger('click')
      await waitForData()

      const listCalls = mockIpcInvoke.mock.calls.filter(([ch]: [string]) => ch === 'vital-signs-items:list')
      expect(listCalls).toHaveLength(2)
    })
  })

  // -----------------------------------------------------------------------
  // Value placement (row × day × hour)
  // -----------------------------------------------------------------------
  describe('value placement', () => {
    it('places values in the correct day/hour cell', async () => {
      mockIpcInvoke.mockImplementation(async (channel: string, params?: any) => {
        if (channel === 'vital-signs-items:list') return [
          makeRecord({ date: dateKeyAgo(0), hour: 9, taSystolique: 140, glycemie: 2.5 }),
          makeRecord({ date: dateKeyAgo(2), hour: 14, taDiastolique: 90 }),
        ]
        if (channel === 'vital-signs-items:save') return makeRecord(params)
        return null
      })
      const wrapper = mountTab()
      await waitForData()

      expect(cell(wrapper, 'taSystolique', dateKeyAgo(0), 9)?.text()).toBe('140')
      expect(cell(wrapper, 'glycemie', dateKeyAgo(0), 9)?.text()).toBe('2.50')
      expect(cell(wrapper, 'taDiastolique', dateKeyAgo(2), 14)?.text()).toBe('90')
      // Same value must not leak into another day.
      expect(cell(wrapper, 'taSystolique', dateKeyAgo(1), 9)?.text()).toBe('')
      // Unrecorded slot stays empty but present.
      expect(cell(wrapper, 'cetonemie', dateKeyAgo(0), 9)?.text()).toBe('')
    })

    it('exposes getValue for a (date, hour, row) triple', async () => {
      mockIpcInvoke.mockImplementation(async (channel: string, params?: any) => {
        if (channel === 'vital-signs-items:list') return [
          makeRecord({ date: dateKeyAgo(0), hour: 8, taSystolique: 140 }),
        ]
        if (channel === 'vital-signs-items:save') return makeRecord(params)
        return null
      })
      const wrapper = mountTab()
      await waitForData()

      const vm = wrapper.vm as any
      expect(vm.getValue(dateKeyAgo(0), 8, 'taSystolique')).toBe(140)
      expect(vm.getValue(dateKeyAgo(0), 8, 'cetonemie')).toBeNull()
    })
  })

  // -----------------------------------------------------------------------
  // Hour dialog
  // -----------------------------------------------------------------------
  describe('hour dialog', () => {
    it('opens the dialog when clicking a cell', async () => {
      const wrapper = mountTab()
      await waitForData()

      await wrapper.findAll('.vital-check__cell')[0].trigger('click')

      const dialog = wrapper.find('.el-dialog')
      expect(dialog.exists()).toBe(true)
      expect(dialog.isVisible()).toBe(true)
    })

    it('opens the dialog when clicking an hour label', async () => {
      const wrapper = mountTab()
      await waitForData()

      await wrapper.findAll('.vital-check__date-hour')[0].trigger('click')

      expect(wrapper.find('.el-dialog').exists()).toBe(true)
    })

    it('populates dialog fields from existing values', async () => {
      mockIpcInvoke.mockImplementation(async (channel: string, params?: any) => {
        if (channel === 'vital-signs-items:list') return [
          makeRecord({ date: dateKeyAgo(0), hour: 8, taSystolique: 145, glycemie: 1.8 }),
        ]
        if (channel === 'vital-signs-items:save') return makeRecord(params)
        return null
      })
      const wrapper = mountTab()
      await waitForData()

      const vm = wrapper.vm as any
      vm.openHourDialog(dateKeyAgo(0), 8)
      await nextTick()

      expect(vm.hourForm.taSystolique).toBe(145)
      expect(vm.hourForm.glycemie).toBe(1.8)
    })

    it('saves all constants when clicking Enregistrer', async () => {
      mockIpcInvoke.mockImplementation(async (channel: string, params?: any) => {
        if (channel === 'vital-signs-items:list') return []
        if (channel === 'vital-signs-items:save') return makeRecord({ date: dateKeyAgo(0), hour: 8, taSystolique: 135, glycemie: 1.0 })
        return null
      })
      const wrapper = mountTab()
      await waitForData()

      const vm = wrapper.vm as any
      vm.openHourDialog(dateKeyAgo(0), 8)
      vm.hourForm.taSystolique = 135
      vm.hourForm.glycemie = 1.0
      await nextTick()

      const footer = wrapper.find('.el-dialog__footer')
      const saveBtn = footer.findAll('button.el-button').find(b => b.text() === 'Enregistrer')
      expect(saveBtn).toBeDefined()
      await saveBtn!.trigger('click')
      await flushPromises()

      const saveCalls = mockIpcInvoke.mock.calls.filter(([ch]: [string]) => ch === 'vital-signs-items:save')
      expect(saveCalls).toHaveLength(1)
      const [, data] = saveCalls[0]
      expect(data.patientId).toBe(42)
      expect(data.date).toBe(dateKeyAgo(0))
      expect(data.hour).toBe(8)
      expect(data.taSystolique).toBe(135)
      expect(data.glycemie).toBe(1.0)
    })
  })

  // -----------------------------------------------------------------------
  // Alert thresholds
  // -----------------------------------------------------------------------
  describe('alert thresholds', () => {
    it('flags glycemie, temperature and saO2 outside thresholds', async () => {
      const wrapper = mountTab()
      await waitForData()

      const vm = wrapper.vm as any
      expect(vm.isAlertValue('glycemie', 2.0)).toBe(true)
      expect(vm.isAlertValue('glycemie', 0.9)).toBe(false)
      expect(vm.isAlertValue('temperature', 39.0)).toBe(true)
      expect(vm.isAlertValue('temperature', 37.0)).toBe(false)
      expect(vm.isAlertValue('saO2', 85)).toBe(true)
      expect(vm.isAlertValue('saO2', 95)).toBe(false)
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
      const wrapper = mountTab()
      await waitForData()

      expect(wrapper.text()).toContain('Erreur réseau')
    })
  })
})
