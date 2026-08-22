// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import BioMatrixTable from '../BioMatrixTable.vue'
import type { MatrixGroup } from '@/composables/useExamResults'

vi.mock('@element-plus/icons-vue', () => ({
  Delete: { name: 'Delete', template: '<span />' },
}))

// ─── Stubs ─────────────────────────────────────────────────────────────────

const stubs: Record<string, any> = {
  'el-button': {
    template: '<button class="el-button" :aria-label="ariaLabel" @click="$emit(\'click\', $event)"><slot /><slot name="icon" /></button>',
    props: ['ariaLabel', 'size', 'type', 'disabled', 'icon'],
    emits: ['click'],
  },
  'el-icon': {
    template: '<span class="el-icon"><slot /></span>',
    props: ['size', 'color'],
  },
}

// ─── Fixtures ──────────────────────────────────────────────────────────────

function makeRow(overrides: Record<string, any> = {}) {
  return {
    parameterId: 'param-1',
    parameterName: 'Glycémie à jeun',
    parameterUnit: 'g/L',
    parameterInputType: 'numeric',
    referenceValues: { min: 0.7, max: 1.1 },
    dates: {
      '2026-07-01': { value: '0.95', isNormal: true },
      '2026-07-02': { value: '1.45', isNormal: false },
    },
    ...overrides,
  }
}

function makeGroup(overrides: Record<string, any> = {}): MatrixGroup {
  return {
    examName: 'Bilan glycémique',
    rows: [makeRow()],
    ...overrides,
  }
}

