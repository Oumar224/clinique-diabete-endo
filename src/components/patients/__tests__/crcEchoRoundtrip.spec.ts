// @vitest-environment jsdom
/**
 * CRC round-trip: live commit → autosave snapshot (baseline-aware merge).
 *
 * Regression suite for the mergeFormData fix (CrcDiabeteForm.vue), mirroring
 * stagedRoundtrip.spec.ts but for the CRC form:
 *   - Baseline-aware merge: when the incoming modelValue snapshot is
 *     deep-equal to the last-EMITTED save payload (a round-trip echo), the
 *     LIVE formData wins instead of being rebuilt from the incoming snapshot.
 *   - Idempotence guard: an incoming snapshot deep-equal to the last MERGED
 *     snapshot is skipped (no re-merge that could wipe in-flight edits).
 *
 * What is verified (empirically, via probes):
 *   1. CLOBBER → regression: a STALE ECHO of our own save (deep-equal to the
 *      last emission) no longer wipes a NEWER in-flight live commit. This
 *      test FAILS on the old `{ ...defaults, ...incoming }` merge and PASSES
 *      on the baseline-aware merge.
 *   2. CONTROL: a FRESH snapshot carrying a value is still applied (the
 *      legitimate incoming-update path is not broken).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref, nextTick } from 'vue'
import type { CrcDiabeteFormData, BilanInitialData } from '@/types/crc-diabete'
import { createDefaultFormData } from '@/types/crc-diabete'

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
  useExport: () => ({ exportCrcDiabetePdf: vi.fn().mockResolvedValue(undefined) }),
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

// ─── Import under test ─────────────────────────────────────────────

import CrcDiabeteForm from '../CrcDiabeteForm.vue'

// ─── Stubs ─────────────────────────────────────────────────────────

const ChildTabStub = {
  template: '<div class="child-tab-stub" />',
  props: ['data', 'readonly', 'documentId'],
  emits: ['change'],
}

const EL_STUBS: Record<string, any> = {
  'el-tabs': { template: '<div class="el-tabs"><slot /></div>' },
  'el-tab-pane': { template: '<div class="el-tab-pane"><slot /><slot name="label" /></div>', props: ['name', 'label'] },
  'el-tag': { template: '<span class="el-tag"><slot /></span>' },
  'el-button': {
    template: '<button class="el-button" :disabled="disabled" @click="$emit(\'click\', $event)"><slot /></button>',
    props: ['disabled'], emits: ['click'],
  },
  'el-alert': { template: '<div class="el-alert"><slot /></div>' },
  AdmissionTab: ChildTabStub, ModeVieAtcdTab: ChildTabStub, FicheDiabeteTab: ChildTabStub,
  BilanInitialTab: ChildTabStub, ExamensComplementairesTab: ChildTabStub, EvolutionMedicaleTab: ChildTabStub,
  OrdonnanceSortieTab: ChildTabStub, SortieTab: ChildTabStub, AnnexeTab: ChildTabStub,
  ParameterHistoryDialog: { template: '<div />', props: ['modelValue'], emits: ['update:modelValue'] },
  HtmlPreviewDialog: { template: '<div />', props: ['open'] },
}

const RICH_HTML = '<p>Douleurs abdominales depuis 3 jours</p>'

// ─── Helpers ───────────────────────────────────────────────────────

function createCrcFormWrapper(modelValue: Record<string, any> = createDefaultFormData()) {
  return mount(CrcDiabeteForm, {
    props: { modelValue, readonly: false, contactId: '1', contactDisplay: 'Test Patient' },
    global: { stubs: { ...EL_STUBS, teleport: true } },
  })
}

function formDataBilan(wrapper: ReturnType<typeof createCrcFormWrapper>): BilanInitialData {
  return (wrapper.vm as any).formData.bilanInitial as BilanInitialData
}

/** Last 'save' payload emitted by the form (as the parent would have persisted
 *  it and refetched it back). */
function lastEmittedSave(wrapper: ReturnType<typeof createCrcFormWrapper>): Record<string, any> {
  const saves = wrapper.emitted('save') as unknown[][]
  return saves.at(-1)![0] as Record<string, any>
}

// ─── Suite ─────────────────────────────────────────────────────────

describe('CRC round-trip: live commit → autosave snapshot (baseline-aware merge)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIpcInvoke.mockReset()
    mockActivePatient.value = null
  })

  it('CLOBBER→FIXED: a stale echo of our own save keeps the NEWER live commit (baseline-aware merge)', async () => {
    const wrapper = createCrcFormWrapper()
    await flushPromises()

    // Commit A through the same data path the (stubbed) tabs mutate: the live
    // formData of the CRC form.
    formDataBilan(wrapper).histoireRecent = RICH_HTML

    // The form's save fires → the parent persists `lastEmittedSnapshot`
    // (containing A).
    await (wrapper.vm as any).handleSaveDraft()
    const baselineEcho = lastEmittedSave(wrapper)

    // While the save is in flight the clinician keeps typing: a NEWER commit B
    // lands in the live formData.
    formDataBilan(wrapper).histoireRecent = '<p>Valeur B</p>'

    // The parent round-trips the STALE echo of its own save (deep-equal to the
    // baseline, but WITHOUT the newer commit B). The baseline-aware merge must
    // keep the LIVE value — the old `{ ...defaults, ...incoming }` merge would
    // clobber B and lose the clinician's newer text.
    await wrapper.setProps({ modelValue: JSON.parse(JSON.stringify(baselineEcho)) as CrcDiabeteFormData })
    await nextTick()
    await flushPromises()

    expect(formDataBilan(wrapper).histoireRecent).toBe('<p>Valeur B</p>')
  })

  it('CONTROL: a FRESH snapshot carrying the committed value survives the round-trip', async () => {
    const wrapper = createCrcFormWrapper()
    await flushPromises()

    const freshSnapshot = JSON.parse(JSON.stringify(createDefaultFormData())) as CrcDiabeteFormData
    freshSnapshot.bilanInitial.histoireRecent = RICH_HTML
    await wrapper.setProps({ modelValue: freshSnapshot })
    await nextTick()
    await flushPromises()

    expect(formDataBilan(wrapper).histoireRecent).toBe(RICH_HTML)
  })
})
