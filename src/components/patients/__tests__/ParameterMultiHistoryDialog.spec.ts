// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import type { MultiHistorySeries } from '../ParameterMultiHistoryDialog.vue'

// ─── Mock chart.js & vue-chartjs ─────────────────────────────────────

vi.mock('chart.js', () => ({
  Chart: { register: vi.fn() },
  CategoryScale: vi.fn(),
  LinearScale: vi.fn(),
  PointElement: vi.fn(),
  LineElement: vi.fn(),
  Title: vi.fn(),
  Tooltip: vi.fn(),
  Legend: vi.fn(),
  Filler: vi.fn(),
}))

vi.mock('vue-chartjs', () => ({
  Line: {
    name: 'Line',
    props: ['data', 'options'],
    template: '<div class="chart-line" />',
  },
}))

vi.mock('@element-plus/icons-vue', () => ({
  InfoFilled: { name: 'InfoFilled', render: () => null },
}))

// ─── Stubs ───────────────────────────────────────────────────────────

const EL_STUBS: Record<string, any> = {
  'el-dialog': {
    template: `
      <div v-if="modelValue" class="el-dialog" role="dialog">
        <div class="el-dialog__header"><span class="el-dialog__title">{{ title }}</span></div>
        <div class="el-dialog__body"><slot /></div>
        <div class="el-dialog__footer"><slot name="footer" /></div>
      </div>
    `,
    props: ['modelValue', 'title', 'width', 'closeOnClickModal'],
    emits: ['update:modelValue'],
  },
  'el-segmented': {
    template: `
      <div class="el-segmented">
        <button
          v-for="opt in options"
          :key="opt.value"
          class="el-segmented__opt"
          :data-value="opt.value"
          :class="{ 'is-active': opt.value === modelValue }"
          @click="$emit('update:modelValue', opt.value)"
        >{{ opt.label }}</button>
      </div>
    `,
    props: ['modelValue', 'options', 'size', 'ariaLabel'],
    emits: ['update:modelValue'],
  },
  'el-tabs': {
    template: '<div class="el-tabs"><slot /></div>',
    props: ['modelValue', 'type'],
    emits: ['update:modelValue'],
  },
  'el-tab-pane': {
    template: '<div class="el-tab-pane" :data-name="name"><slot /></div>',
    props: ['name', 'label'],
  },
  'el-table': {
    template: '<div class="el-table"><slot /></div>',
    props: ['data', 'size'],
    provide() {
      return { elTableData: (this as any).data }
    },
  },
  'el-table-column': {
    template: `
      <div class="el-table-column">
        <template v-for="(row, index) in elTableData" :key="index">
          <span class="el-table-column__cell"><slot :row="row" :column="{}">{{ row[prop] }}</slot></span>
        </template>
      </div>
    `,
    props: ['label', 'prop', 'width', 'minWidth', 'showOverflowTooltip'],
    inject: ['elTableData'],
  },
  'el-empty': {
    template: '<div class="el-empty"><span class="el-empty__description">{{ description }}</span><slot /></div>',
    props: ['description', 'imageSize'],
  },
  'el-alert': {
    template: '<div class="el-alert" :data-title="title" :type="type"><slot /></div>',
    props: ['title', 'type', 'showIcon', 'closable'],
  },
  'el-button': {
    template: '<button class="el-button" :size="size" @click="$emit(\'click\', $event)"><slot /></button>',
    props: ['size', 'icon'],
    emits: ['click'],
  },
  'el-icon': {
    template: '<span class="el-icon"><slot /></span>',
  },
}

import ParameterMultiHistoryDialog from '../ParameterMultiHistoryDialog.vue'

// ─── Fixtures ────────────────────────────────────────────────────────

function glasgowSeries(): MultiHistorySeries[] {
  return [
    {
      path: 'bilanInitial.glasgow.ouvertureYeux',
      label: 'Glasgow – Ouverture des yeux',
      entries: [
        { date: '2025-03-15T11:00:00.000Z', documentId: 'doc-1', documentLabel: 'CRH Diabète', status: 'signed', value: 4 },
      ],
    },
    {
      path: 'bilanInitial.glasgow.reponseVerbale',
      label: 'Glasgow – Réponse verbale',
      entries: [
        { date: '2025-03-15T11:00:00.000Z', documentId: 'doc-1', documentLabel: 'CRH Diabète', status: 'signed', value: 5 },
      ],
    },
    {
      path: 'bilanInitial.glasgow.reponseMotrice',
      label: 'Glasgow – Réponse motrice',
      entries: [
        { date: '2025-03-15T11:00:00.000Z', documentId: 'doc-1', documentLabel: 'CRH Diabète', status: 'signed', value: 6 },
      ],
    },
    {
      path: 'bilanInitial.glasgow.score',
      label: 'Score de Glasgow (/15)',
      unit: '/15',
      entries: [
        { date: '2025-03-15T11:00:00.000Z', documentId: 'doc-1', documentLabel: 'CRH Diabète', status: 'signed', value: 15 },
      ],
    },
  ]
}