describe('BioMatrixTable', () => {
  function createWrapper(props: Record<string, any> = {}) {
    return mount(BioMatrixTable, {
      props: { groups: [makeGroup()], ...props },
      global: { stubs },
    })
  }

  // ─── Rendering ────────────────────────────────────────────────────

  describe('rendering', () => {
    it('renders the left header cells (Analyses, Unités, Valeur de référence)', () => {
      const wrapper = createWrapper()
      expect(wrapper.find('.rb__analyses-header').text()).toContain('Analyses')
      expect(wrapper.find('.rb__unites-header').text()).toContain('Unités')
      expect(wrapper.find('.rb__ref-header').text()).toContain('Valeur de référence')
      expect(wrapper.find('.rb__delete-header').exists()).toBe(false)
    })

    it('renders one group header per exam group', () => {
      const wrapper = createWrapper({ groups: [makeGroup(), makeGroup({ examName: 'Ionogramme' })] })
      const headers = wrapper.findAll('.rb__group-header')
      expect(headers).toHaveLength(2)
      expect(headers[0].text()).toContain('Bilan glycémique')
      expect(headers[1].text()).toContain('Ionogramme')
    })

    it('renders parameter name and unit for each row', () => {
      const wrapper = createWrapper()
      expect(wrapper.find('.rb__analyses-name').text()).toBe('Glycémie à jeun')
      expect(wrapper.find('.rb__unites-text').text()).toBe('g/L')
    })

    it('shows an em dash when the unit is missing', () => {
      const wrapper = createWrapper({ groups: [makeGroup({ rows: [makeRow({ parameterUnit: null })] })] })
      expect(wrapper.find('.rb__unites-text').text()).toBe('—')
    })
  })

  // ─── Reference values ─────────────────────────────────────────────

  describe('reference values', () => {
    it('formats numeric reference ranges (min – max)', () => {
      const wrapper = createWrapper()
      expect(wrapper.find('.rb__ref-text').text()).toContain('0.7 – 1.1')
    })

    it('formats sex-specific ranges when provided', () => {
      const wrapper = createWrapper({
        groups: [makeGroup({
          rows: [makeRow({
            referenceValues: { min_h: 13, max_h: 17, min_f: 12, max_f: 15 },
          })],
        })],
      })
      expect(wrapper.find('.rb__ref-text').text()).toContain('H: 13–17 / F: 12–15')
    })

    it('formats select options joined by commas', () => {
      const wrapper = createWrapper({
        groups: [makeGroup({
          rows: [makeRow({
            parameterInputType: 'select',
            referenceValues: { options: [{ value: 'A' }, { value: 'B' }, { value: 'AB' }] },
          })],
        })],
      })
      expect(wrapper.find('.rb__ref-text').text()).toContain('A, B, AB')
    })

    it('shows an em dash when nothing can be formatted', () => {
      const wrapper = createWrapper({
        groups: [makeGroup({ rows: [makeRow({ referenceValues: undefined })] })],
      })
      expect(wrapper.find('.rb__ref-text').text()).toBe('—')
    })
  })

  // ─── Value cells ──────────────────────────────────────────────────

  describe('value cells', () => {
    it('renders one date column per unique date key, sorted', () => {
      const wrapper = createWrapper({
        groups: [makeGroup({
          rows: [makeRow({
            dates: {
              '2026-07-03': { value: '1.0', isNormal: true },
              '2026-07-01': { value: '0.9', isNormal: true },
            },
          })],
        })],
      })
      const headers = wrapper.findAll('.rb__date-header')
      expect(headers).toHaveLength(2)
      expect(headers[0].text()).toContain('01/07/2026')
      expect(headers[1].text()).toContain('03/07/2026')
    })

    it('renders values with the normal cell class for normal results', () => {
      const wrapper = createWrapper()
      const cell = wrapper.find('.rb__cell')
      expect(cell.text()).toContain('0.95')
      expect(cell.classes()).toContain('rb__cell--normal')
    })

    it('marks abnormal cells with the abnormal class and an arrow', () => {
      const wrapper = createWrapper()
      const cells = wrapper.findAll('.rb__cell')
      expect(cells[1].classes()).toContain('rb__cell--abnormal')
      expect(cells[1].find('.rb__arrow').exists()).toBe(true)
    })

    it('renders a down arrow when the value is below the reference minimum', () => {
      const wrapper = createWrapper({
        groups: [makeGroup({
          rows: [makeRow({
            dates: { '2026-07-01': { value: '0.45', isNormal: false } },
          })],
        })],
      })
      const arrow = wrapper.find('.rb__arrow')
      expect(arrow.text()).toBe('↓')
      expect(arrow.classes()).toContain('rb__arrow--low')
    })

    it('renders an up arrow when the value is above the reference maximum', () => {
      const wrapper = createWrapper()
      const cells = wrapper.findAll('.rb__cell')
      const arrow = cells[1].find('.rb__arrow')
      expect(arrow.text()).toBe('↑')
      expect(arrow.classes()).toContain('rb__arrow--high')
    })

    it('renders an em dash for empty cells', () => {
      const wrapper = createWrapper({
        groups: [makeGroup({
          rows: [makeRow({ dates: { '2026-07-01': { value: '', isNormal: undefined } } })],
        })],
      })
      expect(wrapper.find('.rb__cell').text()).toBe('—')
      expect(wrapper.find('.rb__cell').classes()).toContain('rb__cell--no-data')
    })
  })

  // ─── Deletable mode ───────────────────────────────────────────────

  describe('deletable mode', () => {
    it('shows the Supprimer header and a delete button per row', () => {
      const wrapper = createWrapper({ deletable: true })
      expect(wrapper.find('.rb__delete-header').text()).toContain('Supprimer')
      expect(wrapper.findAll('.rb__delete-cell')).toHaveLength(1)
      expect(wrapper.find('.rb__delete-cell .el-button').exists()).toBe(true)
    })

    it('emits delete with the row when the delete button is clicked', async () => {
      const row = makeRow()
      const wrapper = createWrapper({ deletable: true, groups: [makeGroup({ rows: [row] })] })
      await wrapper.find('.rb__delete-cell .el-button').trigger('click')
      expect(wrapper.emitted('delete')).toBeDefined()
      expect(wrapper.emitted('delete')![0]).toEqual([row])
    })

    it('does not render delete buttons when deletable is false', () => {
      const wrapper = createWrapper()
      expect(wrapper.find('.rb__delete-cell').exists()).toBe(false)
    })
  })

  // ─── Week mode (dateColumns + hourSlots) ──────────────────────────

  describe('week mode', () => {
    it('renders one date header per day with hour slots', () => {
      const wrapper = createWrapper({
        groups: [makeGroup({
          rows: [makeRow({ dates: { '2026-07-01|9': { value: '0.95', isNormal: true } } })],
        })],
        dateColumns: [
          { key: '2026-07-01', name: 'Mer', dateLabel: '01/07', isToday: true },
          { key: '2026-07-02', name: 'Jeu', dateLabel: '02/07', isToday: false },
        ],
        hourSlots: [9, 10],
      })
      const headers = wrapper.findAll('.rb__date-header')
      expect(headers).toHaveLength(2)
      expect(headers[0].text()).toContain('Mer')
      expect(headers[0].text()).toContain('09:00')
      expect(headers[0].text()).toContain('10:00')
      expect(headers[0].classes()).toContain('rb__date-header--today')
      expect(headers[1].text()).toContain('Jeu')
      expect(headers[1].classes()).not.toContain('rb__date-header--today')
    })
  })

  // ─── Empty state ──────────────────────────────────────────────────

  describe('empty state', () => {
    it('shows the empty message when there are no groups', () => {
      const wrapper = createWrapper({ groups: [] })
      expect(wrapper.find('.rb__empty-row').text()).toContain('Aucun résultat disponible')
    })

    it('does not render the empty row when emptyText is empty', () => {
      const wrapper = createWrapper({ groups: [], emptyText: '' })
      expect(wrapper.find('.rb__empty-row').exists()).toBe(false)
    })
  })
})