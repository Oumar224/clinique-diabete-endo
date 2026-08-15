// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import type { FicheDiabeteData } from '@/types/crh-diabete'

// ─── Mock calculations composable (controllable) ───────────────────

const { mockCalcDureeDiabete, mockCalcDFG, mockCalcStadeIR } = vi.hoisted(() => ({
  mockCalcDureeDiabete: vi.fn(),
  mockCalcDFG: vi.fn(),
  mockCalcStadeIR: vi.fn(),
}))

vi.mock('@/composables/useCrhDiabeteCalculations', () => ({
  useCrhDiabeteCalculations: () => ({
    calcDureeDiabete: mockCalcDureeDiabete,
    calcDFG: mockCalcDFG,
    calcStadeIR: mockCalcStadeIR,
  }),
}))

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

import { ElMessageBox } from 'element-plus'

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
  'el-select': {
    template: '<select class="el-select" :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><slot /></select>',
    props: ['modelValue', 'placeholder'],
    emits: ['update:modelValue', 'change'],
  },
  'el-option': {
    template: '<option class="el-option" :value="value">{{ label }}</option>',
    props: ['label', 'value'],
  },
  'el-input-number': {
    template: '<input class="el-input-number" :value="modelValue" :disabled="disabled" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'min', 'max', 'step', 'controlsPosition', 'disabled'],
    emits: ['update:modelValue', 'change'],
  },
  'el-date-picker': {
    template: '<input class="el-date-picker" :value="modelValue" :disabled="disabled" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'type', 'valueFormat', 'disabled', 'style'],
    emits: ['update:modelValue'],
  },
  'el-checkbox': {
    template: '<label class="el-checkbox"><input type="checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)" /><slot /></label>',
    props: ['modelValue'],
    emits: ['update:modelValue', 'change'],
  },
  'el-input': {
    template: '<input class="el-input" :value="modelValue" :disabled="disabled" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'disabled', 'type', 'rows', 'placeholder'],
    emits: ['update:modelValue'],
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
    template: '<button class="el-button" :disabled="disabled" :type="type" @click="$emit(\'click\', $event)"><slot /></button>',
    props: ['disabled', 'type', 'size', 'text', 'loading'],
    emits: ['click'],
  },
}

// ─── Import component ──────────────────────────────────────────────

import FicheDiabeteTab from '../FicheDiabeteTab.vue'

// ─── Test suite ────────────────────────────────────────────────────

