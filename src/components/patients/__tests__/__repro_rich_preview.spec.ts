// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref, reactive, nextTick } from 'vue'
import type { BilanInitialData } from '@/types/crh-diabete'

const mockCan = { undo: vi.fn().mockReturnValue(false), redo: vi.fn().mockReturnValue(false) }

let currentEditorHtml = ''

const mockEditor = {
  isActive: vi.fn().mockReturnValue(false),
  chain: vi.fn().mockReturnValue({
    focus: vi.fn().mockReturnThis(), toggleBold: vi.fn().mockReturnThis(),
    toggleItalic: vi.fn().mockReturnThis(), toggleUnderline: vi.fn().mockReturnThis(),
    toggleStrike: vi.fn().mockReturnThis(), toggleHighlight: vi.fn().mockReturnThis(),
    toggleHeading: vi.fn().mockReturnThis(), toggleBlockquote: vi.fn().mockReturnThis(),
    toggleCode: vi.fn().mockReturnThis(), toggleCodeBlock: vi.fn().mockReturnThis(),
    setHorizontalRule: vi.fn().mockReturnThis(), toggleBulletList: vi.fn().mockReturnThis(),
    toggleOrderedList: vi.fn().mockReturnThis(), sinkListItem: vi.fn().mockReturnThis(),
    liftListItem: vi.fn().mockReturnThis(), clearNodes: vi.fn().mockReturnThis(),
    unsetAllMarks: vi.fn().mockReturnThis(), undo: vi.fn().mockReturnThis(),
    redo: vi.fn().mockReturnThis(), extendMarkRange: vi.fn().mockReturnThis(),
    setLink: vi.fn().mockReturnThis(), unsetLink: vi.fn().mockReturnThis(),
    setColor: vi.fn().mockReturnThis(), setParagraph: vi.fn().mockReturnThis(),
    setFontFamily: vi.fn().mockReturnThis(), unsetFontFamily: vi.fn().mockReturnThis(),
    setFontSize: vi.fn().mockReturnThis(), unsetFontSize: vi.fn().mockReturnThis(),
    toggleSubscript: vi.fn().mockReturnThis(), toggleSuperscript: vi.fn().mockReturnThis(),
    setTextAlign: vi.fn().mockReturnThis(), setImage: vi.fn().mockReturnThis(),
    updateAttributes: vi.fn().mockReturnThis(), insertContent: vi.fn().mockReturnThis(),
    run: vi.fn().mockReturnThis(),
  }),
  can: vi.fn().mockReturnValue(mockCan),
  getAttributes: vi.fn().mockImplementation((name?: string) => {
    if (name === 'textStyle') return { color: null, fontFamily: undefined, fontSize: undefined }
    if (name === 'image') return {}
    return { color: null }
  }),
  setEditable: vi.fn(),
  getHTML: vi.fn(() => currentEditorHtml),
  commands: { setContent: vi.fn((content: string) => { currentEditorHtml = content }) },
  destroy: vi.fn(),
}

const capturedOnUpdates: ((p: { editor: typeof mockEditor }) => void)[] = []

vi.mock('@tiptap/vue-3', () => ({
  useEditor: vi.fn((options: any) => {
    if (options?.onUpdate) capturedOnUpdates.push(options.onUpdate)
    return ref(mockEditor)
  }),
  EditorContent: { template: '<div class="editor-content" />', props: ['editor'] },
}))

vi.mock('@tiptap/starter-kit', () => ({ default: {} }))
vi.mock('@tiptap/extension-underline', () => ({ default: {} }))

vi.mock('@/composables/useCrhDiabeteCalculations', () => ({
  useCrhDiabeteCalculations: () => ({
    calcGlasgowScore: vi.fn().mockReturnValue(15),
    glasgowInterpretation: vi.fn().mockReturnValue({ label: 'OK', type: 'success' }),
    calcIMC: vi.fn((p: number | null, t: number | null) => {
      if (p == null || t == null) return null
      return Math.round((p / ((t / 100) ** 2)) * 10) / 10
    }),
  }),
}))

