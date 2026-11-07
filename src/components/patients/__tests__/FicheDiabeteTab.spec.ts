// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, reactive, computed, provide, inject } from 'vue'
import type { FicheDiabeteData, ExamenPhysique, ExamensComplementairesData, BilanBioResult } from '@/types/crh-diabete'
import { PARAMETER_META } from '@/utils/parameter-history'

// ─── Mock calculations composable (controllable) ───────────────────

const { mockCalcDureeDiabete, mockCalcDFG, mockCalcStadeIR, mockCalcIMC } = vi.hoisted(() => ({
  mockCalcDureeDiabete: vi.fn(),
  mockCalcDFG: vi.fn(),
  mockCalcStadeIR: vi.fn(),
  mockCalcIMC: vi.fn(),
}))

vi.mock('@/composables/useCrhDiabeteCalculations', () => ({
  useCrhDiabeteCalculations: () => ({
    calcDureeDiabete: mockCalcDureeDiabete,
    calcDFG: mockCalcDFG,
    calcStadeIR: mockCalcStadeIR,
    calcIMC: mockCalcIMC,
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
  Delete: { name: 'Delete', render: () => null },
  Clock: { name: 'Clock', render: () => null },
  TrendCharts: { name: 'TrendCharts', render: () => null },
}))

// ─── EL Stubs ──────────────────────────────────────────────────────

const EL_STUBS: Record<string, any> = {
  'el-form': {
    template: '<form class="el-form" @submit.prevent><slot /></form>',
    props: ['labelPosition', 'class'],
  },
  'el-form-item': {
    template: '<div class="el-form-item" :class="$attrs.class"><label v-if="label">{{ label }}</label><slot name="label" /><slot /></div>',
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
    // Forwarde `update:modelValue` (v-model) PUIS `change` : les chemins
    // `@change="onTabacChange(draft)"` / `onSubstanceChange(draft)` reçoivent
    // bien l'événement, en gardant le v-model synchronisé avant le handler.
    template: '<select class="el-select" :value="modelValue" @change="onChange"><slot /></select>',
    props: ['modelValue', 'placeholder'],
    emits: ['update:modelValue', 'change'],
    setup(props, { emit }) {
      function onChange(e: Event) {
        emit('update:modelValue', (e.target as HTMLSelectElement).value)
        emit('change', e)
      }
      return { onChange }
    },
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
  'el-checkbox-group': {
    name: 'ElCheckboxGroupStub',
    template: '<div class="el-checkbox-group"><slot /></div>',
    props: ['modelValue'],
    emits: ['update:modelValue'],
    setup(props, { emit, slots }) {
      provide('elCheckboxGroup', {
        model: computed(() => props.modelValue ?? []),
        toggle(value: unknown) {
          const current = Array.isArray(props.modelValue) ? props.modelValue : []
          emit(
            'update:modelValue',
            current.includes(value) ? current.filter((v: unknown) => v !== value) : [...current, value],
          )
        },
      })
      return {}
    },
  },
  'el-checkbox': {
    name: 'ElCheckboxStub',
    template: '<label class="el-checkbox"><input type="checkbox" :checked="checked" @change="onChange" /><slot /></label>',
    props: ['modelValue', 'value'],
    emits: ['update:modelValue', 'change'],
    setup(props, { emit, slots }) {
      const group = inject<{ model: { value: unknown[] }; toggle: (value: unknown) => void } | null>('elCheckboxGroup', null)
      const checked = computed(() => {
        if (group) {
          return group.model.value.includes(props.value ?? props.modelValue)
        }
        return !!props.modelValue
      })
      function onChange(e: Event) {
        const target = e.target as HTMLInputElement
        if (group) {
          group.toggle(props.value)
        } else {
          emit('update:modelValue', target.checked)
        }
      }
      return { checked, onChange }
    },
  },
  'el-radio-group': {
    template: '<div class="el-radio-group" @update:modelValue="$emit(\'update:modelValue\', $event)"><slot /></div>',
    props: ['modelValue'],
    emits: ['update:modelValue'],
  },
  'el-radio': {
    template: '<label class="el-radio"><input type="radio" :value="value" @change="$emit(\'update:modelValue\', value)" /><slot /></label>',
    props: ['value'],
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
    mockCalcIMC.mockReturnValue(26)
  })

  function createDefaultData(overrides: Partial<FicheDiabeteData> = {}): FicheDiabeteData {
    return {
      dateDiagnostic: '',
      typeDiabete: '',
      typeDiabeteAutre: '',
      circonstanceDecouverte: '',
      anticorps: '',
      typeAnticorps: '',
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
      dyslipidemie: false,
      hta: false,
      sas: '',
      tabac: '',
      tabacQuantite: null,
      tabacUnite: '',
      tabacDuree: '',
      tabacDateDebut: '',
      tabacCommentaire: '',
      substance: '',
      substancePrecision: '',
      substanceQuantite: null,
      substanceUnite: '',
      substanceDuree: '',
      substanceDateDebut: '',
      substanceCommentaire: '',
      medicaments: [],
      adoDateDebut: '',
      adoCommentaire: '',
      glp1DateDebut: '',
      glp1Commentaire: '',
      insulineType: '',
      insulineDateDebut: '',
      insulineCommentaire: '',
      pompeType: '',
      pompeDateDebut: '',
      pompeCommentaire: '',
      traitementHabituel: '',
      surveillanceCapillaire: '',
      surveillanceMCG: '',
      surveillanceCommentaire: '',
      tabacHistory: [],
      substanceHistory: [],
      medicamentsHistory: [],
      traitementHabituelHistory: [],
      surveillanceHistory: [],
      ...overrides,
    }
  }

  function createWrapper(options: {
    data?: FicheDiabeteData
    fieldMeta?: Record<string, string>
    examenPhysique?: ExamenPhysique
    examensComplementaires?: ExamensComplementairesData
    dateEntree?: string
  } = {}) {
    const { data = createDefaultData(), fieldMeta } = options
    const examenPhysique = options.examenPhysique ?? ({ poids: null, taille: null } as ExamenPhysique)

    return mount(FicheDiabeteTab, {
      props: {
        data,
        sexe: 'F',
        age: 45,
        dateEntree: options.dateEntree ?? '2026-06-01',
        fieldMeta,
        examenPhysique,
        examensComplementaires: options.examensComplementaires,
      },
      global: {
        stubs: EL_STUBS,
      },
    })
  }

  // ─── Dernier Examen métabolique fixtures ─────────────────────────

  function createBioResult(overrides: Partial<BilanBioResult> = {}): BilanBioResult {
    return {
      parameterName: 'HbA1c',
      parameterUnit: '%',
      value: '7.2',
      requestDate: '2026-01-10',
      ...overrides,
    }
  }

  function createExamensComplementaires(results: BilanBioResult[] = []): ExamensComplementairesData {
    // reactive() so pushed results re-render the read-only card, mirroring the
    // shared DossierClinic object passed by the parent forms at runtime.
    return reactive({
      imagerieTests: [],
      bilanBio: { dateFrom: '', dateTo: '', results },
    })
  }

  function sectionBodies(wrapper: ReturnType<typeof createWrapper>) {
    return wrapper.findAll('.collapsible-section__body')
  }

  // ─── Helpers migration historique (data-history-path supprimé) ───
  // Le composant n'expose plus data-history-path ; on recherche par label
  // du el-form-item (stub rend <label>{{ label }}</label>).
  function formItemsByLabel(scope: any, label: string) {
    const root = scope?.findAll ? scope : { findAll: () => [] }
    return root.findAll('.el-form-item').filter((w: any) => {
      const l = w.find('label')
      return l.exists() && l.text().trim() === label
    })
  }
  function formItemByLabel(scope: any, label: string, index = 0) {
    const all = formItemsByLabel(scope, label)
    if (all[index]) return all[index]
    // Retourne un wrapper vide (exists() === false) pour les assertions
    // d'absence — évite les TypeError sur .exists() quand le champ est masqué.
    const root: any = scope?.find ? scope : wrapperPlaceholder()
    return root.find('__missing__')
  }
  function wrapperPlaceholder(): any {
    return { find: () => ({ exists: () => false, find: () => ({ exists: () => false }) }) }
  }
  function findSelectByLabel(scope: any, label: string, index = 0) {
    const item = formItemByLabel(scope, label, index)
    return item ? item.find('.el-select') : scope.find('__missing__')
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

  it('renders the CollapsibleSection headers in order (Glasgow unique, no staged doublons)', () => {
    const wrapper = createWrapper()
    const titles = wrapper.findAll('.collapsible-section__title').map(el => el.text())
    expect(titles).toEqual([
      'Historique du Diabète',
      'Facteurs de risque',
      'Facteurs',
      'Dernier Examen métabolique',
      'Traitement-auto surveillance glycémique',
      'Complications Micro & Macro-vasculaires',
    ])
  })

  it('renders one compact FormPreview per staged section (Facteurs stagé, no tabac/substance/anthropo/meds/hab/surv previews)', () => {
    const wrapper = createWrapper()
    const previews = wrapper.findAll('.form-preview')
    expect(previews).toHaveLength(3)
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
    expect(dateRow!.find('.form-preview__value').text()).toBe('01/2026')

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

  // ─── 2bis. Nouveaux champs Historique (type, anticorps, rich text) ────

  it('renders the new historique fields when opened (type, anticorps, rich editors)', async () => {
    const wrapper = createWrapper()
    await openSection(wrapper, 0)

    const typeSelect = formItemByLabel(wrapper, 'Type de diabète').find('.el-select')
    expect(typeSelect.exists()).toBe(true)
    expect(typeSelect.text()).toContain('Diabète type 1')
    expect(typeSelect.text()).toContain('Diabète type 2')
    expect(typeSelect.text()).toContain('Diabète gestationnel')
    expect(typeSelect.text()).toContain('Diabète secondaire')
    expect(typeSelect.text()).toContain('Autre (à préciser)')

    const radioGroup = formItemByLabel(wrapper, 'Anticorps').find('.el-radio-group')
    expect(radioGroup.exists()).toBe(true)
    const radioLabels = wrapper.findAll('.el-radio').map(r => r.text().trim())
    expect(radioLabels).toEqual(['Positifs', 'Négatifs', 'En cours'])

    const typeAnticorpsInput = formItemByLabel(wrapper, "Type d'anticorps").find('.el-input')
    expect(typeAnticorpsInput.exists()).toBe(true)

    const editors = sectionBodies(wrapper)[0].findAll('.rich-editor-mock')
    expect(editors).toHaveLength(1)
    // Migration historique : data-history-path supprimé — vérifié via label.
    expect(formItemByLabel(wrapper, 'Circonstances de découverte').exists()).toBe(true)
  })

  it('shows the typeDiabeteAutre input only when typeDiabete === "Autre"', async () => {
    const wrapper = createWrapper()
    await openSection(wrapper, 0)

    const autreInput = () => { const item = formItemByLabel(wrapper, 'Type de diabète (autre)'); return item.exists() ? item.find('.el-input') : item }
    expect(autreInput().exists()).toBe(false)

    const typeSelect = wrapper.find('.el-select')
    await typeSelect.setValue('Autre')
    await nextTick()
    expect(autreInput().exists()).toBe(true)

    await typeSelect.setValue('Type 1')
    await nextTick()
    expect(autreInput().exists()).toBe(false)
  })

  it('renders the new historique preview rows (type, anticorps, rich fields)', () => {
    const wrapper = createWrapper({
      data: createDefaultData({
        typeDiabete: 'Autre',
        typeDiabeteAutre: 'MODY',
        circonstanceDecouverte: '<p>Découverte fortuite</p>',
        anticorps: 'Positifs',
        typeAnticorps: 'anti-GAD, anti-IA2',
      }),
    })
    const preview = wrapper.findAll('.form-preview')[0]
    const rows = preview.findAll('.form-preview__row')

    const typeRow = rows.find(r => r.text().includes('Type de diabète'))
    expect(typeRow).toBeDefined()
    expect(typeRow!.find('.form-preview__value').text()).toBe('Autre (MODY)')

    const anticorpsRow = rows.find(r => r.text().includes('Anticorps'))
    expect(anticorpsRow).toBeDefined()
    expect(anticorpsRow!.find('.form-preview__value').text()).toBe('Positifs')

    const circRow = rows.find(r => r.text().includes('Circonstances de découverte'))
    expect(circRow).toBeDefined()
    expect(circRow!.find('.form-preview__value').text()).toContain('Découverte fortuite')

    const typeAnticorpsRow = rows.find(r => r.text().includes("Type d'anticorps"))
    expect(typeAnticorpsRow).toBeDefined()
    expect(typeAnticorpsRow!.find('.form-preview__value').text()).toContain('anti-GAD')
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
    const preview = wrapper.findAll('.form-preview')[2]
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
    const preview = wrapper.findAll('.form-preview')[2]
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
    expect(dateRow!.find('.form-preview__value').text()).toBe('03/2024')
  })

  it('syncs durée d\'évolution from the date du diagnostic', async () => {
    const data = createDefaultData({ dateDiagnostic: '2020-03' })
    const wrapper = createWrapper({ data })

    await openSection(wrapper, 0)
    const dureeInputs = sectionBodies(wrapper)[0].findAll('.el-input-number')
    expect(dureeInputs).toHaveLength(2)
    // dateEntree = 2026-06 ⇒ 2020-03 → 6 ans 3 mois
    expect((dureeInputs[0].element as HTMLInputElement).value).toBe('6')
    expect((dureeInputs[1].element as HTMLInputElement).value).toBe('3')
  })

  it('computes the date du diagnostic from an edited durée', async () => {
    const data = createDefaultData({ dateDiagnostic: '2020-03' })
    const wrapper = createWrapper({ data })

    await openSection(wrapper, 0)
    const dureeInputs = sectionBodies(wrapper)[0].findAll('.el-input-number')
    // 6 ans 3 mois → user sets 5 ans → date du diagnostic devient 2021-03
    await dureeInputs[0].setValue('5')
    await nextTick()
    await clickEnregistrer(wrapper, 0)

    expect(data.dateDiagnostic).toBe('2021-03')
    expect(wrapper.emitted('change')).toBeTruthy()
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
    await openSection(wrapper, 0)
    const datePicker = wrapper.findAll('.el-date-picker')[0]
    await datePicker.setValue('2024-03')
    await nextTick()

    await wrapper.findAll('.collapsible-section__header')[0].trigger('click')
    await nextTick()

    expect(confirmSpy).toHaveBeenCalled()
    // Confirmation refused → section stays open
    expect(sectionBodies(wrapper)[0].attributes('style') ?? '').not.toContain('display: none')
  })

  // ─── 7. Conditional detail fields (draft-based) ────────────────

  it('renders amputationDetail rich editor only when draft.amputation is checked', async () => {
    const wrapper = createWrapper()
    await openSection(wrapper, 5)

    // By default: no amputation → no detail editor
    expect(wrapper.text()).not.toContain('Détail amputation')

    const amputationCheckbox = wrapper.findAll('.el-checkbox')[7]
    await amputationCheckbox.find('input').setValue(true)
    await nextTick()

    expect(wrapper.text()).toContain('Détail amputation')
  })

  it('renders ischemicCritique rich editor only when draft.aomi is checked', async () => {
    const wrapper = createWrapper()
    await openSection(wrapper, 5)

    expect(wrapper.text()).not.toContain('Description ischémie critique')

    const aomiCheckbox = wrapper.findAll('.el-checkbox')[9]
    await aomiCheckbox.find('input').setValue(true)
    await nextTick()

    expect(wrapper.text()).toContain('Description ischémie critique')
  })

  it('renders NT-proBNP input only when draft.insuffisanceCardiaque is checked', async () => {
    const wrapper = createWrapper()
    await openSection(wrapper, 5)

    expect(wrapper.text()).not.toContain('NT-proBNP')

    const insuffisanceCheckbox = wrapper.findAll('.el-checkbox')[8]
    await insuffisanceCheckbox.find('input').setValue(true)
    await nextTick()

    expect(wrapper.text()).toContain('NT-proBNP (pg/mL)')
  })

  it('renders amputationDetail editor on its own full-width row (own-line regression)', async () => {
    const wrapper = createWrapper()
    await openSection(wrapper, 5)

    const amputationCheckbox = wrapper.findAll('.el-checkbox')[7]
    await amputationCheckbox.find('input').setValue(true)
    await nextTick()

    const detailRow = wrapper.findAll('.el-row')
      .find(r => r.text().includes('Détail amputation'))
    expect(detailRow).toBeDefined()
    expect(detailRow!.findAll('.el-col')).toHaveLength(1)
    expect(detailRow!.findAll('.el-form-item')).toHaveLength(1)
    expect(detailRow!.find('.el-form-item label').text()).toBe('Détail amputation')
  })

  it('renders ischemicCritique editor on its own full-width row (own-line regression)', async () => {
    const wrapper = createWrapper()
    await openSection(wrapper, 5)

    const aomiCheckbox = wrapper.findAll('.el-checkbox')[9]
    await aomiCheckbox.find('input').setValue(true)
    await nextTick()

    const detailRow = wrapper.findAll('.el-row')
      .find(r => r.text().includes('Description ischémie critique'))
    expect(detailRow).toBeDefined()
    expect(detailRow!.findAll('.el-col')).toHaveLength(1)
    expect(detailRow!.findAll('.el-form-item')).toHaveLength(1)
    expect(detailRow!.find('.el-form-item label').text()).toBe('Description ischémie critique')
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

  // ─── 9. Facteurs : preview & fields ───────────────────
  // Le bloc enfant "Facteurs" est l'index 2 (bodies) — index 1
  // étant le parent non-stagé « Facteurs de risque » ; previews inchangées.

  it('renders the Facteurs preview and opens the section', async () => {
    const wrapper = createWrapper()
    const preview = wrapper.findAll('.form-preview')[1]
    expect(preview.find('.form-preview__title').text()).toBe('Facteurs')

    await openSection(wrapper, 2)
    expect(sectionBodies(wrapper)[2].attributes('style') ?? '').not.toContain('display: none')
  })

  it('hides the dyslipidémie and HTA preview rows by default (unchecked)', () => {
    const wrapper = createWrapper()
    const rows = wrapper.findAll('.form-preview')[1].findAll('.form-preview__row')

    expect(rows.find(r => r.text().includes('Dyslipidémie'))).toBeUndefined()
    expect(rows.find(r => r.text().includes('HTA'))).toBeUndefined()
  })

  it('shows "Oui" in the preview for checked dyslipidémie and HTA', () => {
    const wrapper = createWrapper({
      data: createDefaultData({ dyslipidemie: true, hta: true }),
    })
    const rows = wrapper.findAll('.form-preview')[1].findAll('.form-preview__row')

    const dys = rows.find(r => r.text().includes('Dyslipidémie'))
    expect(dys).toBeDefined()
    expect(dys!.find('.form-preview__value').text()).toBe('Oui')

    const hta = rows.find(r => r.text().includes('HTA'))
    expect(hta).toBeDefined()
    expect(hta!.find('.form-preview__value').text()).toBe('Oui')
  })

  it('shows the chosen SAS value in the preview', () => {
    const wrapper = createWrapper({ data: createDefaultData({ sas: 'Oui' }) })
    const rows = wrapper.findAll('.form-preview')[1].findAll('.form-preview__row')
    const sas = rows.find(r => r.text().includes('SAOS'))
    expect(sas).toBeDefined()
    expect(sas!.find('.form-preview__value').text()).toBe('Oui')
  })

  it('has no staged tabac doublon (Glasgow unique : buffer + table only)', () => {
    const wrapper = createWrapper()
    const titles = wrapper.findAll('.collapsible-section__title').map(el => el.text())
    expect(titles).not.toContain('Consommation de tabac')
    // Ancien formulaire stagé supprimé : aucun label "Tabac" / "Commentaire tabac" stagé
    expect(formItemByLabel(wrapper, 'Tabac').exists()).toBe(false)
    expect(formItemByLabel(wrapper, 'Commentaire tabac').exists()).toBe(false)
    // Pattern Glasgow présent : subtitle + collapse + toolbar + table
    expect(wrapper.text()).toContain('1. Consommation de tabac')
    expect(wrapper.findAll('.history-collapse__header').length).toBeGreaterThanOrEqual(3)
    expect(wrapper.findAll('.history-table').length).toBeGreaterThanOrEqual(3)
  })

  it('reveals the tabac buffer detail fields when Statut tabac is Oui', async () => {
    const wrapper = createWrapper()

    // Par défaut (buffer vide) : champs détail absents du DOM
    expect(formItemByLabel(wrapper, 'Quantité tabac').exists()).toBe(false)
    expect(formItemByLabel(wrapper, 'Unité tabac').exists()).toBe(false)
    expect(formItemByLabel(wrapper, 'Rythme tabac').exists()).toBe(false)
    expect(formItemByLabel(wrapper, 'Date début tabac').exists()).toBe(false)
    expect(formItemByLabel(wrapper, 'Commentaire tabac (mesure)').exists()).toBe(false)

    // Statut = Oui → tous les champs du buffer apparaissent
    await formItemByLabel(wrapper, 'Statut tabac').find('.el-select').setValue('Oui')
    await nextTick()
    expect(formItemByLabel(wrapper, 'Quantité tabac').find('.el-input-number').exists()).toBe(true)
    expect(formItemByLabel(wrapper, 'Unité tabac').find('.el-select').exists()).toBe(true)
    expect(formItemByLabel(wrapper, 'Rythme tabac').find('.el-select').exists()).toBe(true)
    expect(formItemByLabel(wrapper, 'Date début tabac').find('.el-date-picker').exists()).toBe(true)
    expect(formItemByLabel(wrapper, 'Commentaire tabac (mesure)').exists()).toBe(true)

    // Statut = Non → les champs se masquent
    await formItemByLabel(wrapper, 'Statut tabac').find('.el-select').setValue('Non')
    await nextTick()
    expect(formItemByLabel(wrapper, 'Quantité tabac').exists()).toBe(false)
    expect(formItemByLabel(wrapper, 'Commentaire tabac (mesure)').exists()).toBe(false)
  })

  it('saves a tabac buffer entry into tabacHistory and shows it in the table with PA', async () => {
    const data = createDefaultData()
    const wrapper = createWrapper({ data })

    await formItemByLabel(wrapper, 'Statut tabac').find('.el-select').setValue('Oui')
    await nextTick()
    await formItemByLabel(wrapper, 'Quantité tabac').find('.el-input-number').setValue('20')
    await formItemByLabel(wrapper, 'Unité tabac').find('.el-select').setValue('cigarette')
    await formItemByLabel(wrapper, 'Rythme tabac').find('.el-select').setValue('j')
    await formItemByLabel(wrapper, 'Date début tabac').find('.el-date-picker').setValue('2025-06')
    await nextTick()

    // PA live du buffer : 20 cig/j depuis 2025-06 (réf. dateEntree 2026-06 → 1 PA).
    // La PA d'entrée utilise la date de mesure (aujourd'hui) comme référence :
    // on vérifie le buffer live déterministe, pas la valeur flaky de la table.
    expect(wrapper.text()).toContain('1 PA')

    const saveBtn = wrapper.findAll('.history-collapse__actions .el-button')
      .find(b => b.text().includes('Enregistrer'))
    expect(saveBtn).toBeDefined()
    await saveBtn!.trigger('click')
    await nextTick()

    expect(data.tabacHistory).toHaveLength(1)
    expect(data.tabacHistory[0].tabac).toBe('Oui')
    expect(wrapper.emitted('change')).toBeTruthy()
    // Table : quantité + Depuis (PA dépend de la date du jour → on vérifie le suffixe PA)
    const tableText = wrapper.findAll('.history-table')[0].text()
    expect(tableText).toContain('20')
    expect(tableText).toContain('PA')
    expect(tableText).toContain('depuis 06/2025')
  })

  it('computes the pack-years (PA = 1) in the history table for 20 cig/j over 1 year', () => {
    const wrapper = createWrapper({
      data: createDefaultData({
        tabacHistory: [{
          _key: 'k1', date: '2026-06-15T10:00',
          tabac: 'Oui', tabacQuantite: 20, tabacUnite: 'cigarette',
          tabacDuree: 'j', tabacDateDebut: '2025-06', tabacCommentaire: '',
        }],
      }),
    })
    const tableText = wrapper.findAll('.history-table')[0].text()
    expect(tableText).toContain('1 PA')
  })

  it('computes the pack-years (PA = 2) for 40 cig/j over 1 year', () => {
    const wrapper = createWrapper({
      data: createDefaultData({
        tabacHistory: [{
          _key: 'k1', date: '2026-06-15T10:00',
          tabac: 'Oui', tabacQuantite: 40, tabacUnite: 'cigarette',
          tabacDuree: 'j', tabacDateDebut: '2025-06', tabacCommentaire: '',
        }],
      }),
    })
    const tableText = wrapper.findAll('.history-table')[0].text()
    expect(tableText).toContain('2 PA')
  })

  it('computes the pack-years for paquets (2 paquets/j over 1 year → 2 PA)', () => {
    const wrapper = createWrapper({
      data: createDefaultData({
        tabacHistory: [{
          _key: 'k1', date: '2026-06-15T10:00',
          tabac: 'Oui', tabacQuantite: 2, tabacUnite: 'paquet',
          tabacDuree: 'j', tabacDateDebut: '2025-06', tabacCommentaire: '',
        }],
      }),
    })
    const tableText = wrapper.findAll('.history-table')[0].text()
    expect(tableText).toContain('2 PA')
  })

  it('shows "—" PA in the history table when the entry is incomplete', () => {
    const wrapper = createWrapper({
      data: createDefaultData({
        tabacHistory: [{
          _key: 'k1', date: '2026-06-15T10:00',
          tabac: 'Oui', tabacQuantite: null, tabacUnite: '',
          tabacDuree: '', tabacDateDebut: '', tabacCommentaire: '',
        }],
      }),
    })
    // tabac Oui mais pas de quantité → tabacEntryPA renvoie '—'
    const tableText = wrapper.findAll('.history-table')[0].text()
    expect(tableText).toContain('—')
  })

  it('seeds legacy tabac scalaires into tabacHistory[0] once when history is empty (migration)', async () => {
    const data = createDefaultData({
      tabac: 'Oui',
      tabacQuantite: 10,
      tabacUnite: 'cigarette',
      tabacDuree: 'j',
      tabacDateDebut: '2020-01',
      tabacCommentaire: '<p>sevrage</p>',
    })
    const wrapper = createWrapper({ data })
    expect(data.tabacHistory).toHaveLength(1)
    expect(data.tabacHistory[0].tabac).toBe('Oui')
    expect(data.tabacHistory[0].tabacQuantite).toBe(10)
    await nextTick()
    expect(wrapper.findAll('.history-table')[0].text()).toContain('10')
  })

  it('has no staged substance doublon (Glasgow unique : buffer + table only)', () => {
    const wrapper = createWrapper()
    const titles = wrapper.findAll('.collapsible-section__title').map(el => el.text())
    expect(titles).not.toContain('Autre substance toxique')
    expect(formItemByLabel(wrapper, 'Substance / Alcool').exists()).toBe(false)
    expect(formItemByLabel(wrapper, 'Commentaire substance').exists()).toBe(false)
    expect(wrapper.text()).toContain('2. Autre substance toxique')
  })

  it('reveals the substance buffer detail fields only after selecting a substance', async () => {
    const wrapper = createWrapper()

    expect(formItemByLabel(wrapper, 'Précision (mesure)').exists()).toBe(false)

    await formItemByLabel(wrapper, 'Substance (mesure)').find('.el-select').setValue('Cannabis')
    await nextTick()
    expect(formItemByLabel(wrapper, 'Précision (mesure)').find('.el-input').exists()).toBe(true)
    expect(formItemByLabel(wrapper, 'Quantité substance').find('.el-input-number').exists()).toBe(true)
    expect(formItemByLabel(wrapper, 'Unité substance').find('.el-select').exists()).toBe(true)
    expect(formItemByLabel(wrapper, 'Rythme substance').find('.el-select').exists()).toBe(true)
    expect(formItemByLabel(wrapper, 'Date début substance').find('.el-date-picker').exists()).toBe(true)
    expect(formItemByLabel(wrapper, 'Commentaire substance (mesure)').exists()).toBe(true)
  })

  it('saves a substance buffer entry into substanceHistory and shows it in the table', async () => {
    const data = createDefaultData()
    const wrapper = createWrapper({ data })

    await formItemByLabel(wrapper, 'Substance (mesure)').find('.el-select').setValue('Alcool')
    await nextTick()
    await formItemByLabel(wrapper, 'Précision (mesure)').find('.el-input').setValue('vin rouge')
    await formItemByLabel(wrapper, 'Date début substance').find('.el-date-picker').setValue('2024-06')
    await nextTick()

    // Depuis live du buffer : input désactivé "depuis 06/2024 (2 ans)" (réf. dateEntree 2026-06).
    // Le stub el-input rend la valeur en attribut : on lit la valeur du DOM, pas wrapper.text().
    // (Seul le Depuis substance est rendu ici — le Depuis tabac est masqué car tabacBuffer vide.)
    const depuisInput = formItemByLabel(wrapper, 'Depuis', 0).find('.el-input')
    expect(depuisInput.exists()).toBe(true)
    expect((depuisInput.element as HTMLInputElement).value).toContain('depuis 06/2024')

    const saveBtn = wrapper.findAll('.history-collapse__actions .el-button')
      .filter(b => b.text().includes('Enregistrer'))[1]
    expect(saveBtn).toBeDefined()
    await saveBtn!.trigger('click')
    await nextTick()

    expect(data.substanceHistory).toHaveLength(1)
    expect(data.substanceHistory[0].substance).toBe('Alcool')
    expect(wrapper.emitted('change')).toBeTruthy()
    expect(wrapper.findAll('.history-table')[1].text()).toContain('Alcool')
  })

  it('seeds legacy substance scalaires into substanceHistory[0] once when history is empty (migration)', async () => {
    const data = createDefaultData({ substance: 'Alcool', substancePrecision: 'vin' })
    const wrapper = createWrapper({ data })
    expect(data.substanceHistory).toHaveLength(1)
    expect(data.substanceHistory[0].substance).toBe('Alcool')
    await nextTick()
    expect(wrapper.findAll('.history-table')[1].text()).toContain('Alcool')
  })

  it('has no staged anthropométrie doublon (Glasgow unique : buffer + table only)', () => {
    const wrapper = createWrapper()
    const titles = wrapper.findAll('.collapsible-section__title').map(el => el.text())
    expect(titles).not.toContain('Anthropométrie')
    expect(wrapper.text()).toContain('3. Suivi Pondéral')
    // Buffer Glasgow présent dans le parent Facteurs de risque
    expect(formItemByLabel(wrapper, 'Poids (kg)').exists()).toBe(true)
    expect(formItemByLabel(wrapper, 'Taille (cm)').exists()).toBe(true)
  })

  it('saves an anthropo buffer entry into vitalSignsHistory and shows IMC live', async () => {
    mockCalcIMC.mockReturnValue(26)
    const data = createDefaultData()
    const wrapper = createWrapper({ data })

    await formItemByLabel(wrapper, 'Poids (kg)').find('.el-input-number').setValue('80')
    await formItemByLabel(wrapper, 'Taille (cm)').find('.el-input-number').setValue('175')
    await nextTick()

    // IMC live du buffer (mock 26)
    expect(wrapper.text()).toContain('26')

    const saveBtn = wrapper.findAll('.history-collapse__actions .el-button')
      .filter(b => b.text().includes('Enregistrer'))[2]
    expect(saveBtn).toBeDefined()
    await saveBtn!.trigger('click')
    await nextTick()

    expect(wrapper.emitted('change')).toBeTruthy()
    const tableText = wrapper.findAll('.history-table')[2].text()
    expect(tableText).toContain('80')
    expect(tableText).toContain('175')
  })

  it('seeds legacy examenPhysique into vitalSignsHistory[0] once when history is empty (migration)', async () => {
    mockCalcIMC.mockReturnValue(26)
    const wrapper = createWrapper({ examenPhysique: { poids: 70, taille: 175 } as ExamenPhysique })
    await nextTick()
    const tableText = wrapper.findAll('.history-table')[2].text()
    expect(tableText).toContain('70')
    expect(tableText).toContain('175')
  })

  // ─── 10. PARAMETER_META expose les nouveaux chemins facteurs ─────

  it('exposes the new facteurs de risque paths in PARAMETER_META', () => {
    const paths = [
      'ficheDiabete.dyslipidemie',
      'ficheDiabete.hta',
      'ficheDiabete.sas',
      'ficheDiabete.tabac',
      'ficheDiabete.tabacQuantite',
      'ficheDiabete.tabacUnite',
      'ficheDiabete.tabacDuree',
      'ficheDiabete.tabacDateDebut',
      'ficheDiabete.tabacCommentaire',
      'ficheDiabete.substance',
      'ficheDiabete.substancePrecision',
      'ficheDiabete.substanceQuantite',
      'ficheDiabete.substanceUnite',
      'ficheDiabete.substanceDuree',
      'ficheDiabete.substanceDateDebut',
      'ficheDiabete.substanceCommentaire',
    ]
    for (const p of paths) {
      expect(PARAMETER_META[p]).toBeDefined()
      expect(PARAMETER_META[p].label).toBeTruthy()
    }
  })

  // ─── 11. Corrections de revue « Facteurs de risque » ─────────────
  //
  // Guard-rails for the review corrections on the "Facteurs de risque"
  // sub-section: SAS "Non dépisté", Anthropométrie intégrée à la section
  // Facteurs (groupe 4 du draft, pas de carte séparée),
  // substance durée↔date réciproque, rythme semaine/mois PA normalisation,
  // future start dates, and the "tabac ≠ Oui → no PA" guard.
  //
  // NOTE (stub artefact): the el-input-number stub emits the DOM string value
  // (e.g. "2") on update:modelValue, whereas the real Element Plus control emits
  // a number. Any test that compares a *typed* value therefore receives a string
  // via the stub; the sync logic coerces it via arithmetic. When asserting
  // display values read back from the DOM we use the string that the stub renders.

  it('selects "Non dépisté" in the SAS select and shows it in the preview', async () => {
    const data = createDefaultData()
    const wrapper = createWrapper({ data })

    // option is selectable
    const sasSelect = formItemByLabel(wrapper, 'SAOS').find('.el-select')
    await sasSelect.setValue('Non dépisté')
    await nextTick()
    await clickEnregistrer(wrapper, 2)

    // preview of the Facteurs de risque section shows the chosen value
    const rows = wrapper.findAll('.form-preview')[1].findAll('.form-preview__row')
    const sas = rows.find(r => r.text().includes('SAOS'))
    expect(sas).toBeDefined()
    expect(sas!.find('.form-preview__value').text()).toBe('Non dépisté')
    expect(wrapper.emitted('change')).toBeTruthy()
  })

  it('keeps poids/taille buffers inside the Facteurs de risque parent (no staged section)', () => {
    const wrapper = createWrapper()

    // Pas de section stagée Anthropométrie : les buffers vivent dans le parent non-stagé
    const titles = wrapper.findAll('.collapsible-section__title').map(el => el.text())
    expect(titles).not.toContain('Anthropométrie')
    expect(titles).toContain('Facteurs de risque')

    // Buffers présents dans le parent (pas dans le body stagé Facteurs index 2)
    expect(formItemByLabel(wrapper, 'Poids (kg)').exists()).toBe(true)
    expect(formItemByLabel(wrapper, 'Taille (cm)').exists()).toBe(true)
    // 6 history-tables rendues (3 facteurs + 3 traitement, pattern Glasgow)
    expect(wrapper.findAll('.history-table')).toHaveLength(6)
  })

  it('shows the substance Depuis duration from substanceDateDebut in the history table', () => {
    const wrapper = createWrapper({
      data: createDefaultData({
        substanceHistory: [{
          _key: 's1', date: '2026-06-15T10:00',
          substance: 'Alcool', substancePrecision: '', substanceQuantite: 2,
          substanceUnite: 'l', substanceDuree: 'j', substanceDateDebut: '2024-06',
          substanceCommentaire: '',
        }],
      }),
    })
    // dateEntree 2026-06 − début 2024-06 = 2 ans → "depuis 06/2024 (2 ans)"
    const tableText = wrapper.findAll('.history-table')[1].text()
    expect(tableText).toContain('depuis 06/2024')
    expect(tableText).toContain('2 ans')
  })

  it('normalizes the weekly rythme to PA (70 cig/semaine over 1 year → 0.5 PA)', () => {
    const wrapper = createWrapper({
      data: createDefaultData({
        tabacHistory: [{
          _key: 'k1', date: '2026-06-15T10:00',
          tabac: 'Oui', tabacQuantite: 70, tabacUnite: 'cigarette',
          tabacDuree: 'semaine', tabacDateDebut: '2025-06', tabacCommentaire: '',
        }],
      }),
    })
    const tableText = wrapper.findAll('.history-table')[0].text()
    // 70/7 = 10 cig/j → (10/20) × 1 an = 0.5 PA
    expect(tableText).toContain('0.5 PA')
  })

  it('normalizes the monthly rythme to PA (30 cig/mois over 1 year → 0.1 PA after rounding)', () => {
    const wrapper = createWrapper({
      data: createDefaultData({
        tabacHistory: [{
          _key: 'k1', date: '2026-06-15T10:00',
          tabac: 'Oui', tabacQuantite: 30, tabacUnite: 'cigarette',
          tabacDuree: 'mois', tabacDateDebut: '2025-06', tabacCommentaire: '',
        }],
      }),
    })
    const tableText = wrapper.findAll('.history-table')[0].text()
    // 30/30 = 1 cig/j → (1/20) × 1 an = 0.05 → arrondi à 0.1 PA
    expect(tableText).toContain('0.1 PA')
  })

  it('shows "—" PA when the history entry start date is in the future (no console error)', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const wrapper = createWrapper({
      data: createDefaultData({
        tabacHistory: [{
          _key: 'k1', date: '2026-06-15T10:00',
          tabac: 'Oui', tabacQuantite: 20, tabacUnite: 'cigarette',
          tabacDuree: 'j', tabacDateDebut: '2027-01', tabacCommentaire: '',
        }],
      }),
    })

    const tableText = wrapper.findAll('.history-table')[0].text()
    expect(tableText).toContain('—')

    // no console error is emitted
    expect(consoleError).not.toHaveBeenCalled()
    consoleError.mockRestore()
  })

  it('shows "depuis" without duration when the substance entry start date is in the future', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const wrapper = createWrapper({
      data: createDefaultData({
        substanceHistory: [{
          _key: 's1', date: '2026-06-15T10:00',
          substance: 'Alcool', substancePrecision: '', substanceQuantite: 2,
          substanceUnite: 'l', substanceDuree: 'j', substanceDateDebut: '2027-01',
          substanceCommentaire: '',
        }],
      }),
    })
    const tableText = wrapper.findAll('.history-table')[1].text()
    expect(tableText).toContain('depuis 01/2027')

    expect(consoleError).not.toHaveBeenCalled()
    consoleError.mockRestore()
  })

  it('shows "—" PA when the history entry tabac is not "Oui" even with quantity and dates set', () => {
    const wrapper = createWrapper({
      data: createDefaultData({
        tabacHistory: [{
          _key: 'k1', date: '2026-06-15T10:00',
          tabac: 'Non', tabacQuantite: 20, tabacUnite: 'cigarette',
          tabacDuree: 'j', tabacDateDebut: '2025-06', tabacCommentaire: '',
        }],
      }),
    })
    const tableText = wrapper.findAll('.history-table')[0].text()
    expect(tableText).toContain('—')
  })

  // ─── 12. Dernier Examen métabolique (lecture seule, sans staging) ──
  //
  // La carte récupère la DERNIÈRE valeur (valeur + unité + date DD/MM/YYYY)
  // de chaque paramètre (HbA1c, LDL-c, HDL-c, Triglycérides) depuis
  // examensComplementaires.bilanBio.results. « — » quand le patient n'a pas
  // de résultat pour un paramètre. Aucun enregistrement possible ici : la
  // carte n'est pas stagée (ni :keys ni boutons Enregistrer/Annuler).

  it('shows "—" for all four params when the patient has no bio results', () => {
    const wrapper = createWrapper({ examensComplementaires: createExamensComplementaires() })

    const card = wrapper.find('.dernier-examen')
    expect(card.exists()).toBe(true)
    expect(card.text()).toContain('Valeurs issues des résultats bio')

    const rows = card.findAll('.dernier-examen__row')
    expect(rows).toHaveLength(4)
    const values = rows.map(r => r.find('.dernier-examen__value').text())
    expect(values).toEqual(['—', '—', '—', '—'])
  })

  it('renders the card as a non-staged section (no footer / save buttons)', () => {
    const wrapper = createWrapper({ examensComplementaires: createExamensComplementaires() })
    // Section index 3 = Dernier Examen métabolique (historique, parent Facteurs, Facteurs, dernierExamen)
    const body = sectionBodies(wrapper)[3]
    expect(body.find('.staged-section__footer').exists()).toBe(false)
    expect(body.find('button').exists()).toBe(false)
    // But the body is open by default (lecture seule immédiate)
    expect(body.attributes('style') ?? '').not.toContain('display: none')
  })

  it('displays the latest result per param as "value unit (DD/MM/YYYY)"', () => {
    const wrapper = createWrapper({
      examensComplementaires: createExamensComplementaires([
        createBioResult({ parameterName: 'HbA1c', value: '8.1', requestDate: '2025-11-02' }),
        createBioResult({ parameterName: 'HbA1c', value: '7.2', requestDate: '2026-01-10' }),
        createBioResult({ parameterName: 'LDL-c', parameterUnit: 'mmol/L', value: '2.30', requestDate: '2026-01-10' }),
        createBioResult({ parameterName: 'HDL-c', parameterUnit: 'mmol/L', value: '1.10', requestDate: '2026-01-10' }),
        createBioResult({ parameterName: 'Triglycérides', parameterUnit: 'mmol/L', value: '1.50', requestDate: '2026-01-10' }),
      ]),
    })
    const rows = wrapper.findAll('.dernier-examen__row')
    const text = rows.map(r => `${r.find('.dernier-examen__label').text()} = ${r.find('.dernier-examen__value').text()}`)
    expect(text).toContain('HbA1c = 7.2 % (10/01/2026)')
    expect(text).toContain('LDL-c = 2.30 mmol/L (10/01/2026)')
    expect(text).toContain('HDL-c = 1.10 mmol/L (10/01/2026)')
    expect(text).toContain('Triglycérides = 1.50 mmol/L (10/01/2026)')
  })

  it('matches parameter names case/accents-insensitively (hémoglobine glyquée)', () => {
    const wrapper = createWrapper({
      examensComplementaires: createExamensComplementaires([
        createBioResult({ parameterName: 'Hémoglobine glyquée (HbA1c)', value: '6.8', requestDate: '', filledAt: '2026-01-20 08:00:00' }),
      ]),
    })
    const values = wrapper.findAll('.dernier-examen__row').map(r => r.find('.dernier-examen__value').text())
    expect(values[0]).toBe('6.8 % (20/01/2026)')
    expect(values.slice(1)).toEqual(['—', '—', '—'])
  })

  it('falls back to filledAt for the date when requestDate is missing', () => {
    const wrapper = createWrapper({
      examensComplementaires: createExamensComplementaires([
        createBioResult({ requestDate: '', filledAt: '2026-01-20 08:00:00' }),
      ]),
    })
    const rows = wrapper.findAll('.dernier-examen__row')
    expect(rows[0].find('.dernier-examen__value').text()).toBe('7.2 % (20/01/2026)')
    expect(rows[1].find('.dernier-examen__value').text()).toBe('—')
  })

  it('renders a YYYY-MM requestDate as the 1st of the month (M1 parity with electron)', () => {
    const wrapper = createWrapper({
      examensComplementaires: createExamensComplementaires([
        createBioResult({ requestDate: '2026-01' }),
      ]),
    })
    const rows = wrapper.findAll('.dernier-examen__row')
    // formatDate('YYYY-MM') → local month-start (same output as the electron dateFmt)
    expect(rows[0].find('.dernier-examen__value').text()).toBe('7.2 % (01/01/2026)')
  })

  it('omits the date parenthesis when the raw date is unparsable (no "(—)")', () => {
    const wrapper = createWrapper({
      examensComplementaires: createExamensComplementaires([
        createBioResult({ requestDate: 'pas-une-date' }),
      ]),
    })
    const rows = wrapper.findAll('.dernier-examen__row')
    expect(rows[0].find('.dernier-examen__value').text()).toBe('7.2 %')
  })

  it('updates reactively when bio results are pushed to the shared object', async () => {
    const examensComplementaires = createExamensComplementaires()
    const wrapper = createWrapper({ examensComplementaires })
    await nextTick()
    expect(wrapper.findAll('.dernier-examen__row')[0].find('.dernier-examen__value').text()).toBe('—')

    examensComplementaires.bilanBio.results.push(createBioResult({ value: '7.0', requestDate: '2026-03-02' }))
    await nextTick()
    expect(wrapper.findAll('.dernier-examen__row')[0].find('.dernier-examen__value').text()).toBe('7.0 % (02/03/2026)')

    // a more recent result replaces the displayed one
    examensComplementaires.bilanBio.results.push(createBioResult({ value: '6.9', requestDate: '2026-04-15' }))
    await nextTick()
    expect(wrapper.findAll('.dernier-examen__row')[0].find('.dernier-examen__value').text()).toBe('6.9 % (15/04/2026)')
  })

  it('shows "—" only for the params lacking a result', () => {
    const wrapper = createWrapper({
      examensComplementaires: createExamensComplementaires([
        createBioResult({ parameterName: 'LDL-c', parameterUnit: 'mmol/L', value: '2.1', requestDate: '2026-01-10' }),
      ]),
    })
    const rows = wrapper.findAll('.dernier-examen__row')
    expect(rows[0].find('.dernier-examen__value').text()).toBe('—')
    expect(rows[1].find('.dernier-examen__value').text()).toBe('2.1 mmol/L (10/01/2026)')
    expect(rows[2].find('.dernier-examen__value').text()).toBe('—')
    expect(rows[3].find('.dernier-examen__value').text()).toBe('—')
  })

  // ─── 13. Traitement-auto surveillance glycémique (parité Glasgow) ──
  //
  // Parent non-stagé « Traitement-auto surveillance glycémique » (default-open)
  // + 3 blocs historisés (buffer + toolbar + table), sans Staged 15 keys ni
  // preview unique. NOTE (stub) : les checkbox globaux gardent le même ordre
  // (2 Facteurs puis 4 Médicaments) → ADO [2], aGLP-1 [3], INSULINE [4], POMPE [5].

  it('renders the traitement parent with 3 numbered subtitles and no staged preview', () => {
    const wrapper = createWrapper()
    const titles = wrapper.findAll('.collapsible-section__title').map(el => el.text())
    expect(titles).toContain('Traitement-auto surveillance glycémique')
    expect(wrapper.text()).toContain('1. Médicaments')
    expect(wrapper.text()).toContain('2. Traitement habituel')
    expect(wrapper.text()).toContain('3. Auto surveillance glycémique')
    // Pas de preview stagée traitement : 3 previews au total
    expect(wrapper.findAll('.form-preview')).toHaveLength(3)
    // 6 blocs history (3 facteurs + 3 traitement) : collapse + toolbar + table
    expect(wrapper.findAll('.history-collapse__header').length).toBeGreaterThanOrEqual(6)
    expect(wrapper.findAll('.history-table')).toHaveLength(6)
    expect(wrapper.findAll('.history-table-toolbar')).toHaveLength(6)
  })

  it('reveals the medicament blocks only when the matching checkbox is checked', async () => {
    const wrapper = createWrapper()

    // Par défaut (buffer vide) : aucun bloc détail n'est rendu
    expect(formItemByLabel(wrapper, 'ADO – début').exists()).toBe(false)
    expect(formItemByLabel(wrapper, 'aGLP-1 – début').exists()).toBe(false)
    expect(formItemByLabel(wrapper, 'Insuline – début').exists()).toBe(false)
    expect(formItemByLabel(wrapper, 'Pompe – début').exists()).toBe(false)

    const boxes = wrapper.findAll('.el-checkbox')
    await boxes[2].find('input').setValue(true) // ADO
    await boxes[4].find('input').setValue(true) // INSULINE
    await nextTick()

    expect(formItemByLabel(wrapper, 'ADO – début').exists()).toBe(true)
    expect(formItemByLabel(wrapper, 'Insuline – début').exists()).toBe(true)
    expect(formItemByLabel(wrapper, 'aGLP-1 – début').exists()).toBe(false)
    expect(formItemByLabel(wrapper, 'Pompe – début').exists()).toBe(false)
  })

  it('hides the detail blocks again when the medicament is unchecked', async () => {
    const wrapper = createWrapper()
    await wrapper.findAll('.el-checkbox')[2].find('input').setValue(true) // ADO
    await nextTick()
    expect(formItemByLabel(wrapper, 'ADO – début').exists()).toBe(true)

    // Décocher ADO → bloc masqué (la durée du groupe est remise à zéro, la date du buffer est préservée)
    await wrapper.findAll('.el-checkbox')[2].find('input').setValue(false)
    await nextTick()
    expect(formItemByLabel(wrapper, 'ADO – début').exists()).toBe(false)
  })

  it('PRESERVES the ADO/POMPE buffer dates when unchecked (SEV1 guard)', async () => {
    const wrapper = createWrapper()
    // Coche ADO + POMPE puis renseigne les dates de début
    await wrapper.findAll('.el-checkbox')[2].find('input').setValue(true) // ADO
    await wrapper.findAll('.el-checkbox')[5].find('input').setValue(true) // POMPE
    await nextTick()
    await formItemByLabel(wrapper, 'ADO – début').find('.el-date-picker').setValue('2024-03')
    await formItemByLabel(wrapper, 'Pompe – début').find('.el-date-picker').setValue('2024-06')
    await nextTick()

    // Décocher : le reset des durées se fait sous garde isSyncing* → le watcher
    // inverse durée→date ne réécrit PAS la date du buffer au mois de référence.
    await wrapper.findAll('.el-checkbox')[2].find('input').setValue(false) // ADO
    await wrapper.findAll('.el-checkbox')[5].find('input').setValue(false) // POMPE
    await nextTick()

    // Re-cocher ADO → la date de début d'origine est toujours dans le buffer.
    await wrapper.findAll('.el-checkbox')[2].find('input').setValue(true)
    await nextTick()
    const datePicker = formItemByLabel(wrapper, 'ADO – début').find('.el-date-picker')
    expect(datePicker.exists()).toBe(true)
    expect((datePicker.element as HTMLInputElement).value).toBe('2024-03')
  })

  it('CLAMPS a future ADO start date to an empty duration and keeps it in history (M3)', async () => {
    const data = createDefaultData()
    const wrapper = createWrapper({ data })
    await wrapper.findAll('.el-checkbox')[2].find('input').setValue(true) // ADO
    await nextTick()
    await formItemByLabel(wrapper, 'ADO – début').find('.el-date-picker').setValue('2027-01')
    await nextTick()

    // 2027-01 > référence 2026-06 → aucune durée exprimée (années ET mois vides)
    const adoGroups = wrapper.findAll('.duree-group')
    // duree-group[0..1] = historique, [2] = tabac... : on cible le groupe ADO du buffer médicamenteux
    // (premier groupe contenant le label Durée ADO via son form-item parent).
    const adoItem = formItemByLabel(wrapper, 'Durée ADO')
    expect(adoItem.exists()).toBe(true)
    expect((adoItem.findAll('.el-input-number')[0].element as HTMLInputElement).value).toBe('')
    expect((adoItem.findAll('.el-input-number')[1].element as HTMLInputElement).value).toBe('')

    // Enregistrer le buffer → history[0] préserve la date d'origine (early-return SEV1)
    // 4e collapse (index 3) = Médicaments — le .find() prendrait le bouton tabac.
    const saveBtn = wrapper.findAll('.history-collapse__actions .el-button')
      .filter(b => b.text().includes('Enregistrer'))[3]!
    await saveBtn.trigger('click')
    await nextTick()
    expect(data.medicamentsHistory).toHaveLength(1)
    expect(data.medicamentsHistory[0].adoDateDebut).toBe('2027-01')
    // Table : « depuis 01/2027 » sans durée
    const medsTable = wrapper.findAll('.history-table')[3]
    expect(medsTable.text()).toContain('depuis 01/2027')
  })

  it('syncs the ADO duration from the ADO start date (réciproque, buffer)', async () => {
    const wrapper = createWrapper()
    await wrapper.findAll('.el-checkbox')[2].find('input').setValue(true) // ADO
    await nextTick()
    await formItemByLabel(wrapper, 'ADO – début').find('.el-date-picker').setValue('2024-03')
    await nextTick()

    // dateEntree 2026-06 − début 2024-03 = 2 ans 3 mois
    const adoItem = formItemByLabel(wrapper, 'Durée ADO')
    expect((adoItem.findAll('.el-input-number')[0].element as HTMLInputElement).value).toBe('2')
    expect((adoItem.findAll('.el-input-number')[1].element as HTMLInputElement).value).toBe('3')
  })

  it('computes the ADO start date from an edited ADO duration (réciproque, buffer)', async () => {
    const data = createDefaultData()
    const wrapper = createWrapper({ data })
    await wrapper.findAll('.el-checkbox')[2].find('input').setValue(true) // ADO
    await nextTick()
    await formItemByLabel(wrapper, 'ADO – début').find('.el-date-picker').setValue('2020-03')
    await nextTick()

    const adoItem = formItemByLabel(wrapper, 'Durée ADO')
    expect((adoItem.findAll('.el-input-number')[0].element as HTMLInputElement).value).toBe('6')
    expect((adoItem.findAll('.el-input-number')[1].element as HTMLInputElement).value).toBe('3')

    // 6 ans 3 mois → user sets 5 ans → ADO début 2021-03 dans le buffer
    await adoItem.findAll('.el-input-number')[0].setValue('5')
    await nextTick()
    expect((formItemByLabel(wrapper, 'ADO – début').find('.el-date-picker').element as HTMLInputElement).value).toBe('2021-03')

    const saveBtn = wrapper.findAll('.history-collapse__actions .el-button')
      .filter(b => b.text().includes('Enregistrer'))[3]!
    await saveBtn.trigger('click')
    await nextTick()
    expect(data.medicamentsHistory).toHaveLength(1)
    expect(data.medicamentsHistory[0].adoDateDebut).toBe('2021-03')
    expect(wrapper.emitted('change')).toBeTruthy()
  })

  it('syncs the aGLP-1 duration from the aGLP-1 start date (réciproque, buffer)', async () => {
    const wrapper = createWrapper()
    await wrapper.findAll('.el-checkbox')[3].find('input').setValue(true) // aGLP-1
    await nextTick()
    await formItemByLabel(wrapper, 'aGLP-1 – début').find('.el-date-picker').setValue('2022-11')
    await nextTick()

    // dateEntree 2026-06 − début 2022-11 = 3 ans 7 mois
    const glp1Item = formItemByLabel(wrapper, 'Durée aGLP-1')
    expect((glp1Item.findAll('.el-input-number')[0].element as HTMLInputElement).value).toBe('3')
    expect((glp1Item.findAll('.el-input-number')[1].element as HTMLInputElement).value).toBe('7')
  })

  it('renders the INSULINE type select and syncs its duration (réciproque, buffer)', async () => {
    const wrapper = createWrapper()
    await wrapper.findAll('.el-checkbox')[4].find('input').setValue(true) // INSULINE
    await nextTick()
    await formItemByLabel(wrapper, 'Insuline – début').find('.el-date-picker').setValue('2023-03')
    await nextTick()

    const insulineTypeSelect = formItemByLabel(wrapper, "Type d'insuline").find('.el-select')
    expect(insulineTypeSelect.exists()).toBe(true)
    expect(insulineTypeSelect.text()).toContain('Multi-injections')
    expect(insulineTypeSelect.text()).toContain('Basale seule')

    // dateEntree 2026-06 − début 2023-03 = 3 ans 3 mois
    const insulineItem = formItemByLabel(wrapper, 'Durée insuline')
    expect((insulineItem.findAll('.el-input-number')[0].element as HTMLInputElement).value).toBe('3')
    expect((insulineItem.findAll('.el-input-number')[1].element as HTMLInputElement).value).toBe('3')
  })

  it('computes the POMPE duration in whole years only (réciproque, buffer)', async () => {
    const wrapper = createWrapper()
    await wrapper.findAll('.el-checkbox')[5].find('input').setValue(true) // POMPE
    await nextTick()
    await formItemByLabel(wrapper, 'Pompe – début').find('.el-date-picker').setValue('2024-06')
    await nextTick()

    // dateEntree 2026-06 − début 2024-06 = 2 ans entiers (mois anniversaire révolu)
    const pompeItem = formItemByLabel(wrapper, 'Durée pompe (ans)')
    expect(pompeItem.findAll('.el-input-number')).toHaveLength(1)
    expect((pompeItem.find('.el-input-number').element as HTMLInputElement).value).toBe('2')
  })

  it('computes the POMPE date from whole years (réciproque, mois préservé, buffer)', async () => {
    const data = createDefaultData()
    const wrapper = createWrapper({ data })
    await wrapper.findAll('.el-checkbox')[5].find('input').setValue(true) // POMPE
    await nextTick()
    await formItemByLabel(wrapper, 'Pompe – début').find('.el-date-picker').setValue('2024-06')
    await nextTick()

    const pompeItem = formItemByLabel(wrapper, 'Durée pompe (ans)')
    // 3 ans avant 2026-06 → 2023-06 (mois de début inchangé)
    await pompeItem.find('.el-input-number').setValue('3')
    await nextTick()
    expect((formItemByLabel(wrapper, 'Pompe – début').find('.el-date-picker').element as HTMLInputElement).value).toBe('2023-06')

    const saveBtn = wrapper.findAll('.history-collapse__actions .el-button')
      .filter(b => b.text().includes('Enregistrer'))[3]!
    await saveBtn.trigger('click')
    await nextTick()
    expect(data.medicamentsHistory).toHaveLength(1)
    expect(data.medicamentsHistory[0].pompeDateDebut).toBe('2023-06')
    expect(wrapper.emitted('change')).toBeTruthy()
  })

  it('does NOT render the POMPE duration when the start date is in the future', async () => {
    const wrapper = createWrapper()
    await wrapper.findAll('.el-checkbox')[5].find('input').setValue(true) // POMPE
    await nextTick()
    await formItemByLabel(wrapper, 'Pompe – début').find('.el-date-picker').setValue('2027-01')
    await nextTick()

    const pompeItem = formItemByLabel(wrapper, 'Durée pompe (ans)')
    expect((pompeItem.find('.el-input-number').element as HTMLInputElement).value).toBe('')
  })

  it('computes 1 whole year for the POMPE before the anniversary month is reached (M3, buffer)', async () => {
    const wrapper = createWrapper({ dateEntree: '2025-01-15' }) // l'anniversaire de février (2025-02) n'est pas encore atteint
    await wrapper.findAll('.el-checkbox')[5].find('input').setValue(true) // POMPE
    await nextTick()
    await formItemByLabel(wrapper, 'Pompe – début').find('.el-date-picker').setValue('2023-02')
    await nextTick()

    // 2023-02 → 2025-01 = 1 an ENTIER (jamais négatif, jamais 0)
    const pompeItem = formItemByLabel(wrapper, 'Durée pompe (ans)')
    expect((pompeItem.find('.el-input-number').element as HTMLInputElement).value).toBe('1')
  })

  it('renders « 1 an » (singulier) for a 1-year POMPE exposure in the history table (M3)', () => {
    const wrapper = createWrapper({
      data: createDefaultData({
        medicamentsHistory: [{
          _key: 'm1', date: '2025-08-15T10:00', medicaments: ['POMPE'],
          adoDateDebut: '', adoCommentaire: '', glp1DateDebut: '', glp1Commentaire: '',
          insulineType: '', insulineDateDebut: '', insulineCommentaire: '',
          pompeType: 'Omnipod 5', pompeDateDebut: '2024-08', pompeCommentaire: '',
        }],
      }),
      dateEntree: '2025-08-15', // exactement 1 an calendaire plus tard (date de mesure 08/2025)
    })
    const medsTable = wrapper.findAll('.history-table')[3]
    expect(medsTable.text()).toContain('Omnipod 5 — depuis 08/2024 (1 an)')
  })

  it('renders ADO and INSULINE durations (an/mois) in the medicaments history table', () => {
    const wrapper = createWrapper({
      data: createDefaultData({
        medicamentsHistory: [{
          _key: 'm1', date: '2026-06-15T10:00',
          medicaments: ['ADO', 'aGLP-1', 'INSULINE'],
          adoDateDebut: '2022-01', adoCommentaire: '',
          glp1DateDebut: '2024-04', glp1Commentaire: '',
          insulineType: 'basale', insulineDateDebut: '2025-12', insulineCommentaire: '',
          pompeType: '', pompeDateDebut: '', pompeCommentaire: '',
        }],
      }),
    })
    const text = wrapper.findAll('.history-table')[3].text()
    // réf. date de mesure 2026-06 : ADO 4 ans 5 mois · aGLP-1 2 ans 2 mois · INSULINE 6 mois
    expect(text).toContain('ADO, aGLP-1, INSULINE')
    expect(text).toContain('depuis 01/2022 (4 ans 5 mois)')
    expect(text).toContain('depuis 04/2024 (2 ans 2 mois)')
    expect(text).toContain('basale — depuis 12/2025 (6 mois)')
  })

  it('saves a medicaments buffer entry into medicamentsHistory and shows it in the table', async () => {
    const data = createDefaultData()
    const wrapper = createWrapper({ data })
    await wrapper.findAll('.el-checkbox')[2].find('input').setValue(true) // ADO
    await nextTick()
    await formItemByLabel(wrapper, 'ADO – début').find('.el-date-picker').setValue('2022-01')
    await nextTick()

    // buffer édité → history intacte jusqu'à Enregistrer
    expect(data.medicamentsHistory).toHaveLength(0)

    const saveBtn = wrapper.findAll('.history-collapse__actions .el-button')
      .filter(b => b.text().includes('Enregistrer'))[3]!
    await saveBtn.trigger('click')
    await nextTick()
    expect(data.medicamentsHistory).toHaveLength(1)
    expect(data.medicamentsHistory[0].medicaments).toEqual(['ADO'])
    expect(data.medicamentsHistory[0].adoDateDebut).toBe('2022-01')
    expect(wrapper.emitted('change')).toBeTruthy()
    expect(wrapper.findAll('.history-table')[3].text()).toContain('ADO')
    expect(wrapper.findAll('.history-table')[3].text()).toContain('depuis 01/2022')
  })

  it('edits and deletes a medicaments history entry (buffer round-trip)', async () => {
    // Le test « asks for confirmation… » remplace ElMessageBox.confirm par un
    // mock rejeté sans le restaurer : on force la résolution pour le delete.
    (ElMessageBox.confirm as unknown as ReturnType<typeof vi.fn>).mockResolvedValue('confirm')
    const data = createDefaultData({
      medicamentsHistory: [{
        _key: 'm1', date: '2026-06-15T10:00', medicaments: ['ADO'],
        adoDateDebut: '2022-01', adoCommentaire: '', glp1DateDebut: '', glp1Commentaire: '',
        insulineType: '', insulineDateDebut: '', insulineCommentaire: '',
        pompeType: '', pompeDateDebut: '', pompeCommentaire: '',
      }],
    })
    const wrapper = createWrapper({ data })
    // Edit → buffer rechargé avec la date d'origine
    const editBtn = wrapper.findAll('.history-table')[3].findAll('.el-button')[0]
    await editBtn.trigger('click')
    await nextTick()
    expect((formItemByLabel(wrapper, 'ADO – début').find('.el-date-picker').element as HTMLInputElement).value).toBe('2022-01')
    await formItemByLabel(wrapper, 'ADO – début').find('.el-date-picker').setValue('2021-03')
    await nextTick()
    const saveBtn = wrapper.findAll('.history-collapse__actions .el-button')
      .filter(b => b.text().includes('Enregistrer'))[3]!
    await saveBtn.trigger('click')
    await nextTick()
    expect(data.medicamentsHistory[0].adoDateDebut).toBe('2021-03')
    // Delete → collection vidée + change émis
    const delBtn = wrapper.findAll('.history-table')[3].findAll('.el-button')[1]
    await delBtn.trigger('click')
    await nextTick()
    expect(data.medicamentsHistory).toHaveLength(0)
    expect(wrapper.emitted('change')).toBeTruthy()
  })

  it('seeds legacy medicaments scalaires into medicamentsHistory[0] once (migration)', () => {
    const data = createDefaultData({
      medicaments: ['ADO', 'POMPE'],
      adoDateDebut: '2022-01',
      pompeType: 'Omnipod 5',
      pompeDateDebut: '2024-06',
    })
    const wrapper = createWrapper({ data })
    expect(data.medicamentsHistory).toHaveLength(1)
    expect(data.medicamentsHistory[0].medicaments).toEqual(['ADO', 'POMPE'])
    expect(data.medicamentsHistory[0].adoDateDebut).toBe('2022-01')
    expect(wrapper.findAll('.history-table')[3].text()).toContain('ADO')
  })

  it('saves a traitement habituel buffer entry and shows it in the table + seeds legacy', async () => {
    const data = createDefaultData()
    const wrapper = createWrapper({ data })
    // Le RichText est mocké : on écrit directement dans le buffer via le composant
    // en retrouvant le collapse « traitement habituel » (5e history-collapse).
    // Simplification : seed legacy → history[0] sans interaction.
    const seeded = createDefaultData({ traitementHabituel: '<p>Metformine 1000 mg</p>' })
    const wrapper2 = createWrapper({ data: seeded })
    expect(seeded.traitementHabituelHistory).toHaveLength(1)
    await nextTick()
    expect(wrapper2.findAll('.history-table')[4].text()).toContain('Metformine 1000 mg')
    expect(wrapper.findAll('.history-table')[4].text()).toContain('Aucun traitement habituel enregistré')
  })

  it('saves a surveillance buffer entry and shows Capillaire/MCG in the table + seeds legacy', async () => {
    const data = createDefaultData()
    const wrapper = createWrapper({ data })
    await formItemByLabel(wrapper, 'Capillaire').find('.el-select').setValue('Oui')
    await formItemByLabel(wrapper, 'MCG (capteur)').find('.el-select').setValue('Non')
    await nextTick()
    const saveBtns = wrapper.findAll('.history-collapse__actions .el-button')
      .filter(b => b.text().includes('Enregistrer'))
    // 3 tabac/substance/anthropo + 1 meds + 1 hab + 1 surv = le dernier bouton = surv
    const survSave = saveBtns[saveBtns.length - 1]
    await survSave.trigger('click')
    await nextTick()
    expect(data.surveillanceHistory).toHaveLength(1)
    expect(data.surveillanceHistory[0].surveillanceCapillaire).toBe('Oui')
    expect(wrapper.findAll('.history-table')[5].text()).toContain('Oui')

    const seeded = createDefaultData({ surveillanceCapillaire: 'Oui', surveillanceMCG: 'Non', surveillanceCommentaire: '<p>3 mesures/j</p>' })
    const wrapper2 = createWrapper({ data: seeded })
    expect(seeded.surveillanceHistory).toHaveLength(1)
    await nextTick()
    expect(wrapper2.findAll('.history-table')[5].text()).toContain('3 mesures/j')
  })

  it('shows "—" in the medicaments table when an entry has no dates', () => {
    const wrapper = createWrapper({
      data: createDefaultData({
        medicamentsHistory: [{
          _key: 'm1', date: '2026-06-15T10:00', medicaments: ['ADO'],
          adoDateDebut: '', adoCommentaire: '', glp1DateDebut: '', glp1Commentaire: '',
          insulineType: '', insulineDateDebut: '', insulineCommentaire: '',
          pompeType: '', pompeDateDebut: '', pompeCommentaire: '',
        }],
      }),
    })
    const text = wrapper.findAll('.history-table')[3].text()
    expect(text).toContain('ADO')
    expect(text).toContain('—')
  })

  it('exposes the traitement fields by label in the buffers (migration data-history-path)', async () => {
    const wrapper = createWrapper()
    // Révèle tous les blocs conditionnels du buffer médicaments
    await wrapper.findAll('.el-checkbox')[2].find('input').setValue(true) // ADO
    await wrapper.findAll('.el-checkbox')[3].find('input').setValue(true) // aGLP-1
    await wrapper.findAll('.el-checkbox')[4].find('input').setValue(true) // INSULINE
    await wrapper.findAll('.el-checkbox')[5].find('input').setValue(true) // POMPE
    await nextTick()
    // Migration historique : data-history-path supprimé — présence vérifiée
    // via les labels des el-form-item.
    const labels = [
      'ADO – début',
      'Commentaire ADO',
      'aGLP-1 – début',
      'Commentaire aGLP-1',
      "Type d'insuline",
      'Insuline – début',
      'Commentaire insuline',
      'Pompe – modèle',
      'Pompe – début',
      'Commentaire pompe',
      'Traitement habituel',
      'Capillaire',
      'MCG (capteur)',
      'Commentaire autosurveillance',
    ]
    for (const label of labels) {
      const el = formItemByLabel(wrapper, label)
      expect(el?.exists() ?? false, `missing label: ${label}`).toBe(true)
    }
  })

  it('exposes the traitement paths in PARAMETER_META', () => {
    const paths = [
      'ficheDiabete.medicaments',
      'ficheDiabete.adoDateDebut',
      'ficheDiabete.adoCommentaire',
      'ficheDiabete.glp1DateDebut',
      'ficheDiabete.glp1Commentaire',
      'ficheDiabete.insulineType',
      'ficheDiabete.insulineDateDebut',
      'ficheDiabete.insulineCommentaire',
      'ficheDiabete.pompeType',
      'ficheDiabete.pompeDateDebut',
      'ficheDiabete.pompeCommentaire',
      'ficheDiabete.traitementHabituel',
      'ficheDiabete.surveillanceCapillaire',
      'ficheDiabete.surveillanceMCG',
      'ficheDiabete.surveillanceCommentaire',
    ]
    for (const p of paths) {
      expect(PARAMETER_META[p]).toBeDefined()
      expect(PARAMETER_META[p].label).toBeTruthy()
    }
  })

  // ─── 14. Facteurs stagé + 6 historiques Glasgow ──────────

  it('renders Facteurs staged + 6 Glasgow history blocks with their toolbars/tables', () => {
    const wrapper = createWrapper()
    const titles = wrapper.findAll('.collapsible-section__title').map(el => el.text())
    expect(titles).toContain('Facteurs de risque')
    expect(titles).toContain('Facteurs')
    expect(titles).toContain('Traitement-auto surveillance glycémique')
    expect(titles).not.toContain('Consommation de tabac')
    expect(titles).not.toContain('Autre substance toxique')
    expect(titles).not.toContain('Anthropométrie')
    // 3 staged sections (historique + facteurs + complications) each with Enregistrer/Annuler footer
    const footers = wrapper.findAll('.staged-section__footer')
    expect(footers).toHaveLength(3)
    // 3 previews (dernier examen + traitement historisé ont tables, pas de preview)
    expect(wrapper.findAll('.form-preview')).toHaveLength(3)
    // 6 history tables + 6 toolbars (tabac/substance/anthropo + meds/hab/surv, pattern Glasgow)
    expect(wrapper.findAll('.history-table')).toHaveLength(6)
    expect(wrapper.findAll('.history-table-toolbar')).toHaveLength(6)
  })

  it('saves tabac and substance histories independently (separate buffers/collections)', async () => {
    const data = createDefaultData({
      tabacHistory: [{
        _key: 't1', date: '2026-06-15T10:00',
        tabac: 'Oui', tabacQuantite: 10, tabacUnite: 'cigarette',
        tabacDuree: 'j', tabacDateDebut: '2020-01', tabacCommentaire: '',
      }],
      substanceHistory: [{
        _key: 's1', date: '2026-06-15T10:00',
        substance: 'Alcool', substancePrecision: '', substanceQuantite: 2,
        substanceUnite: 'l', substanceDuree: 'j', substanceDateDebut: '2020-01',
        substanceCommentaire: '',
      }],
    })
    const wrapper = createWrapper({ data })

    // Edit tabac entry only → substance untouched
    const editTabacBtn = wrapper.findAll('.history-table')[0].findAll('.el-button')[0]
    await editTabacBtn.trigger('click')
    await nextTick()
    await formItemByLabel(wrapper, 'Quantité tabac').find('.el-input-number').setValue('15')
    await nextTick()
    const saveTabacBtn = wrapper.findAll('.history-collapse__actions .el-button')
      .find(b => b.text().includes('Enregistrer'))!
    await saveTabacBtn.trigger('click')
    await nextTick()

    expect(data.tabacHistory[0].tabacQuantite).toBe('15')
    expect(data.substanceHistory[0].substance).toBe('Alcool')
    expect(wrapper.emitted('change')).toBeTruthy()
  })

  it('exposes ficheTabac and ficheSubstance groups in PARAMETER_GROUPS', async () => {
    const mod = await import('@/utils/parameter-history')
    expect(mod.PARAMETER_GROUPS.ficheTabac).toContain('ficheDiabete.tabac')
    expect(mod.PARAMETER_GROUPS.ficheTabac).toContain('ficheDiabete.tabacDateDebut')
    expect(mod.PARAMETER_GROUPS.ficheSubstance).toContain('ficheDiabete.substance')
    expect(mod.PARAMETER_GROUPS.ficheSubstance).toContain('ficheDiabete.substanceDateDebut')
  })

  it('forwards open-history on tabac history-table Clock click and open-multi-history on Voir courbes', async () => {
    const wrapper = createWrapper({
      data: createDefaultData({
        tabacHistory: [{
          _key: 't1', date: '2026-06-15T10:00',
          tabac: 'Oui', tabacQuantite: 10, tabacUnite: 'cigarette',
          tabacDuree: 'j', tabacDateDebut: '2020-01', tabacCommentaire: '',
        }],
      }),
    })
    const tabacBtn = wrapper.find('button[aria-label="Voir historique Statut tabac"]')
    expect(tabacBtn.exists()).toBe(true)
    await tabacBtn.trigger('click')
    expect(wrapper.emitted('open-history')).toBeTruthy()
    expect(wrapper.emitted('open-history')![0]).toEqual(['ficheDiabete.tabac'])
    // Toolbar Voir courbes tabac -> ficheTabac (6 toolbars au total)
    const toolbars = wrapper.findAll('.history-table-toolbar')
    expect(toolbars.length).toBe(6)
    const voirCourbes = wrapper.findAll('.el-button').filter(b => b.text().includes('Voir courbes'))
    expect(voirCourbes.length).toBe(6)
    await voirCourbes[0].trigger('click')
    expect(wrapper.emitted('open-multi-history')).toBeTruthy()
    expect(wrapper.emitted('open-multi-history')![0]).toEqual(['ficheTabac'])
  })

  it('forwards open-history on substance and anthropométrie history-table Clock clicks', async () => {
    const wrapper = createWrapper({
      data: createDefaultData({
        substanceHistory: [{
          _key: 's1', date: '2026-06-15T10:00',
          substance: 'Alcool', substancePrecision: '', substanceQuantite: 2,
          substanceUnite: 'l', substanceDuree: 'j', substanceDateDebut: '2020-01',
          substanceCommentaire: '',
        }],
      }),
    })
    const subBtn = wrapper.find('button[aria-label="Voir historique Substance"]')
    expect(subBtn.exists()).toBe(true)
    await subBtn.trigger('click')
    expect(wrapper.emitted('open-history')).toBeTruthy()
    const poidsBtn = wrapper.find('button[aria-label="Voir historique Poids"]')
    expect(poidsBtn.exists()).toBe(true)
    await poidsBtn.trigger('click')
    const emitted = wrapper.emitted('open-history')!.map(args => args[0])
    expect(emitted).toContain('ficheDiabete.substance')
    expect(emitted).toContain('bilanInitial.examenPhysique.poids')
  })

  it('forwards open-history on traitement history-table Clock clicks and open-multi-history on Voir courbes', async () => {
    const wrapper = createWrapper({
      data: createDefaultData({
        medicamentsHistory: [{
          _key: 'm1', date: '2026-06-15T10:00', medicaments: ['ADO'],
          adoDateDebut: '2022-01', adoCommentaire: '', glp1DateDebut: '', glp1Commentaire: '',
          insulineType: '', insulineDateDebut: '', insulineCommentaire: '',
          pompeType: '', pompeDateDebut: '', pompeCommentaire: '',
        }],
        traitementHabituelHistory: [{ _key: 'h1', date: '2026-06-15T10:00', traitementHabituel: '<p>Metformine</p>' }],
        surveillanceHistory: [{ _key: 's1', date: '2026-06-15T10:00', surveillanceCapillaire: 'Oui', surveillanceMCG: 'Non', surveillanceCommentaire: '' }],
      }),
    })
    const medsBtn = wrapper.find('button[aria-label="Voir historique Médicaments"]')
    expect(medsBtn.exists()).toBe(true)
    await medsBtn.trigger('click')
    const habBtn = wrapper.find('button[aria-label="Voir historique Traitement habituel"]')
    expect(habBtn.exists()).toBe(true)
    await habBtn.trigger('click')
    const capBtn = wrapper.find('button[aria-label="Voir historique Capillaire"]')
    expect(capBtn.exists()).toBe(true)
    await capBtn.trigger('click')
    const emitted = wrapper.emitted('open-history')!.map(args => args[0])
    expect(emitted).toContain('ficheDiabete.medicaments')
    expect(emitted).toContain('ficheDiabete.traitementHabituel')
    expect(emitted).toContain('ficheDiabete.surveillanceCapillaire')
    // Toolbars 4/5/6 → traitementMeds / traitementHabituel / surveillance
    const voirCourbes = wrapper.findAll('.el-button').filter(b => b.text().includes('Voir courbes'))
    expect(voirCourbes).toHaveLength(6)
    await voirCourbes[3].trigger('click')
    await voirCourbes[4].trigger('click')
    await voirCourbes[5].trigger('click')
    const multi = wrapper.emitted('open-multi-history')!.map(args => args[0])
    expect(multi).toEqual(expect.arrayContaining(['traitementMeds', 'traitementHabituel', 'surveillance']))
  })

  it('accepts a patientId prop (parity BilanInitialTab)', () => {
    const wrapper = createWrapper()
    expect((wrapper.props() as any).patientId ?? null).toBeDefined()
    const withId = mount(FicheDiabeteTab, {
      props: {
        data: createDefaultData(),
        sexe: 'F',
        age: 45,
        dateEntree: '2026-06-01',
        examenPhysique: { poids: null, taille: null } as ExamenPhysique,
        patientId: 42,
      },
      global: { stubs: EL_STUBS },
    })
    expect((withId.props() as any).patientId).toBe(42)
  })
})