describe('FicheDiabeteTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCalcDureeDiabete.mockReturnValue('6 ans')
    mockCalcDFG.mockReturnValue(92)
    mockCalcStadeIR.mockReturnValue('G2')
  })

  function createDefaultData(overrides: Partial<FicheDiabeteData> = {}): FicheDiabeteData {
    return {
      dateDiagnostic: '',
      poidsForme: null,
      poidsJuillet2024: null,
      poidsDecembre2025: null,
      hba1c: null,
      hba1cDate: '',
      hdl: null,
      ldl: null,
      triglycerides: null,
      retinopathie: 'Absente',
      creatininemie: null,
      neuropathie: false,
      podologiqueGrade: null,
      amputation: false,
      amputationDetail: '',
      insuffisanceCardiaque: false,
      ntProBNP: null,
      aomi: false,
      ischemicCritique: '',
      ...overrides,
    }
  }

  function createWrapper(options: {
    data?: FicheDiabeteData
    fieldMeta?: Record<string, string>
  } = {}) {
    const { data = createDefaultData(), fieldMeta } = options

    return mount(FicheDiabeteTab, {
      props: {
        data,
        sexe: 'F',
        age: 45,
        dateEntree: '2026-06-01',
        fieldMeta,
      },
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

  // ─── 1. Sections & previews ─────────────────────────────────────

  it('renders the 4 CollapsibleSection headers in order', () => {
    const wrapper = createWrapper()
    const titles = wrapper.findAll('.collapsible-section__title').map(el => el.text())
    expect(titles).toEqual([
      'Historique du Diabète',
      'Suivi Pondéral',
      'Dernier Bilan Métabolique',
      'Complications Micro & Macro-vasculaires',
    ])
  })

  it('renders one compact FormPreview per section', () => {
    const wrapper = createWrapper()
    const previews = wrapper.findAll('.form-preview')
    expect(previews).toHaveLength(4)
    for (const preview of previews) {
      expect(preview.classes()).toContain('form-preview--compact')
    }
  })

  it('sections are collapsed by default and toggle open on header click', async () => {
    const wrapper = createWrapper()
    const firstHeader = wrapper.findAll('.collapsible-section__header')[0]
    const firstBody = sectionBodies(wrapper)[0]

    expect(firstBody.attributes('style') ?? '').toContain('display: none')

    await firstHeader.trigger('click')
    await nextTick()
    expect(firstBody.attributes('style') ?? '').not.toContain('display: none')

    await firstHeader.trigger('click')
    await nextTick()
    expect(firstBody.attributes('style') ?? '').toContain('display: none')
  })

  // ─── 2. Historique preview ──────────────────────────────────────

  it('renders the historique preview rows (date du diagnostic + durée)', () => {
    const wrapper = createWrapper({
      data: createDefaultData({ dateDiagnostic: '2026-01' }),
    })
    const preview = wrapper.findAll('.form-preview')[0]
    const rows = preview.findAll('.form-preview__row')

    const dateRow = rows.find(r => r.text().includes('Date du diagnostic'))
    expect(dateRow).toBeDefined()
    expect(dateRow!.find('.form-preview__value').text()).toBe('2026-01')

    const dureeRow = rows.find(r => r.text().includes("Durée d'évolution"))
    expect(dureeRow).toBeDefined()
    expect(dureeRow!.find('.form-preview__value').text()).toBe('6 ans')
  })

  it('hides the durée row when calcDureeDiabete returns null', () => {
    mockCalcDureeDiabete.mockReturnValue(null)
    const wrapper = createWrapper({
      data: createDefaultData({ dateDiagnostic: '2026-01' }),
    })
    const preview = wrapper.findAll('.form-preview')[0]
    const dureeRow = preview.findAll('.form-preview__row')
      .find(r => r.text().includes("Durée d'évolution"))
    expect(dureeRow).toBeUndefined()
  })

  // ─── 3. Pondéral preview ────────────────────────────────────────

  it('renders the pondéral preview rows with the three weights', () => {
    const wrapper = createWrapper({
      data: createDefaultData({
        poidsForme: 80,
        poidsJuillet2024: 85,
        poidsDecembre2025: 90,
      }),
    })
    const preview = wrapper.findAll('.form-preview')[1]
    const rows = preview.findAll('.form-preview__row')
    expect(rows).toHaveLength(3)

    expect(rows[0].find('.form-preview__label').text()).toBe('Poids de forme (kg)')
    expect(rows[0].find('.form-preview__value').text()).toBe('80')
    expect(rows[1].find('.form-preview__label').text()).toBe('Poids juillet 2024 (kg)')
    expect(rows[1].find('.form-preview__value').text()).toBe('85')
    expect(rows[2].find('.form-preview__label').text()).toBe('Poids décembre 2025 (kg)')
    expect(rows[2].find('.form-preview__value').text()).toBe('90')
  })

  // ─── 4. Bilan preview ───────────────────────────────────────────

  it('renders the bilan preview rows (HbA1c, date, HDL, LDL, triglycérides)', () => {
    const wrapper = createWrapper({
      data: createDefaultData({
        hba1c: 7.2,
        hba1cDate: '2026-05-20',
        hdl: 1.1,
        ldl: 2.3,
        triglycerides: 1.5,
      }),
    })
    const preview = wrapper.findAll('.form-preview')[2]
    const rows = preview.findAll('.form-preview__row')
    expect(rows).toHaveLength(5)

    const values = rows.map(r => `${r.find('.form-preview__label').text()} = ${r.find('.form-preview__value').text()}`)
    expect(values).toContain('HbA1c (%) = 7.2')
    expect(values).toContain("Date de l'examen = 2026-05-20")
    expect(values).toContain('HDL (mmol/L) = 1.1')
    expect(values).toContain('LDL (mmol/L) = 2.3')
    expect(values).toContain('Triglycérides (mmol/L) = 1.5')
  })

  // ─── 5. Complications preview ───────────────────────────────────

  it('renders the complications preview rows with computed DFG / stade IR', () => {
    const wrapper = createWrapper({
      data: createDefaultData({
        retinopathie: 'Modérée',
        creatininemie: 80,
        neuropathie: true,
        podologiqueGrade: 2,
      }),
    })
    const preview = wrapper.findAll('.form-preview')[3]
    const rows = preview.findAll('.form-preview__row')
    const values = rows.map(r => `${r.find('.form-preview__label').text()} = ${r.find('.form-preview__value').text()}`)

    expect(values).toContain('Rétinopathie = Modérée')
    expect(values).toContain('Créatininémie (µmol/L) = 80')
    expect(values).toContain('DFG (mL/min/1.73m²) = 92')
    expect(values).toContain('Stade IR = G2')
    expect(values).toContain('Neuropathie symptomatique = Oui')
    expect(values).toContain('Grade podologique = 2')
  })

  it('hides the DFG / Stade IR rows when calcDFG returns null', () => {
    mockCalcDFG.mockReturnValue(null)
    mockCalcStadeIR.mockReturnValue('—')
    const wrapper = createWrapper({
      data: createDefaultData({ retinopathie: 'Absente' }),
    })
    const preview = wrapper.findAll('.form-preview')[3]
    const rowsText = preview.findAll('.form-preview__row')
      .map(r => r.text())
      .join(' | ')
    expect(rowsText).not.toContain('DFG')
    expect(rowsText).not.toContain('Stade IR')
  })

  // ─── 6. Staged commit / discard ─────────────────────────────────

  it('commits a date diagnostique change to data on Enregistrer', async () => {
    const data = createDefaultData()
    const wrapper = createWrapper({ data })

    await openSection(wrapper, 0)
    const datePicker = wrapper.findAll('.el-date-picker')[0]
    await datePicker.setValue('2024-03')
    await nextTick()

    // draft edited → data untouched until Enregistrer
    expect(data.dateDiagnostic).toBe('')
    await clickEnregistrer(wrapper, 0)

    expect(data.dateDiagnostic).toBe('2024-03')
    expect(wrapper.emitted('change')).toBeTruthy()

    const rows = wrapper.findAll('.form-preview')[0].findAll('.form-preview__row')
    const dateRow = rows.find(r => r.text().includes('Date du diagnostic'))
    expect(dateRow!.find('.form-preview__value').text()).toBe('2024-03')
  })

  it('Annuler discards unsaved changes and closes the section', async () => {
    const data = createDefaultData({ dateDiagnostic: '2026-01' })
    const wrapper = createWrapper({ data })

    await openSection(wrapper, 0)
    const datePicker = wrapper.findAll('.el-date-picker')[0]
    await datePicker.setValue('2024-03')
    await nextTick()
    expect(data.dateDiagnostic).toBe('2026-01')

    const footerButtons = sectionFooterButtons(wrapper, 0)
    await footerButtons[1].trigger('click')
    await nextTick()

    expect(data.dateDiagnostic).toBe('2026-01')
    expect(wrapper.emitted('change')).toBeFalsy()
    expect(sectionBodies(wrapper)[0].attributes('style') ?? '').toContain('display: none')
  })

  it('asks for confirmation before discarding unsaved changes when collapsing', async () => {
    const confirmSpy = vi.fn().mockRejectedValue('cancel')
    ;(ElMessageBox.confirm as any) = confirmSpy

    const wrapper = createWrapper()
    await openSection(wrapper, 1)
    const poidsInput = wrapper.findAll('.el-input-number')[0]
    await poidsInput.setValue('85')
    await nextTick()

    await wrapper.findAll('.collapsible-section__header')[1].trigger('click')
    await nextTick()

    expect(confirmSpy).toHaveBeenCalled()
    // Confirmation refused → section stays open
    expect(sectionBodies(wrapper)[1].attributes('style') ?? '').not.toContain('display: none')
  })

  it('commits a pondéral change and reflects it in the preview', async () => {
    const data = createDefaultData({ poidsForme: 80 })
    const wrapper = createWrapper({ data })

    await openSection(wrapper, 1)
    const poidsInput = wrapper.findAll('.el-input-number')[0]
    await poidsInput.setValue('84')
    await nextTick()
    expect(data.poidsForme).toBe(80)

    await clickEnregistrer(wrapper, 1)

    expect(data.poidsForme).toBe('84')
    const rows = wrapper.findAll('.form-preview')[1].findAll('.form-preview__row')
    expect(rows[0].find('.form-preview__value').text()).toBe('84')
  })

  // ─── 7. Conditional detail fields (draft-based) ────────────────

  it('renders amputationDetail rich editor only when draft.amputation is checked', async () => {
    const wrapper = createWrapper()
    await openSection(wrapper, 3)

    // By default: no amputation → no detail editor
    expect(wrapper.text()).not.toContain('Détail amputation')

    const amputationCheckbox = wrapper.findAll('.el-checkbox')[1]
    await amputationCheckbox.find('input').setValue(true)
    await nextTick()

    expect(wrapper.text()).toContain('Détail amputation')
  })

  it('renders ischemicCritique rich editor only when draft.aomi is checked', async () => {
    const wrapper = createWrapper()
    await openSection(wrapper, 3)

    expect(wrapper.text()).not.toContain('Description ischémie critique')

    const aomiCheckbox = wrapper.findAll('.el-checkbox')[3]
    await aomiCheckbox.find('input').setValue(true)
    await nextTick()

    expect(wrapper.text()).toContain('Description ischémie critique')
  })

  it('renders NT-proBNP input only when draft.insuffisanceCardiaque is checked', async () => {
    const wrapper = createWrapper()
    await openSection(wrapper, 3)

    expect(wrapper.text()).not.toContain('NT-proBNP')

    const insuffisanceCheckbox = wrapper.findAll('.el-checkbox')[2]
    await insuffisanceCheckbox.find('input').setValue(true)
    await nextTick()

    expect(wrapper.text()).toContain('NT-proBNP (pg/mL)')
  })

  // ─── 8. Field meta (dernière modification) ──────────────────────

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
        data: createDefaultData({ dateDiagnostic: '2026-01' }),
        fieldMeta: { 'ficheDiabete.dateDiagnostic': '2026-06-15T10:30:00.000Z' },
      })

      const row = wrapper.findAll('.form-preview__row')
        .find(r => r.text().includes('Date du diagnostic'))
      expect(row).toBeDefined()

      expect(row!.find('.form-preview__updated').text())
        .toMatch(/^Modifié le \d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/)

      const btn = row!.find('.form-preview__edit')
      expect(btn.exists()).toBe(true)
      expect(btn.attributes('aria-label')).toBe('Modifier Date du diagnostic')
    })

    it('re-opens the collapsed section and scrolls to it when Modifier is clicked', async () => {
      const wrapper = createWrapper({
        data: createDefaultData({ dateDiagnostic: '2026-01' }),
        fieldMeta: { 'ficheDiabete.dateDiagnostic': '2026-06-15T10:30:00.000Z' },
      })

      const body = sectionBodies(wrapper)[0]

      // Prove the section is collapsed BEFORE the click
      expect(body.attributes('style') ?? '').toContain('display: none')

      // The first preview (Historique du Diabète) holds the diagnostic row
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
        data: createDefaultData({ dateDiagnostic: '2026-01' }),
        fieldMeta: {},
      })

      const row = wrapper.findAll('.form-preview__row')
        .find(r => r.text().includes('Date du diagnostic'))
      expect(row).toBeDefined()
      expect(row!.find('.form-preview__updated').text()).toBe('Non modifié')
    })
  })
})
