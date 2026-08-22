// @vitest-environment jsdom
/**
 * CRH round-trip: staged commit → autosave snapshot (baseline-aware merge).
 *
 * Regression suite for the mergeFormData fix (CrhDiabeteForm.vue):
 *   - Baseline-aware merge: when the incoming modelValue snapshot is
 *     deep-equal to the last-EMITTED save payload (a round-trip echo), the
 *     LIVE formData wins instead of being rebuilt from the incoming snapshot.
 *
 * What is verified (empirically, via probes):
 *   1. WIRING (control): BilanInitialTab wiring is CORRECT — a staged commit
 *      writes into `data` (in-place) and FormPreview shows it immediately.
 *   2. CLOBBER → regression: a STALE ECHO of our own save (deep-equal to the
 *      last emission) no longer wipes a NEWER in-flight commit. This test
 *      FAILS on the old `{ ...defaults, ...incoming }` merge and PASSES on
 *      the baseline-aware merge.
 *   3. CONTROL: a FRESH snapshot carrying the committed value is still
 *      applied (the legitimate incoming-update path is not broken).
 *   4. SYMPTOM → acceptance: after clicking the section's "Enregistrer"
 *      button, the inline preview must SHOW the committed value. The
 *      `lastMergedInput` guard (same fix) skips the re-merge when the
 *      incoming snapshot is deep-equal to the last merged input — the
 *      idempotent stale-echo case — so the commit survives the deep
 *      props-watcher round-trip; this suite covers the "Enregistrer"
 *      button path.
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
  usePatientContext: () => ({ activePatient: mockActivePatient }),
}))

vi.mock('@/composables/useEncounters', () => ({
  useEncounters: () => ({ getEncounter: vi.fn().mockResolvedValue(null) }),
}))

vi.mock('@/composables/useExport', () => ({
  useExport: () => ({ exportCrhDiabetePdf: vi.fn().mockResolvedValue(undefined) }),
}))

vi.mock('@/composables/useMedicalStaff', () => ({
  useMedicalStaff: () => ({ fetchMedicalStaff: vi.fn().mockResolvedValue([]) }),
  formatMedecinName: (user: any) => `${(user.nom || '').toUpperCase()} ${user.prenom || ''}`,
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
  usePatients: () => ({ updatePatient: vi.fn().mockResolvedValue(undefined) }),
}))

vi.mock('@/composables/useVitalSigns', () => ({
  getVitalSignsItemsList: vi.fn().mockResolvedValue([]),
  saveVitalSignsItem: vi.fn().mockResolvedValue({}),
  deleteVitalSignsItem: vi.fn().mockResolvedValue(undefined),
}))

const mockIpcInvoke = vi.hoisted(() => vi.fn())

vi.mock('@/utils/ipc', () => ({ ipcInvoke: mockIpcInvoke }))

// ─── RichTextEditor / tiptap ───────────────────────────────────────

const mockEditor = {
  isActive: vi.fn().mockReturnValue(false),
  chain: vi.fn().mockReturnValue({ focus: vi.fn().mockReturnThis(), run: vi.fn().mockReturnThis() }),
  can: vi.fn().mockReturnValue({ undo: vi.fn().mockReturnValue(false), redo: vi.fn().mockReturnValue(false) }),
  getAttributes: vi.fn().mockReturnValue({}),
  setEditable: vi.fn(),
  getHTML: vi.fn(() => ''),
  commands: { setContent: vi.fn() },
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

vi.mock('@element-plus/icons-vue', () => {
  const stub = { render: () => null }
  return {
    Plus: { name: 'Plus', ...stub }, Minus: { name: 'Minus', ...stub },
    ArrowDown: { name: 'ArrowDown', ...stub }, Edit: { name: 'Edit', ...stub },
    Delete: { name: 'Delete', ...stub }, Download: { name: 'Download', ...stub },
    Printer: { name: 'Printer', ...stub }, Close: { name: 'Close', ...stub },
    ZoomIn: { name: 'ZoomIn', ...stub }, ZoomOut: { name: 'ZoomOut', ...stub },
  }
})

// ─── Imports under test ────────────────────────────────────────────

import CrhDiabeteForm from '../CrhDiabeteForm.vue'
import BilanInitialTab from '../BilanInitialTab.vue'
import StagedCollapsibleSection from '@/components/common/StagedCollapsibleSection.vue'

// ─── Stubs ─────────────────────────────────────────────────────────

const ChildTabStub = {
  template: '<div class="child-tab-stub" />',
  props: ['data', 'readonly', 'documentId'],
  emits: ['change'],
}

const EL_STUBS: Record<string, any> = {
  // Render ALL tab panes (real el-tabs lazy-renders only the active pane).
  'el-tabs': { template: '<div class="el-tabs"><slot /></div>' },
  'el-tab-pane': { template: '<div class="el-tab-pane"><slot /><slot name="label" /></div>', props: ['name', 'label'] },
  'el-tag': { template: '<span class="el-tag"><slot /></span>' },
  'el-button': {
    template: '<button class="el-button" :disabled="disabled" @click="$emit(\'click\', $event)"><slot /></button>',
    props: ['disabled'], emits: ['click'],
  },
  'el-alert': { template: '<div class="el-alert"><slot /></div>' },
  AdmissionTab: ChildTabStub, ModeVieAtcdTab: ChildTabStub, FicheDiabeteTab: ChildTabStub,
  ExamensComplementairesTab: ChildTabStub, EvolutionMedicaleTab: ChildTabStub,
  OrdonnanceSortieTab: ChildTabStub, SortieTab: ChildTabStub, AnnexeTab: ChildTabStub,
  ParameterHistoryDialog: { template: '<div />', props: ['modelValue'], emits: ['update:modelValue'] },
  HtmlPreviewDialog: { template: '<div />', props: ['open'] },
}

const RICH_HTML = '<p>Douleurs abdominales depuis 3 jours</p>'
const RICH_TEXT = 'Douleurs abdominales depuis 3 jours'

// ─── Helpers ───────────────────────────────────────────────────────

function createDefaultBilanData(overrides: Partial<BilanInitialData> = {}): BilanInitialData {
  return {
    histoireRecent: '', traitementEntree: '', examenPhysiqueTexte: '', conclusionEntree: '', projetSoin: '',
    glasgow: { ouvertureYeux: null, reponseVerbale: null, reponseMotrice: null },
    glasgowHistory: [], douleurHistory: [], vitalSignsHistory: [], scoreDouleur: null,
    examenPhysique: {
      taSystolique: null, taDiastolique: null, frequenceCardiaque: null, temperature: null,
      glycemie: null, cetonurie: null, glucosurie: null, cetonemie: null, poids: null, taille: null, saO2: null, diurese: null,
    },
    ...overrides,
  }
}

function createCrFormWrapper(modelValue: Record<string, any> = createDefaultFormData()) {
  return mount(CrhDiabeteForm, {
    props: { modelValue, readonly: false, contactId: '1', contactDisplay: 'Test Patient' },
    global: { stubs: { ...EL_STUBS, teleport: true } },
  })
}

/** Opens the "Histoire récente" section and types into its draft, then either
 *  clicks "Enregistrer" (viaButton) or calls the section's exposed save()
 *  directly. Returns the value of the section's modelValue read SYNCHRONOUSLY
 *  right after save() — i.e., the pre-flush commit value (the deep props
 *  watcher's re-merge only runs at the next microtask). */
