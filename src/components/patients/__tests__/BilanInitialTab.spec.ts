// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref, nextTick } from 'vue'
import type { BilanInitialData } from '@/types/crh-diabete'

// ─── Mock @tiptap/vue-3 ────────────────────────────────────────────

const mockCan = {
  undo: vi.fn().mockReturnValue(false),
  redo: vi.fn().mockReturnValue(false),
}

const mockEditor = {
  isActive: vi.fn().mockReturnValue(false),
  chain: vi.fn().mockReturnValue({
    focus: vi.fn().mockReturnThis(),
    toggleBold: vi.fn().mockReturnThis(),
    toggleItalic: vi.fn().mockReturnThis(),
    toggleUnderline: vi.fn().mockReturnThis(),
    toggleStrike: vi.fn().mockReturnThis(),
    toggleHighlight: vi.fn().mockReturnThis(),
    toggleHeading: vi.fn().mockReturnThis(),
    toggleBlockquote: vi.fn().mockReturnThis(),
    toggleCode: vi.fn().mockReturnThis(),
    toggleCodeBlock: vi.fn().mockReturnThis(),
    setHorizontalRule: vi.fn().mockReturnThis(),
    toggleBulletList: vi.fn().mockReturnThis(),
    toggleOrderedList: vi.fn().mockReturnThis(),
    sinkListItem: vi.fn().mockReturnThis(),
    liftListItem: vi.fn().mockReturnThis(),
    clearNodes: vi.fn().mockReturnThis(),
    unsetAllMarks: vi.fn().mockReturnThis(),
    undo: vi.fn().mockReturnThis(),
    redo: vi.fn().mockReturnThis(),
    extendMarkRange: vi.fn().mockReturnThis(),
    setLink: vi.fn().mockReturnThis(),
    unsetLink: vi.fn().mockReturnThis(),
    setColor: vi.fn().mockReturnThis(),
    setParagraph: vi.fn().mockReturnThis(),
    setFontFamily: vi.fn().mockReturnThis(),
    unsetFontFamily: vi.fn().mockReturnThis(),
    setFontSize: vi.fn().mockReturnThis(),
    unsetFontSize: vi.fn().mockReturnThis(),
    toggleSubscript: vi.fn().mockReturnThis(),
    toggleSuperscript: vi.fn().mockReturnThis(),
    setTextAlign: vi.fn().mockReturnThis(),
    setImage: vi.fn().mockReturnThis(),
    updateAttributes: vi.fn().mockReturnThis(),
    insertContent: vi.fn().mockReturnThis(),
    run: vi.fn().mockReturnThis(),
  }),
  can: vi.fn().mockReturnValue(mockCan),
  getAttributes: vi.fn().mockImplementation((name?: string) => {
    if (name === 'textStyle') return { color: null, fontFamily: undefined, fontSize: undefined }
    if (name === 'image') return {}
    return { color: null }
  }),
  setEditable: vi.fn(),
  getHTML: vi.fn().mockReturnValue(''),
  commands: { setContent: vi.fn() },
  destroy: vi.fn(),
}

vi.mock('@tiptap/vue-3', () => ({
  useEditor: vi.fn(() => ref(mockEditor)),
  EditorContent: {
    template: '<div class="editor-content" />',
    props: ['editor'],
  },
}))

vi.mock('@tiptap/starter-kit', () => ({ default: {} }))
vi.mock('@tiptap/extension-underline', () => ({ default: {} }))

// ─── Mock RichTextEditor (emits update:modelValue for staged tests) ──

vi.mock('@/components/patients/RichTextEditor.vue', () => ({
  default: {
    name: 'RichTextEditor',
    template: '<div class="rich-editor"><input class="rich-editor-input" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" /></div>',
    props: ['modelValue', 'readonly', 'rows', 'placeholder'],
    emits: ['update:modelValue', 'change'],
  },
}))

// ─── Mock composables ──────────────────────────────────────────────

vi.mock('@/composables/useCrhDiabeteCalculations', () => ({
  useCrhDiabeteCalculations: () => ({
    calcGlasgowScore: vi.fn().mockReturnValue(15),
    glasgowInterpretation: vi.fn().mockReturnValue({
      label: 'Traumatisme léger / Conscience normale',
      type: 'success',
    }),
    // Real formula (mirrors src/composables/useCrhDiabeteCalculations.ts) so
    // imcDisplay / entryImc assertions are meaningful: round((poids / (taille/100)^2) * 10) / 10
    calcIMC: vi.fn((poids: number | null, taille: number | null) => {
      if (poids == null || taille == null) return null
      if (poids <= 0 || taille <= 0) return null
      const tailleM = taille / 100
      return Math.round((poids / (tailleM * tailleM)) * 10) / 10
    }),
  }),
}))

// ─── Mock useVitalSigns ───────────────────────────────────────────

vi.mock('@/composables/useVitalSigns', () => ({
  getVitalSignsItemsList: vi.fn().mockResolvedValue([]),
  saveVitalSignsItem: vi.fn().mockResolvedValue({}),
  deleteVitalSignsItem: vi.fn().mockResolvedValue(undefined),
}))

// ─── Mock Element Plus (with ElMessageBox) ─────────────────────────

vi.mock('element-plus', async () => {
  const actual = await vi.importActual('element-plus')
  return {
    ...actual,
    ElMessage: { success: vi.fn(), warning: vi.fn(), error: vi.fn() },
    ElMessageBox: { confirm: vi.fn().mockResolvedValue(undefined) },
  }
})

// ─── Mock @element-plus/icons-vue ──────────────────────────────────

vi.mock('@element-plus/icons-vue', () => ({
  Plus: { template: '<span />' },
  Minus: { template: '<span />' },
  ArrowDown: { template: '<span />' },
  Edit: { template: '<span />' },
  Delete: { template: '<span />' },
}))

// ─── EL Stubs ──────────────────────────────────────────────────────

