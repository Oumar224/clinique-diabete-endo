// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import type { ExamensComplementairesData } from '@/types/crh-diabete'

// ─── Mock IPC (channel-aware) ──────────────────────────────────────

const { mockIpcInvoke } = vi.hoisted(() => ({
  mockIpcInvoke: vi.fn(),
}))

vi.mock('@/utils/ipc', () => ({
  ipcInvoke: mockIpcInvoke,
}))

const SAMPLE_BIO_RESULTS = [
  { parameterName: 'HbA1c', parameterUnit: '%', value: '7.2', isNormal: false, requestDate: '2026-01-10' },
  { parameterName: 'Glycémie', parameterUnit: 'g/L', value: '1.1', isNormal: true, requestDate: '2026-01-10' },
]

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
  Delete: { name: 'Delete', render: () => null },
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
  'el-select': {
    template: '<select class="el-select" :value="modelValue" :disabled="disabled" @change="$emit(\'update:modelValue\', $event.target.value)"><slot /></select>',
    props: ['modelValue', 'filterable', 'placeholder', 'disabled'],
    emits: ['update:modelValue', 'change'],
  },
  'el-option': {
    template: '<option :value="value">{{ label }}</option>',
    props: ['label', 'value'],
  },
  'el-input': {
    template: '<input class="el-input" :value="modelValue" :disabled="disabled" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'disabled', 'type', 'rows', 'placeholder'],
    emits: ['update:modelValue', 'keyup.enter'],
  },
  'el-input-number': {
    template: '<input class="el-input-number" :value="modelValue" />',
    props: ['modelValue', 'min', 'max', 'controlsPosition', 'style'],
    emits: ['update:modelValue', 'change'],
  },
  'el-date-picker': {
    template: '<input class="el-date-picker" :value="modelValue" :disabled="disabled" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'type', 'valueFormat', 'disabled', 'startPlaceholder', 'endPlaceholder'],
    emits: ['update:modelValue', 'change'],
  },
  'el-button': {
    template: '<button class="el-button" :disabled="disabled" :type="type" :loading="loading" @click="$emit(\'click\', $event)"><slot /></button>',
    props: ['disabled', 'type', 'size', 'text', 'loading'],
    emits: ['click'],
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
  'el-tag': {
    template: '<span class="el-tag" :type="type" :effect="effect"><slot /></span>',
    props: ['type', 'size', 'effect'],
  },
}

// ─── Import component ──────────────────────────────────────────────

import ExamensComplementairesTab from '../ExamensComplementairesTab.vue'

// ─── Test suite ────────────────────────────────────────────────────

