// @vitest-environment jsdom
/**
 * Repro: "inline preview stays empty after Enregistrer" — upstream round-trip.
 *
 * Diagnoses the mergeFormData clobber theory at the CRH-form level:
 *   1. commit a rich value through the real BilanInitialTab staged section
 *   2. simulate the autosave round-trip (parent replaces props.modelValue with
 *      a snapshot) and check whether the committed value survives.
 *
 * See CrhDiabeteForm.vue `mergeFormData`: for every object section it does
 *   formData.value[key] = { ...defaults[key], ...val[key] }
 * which REPLACES the section object identity. If the incoming snapshot does
 * not carry the committed field, the committed value is clobbered.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref, reactive, nextTick } from 'vue'
import type { CrhDiabeteFormData, BilanInitialData } from '@/types/crh-diabete'
import { createDefaultFormData } from '@/types/crh-diabete'

// ─── Composables ───────────────────────────────────────────────────

vi.mock('@/composables/useAuth', () => ({
  useAuth: () => ({
    user: ref({ id: 1, nom: 'Dupont', prenom: 'Jean', role: 'MEDECIN' }),
  }),
}))

const mockActivePatient = ref(null)

vi.mock('@/composables/usePatientContext', () => ({
  usePatientContext: () => ({
    activePatient: mockActivePatient,
  }),
}))

vi.mock('@/composables/useEncounters', () => ({
  useEncounters: () => ({
    getEncounter: vi.fn().mockResolvedValue(null),
  }),
}))

vi.mock('@/composables/useExport', () => ({
  useExport: () => ({
    exportCrhDiabetePdf: vi.fn().mockResolvedValue(undefined),
  }),
}))

vi.mock('@/composables/useMedicalStaff', () => ({
  useMedicalStaff: () => ({ fetchMedicalStaff: vi.fn().mockResolvedValue([]) }),
  formatMedecinName: (user: any) => {
    const nom = (user.nom || '').toUpperCase()
    const prenom = user.prenom || ''
    return `${nom} ${prenom}`
  },
}))

vi.mock('@/composables/useCrhDiabeteCalculations', () => ({
  useCrhDiabeteCalculations: () => ({
    calcAge: vi.fn().mockReturnValue(45),
    calcGlasgowScore: vi.fn().mockReturnValue(15),
    glasgowInterpretation: vi.fn().mockReturnValue({ label: 'OK', type: 'success' }),
    calcIMC: vi.fn(() => null),
  }),
}))

vi.mock('@/composables/usePatients', () => ({
  usePatients: () => ({
    updatePatient: vi.fn().mockResolvedValue(undefined),
  }),
}))

vi.mock('@/composables/useVitalSigns', () => ({
  getVitalSignsItemsList: vi.fn().mockResolvedValue([]),
  saveVitalSignsItem: vi.fn().mockResolvedValue({}),
  deleteVitalSignsItem: vi.fn().mockResolvedValue(undefined),
}))

const mockIpcInvoke = vi.hoisted(() => vi.fn())

vi.mock('@/utils/ipc', () => ({
  ipcInvoke: mockIpcInvoke,
}))

// ─── RichTextEditor / tiptap ───────────────────────────────────────

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

vi.mock('@tiptap/vue-3', () => ({
  useEditor: vi.fn(() => ref(mockEditor)),
  EditorContent: { template: '<div class="editor-content" />', props: ['editor'] },
}))

vi.mock('@tiptap/starter-kit', () => ({ default: {} }))
vi.mock('@tiptap/extension-underline', () => ({ default: {} }))

// ─── Element Plus ──────────────────────────────────────────────────

vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), warning: vi.fn(), error: vi.fn() },
  ElMessageBox: { confirm: vi.fn().mockResolvedValue(true) },
}))

vi.mock('@element-plus/icons-vue', () => ({
  Plus: { name: 'Plus', render: () => null },
  Minus: { name: 'Minus', render: () => null },
  ArrowDown: { name: 'ArrowDown', render: () => null },
  Edit: { name: 'Edit', render: () => null },
  Delete: { name: 'Delete', render: () => null },
  Download: { name: 'Download', render: () => null },
  Printer: { name: 'Printer', render: () => null },
  Close: { name: 'Close', render: () => null },
  ZoomIn: { name: 'ZoomIn', render: () => null },
  ZoomOut: { name: 'ZoomOut', render: () => null },
}))

// ─── Imports under test ────────────────────────────────────────────

import CrhDiabeteForm from '../CrhDiabeteForm.vue'
import BilanInitialTab from '../BilanInitialTab.vue'
import StagedCollapsibleSection from '@/components/common/StagedCollapsibleSection.vue'

// ─── Stubs ─────────────────────────────────────────────────────────

const ChildTabStub = {
  template: '<div class="child-tab-stub" />',
  props: ['data', 'readonly'],
  emits: ['change'],
}

const EL_STUBS: Record<string, any> = {
  // Force ALL tab panes to render (real el-tabs lazy-renders only the active
  // pane; the stub renders every default slot so the real BilanInitialTab is
  // always mounted, exactly like the existing CrhDiabeteForm.spec.ts pattern).
  'el-tabs': {
    template: '<div class="el-tabs"><slot /></div>',
    props: ['modelValue', 'type'],
    emits: ['update:modelValue'],
  },
  'el-tab-pane': {
    template: '<div class="el-tab-pane"><slot /><slot name="label" /></div>',
    props: ['name', 'label'],
  },
  'el-tag': {
    template: '<span class="el-tag" :type="type" :effect="effect"><slot /></span>',
    props: ['type', 'size', 'effect'],
  },
  'el-button': {
    template: '<button class="el-button" :disabled="disabled" :type="type" :loading="loading" @click="$emit(\'click\', $event)"><slot /></button>',
    props: ['disabled', 'type', 'size', 'text', 'loading'],
    emits: ['click'],
  },
  'el-alert': {
    template: '<div class="el-alert" :title="title" :type="type"><slot /></div>',
    props: ['title', 'type', 'showIcon', 'closable'],
  },
  // Sibling tabs stubbed; BilanInitialTab left REAL.
  AdmissionTab: ChildTabStub,
  ModeVieAtcdTab: ChildTabStub,
  FicheDiabeteTab: ChildTabStub,
  ExamensComplementairesTab: ChildTabStub,
  EvolutionMedicaleTab: ChildTabStub,
  OrdonnanceSortieTab: ChildTabStub,
  SortieTab: ChildTabStub,
  ParameterHistoryDialog: {
    template: '<div v-if="modelValue" class="parameter-history-dialog-stub" />',
    props: ['modelValue', 'title', 'path', 'loading', 'entries'],
    emits: ['update:modelValue'],
  },
  HtmlPreviewDialog: {
    template: '<div v-if="open" class="html-preview-dialog-stub" />',
    props: ['title', 'channel', 'downloadChannel', 'params'],
  },
}

const RICH_HTML = '<p>Douleurs abdominales depuis 3 jours</p>'
const RICH_TEXT = 'Douleurs abdominales depuis 3 jours'

// ─── Helpers ───────────────────────────────────────────────────────

function createWrapper(modelValue: Record<string, any> = createDefaultFormData()) {
  return mount(CrhDiabeteForm, {
    props: {
      modelValue,
      readonly: false,
      contactId: '1',
      contactDisplay: 'Test Patient',
    },
    global: { stubs: { ...EL_STUBS, teleport: true } },
  })
}

/** Returns the "Histoire récente" StagedCollapsibleSection (first section). */
function histoireSection(wrapper: ReturnType<typeof createWrapper>) {
  const sections = wrapper.findAllComponents(StagedCollapsibleSection)
  return sections[0]
}