async function commitHistoireRecent(
  wrapper: ReturnType<typeof createCrFormWrapper> | ReturnType<typeof mount<typeof BilanInitialTab>>,
  html: string,
  viaButton = true,
): Promise<string | undefined> {
  const sections = wrapper.findAllComponents(StagedCollapsibleSection)
  const section = sections[0]
  await section.find('.collapsible-section__header').trigger('click')
  await nextTick()
  section.vm.draft.histoireRecent = html
  await nextTick()
  if (viaButton) {
    const saveBtn = section
      .findAll('.staged-section__footer button, .staged-section__footer el-button')
      .find(b => b.text().trim() === 'Enregistrer')
    await saveBtn!.trigger('click')
    return (section.vm as any).modelValue?.histoireRecent
  }
  // Same handler the "Enregistrer" button binds (@click="save").
  (section.vm as any).save()
  // Synchronous read — runs before any queued watcher flush.
  return (section.vm as any).modelValue?.histoireRecent
}

function histoirePreviewValue(wrapper: ReturnType<typeof createCrFormWrapper>): string | undefined {
  const preview0 = wrapper.findAll('.form-preview')[0]
  const rows = preview0.findAll('.form-preview__row')
  const row = rows.find(r => r.text().includes('Histoire récente de la maladie'))
  return row?.find('.form-preview__value').text()
}

function formDataBilan(wrapper: ReturnType<typeof createCrFormWrapper>): BilanInitialData {
  return (wrapper.vm as any).formData.bilanInitial as BilanInitialData
}

/** Last 'save' payload emitted by the form (as the parent would have persisted
 *  it and refetched it back). */
