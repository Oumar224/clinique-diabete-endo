// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import type { ParameterHistoryEntry } from '@/composables/useParameterHistory'

// ─── Mock Element Plus ─────────────────────────────────────────────

vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), warning: vi.fn(), error: vi.fn() },
}))

// ─── Stubs for all Element Plus components ─────────────────────────
// `el-table` provides the rows via provide/inject so that each
// `el-table-column` stub can render one cell per entry (including the
// dialog's scoped slots `#default="{ row }"`).

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
  'el-table': {
    template: '<div class="el-table"><slot /></div>',
    props: ['data', 'size'],
    provide() {
      return { elTableData: this.data }
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
  'el-tag': {
    template: '<span class="el-tag" :type="type" :effect="effect"><slot /></span>',
    props: ['type', 'size', 'effect'],
  },
  'el-empty': {
    template: '<div class="el-empty"><span class="el-empty__description">{{ description }}</span><slot /></div>',
    props: ['description', 'imageSize'],
  },
  'el-button': {
    template: '<button class="el-button" :disabled="disabled" :type="type" :size="size" @click="$emit(\'click\', $event)"><slot /></button>',
    props: ['disabled', 'type', 'size', 'loading'],
    emits: ['click'],
  },
}

// ─── Import component ──────────────────────────────────────────────

import ParameterHistoryDialog from '../ParameterHistoryDialog.vue'

// ─── Test fixtures ─────────────────────────────────────────────────

const ENTRIES: ParameterHistoryEntry[] = [
  {
    date: '2025-03-15T10:30:00',
    documentId: 'doc-1',
    documentLabel: 'CRH Diabète',
    status: 'signed',
    value: 75,
  },
  {
    date: '2025-01-10T08:00:00',
    documentId: 'doc-2',
    documentLabel: 'CRH Diabète (brouillon)',
    status: 'draft',
    value: 70,
  },
]

// ─── Test suite ────────────────────────────────────────────────────

describe('ParameterHistoryDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ''
  })

  function createWrapper({
    modelValue = true,
    title = 'Historique — Poids (kg)',
    path = 'bilanInitial.examenPhysique.poids',
    loading = false,
    entries = ENTRIES,
  } = {}) {
    return mount(ParameterHistoryDialog, {
      props: {
        modelValue,
        title,
        path,
        loading,
        entries,
      },
      global: {
        stubs: EL_STUBS,
        directives: { loading: () => {} },
      },
      attachTo: document.body,
    })
  }

  describe('rendering', () => {
    it('renders the title as "Historique — <title>" when modelValue is true', () => {
      const wrapper = createWrapper({ title: 'Historique — Poids (kg)' })
      expect(wrapper.find('.el-dialog__title').text()).toContain('Historique — Poids (kg)')
    })

    it('renders one row per entry: document label, formatted date, and formatted value', () => {
      const wrapper = createWrapper()

      // 3 columns × 2 entries
      expect(wrapper.findAll('.el-table-column__cell')).toHaveLength(6)

      // Entry 1
      expect(wrapper.text()).toContain('CRH Diabète')
      expect(wrapper.text()).toContain('15/03/2025')
      expect(wrapper.text()).toContain('10:30')
      expect(wrapper.text()).toContain('75')

      // Entry 2
      expect(wrapper.text()).toContain('CRH Diabète (brouillon)')
      expect(wrapper.text()).toContain('10/01/2025')
      expect(wrapper.text()).toContain('70')
    })

    it('formats values with the registered meta formatter for the given path', () => {
      const wrapper = createWrapper({
        path: 'modeVieAtcd.isolement',
        title: 'Historique — Isolement',
        entries: [
          {
            date: '2025-02-01T09:00:00',
            documentId: 'doc-1',
            documentLabel: 'CRH Diabète',
            status: 'signed',
            value: true,
          },
        ],
      })

      expect(wrapper.text()).toContain('Oui')
    })

    it('shows the empty state text when entries is empty', () => {
      const wrapper = createWrapper({ entries: [] })

      expect(wrapper.find('.el-empty').exists()).toBe(true)
      expect(wrapper.text()).toContain('Aucun historique pour ce paramètre')
    })

    it('does not render content when modelValue is false', () => {
      const wrapper = createWrapper({ modelValue: false })

      expect(wrapper.find('.el-dialog').exists()).toBe(false)
      expect(wrapper.text()).not.toContain('Historique — Poids (kg)')
      expect(wrapper.find('.el-table').exists()).toBe(false)
    })

    it('does not render the table or the empty state while loading', () => {
      const wrapper = createWrapper({ loading: true, entries: [] })

      expect(wrapper.find('.el-table').exists()).toBe(false)
      expect(wrapper.find('.el-empty').exists()).toBe(false)
    })

    it('renders the table once loading finishes', () => {
      const loadingWrapper = createWrapper({ loading: true })
      expect(loadingWrapper.find('.el-table').exists()).toBe(false)

      const loadedWrapper = createWrapper({ loading: false })
      expect(loadedWrapper.find('.el-table').exists()).toBe(true)
      expect(loadedWrapper.findAll('.el-table-column__cell')).toHaveLength(6)
    })
  })

  describe('closing', () => {
    it('emits update:modelValue false when the Fermer button is clicked', async () => {
      const wrapper = createWrapper()
      const closeBtn = wrapper.findAll('.el-button').find(b => b.text().includes('Fermer'))
      expect(closeBtn).toBeDefined()

      await closeBtn!.trigger('click')

      expect(wrapper.emitted('update:modelValue')).toBeDefined()
      expect(wrapper.emitted('update:modelValue')![0]).toEqual([false])
    })
  })
})