/** Opens the section, types a rich value into its draft, clicks "Enregistrer". */
async function commitHistoireRecent(wrapper: ReturnType<typeof createWrapper>, html: string) {
  const section = histoireSection(wrapper)
  await section.find('.collapsible-section__header').trigger('click')
  await nextTick()
  // Pragmatic drive of the RichTextEditor v-model: set the section's local
  // reactive draft directly (the editor's onUpdate would do the same).
  section.vm.draft.histoireRecent = html
  await nextTick()
  const saveBtn = section
    .findAll('.staged-section__footer button, .staged-section__footer el-button')
    .find(b => b.text().trim() === 'Enregistrer')
  await saveBtn!.trigger('click')
  await nextTick()
}

function histoirePreviewValue(wrapper: ReturnType<typeof createWrapper>): string | undefined {
  const preview0 = wrapper.findAll('.form-preview')[0]
  const rows = preview0.findAll('.form-preview__row')
  const row = rows.find(r => r.text().includes('Histoire récente de la maladie'))
  return row?.find('.form-preview__value').text()
}

function formDataBilan(wrapper: ReturnType<typeof createWrapper>): BilanInitialData {
  return (wrapper.vm as any).formData.bilanInitial as BilanInitialData
}

// ─── Suite ─────────────────────────────────────────────────────────