function categoricalSeries(): MultiHistorySeries[] {
  return [
    {
      path: 'bilanInitial.examenPhysique.cetonurie',
      label: 'Cétominurie',
      entries: [
        { date: '2025-03-15T10:00:00.000Z', documentId: 'doc-1', documentLabel: 'CRH Diabète', status: 'signed', value: '++' },
      ],
    },
  ]
}

// ─── Suite ───────────────────────────────────────────────────────────

describe('ParameterMultiHistoryDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ''
  })

  function createWrapper(overrides: Record<string, any> = {}) {
    return mount(ParameterMultiHistoryDialog, {
      props: {
        modelValue: true,
        title: 'Historique CRH — Glasgow',
        series: glasgowSeries(),
        loading: false,
        ...overrides,
      },
      global: {
        stubs: EL_STUBS,
        directives: { loading: () => {} },
      },
      attachTo: document.body,
    })
  }

  function setViewMode(wrapper: ReturnType<typeof createWrapper>, value: string) {
    const opt = wrapper.find(`.el-segmented__opt[data-value="${value}"]`)
    expect(opt.exists()).toBe(true)
    return opt.trigger('click')
  }

  it('renders the title and defaults to the separate-curves view', () => {
    const wrapper = createWrapper()
    expect(wrapper.find('.el-dialog__title').text()).toBe('Historique CRH — Glasgow')
    // Toolbar toggle with the 3 modes.
    const labels = wrapper.findAll('.el-segmented__opt').map(b => b.text())
    expect(labels).toEqual(['Tableau', 'Courbes séparées', 'Combiné'])
    // Default: one card per series with a chart.
    expect(wrapper.findAll('.multi-history-dialog__card')).toHaveLength(4)
    expect(wrapper.findAll('.chart-line')).toHaveLength(4)
  })

  it('toggles to Tableau: one tab per parameter with the entry count', async () => {
    const wrapper = createWrapper()
    await setViewMode(wrapper, 'table')
    await nextTick()

    const panes = wrapper.findAll('.el-tab-pane')
    expect(panes).toHaveLength(4)
    // Table mode renders the value via formatValue (score 15 visible).
    expect(wrapper.text()).toContain('15')
  })

  it('toggles to Combiné: single combined chart for a homogeneous family (no warning)', async () => {
    const wrapper = createWrapper()
    await setViewMode(wrapper, 'combined')
    await nextTick()

    expect(wrapper.find('.multi-history-dialog__chart--combined').exists()).toBe(true)
    expect(wrapper.findAll('.multi-history-dialog__chart--combined .chart-line')).toHaveLength(1)
    // Homogeneous Glasgow family → no mixed-units warning.
    expect(wrapper.find('.el-alert').exists()).toBe(false)
  })

  it('shows the non-applicable note for categorical values (cetonurie +/++/+++)', () => {
    const wrapper = createWrapper({ series: categoricalSeries(), title: 'Historique CRH — Vitaux' })
    expect(wrapper.find('.multi-history-dialog__note').exists()).toBe(true)
    expect(wrapper.text()).toContain('Courbe non applicable')
    expect(wrapper.find('.chart-line').exists()).toBe(false)
  })

  it('resets the view to separate curves on reopen (anti-stale)', async () => {
    const wrapper = createWrapper()
    await setViewMode(wrapper, 'table')
    await nextTick()
    expect(wrapper.findAll('.el-tab-pane')).toHaveLength(4)

    await wrapper.setProps({ modelValue: false })
    await wrapper.setProps({ modelValue: true })
    await nextTick()

    // Back to the default separate view — never reopen on a stale tab.
    expect(wrapper.findAll('.multi-history-dialog__card')).toHaveLength(4)
  })

  it('renders the empty state when the group has no series', () => {
    const wrapper = createWrapper({ series: [] })
    expect(wrapper.text()).toContain('Aucun paramètre dans ce groupe')
  })
})