const EL_STUBS: Record<string, any> = {
  'el-form': {
    template: '<form class="el-form" @submit.prevent><slot /></form>',
    props: ['labelPosition', 'class'],
  },
  'el-form-item': {
    template: '<div class="el-form-item"><label v-if="label">{{ label }}</label><slot /></div>',
    props: ['label', 'prop'],
  },
  'el-divider': {
    template: '<div class="el-divider"><slot /></div>',
    props: ['contentPosition'],
  },
  'el-row': {
    template: '<div class="el-row"><slot /></div>',
    props: ['gutter'],
  },
  'el-col': {
    template: '<div class="el-col"><slot /></div>',
    props: ['span'],
  },
  'el-input': {
    template: '<input class="el-input" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'placeholder', 'type', 'rows'],
    emits: ['update:modelValue'],
  },
  'el-input-number': {
    template: '<input class="el-input-number" type="number" :value="modelValue" @input="$emit(\'update:modelValue\', Number($event.target.value))" />',
    props: ['modelValue', 'min', 'max', 'step', 'controlsPosition'],
    emits: ['update:modelValue'],
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
  'el-tag': {
    template: '<span class="el-tag" :type="type" :effect="effect"><slot /></span>',
    props: ['type', 'effect'],
  },
  'el-button': {
    template: '<button class="el-button" :type="type" :size="size" @click="$emit(\'click\', $event)"><slot /></button>',
    props: ['type', 'size'],
    emits: ['click'],
  },
  'el-icon': {
    template: '<span class="el-icon"><slot /></span>',
  },
  'el-badge': {
    template: '<span class="el-badge"><span class="el-badge__value">{{ value }}</span><slot /></span>',
    props: ['value', 'class'],
  },
  'el-date-picker': {
    template: '<input class="el-date-picker" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'type', 'valueFormat', 'placeholder'],
    emits: ['update:modelValue'],
  },
  'el-select': {
    template: '<select class="el-select" :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value); $emit(\'change\')"><slot /></select>',
    props: ['modelValue', 'placeholder', 'clearable'],
    emits: ['update:modelValue', 'change'],
  },
  'el-option': {
    template: '<option class="el-option" :value="value"><slot /></option>',
    props: ['label', 'value'],
  },
}

// ─── Import component ──────────────────────────────────────────────

import BilanInitialTab from '../BilanInitialTab.vue'
import { getVitalSignsItemsList, saveVitalSignsItem, deleteVitalSignsItem } from '@/composables/useVitalSigns'
import type { VitalSignsItemRecord } from '@/composables/useVitalSigns'

// ─── Test suite ────────────────────────────────────────────────────

describe('BilanInitialTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getVitalSignsItemsList).mockResolvedValue([])
    vi.mocked(saveVitalSignsItem).mockResolvedValue({} as VitalSignsItemRecord)
    vi.mocked(deleteVitalSignsItem).mockResolvedValue(undefined)
  })

  function createDefaultData(overrides: Partial<BilanInitialData> = {}): BilanInitialData {
    return {
      histoireRecent: '',
      traitementEntree: '',
      glasgow: {
        ouvertureYeux: 0,
        reponseVerbale: 0,
        reponseMotrice: 0,
      },
      examenPhysique: {
        taSystolique: null,
        taDiastolique: null,
        frequenceCardiaque: null,
        temperature: null,
        glycemie: null,
        cetonurie: null,
        glucosurie: null,
        cetonemie: null,
        poids: null,
        taille: null,
      },
      scoreDouleur: null,
      examenPhysiqueTexte: '',
      conclusionEntree: '',
      projetSoin: '',
      glasgowHistory: [],
      vitalSignsHistory: [],
      douleurHistory: [],
      ...overrides,
    }
  }

  function createWrapper(options: {
    data?: BilanInitialData
    patientId?: number | null
    dateDebut?: string
    dateFin?: string
    linkVitalCheck?: boolean
    readonly?: boolean
  } = {}) {
    const { data = createDefaultData(), ...rest } = options

    return mount(BilanInitialTab, {
      props: { data, ...rest },
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

  // ─── 1. Motif d'hospitalisation NOT rendered ─────────────────────
  describe('does NOT render "Motif d\'hospitalisation" field', () => {
    it('does not have a motifHospitalisation textarea', () => {
      const wrapper = createWrapper()
      const textareas = wrapper.findAll('.el-input')
      const motifTextarea = textareas.find(el => {
        const label = el.find('label')
        return label.exists() && label.text().includes("Motif d'hospitalisation")
      })
      expect(motifTextarea).toBeUndefined()
    })

    it('does not contain "Motif d\'hospitalisation" in any form item label', () => {
      const wrapper = createWrapper()
      const formItems = wrapper.findAll('.el-form-item')
      const motifItem = formItems.find(item => {
        const label = item.find('label')
        return label.exists() && label.text().includes("Motif d'hospitalisation")
      })
      expect(motifItem).toBeUndefined()
    })
  })

  // ─── 2. Other bilanInitial fields rendered ────────────────────────

  describe('renders other bilanInitial fields', () => {
    it('renders "Histoire récente de la maladie" label', () => {
      const wrapper = createWrapper()
      expect(wrapper.text()).toContain('Histoire récente de la maladie')
    })

    it('renders RichTextEditor for histoireRecent', () => {
      const wrapper = createWrapper()
      expect(wrapper.find('.rich-editor').exists()).toBe(true)
    })

    it('does not render textarea elements (replaced by RichTextEditor)', () => {
      const wrapper = createWrapper()
      const textareas = wrapper.findAll('textarea')
      expect(textareas).toHaveLength(0)
    })

    it('renders Glasgow section', () => {
      const wrapper = createWrapper()
      expect(wrapper.text()).toContain('Enregistrer une évaluation')
      expect(wrapper.text()).toContain('Score Glasgow')
    })

    it('renders Glasgow sub-fields', () => {
      const wrapper = createWrapper()
      expect(wrapper.text()).toContain('Ouverture des yeux')
      expect(wrapper.text()).toContain('Réponse verbale')
      expect(wrapper.text()).toContain('Réponse motrice')
    })

    it('renders vitals section', () => {
      const wrapper = createWrapper()
      expect(wrapper.text()).toContain('Enregistrer une mesure')
      expect(wrapper.text()).toContain('TA Systolique')
      expect(wrapper.text()).toContain('Glycémie')
    })

    it('renders examen physique fields', () => {
      const wrapper = createWrapper()
      expect(wrapper.text()).toContain('TA Systolique')
      expect(wrapper.text()).toContain('TA Diastolique')
      expect(wrapper.text()).toContain('Fréquence cardiaque')
      expect(wrapper.text()).toContain('Température')
      expect(wrapper.text()).toContain('Glycémie')
    })

    it('renders "Conclusion à l\'entrée" section', () => {
      const wrapper = createWrapper()
      expect(wrapper.text()).toContain("Conclusion à l'entrée")
    })
  })

  // ─── 2b. New fields (traitement, douleur, examen physique, projet de soin) ──

  describe('renders new bilanInitial fields', () => {
    it('renders "Traitement à l\'entrée" divider', () => {
      const wrapper = createWrapper()
      expect(wrapper.text()).toContain('Traitement à l\'entrée')
    })

    it('renders "Score de douleur à l\'entrée" collapsible', () => {
      const wrapper = createWrapper()
      expect(wrapper.text()).toContain('Score de douleur à l\'entrée')
    })

    it('renders "Examen physique" label', () => {
      const wrapper = createWrapper()
      expect(wrapper.text()).toContain('Examen physique')
    })

    it('renders "Projet de soin pendant l\'hospitalisation" divider', () => {
      const wrapper = createWrapper()
      expect(wrapper.text()).toContain('Projet de soin pendant l\'hospitalisation')
    })

    it('renders "Examen clinique à l\'entrée" group heading', () => {
      const wrapper = createWrapper()
      expect(wrapper.text()).toContain('Examen clinique à l\'entrée')
    })

    it('renders numbered sub-section headings under Examen clinique', () => {
      const wrapper = createWrapper()
      const subtitles = wrapper.findAll('.examen-subtitle').map(el => el.text())
      expect(subtitles).toEqual([
        '1. Score de Glasgow',
        '2. Score de douleur à l\'entrée',
        '3. Paramètres vitaux à l\'admission',
        '4. Examen physique',
      ])
    })
  })

  describe('Score de douleur collapsible', () => {
    it('is collapsed by default', () => {
      const wrapper = createWrapper()
      const bodies = wrapper.findAll('.history-collapse__body')
      expect(bodies[1].isVisible()).toBe(false)
    })

    it('expands on header click', async () => {
      const wrapper = createWrapper()
      const headers = wrapper.findAll('.history-collapse__header')
      await headers[1].trigger('click')
      const bodies = wrapper.findAll('.history-collapse__body')
      expect(bodies[1].isVisible()).toBe(true)
    })

    it('updates data.scoreDouleur through the el-input-number', async () => {
      const data = createDefaultData()
      const wrapper = createWrapper({ data })
      const headers = wrapper.findAll('.history-collapse__header')
      await headers[1].trigger('click')
      const bodies = wrapper.findAll('.history-collapse__body')
      const input = bodies[1].find('.el-input-number')
      await input.setValue('7')
      expect(data.scoreDouleur).toBe(7)
    })
  })

  describe('Score de douleur History', () => {
    it('renders "Enregistrer une mesure" douleur collapse header', () => {
      const wrapper = createWrapper()
      const headers = wrapper.findAll('.history-collapse__header')
      expect(headers[1].text()).toContain('Enregistrer une mesure')
    })

    it('shows empty douleur table when no history', () => {
      const wrapper = createWrapper()
      const tables = wrapper.findAll('.history-table')
      const douleurRows = tables[1].findAll('tbody tr')
      expect(douleurRows.length).toBe(1)
      expect(douleurRows[0].text()).toContain('Aucune mesure enregistrée')
    })

    it('adds a douleur entry with _key, date and score', async () => {
      const data = createDefaultData({ scoreDouleur: 6 })
      const wrapper = createWrapper({ data })

      const headers = wrapper.findAll('.history-collapse__header')
      await headers[1].trigger('click')

      const bodies = wrapper.findAll('.history-collapse__body')
      const actions = bodies[1].find('.history-collapse__actions')
      const saveBtn = actions.findAll('button').find(b => b.text() === 'Enregistrer')
      await saveBtn.trigger('click')
      await flushPromises()

      expect(data.douleurHistory).toHaveLength(1)
      expect(data.douleurHistory[0]._key).toBeTruthy()
      expect(data.douleurHistory[0].date).toBeTruthy()
      expect(data.douleurHistory[0].score).toBe(6)
    })

    it('shows the badge count on the douleur collapse header', () => {
      const wrapper = createWrapper({
        data: createDefaultData({
          douleurHistory: [
            { _key: 'd1', date: '2025-03-15T10:00', score: 7 },
            { _key: 'd2', date: '2025-02-10T08:00', score: 3 },
          ],
        }),
      })

      const headers = wrapper.findAll('.history-collapse__header')
      const badge = headers[1].find('.el-badge')
      expect(badge.exists()).toBe(true)
      expect(badge.text()).toContain('2')
    })

    it('does not show the badge when douleur history is empty', () => {
      const wrapper = createWrapper()
      const headers = wrapper.findAll('.history-collapse__header')
      expect(headers[1].find('.el-badge').exists()).toBe(false)
    })

    it('displays douleur history entries in a table', () => {
      const wrapper = createWrapper({
        data: createDefaultData({
          douleurHistory: [{ _key: 'd1', date: '2025-03-15T10:00', score: 7 }],
        }),
      })

      const tables = wrapper.findAll('.history-table')
      const rows = tables[1].findAll('tbody tr')
      expect(rows.length).toBe(1)
      expect(rows[0].text()).toContain('15/03/2025')
      expect(rows[0].text()).toContain('7')
    })

    it('sorts douleur history entries by date descending', () => {
      const wrapper = createWrapper({
        data: createDefaultData({
          douleurHistory: [
            { _key: 'd1', date: '2025-01-05T08:00', score: 3 },
            { _key: 'd2', date: '2025-04-12T14:00', score: 9 },
          ],
        }),
      })

      const tables = wrapper.findAll('.history-table')
      const rows = tables[1].findAll('tbody tr')
      expect(rows.length).toBe(2)
      expect(rows[0].text()).toContain('12/04/2025')
      expect(rows[1].text()).toContain('05/01/2025')
    })

    it('deletes a douleur entry after confirmation', async () => {
      const { ElMessageBox } = await import('element-plus')
      const data = createDefaultData({
        douleurHistory: [
          { _key: 'd1', date: '2025-03-15T10:00', score: 7 },
          { _key: 'd2', date: '2025-02-10T08:00', score: 3 },
        ],
      })
      const wrapper = createWrapper({ data })

      const actionCells = wrapper.findAll('.history-table__actions')
      const deleteBtn = actionCells[0].findAll('button').find(b => b.attributes('title') === 'Supprimer')
      await deleteBtn!.trigger('click')
      await flushPromises()

      expect(ElMessageBox.confirm).toHaveBeenCalled()
      expect(data.douleurHistory).toHaveLength(1)
      expect(data.douleurHistory[0]._key).toBe('d2')
    })

    it('edits an existing douleur entry in place', async () => {
      const data = createDefaultData({
        douleurHistory: [
          { _key: 'd1', date: '2025-03-15T10:00', score: 7 },
          { _key: 'd2', date: '2025-02-10T08:00', score: 3 },
        ],
      })
      const wrapper = createWrapper({ data })

      const actionCells = wrapper.findAll('.history-table__actions')
      const editBtn = actionCells[0].findAll('button').find(b => b.attributes('title') === 'Modifier')
      await editBtn!.trigger('click')
      await flushPromises()

      expect(data.scoreDouleur).toBe(7)
      const headers = wrapper.findAll('.history-collapse__header')
      expect(headers[1].text()).toContain('Modifier la mesure')

      data.scoreDouleur = 5
      const bodies = wrapper.findAll('.history-collapse__body')
      const saveBtn = bodies[1].find('.history-collapse__actions').findAll('button').find(b => b.text() === 'Enregistrer')
      await saveBtn!.trigger('click')
      await flushPromises()

      expect(data.douleurHistory).toHaveLength(2)
      expect(data.douleurHistory[0]._key).toBe('d1')
      expect(data.douleurHistory[0].score).toBe(5)
      expect(headers[1].text()).toContain('Enregistrer une mesure')
    })
  })

  // ─── 3. Vital Signs History ─────────────────────────────────────

  describe('Vital Signs History', () => {
    it('renders "Enregistrer une mesure" collapse header', () => {
      const wrapper = createWrapper()
      expect(wrapper.text()).toContain('Enregistrer une mesure')
    })

    it('vital signs form is collapsed by default', () => {
      const wrapper = createWrapper()
      const collapseBody = wrapper.findAll('.history-collapse__body')[2]
      expect(collapseBody.isVisible()).toBe(false)
    })

    it('toggles vital signs form on header click', async () => {
      const wrapper = createWrapper()
      const header = wrapper.findAll('.history-collapse__header')[2]
      await header.trigger('click')
      const collapseBody = wrapper.findAll('.history-collapse__body')[2]
      expect(collapseBody.isVisible()).toBe(true)
    })

    it('adds a vital signs entry with auto date/time', async () => {
      const data = createDefaultData({
        examenPhysique: { taSystolique: 130, taDiastolique: 85, frequenceCardiaque: 76, temperature: 36.9, glycemie: 6.1, cetonurie: null, glucosurie: null, cetonemie: null, poids: null, taille: null },
      })
      const wrapper = createWrapper({ data })

      const header = wrapper.findAll('.history-collapse__header')[2]
      await header.trigger('click')

      const bodies = wrapper.findAll('.history-collapse__body')
      const saveBtn = bodies[2].findAll('button').find(b => b.text() === 'Enregistrer')
      await saveBtn.trigger('click')
      await flushPromises()

      expect(data.vitalSignsHistory).toHaveLength(1)
      expect(data.vitalSignsHistory[0].date).toBeTruthy()
      expect(data.vitalSignsHistory[0].taSystolique).toBe(130)
      expect(data.vitalSignsHistory[0].taDiastolique).toBe(85)
      expect(data.vitalSignsHistory[0].frequenceCardiaque).toBe(76)
      expect(saveVitalSignsItem).not.toHaveBeenCalled()
    })

    it('displays history entries in a table', () => {
      const wrapper = createWrapper({
        data: createDefaultData({
          vitalSignsHistory: [
            { _key: 'v1', date: '2025-02-20T14:30', taSystolique: 140, taDiastolique: 90, frequenceCardiaque: 80, temperature: 36.8, glycemie: 7.2, cetonurie: null, glucosurie: null, cetonemie: null, poids: null, taille: null },
            { _key: 'v2', date: '2025-01-10T09:15', taSystolique: 120, taDiastolique: 75, frequenceCardiaque: 68, temperature: 37.1, glycemie: 5.5, cetonurie: null, glucosurie: null, cetonemie: null, poids: null, taille: null },
          ],
        }),
      })

      const tables = wrapper.findAll('.history-table')
      const vitalRows = tables[2].findAll('tbody tr')
      expect(vitalRows.length).toBe(2)
      expect(wrapper.text()).toContain('140')
      expect(wrapper.text()).toContain('90')
      expect(wrapper.text()).toContain('120')
      expect(wrapper.text()).toContain('75')
    })

    it('shows empty table when no history', () => {
      const wrapper = createWrapper()
      expect(wrapper.text()).toContain('Aucune mesure enregistrée')
    })

    it('deletes an entry after confirmation', async () => {
      const { ElMessageBox } = await import('element-plus')
      const data = createDefaultData({
        vitalSignsHistory: [
          { _key: 'v1', date: '2025-02-20T14:30', taSystolique: 140, taDiastolique: 90, frequenceCardiaque: 80, temperature: 36.8, glycemie: 7.2, cetonurie: null, glucosurie: null, cetonemie: null, poids: null, taille: null },
          { _key: 'v2', date: '2025-01-10T09:15', taSystolique: 120, taDiastolique: 75, frequenceCardiaque: 68, temperature: 37.1, glycemie: 5.5, cetonurie: null, glucosurie: null, cetonemie: null, poids: null, taille: null },
        ],
      })
      const wrapper = createWrapper({ data })

      const actionCells = wrapper.findAll('.history-table__actions')
      const deleteBtn = actionCells[0].findAll('button').find(b => b.attributes('title') === 'Supprimer')
      await deleteBtn!.trigger('click')
      await flushPromises()

      expect(ElMessageBox.confirm).toHaveBeenCalled()
      expect(data.vitalSignsHistory).toHaveLength(1)
      expect(data.vitalSignsHistory[0]._key).toBe('v2')
      expect(deleteVitalSignsItem).not.toHaveBeenCalled()
    })

    it('edits an existing vital entry in place', async () => {
      const data = createDefaultData({
        vitalSignsHistory: [
          { _key: 'v1', date: '2025-02-20T14:30', taSystolique: 140, taDiastolique: 90, frequenceCardiaque: 80, temperature: 36.8, glycemie: 7.2, cetonurie: null, glucosurie: null, cetonemie: null, poids: null, taille: null },
        ],
      })
      const wrapper = createWrapper({ data })

      const actionCells = wrapper.findAll('.history-table__actions')
      const editBtn = actionCells[0].findAll('button').find(b => b.attributes('title') === 'Modifier')
      await editBtn!.trigger('click')
      await flushPromises()

      expect(data.examenPhysique.taSystolique).toBe(140)

      data.examenPhysique.taSystolique = 150
      const bodies = wrapper.findAll('.history-collapse__body')
      const saveBtn = bodies[2].find('.history-collapse__actions').findAll('button').find(b => b.text() === 'Enregistrer')
      await saveBtn!.trigger('click')
      await flushPromises()

      expect(data.vitalSignsHistory).toHaveLength(1)
      expect(data.vitalSignsHistory[0].taSystolique).toBe(150)
      expect(saveVitalSignsItem).not.toHaveBeenCalled()
    })

    it('sorts history entries by date descending', () => {
      const wrapper = createWrapper({
        data: createDefaultData({
          vitalSignsHistory: [
            { _key: 'v1', date: '2025-01-10T09:00', taSystolique: 120, taDiastolique: 75, frequenceCardiaque: 68, temperature: 37.1, glycemie: 5.5, cetonurie: null, glucosurie: null, cetonemie: null, poids: null, taille: null },
            { _key: 'v2', date: '2025-03-20T14:00', taSystolique: 140, taDiastolique: 90, frequenceCardiaque: 80, temperature: 36.8, glycemie: 7.2, cetonurie: null, glucosurie: null, cetonemie: null, poids: null, taille: null },
          ],
        }),
      })

      const tables = wrapper.findAll('.history-table')
      const rows = tables[2].findAll('tbody tr')
      expect(rows.length).toBe(2)
      expect(rows[0].text()).toContain('20/03/2025')
      expect(rows[1].text()).toContain('10/01/2025')
    })
  })

  // ─── 3a. Vital Signs — Poids / Taille / IMC fields ───────────────

  describe('Vital Signs — Poids / Taille / IMC', () => {
    // There are 3 collapsibles: [0] Glasgow, [1] douleur, [2] vitaux.
    // The vitals collapse (header/body index 2) is the target here.
    async function openVitalsForm(wrapper: any) {
      const headers = wrapper.findAll('.history-collapse__header')
      await headers[2].trigger('click')
      return wrapper.findAll('.history-collapse__body')[2]
    }

    it('renders Poids (kg), Taille (cm) and IMC (kg/m²) inputs in the vitals form', async () => {
      const wrapper = createWrapper()
      const body = await openVitalsForm(wrapper)

      const poidsItem = body.find('[data-history-path="bilanInitial.examenPhysique.poids"]')
      const tailleItem = body.find('[data-history-path="bilanInitial.examenPhysique.taille"]')
      const imcItem = body.find('[data-history-path="bilanInitial.examenPhysique.imc"]')

      expect(poidsItem.exists()).toBe(true)
      expect(poidsItem.find('.el-input-number').exists()).toBe(true)
      expect(tailleItem.exists()).toBe(true)
      expect(tailleItem.find('.el-input-number').exists()).toBe(true)

      const imcInput = imcItem.find('.el-input')
      expect(imcInput.exists()).toBe(true)
      expect(imcInput.attributes('disabled')).toBeDefined()
      // Without poids/taille the computed IMC renders the placeholder '—'
      expect((imcInput.element as HTMLInputElement).value).toBe('—')
    })

    it('binds the Poids and Taille inputs to data.examenPhysique', async () => {
      const data = createDefaultData()
      const wrapper = createWrapper({ data })
      const body = await openVitalsForm(wrapper)

      await body.find('[data-history-path="bilanInitial.examenPhysique.poids"] .el-input-number').setValue('75')
      await body.find('[data-history-path="bilanInitial.examenPhysique.taille"] .el-input-number').setValue('170')

      expect(data.examenPhysique.poids).toBe(75)
      expect(data.examenPhysique.taille).toBe(170)
    })

    it('displays the computed IMC "26" for poids 75 / taille 170 in the disabled field', async () => {
      const data = createDefaultData()
      const wrapper = createWrapper({ data })
      const body = await openVitalsForm(wrapper)

      const imcInput = () => body.find('[data-history-path="bilanInitial.examenPhysique.imc"] .el-input')
      expect((imcInput().element as HTMLInputElement).value).toBe('—')

      // Mutating the nested plain-object prop directly does NOT trigger the
      // computed in Vue 3 (props are shallow), so push a fresh object via setProps.
      await wrapper.setProps({
        data: { ...data, examenPhysique: { ...data.examenPhysique, poids: 75, taille: 170 } },
      })

      // imcDisplay = String(calcIMC(75, 170)) -> 75 / 1.70² = 25.95… -> round -> 26
      expect((wrapper.vm as any).imcDisplay).toBe('26')
      expect((imcInput().element as HTMLInputElement).value).toBe('26')
    })

    it('saves poids and taille into the vital signs history entry', async () => {
      const data = createDefaultData({
        examenPhysique: { taSystolique: 130, taDiastolique: 85, frequenceCardiaque: 76, temperature: 36.9, glycemie: 6.1, cetonurie: null, glucosurie: null, cetonemie: null, poids: 75, taille: 170 },
      })
      const wrapper = createWrapper({ data })
      const body = await openVitalsForm(wrapper)

      const saveBtn = body.find('.history-collapse__actions').findAll('button').find(b => b.text() === 'Enregistrer')
      await saveBtn!.trigger('click')
      await flushPromises()

      expect(data.vitalSignsHistory).toHaveLength(1)
      expect(data.vitalSignsHistory[0]._key).toBeTruthy()
      expect(data.vitalSignsHistory[0].date).toBeTruthy()
      expect(data.vitalSignsHistory[0].poids).toBe(75)
      expect(data.vitalSignsHistory[0].taille).toBe(170)
      expect(saveVitalSignsItem).not.toHaveBeenCalled()
    })

    it('restores poids/taille into data.examenPhysique when editing a history entry', async () => {
      const data = createDefaultData({
        vitalSignsHistory: [
          { _key: 'v1', date: '2025-02-20T14:30', taSystolique: 140, taDiastolique: 90, frequenceCardiaque: 80, temperature: 36.8, glycemie: 7.2, cetonurie: null, glucosurie: null, cetonemie: null, poids: 88, taille: 165 },
        ],
      })
      const wrapper = createWrapper({ data })

      const actionCells = wrapper.findAll('.history-table__actions')
      const editBtn = actionCells[0].findAll('button').find(b => b.attributes('title') === 'Modifier')
      await editBtn!.trigger('click')
      await flushPromises()

      expect(data.examenPhysique.poids).toBe(88)
      expect(data.examenPhysique.taille).toBe(165)
      const headers = wrapper.findAll('.history-collapse__header')
      expect(headers[2].text()).toContain('Modifier la mesure')
    })

    it('renders Poids / Taille / IMC columns and computes the per-row IMC', () => {
      const wrapper = createWrapper({
        data: createDefaultData({
          vitalSignsHistory: [
            { _key: 'v1', date: '2025-02-20T14:30', taSystolique: 140, taDiastolique: 90, frequenceCardiaque: 80, temperature: 36.8, glycemie: 7.2, cetonurie: null, glucosurie: null, cetonemie: null, poids: 80, taille: 175 },
            { _key: 'v2', date: '2025-01-10T09:15', taSystolique: 120, taDiastolique: 75, frequenceCardiaque: 68, temperature: 37.1, glycemie: 5.5, cetonurie: null, glucosurie: null, cetonemie: null, poids: 60, taille: 160 },
          ],
        }),
      })

      const tables = wrapper.findAll('.history-table')
      const headers = tables[2].findAll('thead th').map(th => th.text())
      expect(headers).toContain('Poids (kg)')
      expect(headers).toContain('Taille (cm)')
      expect(headers).toContain('IMC (kg/m²)')

      const rows = tables[2].findAll('tbody tr')
      expect(rows).toHaveLength(2)
      // v1 (newest, sorted first): 80 kg / 175 cm -> calcIMC -> 26.1
      expect(rows[0].text()).toContain('80')
      expect(rows[0].text()).toContain('175')
      expect(rows[0].text()).toContain('26.1')
      // v2: 60 kg / 160 cm -> calcIMC -> 23.4
      expect(rows[1].text()).toContain('60')
      expect(rows[1].text()).toContain('160')
      expect(rows[1].text()).toContain('23.4')
    })

    it('keeps the vitals empty-state row with colspan 15', () => {
      const wrapper = createWrapper()
      const tables = wrapper.findAll('.history-table')
      const emptyCell = tables[2].find('td.history-table__empty')
      expect(emptyCell.exists()).toBe(true)
      expect(emptyCell.attributes('colspan')).toBe('15')
      expect(emptyCell.text()).toContain('Aucune mesure enregistrée')
    })
  })

  // ─── 3b. Vital Signs linked mode (CRH: linkVitalCheck) ───────────

  describe('Vital Signs History — linked mode', () => {
    function makeItem(overrides: Partial<VitalSignsItemRecord> = {}): VitalSignsItemRecord {
      return {
        id: 1,
        patientId: 5,
        date: '2025-03-15',
        hour: 9,
        taSystolique: 130,
        taDiastolique: 85,
        frequenceCardiaque: 76,
        temperature: 36.9,
        glycemie: 6.1,
        cetonurie: null,
        glucosurie: null,
        cetonemie: null,
        saO2: 97,
        diurese: 500,
        poids: 70,
        createdBy: 1,
        createdAt: '2025-03-15T09:00:00',
        updatedAt: '2025-03-15T09:00:00',
        ...overrides,
      }
    }

    describe('gating', () => {
      it('does NOT call getVitalSignsItemsList without linkVitalCheck', async () => {
        const wrapper = createWrapper({ patientId: 5 })
        await flushPromises()
        expect(getVitalSignsItemsList).not.toHaveBeenCalled()
      })

      it('calls getVitalSignsItemsList once with (patientId, dateDebut, dateFin) when linked', async () => {
        const wrapper = createWrapper({
          patientId: 5,
          dateDebut: '2025-03-15',
          dateFin: '2099-12-31',
          linkVitalCheck: true,
        })
        await flushPromises()
        expect(getVitalSignsItemsList).toHaveBeenCalledTimes(1)
        expect(getVitalSignsItemsList).toHaveBeenCalledWith(5, '2025-03-15', '2099-12-31')
      })

      it('clamps sync end to today when dateFin is in the past', async () => {
        const wrapper = createWrapper({
          patientId: 5,
          dateDebut: '2025-03-15',
          dateFin: '2025-03-20',
          linkVitalCheck: true,
        })
        await flushPromises()
        const today = new Date()
        const todayISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
        expect(getVitalSignsItemsList).toHaveBeenCalledTimes(1)
        expect(getVitalSignsItemsList).toHaveBeenCalledWith(5, '2025-03-15', todayISO)
      })

      it('re-syncs when patientId changes', async () => {
        const wrapper = createWrapper({ patientId: 1, linkVitalCheck: true })
        await flushPromises()
        expect(getVitalSignsItemsList).toHaveBeenCalledTimes(1)

        await wrapper.setProps({ patientId: 2 })
        await flushPromises()

        expect(getVitalSignsItemsList).toHaveBeenCalledTimes(2)
        expect(getVitalSignsItemsList).toHaveBeenLastCalledWith(2, '', expect.any(String))
      })
    })

    describe('sync', () => {
      it('replaces vitalSignsHistory with mapped API entries', async () => {
        const data = createDefaultData()
        vi.mocked(getVitalSignsItemsList).mockResolvedValue([
          makeItem({ id: 1, hour: 9, saO2: 97, diurese: 500 }),
          makeItem({ id: 2, date: '2025-03-16', hour: 11, saO2: 98, diurese: 800 }),
        ])
        const wrapper = createWrapper({
          data,
          patientId: 5,
          dateDebut: '2025-03-15',
          dateFin: '2099-12-31',
          linkVitalCheck: true,
        })
        await flushPromises()

        expect(getVitalSignsItemsList).toHaveBeenCalledWith(5, '2025-03-15', '2099-12-31')
        expect(data.vitalSignsHistory).toHaveLength(2)
        expect(data.vitalSignsHistory[0]).toMatchObject({
          _key: '1',
          date: '2025-03-15T09:00:00',
          hour: 9,
          saO2: 97,
          diurese: 500,
          taille: null,
        })
        expect(data.vitalSignsHistory[1]).toMatchObject({
          _key: '2',
          date: '2025-03-16T11:00:00',
          hour: 11,
          saO2: 98,
          diurese: 800,
          taille: null,
        })
        expect(wrapper.emitted('change')).toBeUndefined()
      })

      it('prefills empty examenPhysique from the latest admission-day item', async () => {
        const data = createDefaultData()
        vi.mocked(getVitalSignsItemsList).mockResolvedValue([
          makeItem({ id: 1, date: '2025-03-15', hour: 8, taSystolique: 120, temperature: 36.5 }),
          makeItem({ id: 2, date: '2025-03-15', hour: 14, taSystolique: 140, temperature: 37.0 }),
          makeItem({ id: 3, date: '2025-03-16', hour: 9, taSystolique: 135, temperature: 36.8 }),
        ])
        const wrapper = createWrapper({
          data,
          patientId: 5,
          dateDebut: '2025-03-15',
          dateFin: '2025-03-20',
          linkVitalCheck: true,
        })
        await flushPromises()

        expect(data.examenPhysique.taSystolique).toBe(140)
        expect(data.examenPhysique.taDiastolique).toBe(85)
        expect(data.examenPhysique.temperature).toBe(37.0)
        expect(data.examenPhysique.poids).toBe(70)
        expect(data.examenPhysique.taille).toBeNull()
        expect(wrapper.emitted('change')).toBeUndefined()
      })

      it('renders the Date picker and Heure options 6..22 in linked mode', async () => {
        const wrapper = createWrapper({ patientId: 5, linkVitalCheck: true })
        await flushPromises()

        const header = wrapper.findAll('.history-collapse__header')[2]
        await header.trigger('click')
        const bodies = wrapper.findAll('.history-collapse__body')

        const datePicker = bodies[2].find('.el-date-picker')
        expect(datePicker.exists()).toBe(true)
        // el-date-picker v-model carries plain YYYY-MM-DD strings (value-format)
        await datePicker.setValue('2025-03-15')
        expect((wrapper.vm as any).vitalDate).toBe('2025-03-15')

        const options = bodies[2].find('.el-select').findAll('.el-option')
        expect(options).toHaveLength(17)
        expect(options[0].attributes('value')).toBe('6')
        expect(options[16].attributes('value')).toBe('22')
      })

      it('does NOT render the Date picker in non-linked mode', () => {
        const wrapper = createWrapper()
        expect(wrapper.find('.el-date-picker').exists()).toBe(false)
      })
    })

    describe('readonly gating', () => {
      it('does NOT call getVitalSignsItemsList when readonly', async () => {
        const wrapper = createWrapper({ patientId: 5, linkVitalCheck: true, readonly: true })
        await flushPromises()
        expect(getVitalSignsItemsList).not.toHaveBeenCalled()
      })
    })

    describe('save (linked)', () => {
      it('saves via saveVitalSignsItem and upserts the returned record', async () => {
        const data = createDefaultData()
        data.examenPhysique.taSystolique = 130
        data.examenPhysique.taDiastolique = 85
        data.examenPhysique.frequenceCardiaque = 76
        data.examenPhysique.temperature = 36.9
        data.examenPhysique.glycemie = 6.1
        data.examenPhysique.poids = 70
        const wrapper = createWrapper({ data, patientId: 5, linkVitalCheck: true })
        await flushPromises()

        const header = wrapper.findAll('.history-collapse__header')[2]
        await header.trigger('click')
        const bodies = wrapper.findAll('.history-collapse__body')
        ;(wrapper.vm as any).vitalDate = '2025-03-15'
        ;(wrapper.vm as any).vitalHour = 10

        vi.mocked(saveVitalSignsItem).mockResolvedValue(
          makeItem({ id: 55, date: '2025-03-15', hour: 10, saO2: null, diurese: null }),
        )

        const saveBtn = bodies[2].find('.history-collapse__actions').findAll('button').find(b => b.text() === 'Enregistrer')
        await saveBtn!.trigger('click')
        await flushPromises()

        expect(saveVitalSignsItem).toHaveBeenCalledTimes(1)
        expect(saveVitalSignsItem).toHaveBeenCalledWith(5, {
          date: '2025-03-15',
          hour: 10,
          taSystolique: 130,
          taDiastolique: 85,
          frequenceCardiaque: 76,
          temperature: 36.9,
          glycemie: 6.1,
          cetonurie: null,
          glucosurie: null,
          cetonemie: null,
          saO2: null,
          diurese: null,
          poids: 70,
        })
        const payload = vi.mocked(saveVitalSignsItem).mock.calls[0][1]
        expect(payload).not.toHaveProperty('taille')

        expect(data.vitalSignsHistory).toHaveLength(1)
        expect(data.vitalSignsHistory[0]).toMatchObject({
          _key: '55',
          date: '2025-03-15T10:00:00',
          taSystolique: 130,
          saO2: null,
          diurese: null,
          taille: null,
        })
        expect(wrapper.emitted('change')).toHaveLength(1)
      })

      it('edit then save reuses entry date/hour and never sends taille', async () => {
        const data = createDefaultData()
        vi.mocked(getVitalSignsItemsList).mockResolvedValue([
          makeItem({ id: 7, hour: 10, taSystolique: 140, taDiastolique: 90, temperature: 37.2 }),
        ])
        const wrapper = createWrapper({ data, patientId: 5, linkVitalCheck: true })
        await flushPromises()

        const actionCells = wrapper.findAll('.history-table__actions')
        const editBtn = actionCells[0].findAll('button').find(b => b.attributes('title') === 'Modifier')
        await editBtn!.trigger('click')
        await flushPromises()

        expect((wrapper.vm as any).vitalDate).toBe('2025-03-15')
        expect((wrapper.vm as any).vitalHour).toBe(10)
        expect(data.examenPhysique.taille).toBeNull()

        data.examenPhysique.taSystolique = 150
        vi.mocked(saveVitalSignsItem).mockResolvedValue(
          makeItem({ id: 7, hour: 10, taSystolique: 150, taDiastolique: 90, temperature: 37.2 }),
        )

        const bodies = wrapper.findAll('.history-collapse__body')
        const saveBtn = bodies[2].find('.history-collapse__actions').findAll('button').find(b => b.text() === 'Enregistrer')
        await saveBtn!.trigger('click')
        await flushPromises()

        expect(saveVitalSignsItem).toHaveBeenCalledWith(5, expect.objectContaining({
          date: '2025-03-15',
          hour: 10,
          taSystolique: 150,
        }))
        const payload = vi.mocked(saveVitalSignsItem).mock.calls[0][1]
        expect(payload).not.toHaveProperty('taille')

        expect(data.vitalSignsHistory).toHaveLength(1)
        expect(data.vitalSignsHistory[0]).toMatchObject({
          _key: '7',
          taSystolique: 150,
          taille: null,
        })
      })
    })

    describe('delete (linked)', () => {
      it('deletes via deleteVitalSignsItem when the key is numeric', async () => {
        const { ElMessageBox } = await import('element-plus')
        const data = createDefaultData()
        vi.mocked(getVitalSignsItemsList).mockResolvedValue([
          makeItem({ id: 7, date: '2025-03-16', hour: 10 }),
          makeItem({ id: 8, date: '2025-03-15', hour: 11 }),
        ])
        const wrapper = createWrapper({ data, patientId: 5, linkVitalCheck: true })
        await flushPromises()
        expect(data.vitalSignsHistory).toHaveLength(2)

        const actionCells = wrapper.findAll('.history-table__actions')
        const deleteBtn = actionCells[0].findAll('button').find(b => b.attributes('title') === 'Supprimer')
        await deleteBtn!.trigger('click')
        await flushPromises()

        expect(ElMessageBox.confirm).toHaveBeenCalled()
        expect(deleteVitalSignsItem).toHaveBeenCalledTimes(1)
        expect(deleteVitalSignsItem).toHaveBeenCalledWith(7)
        expect(data.vitalSignsHistory).toHaveLength(1)
        expect(data.vitalSignsHistory[0]._key).toBe('8')
        expect(wrapper.emitted('change')).toHaveLength(1)
      })

      it('falls back to local removal without deleteVitalSignsItem for non-numeric keys', async () => {
        const data = createDefaultData({
          vitalSignsHistory: [
            { _key: 'local-x7', date: '2025-03-15T10:00', taSystolique: 130, taDiastolique: 85, frequenceCardiaque: 76, temperature: 36.9, glycemie: 6.1, cetonurie: null, glucosurie: null, cetonemie: null, poids: null, taille: null },
          ],
        })
        vi.mocked(getVitalSignsItemsList).mockRejectedValue(new Error('sync failed'))
        const wrapper = createWrapper({ data, patientId: 5, linkVitalCheck: true })
        await flushPromises()

        expect(data.vitalSignsHistory).toHaveLength(1)

        const actionCells = wrapper.findAll('.history-table__actions')
        const deleteBtn = actionCells[0].findAll('button').find(b => b.attributes('title') === 'Supprimer')
        await deleteBtn!.trigger('click')
        await flushPromises()

        expect(deleteVitalSignsItem).not.toHaveBeenCalled()
        expect(data.vitalSignsHistory).toHaveLength(0)
        expect(wrapper.emitted('change')).toHaveLength(1)
      })
    })

    describe('readonly blocks writes', () => {
      it('does NOT call saveVitalSignsItem when readonly', async () => {
        const data = createDefaultData()
        const wrapper = createWrapper({ data, patientId: 5, linkVitalCheck: true, readonly: true })
        await flushPromises()

        const header = wrapper.findAll('.history-collapse__header')[2]
        await header.trigger('click')
        const bodies = wrapper.findAll('.history-collapse__body')
        const saveBtn = bodies[2].find('.history-collapse__actions').findAll('button').find(b => b.text() === 'Enregistrer')
        await saveBtn!.trigger('click')
        await flushPromises()

        expect(saveVitalSignsItem).not.toHaveBeenCalled()
        expect(data.vitalSignsHistory).toHaveLength(0)
      })

      it('does NOT call deleteVitalSignsItem when readonly', async () => {
        const { ElMessageBox } = await import('element-plus')
        const data = createDefaultData({
          vitalSignsHistory: [
            { _key: 'v1', date: '2025-03-15T10:00', taSystolique: 140, taDiastolique: 90, frequenceCardiaque: 80, temperature: 36.8, glycemie: 7.2, cetonurie: null, glucosurie: null, cetonemie: null, poids: null, taille: null },
          ],
        })
        const wrapper = createWrapper({ data, patientId: 5, linkVitalCheck: true, readonly: true })
        await flushPromises()

        const actionCells = wrapper.findAll('.history-table__actions')
        const deleteBtn = actionCells[0].findAll('button').find(b => b.attributes('title') === 'Supprimer')
        await deleteBtn!.trigger('click')
        await flushPromises()

        expect(deleteVitalSignsItem).not.toHaveBeenCalled()
        expect(ElMessageBox.confirm).not.toHaveBeenCalled()
        expect(data.vitalSignsHistory).toHaveLength(1)
      })
    })
  })

  // ─── 4. Glasgow History ─────────────────────────────────────────

  describe('Glasgow History', () => {
    it('renders "Enregistrer une évaluation" collapse header', () => {
      const wrapper = createWrapper()
      expect(wrapper.text()).toContain('Enregistrer une évaluation')
    })

    it('glasgow form is collapsed by default', () => {
      const wrapper = createWrapper()
      const bodies = wrapper.findAll('.history-collapse__body')
      expect(bodies).toHaveLength(3)
      expect(bodies[0].isVisible()).toBe(false)
    })

    it('toggles glasgow form on header click', async () => {
      const wrapper = createWrapper()
      const headers = wrapper.findAll('.history-collapse__header')
      await headers[0].trigger('click')
      const bodies = wrapper.findAll('.history-collapse__body')
      expect(bodies[0].isVisible()).toBe(true)
    })

    it('adds a glasgow entry with auto date/time', async () => {
      const data = createDefaultData({
        glasgow: { ouvertureYeux: 4, reponseVerbale: 5, reponseMotrice: 6 },
      })
      const wrapper = createWrapper({ data })

      const headers = wrapper.findAll('.history-collapse__header')
      await headers[0].trigger('click')

      const bodies = wrapper.findAll('.history-collapse__body')
      const glasgowBody = bodies[0]

      const actions = glasgowBody.find('.history-collapse__actions')
      const saveBtn = actions.findAll('button').find(b => b.text() === 'Enregistrer')
      await saveBtn.trigger('click')
      await flushPromises()

      expect(data.glasgowHistory).toHaveLength(1)
      expect(data.glasgowHistory[0].date).toBeTruthy()
      expect(data.glasgowHistory[0].ouvertureYeux).toBe(4)
      expect(data.glasgowHistory[0].reponseVerbale).toBe(5)
      expect(data.glasgowHistory[0].reponseMotrice).toBe(6)
    })

    it('displays history entries in a table with score breakdown', () => {
      const wrapper = createWrapper({
        data: createDefaultData({
          glasgowHistory: [
            { _key: 'g1', date: '2025-03-15T10:00', ouvertureYeux: 4, reponseVerbale: 5, reponseMotrice: 6 },
          ],
        }),
      })

      const tables = wrapper.findAll('.history-table')
      const glasgowRows = tables[0].findAll('tbody tr')
      expect(glasgowRows.length).toBe(1)
      expect(wrapper.text()).toContain('15/03/2025')
      expect(wrapper.text()).toContain('15 / 15')
    })

    it('shows empty table when no glasgow history', () => {
      const wrapper = createWrapper()
      expect(wrapper.text()).toContain('Aucune évaluation enregistrée')
    })

    it('deletes a glasgow entry after confirmation', async () => {
      const { ElMessageBox } = await import('element-plus')
      const data = createDefaultData({
        glasgowHistory: [
          { _key: 'g1', date: '2025-03-15T10:00', ouvertureYeux: 4, reponseVerbale: 5, reponseMotrice: 6 },
          { _key: 'g2', date: '2025-02-10T08:00', ouvertureYeux: 3, reponseVerbale: 4, reponseMotrice: 5 },
        ],
      })
      const wrapper = createWrapper({ data })

      const actionCells = wrapper.findAll('.history-table__actions')
      const deleteBtn = actionCells[0].findAll('button').find(b => b.attributes('title') === 'Supprimer')
      await deleteBtn!.trigger('click')
      await flushPromises()

      expect(ElMessageBox.confirm).toHaveBeenCalled()
      expect(data.glasgowHistory).toHaveLength(1)
      expect(data.glasgowHistory[0]._key).toBe('g2')
    })

    it('edits an existing glasgow entry in place', async () => {
      const data = createDefaultData({
        glasgowHistory: [
          { _key: 'g1', date: '2025-03-15T10:00', ouvertureYeux: 3, reponseVerbale: 4, reponseMotrice: 5 },
        ],
      })
      const wrapper = createWrapper({ data })

      const actionCells = wrapper.findAll('.history-table__actions')
      const editBtn = actionCells[0].findAll('button').find(b => b.attributes('title') === 'Modifier')
      await editBtn!.trigger('click')
      await flushPromises()

      expect(data.glasgow.ouvertureYeux).toBe(3)
      expect(data.glasgow.reponseVerbale).toBe(4)
      expect(data.glasgow.reponseMotrice).toBe(5)

      data.glasgow.reponseMotrice = 6
      const bodies = wrapper.findAll('.history-collapse__body')
      const saveBtn = bodies[0].find('.history-collapse__actions').findAll('button').find(b => b.text() === 'Enregistrer')
      await saveBtn!.trigger('click')
      await flushPromises()

      expect(data.glasgowHistory).toHaveLength(1)
      expect(data.glasgowHistory[0].reponseMotrice).toBe(6)
    })

    it('sorts glasgow history entries by date descending', () => {
      const wrapper = createWrapper({
        data: createDefaultData({
          glasgowHistory: [
            { _key: 'g1', date: '2025-01-05T08:00', ouvertureYeux: 3, reponseVerbale: 4, reponseMotrice: 5 },
            { _key: 'g2', date: '2025-04-12T14:00', ouvertureYeux: 4, reponseVerbale: 5, reponseMotrice: 6 },
          ],
        }),
      })

      const tables = wrapper.findAll('.history-table')
      const rows = tables[0].findAll('tbody tr')
      expect(rows.length).toBe(2)
      expect(rows[0].text()).toContain('12/04/2025')
      expect(rows[1].text()).toContain('05/01/2025')
    })
  })

  // ─── 11. Staged sections & previews ──────────────────────────────

  describe('staged sections', () => {
    it('renders the 5 CollapsibleSection headers in order', () => {
      const wrapper = createWrapper()
      const titles = wrapper.findAll('.collapsible-section__title').map(el => el.text())
      expect(titles).toEqual([
        'Histoire récente',
        'Traitement à l\'entrée',
        'Examen clinique à l\'entrée',
        'Conclusion à l\'entrée',
        'Projet de soin pendant l\'hospitalisation',
      ])
    })

    it('renders one compact FormPreview per section', () => {
      const wrapper = createWrapper()
      const previews = wrapper.findAll('.form-preview')
      expect(previews).toHaveLength(5)
      for (const preview of previews) {
        expect(preview.classes()).toContain('form-preview--compact')
      }
    })

    it('sections are collapsed by default except the examen section (default-open)', () => {
      const wrapper = createWrapper()
      const bodies = sectionBodies(wrapper)
      expect(bodies).toHaveLength(5)

      expect(bodies[0].attributes('style') ?? '').toContain('display: none')
      expect(bodies[1].attributes('style') ?? '').toContain('display: none')
      expect(bodies[3].attributes('style') ?? '').toContain('display: none')
      expect(bodies[4].attributes('style') ?? '').toContain('display: none')

      // Examen clinique section stays open so the history-collapse sub-blocks
      // (Glasgow / Douleur / Vitals) are visible and editable by default
      expect(bodies[2].attributes('style') ?? '').not.toContain('display: none')
    })

    it('toggles open on header click', async () => {
      const wrapper = createWrapper()
      const firstHeader = wrapper.findAll('.collapsible-section__header')[0]
      const firstBody = sectionBodies(wrapper)[0]

      await firstHeader.trigger('click')
      await nextTick()
      expect(firstBody.attributes('style') ?? '').not.toContain('display: none')

      await firstHeader.trigger('click')
      await nextTick()
      expect(firstBody.attributes('style') ?? '').toContain('display: none')
    })
  })

  // ─── 12. Staged commit / discard ─────────────────────────────────

  describe('staged commit / discard', () => {
    it('commits a histoireRecent change to data on Enregistrer', async () => {
      const data = createDefaultData()
      const wrapper = createWrapper({ data })

      await openSection(wrapper, 0)
      const editor = sectionBodies(wrapper)[0].find('.rich-editor-input')
      await editor.setValue('<p>Douleurs abdominales depuis 3 jours</p>')
      await nextTick()

      // draft edited → data untouched until Enregistrer
      expect(data.histoireRecent).toBe('')
      await clickEnregistrer(wrapper, 0)

      expect(data.histoireRecent).toBe('<p>Douleurs abdominales depuis 3 jours</p>')
      expect(wrapper.emitted('change')).toBeTruthy()

      const rows = wrapper.findAll('.form-preview')[0].findAll('.form-preview__row')
      const row = rows.find(r => r.text().includes('Histoire récente de la maladie'))
      expect(row!.find('.form-preview__value').text()).toBe('Douleurs abdominales depuis 3 jours')
    })

    it('Annuler discards unsaved changes and closes the section', async () => {
      const data = createDefaultData({ conclusionEntree: '<p>Sortie prévue</p>' })
      const wrapper = createWrapper({ data })

      await openSection(wrapper, 3)
      const editor = sectionBodies(wrapper)[3].find('.rich-editor-input')
      await editor.setValue('<p>Modification perdue</p>')
      await nextTick()
      expect(data.conclusionEntree).toBe('<p>Sortie prévue</p>')

      const footerButtons = sectionFooterButtons(wrapper, 3)
      await footerButtons[1].trigger('click')
      await nextTick()

      expect(data.conclusionEntree).toBe('<p>Sortie prévue</p>')
      expect(wrapper.emitted('change')).toBeFalsy()
      expect(sectionBodies(wrapper)[3].attributes('style') ?? '').toContain('display: none')
    })

    it('asks for confirmation before discarding unsaved changes when collapsing', async () => {
      const { ElMessageBox } = await import('element-plus')
      const confirmSpy = vi.fn().mockRejectedValue('cancel')
      ;(ElMessageBox.confirm as any) = confirmSpy

      const wrapper = createWrapper()
      await openSection(wrapper, 1)
      const editor = sectionBodies(wrapper)[1].find('.rich-editor-input')
      await editor.setValue('<p>Dirty</p>')
      await nextTick()

      await wrapper.findAll('.collapsible-section__header')[1].trigger('click')
      await nextTick()

      expect(confirmSpy).toHaveBeenCalled()
      // Confirmation refused → section stays open
      expect(sectionBodies(wrapper)[1].attributes('style') ?? '').not.toContain('display: none')
    })

    it('Enregistrer commits and closes the section', async () => {
      const data = createDefaultData()
      const wrapper = createWrapper({ data })

      await openSection(wrapper, 4)
      const editor = sectionBodies(wrapper)[4].find('.rich-editor-input')
      await editor.setValue('<p>Projet de soin</p>')
      await nextTick()

      await clickEnregistrer(wrapper, 4)

      expect(data.projetSoin).toBe('<p>Projet de soin</p>')
      expect(sectionBodies(wrapper)[4].attributes('style') ?? '').toContain('display: none')
    })
  })

  // ─── 13. Field meta (dernière modification) ──────────────────────

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
        data: createDefaultData({ histoireRecent: '<p>Episode 1</p>' }),
        fieldMeta: { 'bilanInitial.histoireRecent': '2026-06-15T10:30:00.000Z' },
      })

      const row = wrapper.findAll('.form-preview__row')
        .find(r => r.text().includes('Histoire récente de la maladie'))
      expect(row).toBeDefined()

      expect(row!.find('.form-preview__updated').text())
        .toMatch(/^Modifié le \d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/)

      const btn = row!.find('.form-preview__edit')
      expect(btn.exists()).toBe(true)
      expect(btn.attributes('aria-label')).toBe('Modifier Histoire récente de la maladie')
    })

    it('re-opens the collapsed section and scrolls to it when Modifier is clicked', async () => {
      const wrapper = createWrapper({
        data: createDefaultData({ conclusionEntree: '<p>Conclusion</p>' }),
        fieldMeta: { 'bilanInitial.conclusionEntree': '2026-06-15T10:30:00.000Z' },
      })

      const body = sectionBodies(wrapper)[3]

      // Prove the section is collapsed BEFORE the click
      expect(body.attributes('style') ?? '').toContain('display: none')

      const btn = wrapper.findAll('.form-preview')[3]
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
        data: createDefaultData({ traitementEntree: '<p>Traitement</p>' }),
        fieldMeta: {},
      })

      const row = wrapper.findAll('.form-preview__row')
        .find(r => r.text().includes('Traitement à l\'entrée'))
      expect(row).toBeDefined()
      expect(row!.find('.form-preview__updated').text()).toBe('Non modifié')
    })
  })
})