function lastEmittedSave(wrapper: ReturnType<typeof createCrFormWrapper>): Record<string, any> {
  const saves = wrapper.emitted('save') as unknown[][]
  return saves.at(-1)![0] as Record<string, any>
}

// ─── Suite ─────────────────────────────────────────────────────────

describe('CRH round-trip: staged commit → autosave snapshot (baseline-aware merge)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIpcInvoke.mockReset()
    mockActivePatient.value = null
  })

  it('WIRING: BilanInitialTab commit shows in the inline preview (tab level, real reactive data)', async () => {
    const data = reactive(createDefaultBilanData())
    const wrapper = mount(BilanInitialTab, {
      props: {
        data, fieldMeta: {}, patientId: null,
        dateDebut: '2026-01-01', dateFin: '2026-01-10', linkVitalCheck: true, readonly: false,
      },
      global: { stubs: { ...EL_STUBS, teleport: true } },
    })
    await nextTick()

    await commitHistoireRecent(wrapper as any, RICH_HTML)
    await nextTick()

    // The commit landed on the reactive `data` object (in-place prop mutation)
    expect(data.histoireRecent).toBe(RICH_HTML)
    // …and the inline FormPreview renders it right away.
    expect(histoirePreviewValue(wrapper as any)).toBe(RICH_TEXT)
  })

  it('CLOBBER→FIXED: a stale echo of our own save keeps the NEWER live commit (baseline-aware merge)', async () => {
    const wrapper = createCrFormWrapper()
    await flushPromises()

    // Commit A through the REAL section save(). The returned value is the
    // SYNCHRONOUS pre-flush commit — the deep props-watcher re-merge only runs
    // at the next microtask — proving the write landed in the form's internal
    // bilanInitial.
    const committedA = await commitHistoireRecent(wrapper, RICH_HTML, false)
    expect(committedA).toBe(RICH_HTML)

    // The form's save fires (autosave / "Enregistrer Brouillon") → the parent
    // persists `lastEmittedSnapshot` (containing A).
    await (wrapper.vm as any).handleSaveDraft()
    const baselineEcho = lastEmittedSave(wrapper)

    // While the save is in flight the clinician keeps typing: a NEWER commit B
    // lands in the live formData (direct save, no flush between).
    const committedB = await commitHistoireRecent(wrapper, '<p>Valeur B</p>', false)
    expect(committedB).toBe('<p>Valeur B</p>')

    // The parent round-trips the STALE echo of its own save (deep-equal to the
    // baseline, but WITHOUT the newer commit B). The baseline-aware merge must
    // keep the LIVE value — the old `{ ...defaults, ...incoming }` merge would
    // clobber B and lose the clinician's newer text.
    await wrapper.setProps({ modelValue: JSON.parse(JSON.stringify(baselineEcho)) as CrhDiabeteFormData })
    await nextTick()
    await flushPromises()

    expect(formDataBilan(wrapper).histoireRecent).toBe('<p>Valeur B</p>')
    expect(histoirePreviewValue(wrapper)).toBe('Valeur B')
  })

  it('CONTROL: a FRESH snapshot carrying the committed value survives the round-trip', async () => {
    const wrapper = createCrFormWrapper()
    await flushPromises()

    const committed = await commitHistoireRecent(wrapper, RICH_HTML, false)
    expect(committed).toBe(RICH_HTML)

    const freshSnapshot = JSON.parse(JSON.stringify(createDefaultFormData())) as CrhDiabeteFormData
    freshSnapshot.bilanInitial.histoireRecent = RICH_HTML
    await wrapper.setProps({ modelValue: freshSnapshot })
    await nextTick()
    await flushPromises()

    expect(formDataBilan(wrapper).histoireRecent).toBe(RICH_HTML)
    expect(histoirePreviewValue(wrapper)).toBe(RICH_TEXT)
  })

  it('SYMPTOM: the inline preview SHOWS the committed value after clicking Enregistrer', async () => {
    // The `lastMergedInput` guard skips the re-merge of an unchanged incoming
    // snapshot (idempotent stale-echo protection), so the committed value
    // survives the deep props-watcher round-trip.
    const wrapper = createCrFormWrapper()
    await flushPromises()

    // The exact user action: type into the staged section, click "Enregistrer".
    await commitHistoireRecent(wrapper, RICH_HTML)
    await flushPromises()

    // The commit must survive the props-watcher re-merge…
    expect(formDataBilan(wrapper).histoireRecent).toBe(RICH_HTML)
    // …and the inline preview must show it (the reported bug).
    expect(histoirePreviewValue(wrapper)).toBe(RICH_TEXT)
  })
})