describe('ExamensComplementairesTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIpcInvoke.mockImplementation(async (channel: string) => {
      if (channel === 'exam-results:list-by-patient') return SAMPLE_BIO_RESULTS
      return []
    })
  })

  function createDefaultData(overrides: Partial<ExamensComplementairesData> = {}): ExamensComplementairesData {
    return {
      imagerieTests: [],
      bilanBio: { dateFrom: '', dateTo: '', results: [] },
      ...overrides,
    }
  }

  function createWrapper(options: {
    data?: ExamensComplementairesData
    patientId?: number | null
    fieldMeta?: Record<string, string>
  } = {}) {
    const { data = createDefaultData(), patientId, fieldMeta } = options

    return mount(ExamensComplementairesTab, {
      props: { data, patientId, fieldMeta },
      global: {
        stubs: EL_STUBS,
      },
    })
  }

  function sectionBodies(wrapper: ReturnType<typeof createWrapper>) {
    return wrapper.findAll('.collapsible-section__body')
  }

  async function openSection(wrapper: ReturnType<typeof createWrapper>, index: number) {
    await wrapper.findAll('.collapsible-section__header')[index].trigger('click')
    await nextTick()
  }

  function sectionFooterButtons(wrapper: ReturnType<typeof createWrapper>, index: number) {
    return sectionBodies(wrapper)[index].find('.staged-section__footer').findAll('.el-button')
  }

  async function clickEnregistrer(wrapper: ReturnType<typeof createWrapper>, index: number) {
    await sectionFooterButtons(wrapper, index)[0].trigger('click')
    await nextTick()
  }

  // ─── 1. Sections rendered ──────────────────────────────────────

  it('renders only the Imagerie / Test and Résultat Bio sections (legacy sections removed)', () => {
    const wrapper = createWrapper()

    const titles = wrapper.findAll('.collapsible-section__title').map(el => el.text())
    expect(titles).toEqual(['Imagerie / Test', 'Résultat Bio'])

    expect(wrapper.text()).not.toContain('Ajouter un acte')
  })

  // ─── 2. Add an exam ────────────────────────────────────────────

  it('adds an examen card with Date / Type / Résultat fields and the full type select', async () => {
    const data = createDefaultData()
    const wrapper = createWrapper({ data })

    await openSection(wrapper, 0)
    expect(wrapper.findAll('.examen-card')).toHaveLength(0)

    const addBtn = wrapper.findAll('.el-button').find(b => b.text().includes('Ajouter un examen'))
    expect(addBtn).toBeDefined()
    await addBtn!.trigger('click')

    const cards = wrapper.findAll('.examen-card')
    expect(cards).toHaveLength(1)
    // draft holds the new card, data is untouched until Enregistrer
    expect(data.imagerieTests).toHaveLength(0)

    const cardText = cards[0].text()
    expect(cardText).toContain('Date de l\'examen')
    expect(cardText).toContain('Type d\'examen')
    expect(cardText).toContain('Résultat / Conclusion')

    const typeSelect = cards[0].find('select.el-select')
    const options = typeSelect.findAll('option').map(o => o.text())
    expect(options).toEqual([
      'Radiographie du pied',
      'ECG de repos',
      'Échographie cardiaque',
      'Échographie abdominale',
      'Doppler',
      'Scanner',
      'IRM',
      'Holter',
      'Autre (libre)',
    ])

    await clickEnregistrer(wrapper, 0)
    expect(data.imagerieTests).toHaveLength(1)
    expect(wrapper.emitted('change')).toBeTruthy()
  })

  it('renders an icon-only delete button on each examen card', async () => {
    const data = createDefaultData({
      imagerieTests: [{ _key: 'k1', date: '', type: '', typeLibre: '', resultat: '' }],
    })
    const wrapper = createWrapper({ data })
    await openSection(wrapper, 0)

    const delBtn = wrapper.find('.examen-card .el-button')
    expect(delBtn.exists()).toBe(true)
    expect(delBtn.attributes('aria-label')).toBe('Supprimer examen #1')
    expect(delBtn.text().trim()).toBe('')
  })

  // ─── 3. "Autre (libre)" reveals the free-type input ────────────

  it('reveals the "Précisez le type" input when "Autre (libre)" is selected', async () => {
    const data = createDefaultData()
    const wrapper = createWrapper({ data })

    await openSection(wrapper, 0)
    const addBtn = wrapper.findAll('.el-button').find(b => b.text().includes('Ajouter un examen'))
    await addBtn!.trigger('click')

    const card = wrapper.find('.examen-card')
    expect(card.text()).not.toContain('Précisez le type')

    await card.find('select.el-select').setValue('__autre__')

    expect(card.text()).toContain('Précisez le type')
    // draft holds the selection; commit it to data
    await clickEnregistrer(wrapper, 0)
    expect(data.imagerieTests[0].type).toBe('__autre__')
  })

  // ─── 4. Remove an exam ─────────────────────────────────────────

  it('removes an examen card', async () => {
    const data = createDefaultData({
      imagerieTests: [{ _key: 'k1', date: '', type: '', typeLibre: '', resultat: '' }],
    })
    const wrapper = createWrapper({ data })
    await openSection(wrapper, 0)
    expect(wrapper.findAll('.examen-card')).toHaveLength(1)

    const delBtn = wrapper.find('.examen-card .el-button')
    await delBtn.trigger('click')

    // removed from the draft; data is untouched until Enregistrer
    expect(wrapper.findAll('.examen-card')).toHaveLength(0)
    expect(data.imagerieTests).toHaveLength(1)

    await clickEnregistrer(wrapper, 0)
    expect(data.imagerieTests).toHaveLength(0)
  })

  // ─── 5. Fetch disabled without patientId ───────────────────────

  it('disables « Récupérer les résultats » when patientId is not provided', async () => {
    const wrapper = createWrapper({
      data: createDefaultData({
        bilanBio: { dateFrom: '2026-01-01', dateTo: '2026-01-31', results: [] },
      }),
    })
    await openSection(wrapper, 1)

    const btn = wrapper.findAll('.el-button').find(b => b.text().includes('Récupérer les résultats'))
    expect(btn).toBeDefined()
    expect(btn!.attributes('disabled') !== undefined).toBe(true)
  })

  // ─── 6. Fetch bio results with patientId ───────────────────────

  it('fetches bio results via ipc and populates the table', async () => {
    const data = createDefaultData({
      bilanBio: { dateFrom: '2026-01-01', dateTo: '2026-01-31', results: [] },
    })
    const wrapper = createWrapper({ data, patientId: 42 })
    await openSection(wrapper, 1)

    const btn = wrapper.findAll('.el-button').find(b => b.text().includes('Récupérer les résultats'))
    expect(btn).toBeDefined()
    expect(btn!.attributes('disabled')).toBeUndefined()

    await btn!.trigger('click')
    await flushPromises()

    expect(mockIpcInvoke).toHaveBeenCalledWith('exam-results:list-by-patient', {
      patientId: 42,
      dateFrom: '2026-01-01',
      dateTo: '2026-01-31',
    })
    // results land in the draft, not in data yet
    expect(data.bilanBio.results).toHaveLength(0)

    // 1 group header row (results carry no examName → fallback group) + 2 parameter rows
    const rows = wrapper.findAll('tbody tr')
    expect(rows).toHaveLength(3)
    expect(wrapper.text()).toContain('Examen non précisé')
    expect(wrapper.text()).toContain('HbA1c')
    expect(wrapper.text()).toContain('7.2')
    expect(wrapper.text()).toContain('Glycémie')
    expect(wrapper.text()).toContain('1.1')
    expect(wrapper.text()).toContain('2026-01-10')

    const abnormalCell = wrapper.find('.bio-table__abnormal')
    expect(abnormalCell.exists()).toBe(true)
    expect(abnormalCell.text()).toBe('7.2')

    await clickEnregistrer(wrapper, 1)
    expect(data.bilanBio.dateFrom).toBe('2026-01-01')
    expect(data.bilanBio.dateTo).toBe('2026-01-31')
    expect(data.bilanBio.results).toHaveLength(2)
    expect(data.bilanBio.results[0].parameterName).toBe('HbA1c')
    expect(wrapper.emitted('change')).toBeTruthy()
  })

  // ─── 7. Effacer clears results ─────────────────────────────────

  it('clears bio results with the Effacer button', async () => {
    const data = createDefaultData({
      bilanBio: {
        dateFrom: '2026-01-01',
        dateTo: '2026-01-31',
        results: [SAMPLE_BIO_RESULTS[0]],
      },
    })
    const wrapper = createWrapper({ data })
    await openSection(wrapper, 1)
    // 1 group header row + 1 parameter row
    expect(wrapper.findAll('tbody tr')).toHaveLength(2)

    const clearBtn = wrapper.findAll('.el-button').find(b => b.text().includes('Effacer'))
    expect(clearBtn).toBeDefined()
    await clearBtn!.trigger('click')

    // cleared in the draft; data is untouched until Enregistrer
    expect(wrapper.find('.bio-table__empty').exists()).toBe(true)
    expect(data.bilanBio.results).toHaveLength(1)

    await clickEnregistrer(wrapper, 1)
    expect(data.bilanBio.results).toHaveLength(0)
    expect(data.bilanBio.dateFrom).toBe('')
    expect(data.bilanBio.dateTo).toBe('')
  })

  // ─── 8. formatReferenceValues (min – max) ──────────────────────

  it('renders numeric min/max reference values as "min – max"', async () => {
    const data = createDefaultData({
      bilanBio: {
        dateFrom: '2026-01-01',
        dateTo: '2026-01-31',
        results: [{
          parameterName: 'Créatinine',
          value: '85',
          parameterUnit: 'µmol/L',
          parameterReferenceValues: { min: 3.5, max: 6.5 },
          requestDate: '2026-01-10',
        }],
      },
    })
    const wrapper = createWrapper({ data })
    await openSection(wrapper, 1)

    expect(wrapper.text()).toContain('3.5 – 6.5')
  })

  // ─── 9. Résultat Bio grouped by examName ────────────────────────

  it('groups Résultat Bio by examName with one header per group, params sorted by name', async () => {
    const data = createDefaultData({
      bilanBio: {
        dateFrom: '2026-01-01',
        dateTo: '2026-01-31',
        results: [
          { parameterName: 'HbA1c', parameterUnit: '%', value: '7.2', isNormal: false, requestDate: '2026-01-10', examName: 'Bilan glycémique' },
          { parameterName: 'Glycémie', parameterUnit: 'g/L', value: '1.1', isNormal: true, requestDate: '2026-01-10', examName: 'Bilan glycémique' },
          { parameterName: 'Créatinine', parameterUnit: 'µmol/L', value: '85', isNormal: true, requestDate: '2026-01-10', examName: 'Bilan rénal' },
        ],
      },
    })
    const wrapper = createWrapper({ data })
    await openSection(wrapper, 1)

    const text = wrapper.text()
    // both group headers are rendered
    expect(text).toContain('Bilan glycémique')
    expect(text).toContain('Bilan rénal')
    // every parameter is rendered
    expect(text).toContain('HbA1c')
    expect(text).toContain('Glycémie')
    expect(text).toContain('Créatinine')

    // groups sorted alphabetically (case-insensitive): Bilan glycémique < Bilan rénal
    expect(text.indexOf('Bilan glycémique')).toBeLessThan(text.indexOf('Bilan rénal'))
    // parameters sorted by name within a group: Glycémie < HbA1c
    expect(text.indexOf('Glycémie')).toBeLessThan(text.indexOf('HbA1c'))
    // each parameter is rendered after its group header
    expect(text.indexOf('Glycémie')).toBeGreaterThan(text.indexOf('Bilan glycémique'))
    expect(text.indexOf('HbA1c')).toBeGreaterThan(text.indexOf('Bilan glycémique'))
    expect(text.indexOf('Créatinine')).toBeGreaterThan(text.indexOf('Bilan rénal'))
  })

  it('groups results without examName under « Examen non précisé »', async () => {
    const data = createDefaultData({
      bilanBio: {
        dateFrom: '',
        dateTo: '',
        results: [
          { parameterName: 'HbA1c', parameterUnit: '%', value: '7.2', requestDate: '2026-01-10' },
          { parameterName: 'Créatinine', parameterUnit: 'µmol/L', value: '85', requestDate: '2026-01-10', examName: '' },
        ],
      },
    })
    const wrapper = createWrapper({ data })
    await openSection(wrapper, 1)

    const text = wrapper.text()
    expect(text).toContain('Examen non précisé')
    expect(text).toContain('HbA1c')
    expect(text).toContain('Créatinine')
    // both parameters land under the fallback group header
    expect(text.indexOf('HbA1c')).toBeGreaterThan(text.indexOf('Examen non précisé'))
    expect(text.indexOf('Créatinine')).toBeGreaterThan(text.indexOf('Examen non précisé'))
  })

  it('removes the correct flat entry when results are grouped', async () => {
    const data = createDefaultData({
      bilanBio: {
        dateFrom: '',
        dateTo: '',
        results: [
          { parameterName: 'HbA1c', parameterUnit: '%', value: '7.2', requestDate: '2026-01-10', examName: 'Bilan glycémique' },
          { parameterName: 'Créatinine', parameterUnit: 'µmol/L', value: '85', requestDate: '2026-01-10', examName: 'Bilan rénal' },
          { parameterName: 'Glycémie', parameterUnit: 'g/L', value: '1.1', requestDate: '2026-01-10', examName: 'Bilan glycémique' },
        ],
      },
    })
    const wrapper = createWrapper({ data })
    await openSection(wrapper, 1)

    const rows = wrapper.findAll('tbody tr')
    const creatinineRow = rows.find(r => r.text().includes('Créatinine'))
    expect(creatinineRow).toBeDefined()
    const removeBtn = creatinineRow!.find('.el-button')
    expect(removeBtn.exists()).toBe(true)
    await removeBtn.trigger('click')

    // removed from the draft; data is untouched until Enregistrer
    expect(data.bilanBio.results).toHaveLength(3)
    const tableText = wrapper.find('.bio-table-wrap').text()
    expect(tableText).not.toContain('Créatinine')
    expect(tableText).toContain('Bilan glycémique')

    await clickEnregistrer(wrapper, 1)
    // the flat results array is spliced at the correct index (grouping is display-only)
    expect(data.bilanBio.results).toHaveLength(2)
    expect(data.bilanBio.results.map(r => r.parameterName)).toEqual(['HbA1c', 'Glycémie'])
  })

  it('commits a manually set bio date range to data on Enregistrer', async () => {
    const data = createDefaultData()
    const wrapper = createWrapper({ data, patientId: 42 })
    await openSection(wrapper, 1)

    const rangePicker = wrapper.find('.el-date-picker')
    await rangePicker.setValue('2026-02-01→2026-02-28')

    const fetchBtn = wrapper.findAll('.el-button').find(b => b.text().includes('Récupérer les résultats'))
    expect(fetchBtn!.attributes('disabled')).toBeUndefined()

    await fetchBtn!.trigger('click')
    await flushPromises()

    // range + results committed together on Enregistrer
    expect(data.bilanBio.dateFrom).toBe('')
    await clickEnregistrer(wrapper, 1)
    expect(data.bilanBio.dateFrom).toBe('2026-02-01')
    expect(data.bilanBio.dateTo).toBe('2026-02-28')
  })

  // ─── 10. Field meta (dernière modification) ───────────────────────

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
        data: createDefaultData({
          imagerieTests: [{ _key: 'k1', date: '2026-01-05', type: 'Scanner', typeLibre: '', resultat: 'Normal' }],
        }),
        fieldMeta: { 'examensComplementaires.imagerieTests': '2026-06-15T10:30:00.000Z' },
      })

      const row = wrapper.findAll('.form-preview__row')
        .find(r => r.text().includes('Scanner'))
      expect(row).toBeDefined()

      expect(row!.find('.form-preview__updated').text())
        .toMatch(/^Modifié le \d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/)

      const btn = row!.find('.form-preview__edit')
      expect(btn.exists()).toBe(true)
      expect(btn.attributes('aria-label')).toBe('Modifier 2026-01-05 · Scanner')
    })

    it('re-opens the collapsed section and scrolls to it when Modifier is clicked', async () => {
      const wrapper = createWrapper({
        data: createDefaultData({
          imagerieTests: [{ _key: 'k1', date: '2026-01-05', type: 'Scanner', typeLibre: '', resultat: 'Normal' }],
        }),
        fieldMeta: { 'examensComplementaires.imagerieTests': '2026-06-15T10:30:00.000Z' },
      })

      const body = sectionBodies(wrapper)[0]

      // Prove the section is collapsed BEFORE the click
      expect(body.attributes('style') ?? '').toContain('display: none')

      // The first preview (Imagerie / Test) holds the exam row
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
        data: createDefaultData({
          imagerieTests: [{ _key: 'k1', date: '2026-01-05', type: 'Scanner', typeLibre: '', resultat: 'Normal' }],
        }),
        fieldMeta: {},
      })

      const row = wrapper.findAll('.form-preview__row')
        .find(r => r.text().includes('Scanner'))
      expect(row).toBeDefined()
      expect(row!.find('.form-preview__updated').text()).toBe('Non modifié')
    })
  })
})
