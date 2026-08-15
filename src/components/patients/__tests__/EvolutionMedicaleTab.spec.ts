// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import type { EvolutionMedicaleData } from '@/types/crh-diabete'

// ─── Mock RichTextEditor ──────────────────────────────────────────

vi.mock('@/components/patients/RichTextEditor.vue', () => ({
  default: {
    name: 'RichTextEditor',
    template: '<div class="rich-editor-mock" />',
    props: ['modelValue', 'readonly', 'rows', 'placeholder'],
    emits: ['update:modelValue', 'change'],
  },
}))

// ─── Mock Element Plus ─────────────────────────────────────────────

vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), warning: vi.fn(), error: vi.fn() },
  ElMessageBox: { confirm: vi.fn().mockResolvedValue('confirm') },
}))

// ─── Mock @element-plus/icons-vue ──────────────────────────────────

vi.mock('@element-plus/icons-vue', () => ({
  Plus: { name: 'Plus', render: () => null },
  Minus: { name: 'Minus', render: () => null },
  ArrowDown: { name: 'ArrowDown', render: () => null },
  Edit: { name: 'Edit', render: () => null },
}))

// ─── EL Stubs ──────────────────────────────────────────────────────

const EL_STUBS: Record<string, any> = {
  'el-form': {
    template: '<form class="el-form" @submit.prevent><slot /></form>',
    props: ['labelPosition', 'class'],
  },
  'el-form-item': {
    template: '<div class="el-form-item" :class="$attrs.class"><label v-if="label">{{ label }}</label><slot /></div>',
    props: ['label', 'prop'],
  },
  'el-row': {
    template: '<div class="el-row"><slot /></div>',
    props: ['gutter'],
  },
  'el-col': {
    template: '<div class="el-col"><slot /></div>',
    props: ['span'],
  },
  'el-checkbox': {
    template: '<label class="el-checkbox"><input type="checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)" /><slot /></label>',
    props: ['modelValue'],
    emits: ['update:modelValue', 'change'],
  },
  'el-tag': {
    template: '<span class="el-tag" :type="type" :effect="effect"><slot /></span>',
    props: ['type', 'size', 'effect'],
  },
  'el-icon': {
    template: '<span class="el-icon"><slot /></span>',
  },
  'el-badge': {
    template: '<span class="el-badge" :value="value"><slot /></span>',
    props: ['value'],
  },
  'el-empty': {
    template: '<div class="el-empty" :description="description" :image-size="imageSize"><slot /></div>',
    props: ['description', 'imageSize'],
  },
  'el-button': {
    template: '<button type="button" class="el-button" :disabled="disabled" @click="$emit(\'click\', $event)"><slot /></button>',
    props: ['disabled', 'type', 'size', 'text'],
    emits: ['click'],
  },
}

// ─── Import component ──────────────────────────────────────────────

import EvolutionMedicaleTab from '../EvolutionMedicaleTab.vue'

// ─── Test suite ────────────────────────────────────────────────────