describe('CRH round-trip: staged commit → autosave snapshot (mergeFormData clobber theory)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIpcInvoke.mockReset()
    mockActivePatient.value = null
  })

  it('committing "Histoire récente" writes through to formData AND shows in the inline preview', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    await commitHistoireRecent(wrapper, RICH_HTML)

    // The commit landed in the CRH-level formData (in-place mutation path).
    expect(formDataBilan(wrapper).histoireRecent).toBe(RICH_HTML)

    // The inline FormPreview shows the committed value → tab wiring is correct.
    expect(histoirePreviewValue(wrapper)).toBe(RICH_TEXT)
  })

  it('ROUND-TRIP CLOBBER: a stale autosave snapshot (missing the commit) wipes the value from formData AND the preview', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    await commitHistoireRecent(wrapper, RICH_HTML)
    expect(histoirePreviewValue(wrapper)).toBe(RICH_TEXT)

    // Parent round-trip: modelValue is replaced by a snapshot that does NOT
    // contain the committed field (stale autosave response / re-fetched doc).
    const staleSnapshot = JSON.parse(JSON.stringify(createDefaultFormData())) as CrhDiabeteFormData
    staleSnapshot.bilanInitial.histoireRecent = '' // stale — the commit is missing
    await wrapper.setProps({ modelValue: staleSnapshot })
    await nextTick()
    await flushPromises()

    // mergeFormData rebuilt bilanInitial from { ...defaults, ...stale } → commit lost.
    expect(formDataBilan(wrapper).histoireRecent).toBe('')
    expect(histoirePreviewValue(wrapper)).toBeUndefined()
  })

  it('CONTROL: a FRESH snapshot carrying the committed value survives the round-trip', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    await commitHistoireRecent(wrapper, RICH_HTML)
    expect(histoirePreviewValue(wrapper)).toBe(RICH_TEXT)

    // Fresh autosave response: contains the committed field.
    const freshSnapshot = JSON.parse(JSON.stringify(createDefaultFormData())) as CrhDiabeteFormData
    freshSnapshot.bilanInitial.histoireRecent = RICH_HTML
    await wrapper.setProps({ modelValue: freshSnapshot })
    await nextTick()
    await flushPromises()

    expect(formDataBilan(wrapper).histoireRecent).toBe(RICH_HTML)
    expect(histoirePreviewValue(wrapper)).toBe(RICH_TEXT)
  })

  it('MECHANISM: BilanInitialTab loses the preview when its `data` prop is replaced by a new object identity', async () => {
    // Direct tab-level proof that "the data prop being replaced" (what
    // mergeFormData does) empties the preview even with a fully reactive data.
    const data = reactive(createDefaultBilanData())
    const wrapper = mount(BilanInitialTab, {
      props: {
        data,
        fieldMeta: {},
        patientId: null,
        dateDebut: '2026-01-01',
        dateFin: '2026-01-10',
        linkVitalCheck: true,
        readonly: false,
      },
      global: { stubs: { ...EL_STUBS, teleport: true } },
    })
    await nextTick()

    await commitHistoireRecent(wrapper as any, RICH_HTML)
    expect(histoirePreviewValue(wrapper as any)).toBe(RICH_TEXT)

    // Simulate mergeFormData's section rebuild: NEW object identity, value gone.
    const freshEmpty = reactive(createDefaultBilanData())
    await wrapper.setProps({ data: freshEmpty })
    await nextTick()

    expect(histoirePreviewValue(wrapper as any)).toBeUndefined()
  })
})

function createDefaultBilanData(overrides: Partial<BilanInitialData> = {}): BilanInitialData {
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