vi.mock('@/composables/useVitalSigns', () => ({
  getVitalSignsItemsList: vi.fn().mockResolvedValue([]),
  saveVitalSignsItem: vi.fn().mockResolvedValue({}),
  deleteVitalSignsItem: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('element-plus', async () => {
  const actual = await vi.importActual('element-plus')
  return {
    ...actual,
    ElMessageBox: { confirm: vi.fn().mockResolvedValue('confirm') },
    ElMessage: { success: vi.fn(), warning: vi.fn(), error: vi.fn() },
  }
})

import BilanInitialTab from '@/components/patients/BilanInitialTab.vue'
import type { CrhDiabeteFormData } from '@/types/crh-diabete'

function createDefaultData(overrides: Partial<BilanInitialData> = {}): BilanInitialData {
  return {
    histoireRecent: '',
    traitementEntree: '',
    examenPhysiqueTexte: '',
    conclusionEntree: '',
    projetSoin: '',
    glasgow: { ouvertureYeux: null, reponseVerbale: null, reponseMotrice: null },
    glasgowHistory: [],
    douleurHistory: [],
    vitalSignsHistory: [],
    scoreDouleur: null,
    examenPhysique: {
      taSystolique: null, taDiastolique: null, frequenceCardiaque: null, temperature: null,
      glycemie: null, cetonurie: null, glucosurie: null, cetonemie: null, poids: null, taille: null, saO2: null, diurese: null,
    },
    ...overrides,
  }
}

function createWrapper(opts: { data?: BilanInitialData } = {}) {
  // Faithful mirror of the app flow: CrhDiabeteForm holds `formData = ref(...)`
  // and passes `:data="formData.bilanInitial"` — a DEEP-reactive object. Wrap the
  // POJO in reactive() so the computed preview fields get real reactive deps,
  // exactly like the production `data` prop.
  const data = reactive(opts.data ?? createDefaultData())
  return mount(BilanInitialTab, {
    props: {
      data,
      fieldMeta: {},
      patientId: null,
      dateDebut: '2026-01-01',
      dateFin: '2026-01-10',
      linkVitalCheck: true,
      readonly: false,
    },
    global: { stubs: { teleport: true } },
  })
}

function sectionBodies(wrapper: ReturnType<typeof createWrapper>) {
  return wrapper.findAll('.collapsible-section__body')
}

async function openSection(wrapper: ReturnType<typeof createWrapper>, index: number) {
  await wrapper.findAll('.collapsible-section__header')[index].trigger('click')
  await nextTick()
}

async function clickEnregistrer(wrapper: ReturnType<typeof createWrapper>, index: number) {
  const body = sectionBodies(wrapper)[index]
  const saveBtn = body.findAll('.staged-section__footer button, .staged-section__footer el-button').find(b => b.text().trim() === 'Enregistrer')
  await saveBtn!.trigger('click')
  await nextTick()
}

describe('REAL RichTextEditor flow', () => {
  beforeEach(() => {
    currentEditorHtml = ''
    capturedOnUpdates.length = 0
  })

  it('preview shows saved rich content after Enregistrer', async () => {
    const data = reactive(createDefaultData())
    const wrapper = createWrapper({ data })

    await openSection(wrapper, 0)

    // Simulate user typing in the REAL editor: onUpdate fires with getHTML()
    currentEditorHtml = '<p>Douleurs abdominales depuis 3 jours</p>'
    expect(capturedOnUpdates.length).toBeGreaterThan(0)
    capturedOnUpdates[0]({ editor: mockEditor })
    await nextTick()

    const footers = sectionBodies(wrapper)[0].findAll('.staged-section__footer button')
    await clickEnregistrer(wrapper, 0)

    expect(data.histoireRecent).toBe('<p>Douleurs abdominales depuis 3 jours</p>')

    const rows = wrapper.findAll('.form-preview')[0].findAll('.form-preview__row')
    // La valeur riche est rendue en v-html dans .form-preview__value ; le champ
    // « Histoire récente de la maladie » est déclaré avec hideLabel: true (le
    // libellé n'apparaît donc pas dans le DOM du preview).
    const richRow = rows.find(r => r.find('.form-preview__value').text() === 'Douleurs abdominales depuis 3 jours')
    expect(richRow).toBeTruthy()
    expect(richRow!.find('.form-preview__value').text()).toBe('Douleurs abdominales depuis 3 jours')
  })

  it('preview shows pre-loaded rich content at mount', async () => {
    const data = reactive(createDefaultData({ histoireRecent: '<p>Motif existant depuis l\'entrée</p>' }))
    const wrapper = createWrapper({ data })
    await nextTick()

    const rows = wrapper.findAll('.form-preview')[0].findAll('.form-preview__row')
    // idem : valeur riche rendue en v-html, libellé masqué (hideLabel)
    const richRow = rows.find(r => r.find('.form-preview__value').text() === 'Motif existant depuis l\'entrée')
    expect(richRow).toBeTruthy()
    expect(richRow!.find('.form-preview__value').text()).toBe('Motif existant depuis l\'entrée')
  })
})