describe('EvolutionMedicaleTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function createDefaultData(overrides: Partial<EvolutionMedicaleData> = {}): EvolutionMedicaleData {
    return {
      infoPatientFamille: false,
      produitsSanguins: false,
      bmrBhre: false,
      journalEvolution: '',
      ...overrides,
    }
  }

  function createWrapper(options: {
    data?: EvolutionMedicaleData
    fieldMeta?: Record<string, string>
  } = {}) {
    const { data = createDefaultData(), fieldMeta } = options

    return mount(EvolutionMedicaleTab, {
      props: { data, fieldMeta },
      global: {
        stubs: EL_STUBS,
      },
    })
  }

  function sectionBodies(wrapper: ReturnType<typeof createWrapper>) {
    return wrapper.findAll('.collapsible-section__body')
  }

  /** Scope to the « Journal de l'Évolution » FormPreview (the tab renders two previews). */
  function journalPreview(wrapper: ReturnType<typeof createWrapper>) {
    const previews = wrapper.findAll('.form-preview')
    const journal = previews.find(p => p.find('.form-preview__title').text().includes('Journal'))
    expect(journal).toBeDefined()
    return journal!
  }

  function journalRows(wrapper: ReturnType<typeof createWrapper>) {
    return journalPreview(wrapper).findAll('.form-preview__row')
  }

  // ─── 1. Per-entry journal preview with timestamps ─────────────

  it('shows one preview row per journal entry with the timestamp as label', () => {
    const wrapper = createWrapper({
      data: createDefaultData({
        journalEvolution: '<p>[12/01/2026 10:30] Entrée un</p><p>[12/01/2026 14:00] Entrée deux</p>',
      }),
    })

    const rows = journalRows(wrapper)
    expect(rows).toHaveLength(2)
    expect(rows[0].find('.form-preview__label').text()).toBe('12/01/2026 10:30')
    expect(rows[0].find('.form-preview__value').text()).toBe('Entrée un')
    expect(rows[1].find('.form-preview__label').text()).toBe('12/01/2026 14:00')
    expect(rows[1].find('.form-preview__value').text()).toBe('Entrée deux')
  })

  // ─── 2. Entries without a timestamp → Entrée #N ───────────────

  it('labels a line without a timestamp as Entrée #1 with the whole line as value', () => {
    const wrapper = createWrapper({
      data: createDefaultData({
        journalEvolution: '<p>texte libre</p>',
      }),
    })

    const rows = journalRows(wrapper)
    expect(rows).toHaveLength(1)
    expect(rows[0].find('.form-preview__label').text()).toBe('Entrée #1')
    expect(rows[0].find('.form-preview__value').text()).toBe('texte libre')
  })

  it('numbers untimestamped entries sequentially (Entrée #1, Entrée #2)', () => {
    const wrapper = createWrapper({
      data: createDefaultData({
        journalEvolution: '<p>Première ligne</p><p>Deuxième ligne</p>',
      }),
    })

    const rows = journalRows(wrapper)
    expect(rows).toHaveLength(2)
    expect(rows[0].find('.form-preview__label').text()).toBe('Entrée #1')
    expect(rows[0].find('.form-preview__value').text()).toBe('Première ligne')
    expect(rows[1].find('.form-preview__label').text()).toBe('Entrée #2')
    expect(rows[1].find('.form-preview__value').text()).toBe('Deuxième ligne')
  })

  // ─── 3. Empty journal → empty state ───────────────────────────

  it('shows no preview rows for an empty journal (empty state)', () => {
    const wrapper = createWrapper({
      data: createDefaultData({ journalEvolution: '' }),
    })

    const journal = journalPreview(wrapper)
    expect(journal.findAll('.form-preview__row')).toHaveLength(0)
    expect(journal.find('.el-empty').exists()).toBe(true)
  })

  // ─── 4. Timestamp + trailing text on the same paragraph ───────

  it('extracts label = timestamp and value = trailing text on the same paragraph', () => {
    const wrapper = createWrapper({
      data: createDefaultData({
        journalEvolution: '<p>[12/01/2026 10:30] Patient stable — sortie envisagée dans 48h</p>',
      }),
    })

    const rows = journalRows(wrapper)
    expect(rows).toHaveLength(1)
    expect(rows[0].find('.form-preview__label').text()).toBe('12/01/2026 10:30')
    expect(rows[0].find('.form-preview__value').text()).toBe('Patient stable — sortie envisagée dans 48h')
  })

  // ─── 5. Staged model (Enregistrer) ──────────────────────────────

  describe('staged model', () => {
    it('sections are collapsed by default', () => {
      const wrapper = createWrapper()
      for (const body of sectionBodies(wrapper)) {
        expect(body.attributes('style') ?? '').toContain('display: none')
      }
    })

    it('keeps edits in the draft until Enregistrer is clicked', async () => {
      const wrapper = createWrapper()
      const header = wrapper.findAll('.collapsible-section__header')[0]
      await header.trigger('click')
      await nextTick()
      const checkbox = wrapper.find('.el-checkbox input')
      await checkbox.setValue(true)
      await nextTick()
      // No preview row yet — the value is only in the draft
      const rows = wrapper.findAll('.form-preview__row')
        .filter(r => r.text().includes('Information du patient / famille'))
      expect(rows).toHaveLength(0)
    })

    it('commits the draft and updates the preview on Enregistrer', async () => {
      const wrapper = createWrapper()
      const header = wrapper.findAll('.collapsible-section__header')[0]
      await header.trigger('click')
      await nextTick()
      const checkbox = wrapper.find('.el-checkbox input')
      await checkbox.setValue(true)
      await nextTick()
      const saveBtn = wrapper.findAll('.staged-section__footer .el-button')[0]
      await saveBtn.trigger('click')
      await nextTick()
      const row = wrapper.findAll('.form-preview__row')
        .find(r => r.text().includes('Information du patient / famille'))
      expect(row).toBeDefined()
      expect(row!.text()).toContain('Oui')
    })
  })

  // ─── 6. Field meta (dernière modification) ────────────────────────

  describe('field meta (dernière modification)', () => {
    let scrollSpy: ReturnType<typeof vi.fn>

    beforeEach(() => {
      scrollSpy = vi.fn()
      // jsdom 24 does not implement Element.prototype.scrollIntoView; install
      // a spy so openSection() can call it, and restore after each test.
      Object.defineProperty(Element.prototype, 'scrollIntoView', {
        value: scrollSpy,
        configurable: true,
        writable: true,
      })
    })

    afterEach(() => {
      delete (Element.prototype as any).scrollIntoView
    })

    it('renders "Modifié le" with a formatted date and a Modifier button for a tracked field', () => {
      const wrapper = createWrapper({
        data: createDefaultData({ infoPatientFamille: true }),
        fieldMeta: { 'evolutionMedicale.infoPatientFamille': '2026-06-15T10:30:00.000Z' },
      })

      const row = wrapper.findAll('.form-preview__row')
        .find(r => r.text().includes('Information du patient / famille'))
      expect(row).toBeDefined()

      expect(row!.find('.form-preview__updated').text())
        .toMatch(/^Modifié le \d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/)

      const btn = row!.find('.form-preview__edit')
      expect(btn.exists()).toBe(true)
      expect(btn.attributes('aria-label')).toBe('Modifier Information du patient / famille')
    })

    it('re-opens the collapsed section and scrolls to it when Modifier is clicked', async () => {
      const wrapper = createWrapper({
        data: createDefaultData({ infoPatientFamille: true }),
        fieldMeta: { 'evolutionMedicale.infoPatientFamille': '2026-06-15T10:30:00.000Z' },
      })

      const body = sectionBodies(wrapper)[0]

      // Prove the section is collapsed BEFORE the click
      expect(body.attributes('style') ?? '').toContain('display: none')

      // The first preview (Événements réglementaires) holds the field row
      const btn = wrapper.findAll('.form-preview')[0]
        .find('.form-preview__row .form-preview__edit')
      expect(btn.exists()).toBe(true)
      await btn.trigger('click')
      await nextTick()

      // openSection() re-opened the section and scrolled to it
      expect(body.attributes('style') ?? '').not.toContain('display: none')
      expect(scrollSpy).toHaveBeenCalled()
    })

    it('renders "Non modifié" when the field is tracked but has no timestamp', () => {
      const wrapper = createWrapper({
        data: createDefaultData({ infoPatientFamille: true }),
        fieldMeta: {},
      })

      const row = wrapper.findAll('.form-preview__row')
        .find(r => r.text().includes('Information du patient / famille'))
      expect(row).toBeDefined()
      expect(row!.find('.form-preview__updated').text()).toBe('Non modifié')
    })
  })
})
