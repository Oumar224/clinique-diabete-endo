// @vitest-environment jsdom
/**
 * "Score de douleur à l'entrée" round-trip: live commit → autosave snapshot
 * (baseline-aware merge).
 *
 * Regression suite for the mergeFormData stale-echo fix (CrhDiabeteForm.vue):
 * the "Score de douleur à l'entrée" CRUD previously ALWAYS persisted the same
 * score because a stale/out-of-order round-trip echo of the form's own save
 * reverted `bilanInitial.scoreDouleur` and `bilanInitial.douleurHistory` back
 * to an older value.
 *
 * The form now keeps a `Set` of every snapshot it has emitted
 * (`emittedSnapshots`, cap 20) and, via `isEmittedSection`, treats incoming
 * `bilanInitial` that deep-equals ANY previously-emitted section as our own
 * round-trip feedback — the LIVE value wins, so an older echo fed back after a
 * newer commit can no longer clobber the douleur score/history.
 *
 * Scenario (mirrors crcEchoRoundtrip.spec.ts "CLOBBER→FIXED"):
 *   1. A douleur commit A lands in the live formData (score + a history row).
 *   2. handleSaveDraft() emits its snapshot (containing A); the parent persists
 *      it.
 *   3. While the save is in flight the clinician enters a NEWER score/history B
 *      into the live formData.
 *   4. The parent round-trips the STALE echo (deep-equal to the emitted A
 *      snapshot, WITHOUT B) into `modelValue`.
 *   5. KEY assertion: `bilanInitial.scoreDouleur` and `douleurHistory`
 *      must keep the NEWER B, NOT be reverted to A.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref, nextTick } from 'vue'
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
  BilanInitialTab: ChildTabStub, ExamensComplementairesTab: ChildTabStub, EvolutionMedicaleTab: ChildTabStub,
  OrdonnanceSortieTab: ChildTabStub, SortieTab: ChildTabStub, AnnexeTab: ChildTabStub,
  ParameterHistoryDialog: { template: '<div />', props: ['modelValue'], emits: ['update:modelValue'] },
  HtmlPreviewDialog: { template: '<div />', props: ['open'] },
  DossierPatientHeader: { template: '<div />', props: ['contactDisplay', 'admission'] },
}

// ─── Helpers ───────────────────────────────────────────────────────

function createCrFormWrapper(modelValue: Record<string, any> = createDefaultFormData()) {
  return mount(CrhDiabeteForm, {
    props: { modelValue, readonly: false, contactId: '1', contactDisplay: 'Test Patient' },
    global: { stubs: { ...EL_STUBS, teleport: true } },
  })
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

describe('Douleur "Score de douleur à l\'entrée" round-trip: stale-echo-proof (baseline-aware merge)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIpcInvoke.mockReset()
    mockActivePatient.value = null
  })

  it('CLOBBER→FIXED: a stale echo of our own save keeps the NEWER live douleur score/history (baseline-aware merge)', async () => {
    const wrapper = createCrFormWrapper()
    await flushPromises()

    // Commit A through the same data path the douleur CRUD mutates: the live
    // bilanInitial of the CRH form (a richer score + a history row).
    formDataBilan(wrapper).scoreDouleur = 7
    formDataBilan(wrapper).douleurHistory = [
      { _key: 'dA', date: '2026-01-01T10:00', score: 7 },
    ]

    // The form's save fires → the parent persists `lastEmittedSnapshot`
    // (containing A) and tracks it in `emittedSnapshots`.
    await (wrapper.vm as any).handleSaveDraft()
    const baselineEcho = lastEmittedSave(wrapper)

    // While the save is in flight the clinician records a NEWER score B and a
    // newer history row.
    formDataBilan(wrapper).scoreDouleur = 9
    formDataBilan(wrapper).douleurHistory = [
      { _key: 'dB', date: '2026-01-02T10:00', score: 9 },
      { _key: 'dA', date: '2026-01-01T10:00', score: 7 },
    ]

    // The parent round-trips the STALE echo of its own save (deep-equal to the
    // baseline, but WITHOUT the newer B). The baseline-aware merge must keep
    // the LIVE value — the old `{ ...defaults, ...incoming }` merge would
    // revert the douleur score/history to A, reproducing the persistent-same-
    // score bug.
    await wrapper.setProps({ modelValue: JSON.parse(JSON.stringify(baselineEcho)) as CrhDiabeteFormData })
    await nextTick()
    await flushPromises()

    // KEY: the live NEWER values are preserved, not reverted.
    expect(formDataBilan(wrapper).scoreDouleur).toBe(9)
    expect(formDataBilan(wrapper).douleurHistory).toEqual([
      { _key: 'dB', date: '2026-01-02T10:00', score: 9 },
      { _key: 'dA', date: '2026-01-01T10:00', score: 7 },
    ])
  })

  it('CONTROL: a FRESH snapshot carrying a douleur value is still applied (legitimate incoming-update path not broken)', async () => {
    const wrapper = createCrFormWrapper()
    await flushPromises()

    // A real (non-echo) incoming snapshot — e.g. loaded from another editor or
    // a previous session — must still be applied normally.
    const freshSnapshot = JSON.parse(JSON.stringify(createDefaultFormData())) as CrhDiabeteFormData
    freshSnapshot.bilanInitial.scoreDouleur = 5
    freshSnapshot.bilanInitial.douleurHistory = [
      { _key: 'dC', date: '2026-01-03T10:00', score: 5 },
    ]
    await wrapper.setProps({ modelValue: freshSnapshot })
    await nextTick()
    await flushPromises()

    expect(formDataBilan(wrapper).scoreDouleur).toBe(5)
    expect(formDataBilan(wrapper).douleurHistory).toEqual([
      { _key: 'dC', date: '2026-01-03T10:00', score: 5 },
    ])
  })

  it('per-section echo guard: an out-of-order older bilanInitial echo does not clobber a newer score (cap-agnostic, deterministic)', async () => {
    // Mirrors the emittedSnapshots per-section behavior across MULTIPLE save
    // emissions: an older echo is still recognized as OUR OWN echo even after
    // a newer emission replaced `lastEmittedSnapshot`.
    const wrapper = createCrFormWrapper()
    await flushPromises()

    // Save 1 — douleur score 3.
    formDataBilan(wrapper).scoreDouleur = 3
    formDataBilan(wrapper).douleurHistory = [
      { _key: 'd1', date: '2026-01-01T10:00', score: 3 },
    ]
    await (wrapper.vm as any).handleSaveDraft()
    const olderEcho = lastEmittedSave(wrapper)

    // Save 2 — a different section changes, so bilanInitial keeps score 3 but
    // a different field (histoireRecent) advances, producing a NEW emission.
    formDataBilan(wrapper).histoireRecent = '<p>Nouveau texte</p>'
    await (wrapper.vm as any).handleSaveDraft()

    // Now the clinician enters a NEWER douleur score 6 in the live form.
    formDataBilan(wrapper).scoreDouleur = 6
    formDataBilan(wrapper).douleurHistory = [
      { _key: 'd2', date: '2026-01-04T10:00', score: 6 },
    ]

    // The parent round-trips the OLDER emission (score 3) — this is NOT the
    // latest emission, but it was still emitted by THIS form instance, so the
    // stale echo must not revert score 6 back to 3.
    await wrapper.setProps({ modelValue: JSON.parse(JSON.stringify(olderEcho)) as CrhDiabeteFormData })
    await nextTick()
    await flushPromises()

    expect(formDataBilan(wrapper).scoreDouleur).toBe(6)
    expect(formDataBilan(wrapper).douleurHistory).toEqual([
      { _key: 'd2', date: '2026-01-04T10:00', score: 6 },
    ])
  })
})
