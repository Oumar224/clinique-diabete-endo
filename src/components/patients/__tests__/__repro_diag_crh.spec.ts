// @vitest-environment jsdom
/** TEMP diagnostic: trace the commit path at CRH level. */
import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref, nextTick } from 'vue'
import { createDefaultFormData } from '@/types/crh-diabete'

vi.mock('@/composables/useAuth', () => ({ useAuth: () => ({ user: ref({ id: 1, nom: 'D', prenom: 'J', role: 'MEDECIN' }) }) }))
const mockActivePatient = ref(null)
vi.mock('@/composables/usePatientContext', () => ({ usePatientContext: () => ({ activePatient: mockActivePatient }) }))
vi.mock('@/composables/useEncounters', () => ({ useEncounters: () => ({ getEncounter: vi.fn().mockResolvedValue(null) }) }))
vi.mock('@/composables/useExport', () => ({ useExport: () => ({ exportCrhDiabetePdf: vi.fn() }) }))
vi.mock('@/composables/useMedicalStaff', () => ({ useMedicalStaff: () => ({ fetchMedicalStaff: vi.fn().mockResolvedValue([]) }), formatMedecinName: () => 'TEST' }))
vi.mock('@/composables/useCrhDiabeteCalculations', () => ({
  useCrhDiabeteCalculations: () => ({
    calcAge: vi.fn().mockReturnValue(45),
    calcGlasgowScore: vi.fn().mockReturnValue(15),
    glasgowInterpretation: vi.fn().mockReturnValue({ label: 'OK', type: 'success' }),
    calcIMC: vi.fn(() => null),
  }),
}))
vi.mock('@/composables/usePatients', () => ({ usePatients: () => ({ updatePatient: vi.fn() }) }))
vi.mock('@/composables/useVitalSigns', () => ({
  getVitalSignsItemsList: vi.fn().mockResolvedValue([]),
  saveVitalSignsItem: vi.fn().mockResolvedValue({}),
  deleteVitalSignsItem: vi.fn().mockResolvedValue(undefined),
}))
const mockIpcInvoke = vi.hoisted(() => vi.fn())
vi.mock('@/utils/ipc', () => ({ ipcInvoke: mockIpcInvoke }))

const mockEditor = { isActive: vi.fn().mockReturnValue(false), can: vi.fn().mockReturnValue({ undo: vi.fn().mockReturnValue(false), redo: vi.fn().mockReturnValue(false) }), chain: vi.fn().mockReturnValue({ focus: vi.fn().mockReturnThis(), run: vi.fn().mockReturnThis() }), getAttributes: vi.fn().mockReturnValue({}), setEditable: vi.fn(), getHTML: vi.fn(() => ''), commands: { setContent: vi.fn() }, destroy: vi.fn() }
vi.mock('@tiptap/vue-3', () => ({ useEditor: vi.fn(() => ref(mockEditor)), EditorContent: { template: '<div class="editor-content" />' } }))
vi.mock('@tiptap/starter-kit', () => ({ default: {} }))
vi.mock('@tiptap/extension-underline', () => ({ default: {} }))
vi.mock('element-plus', () => ({ ElMessage: { success: vi.fn(), warning: vi.fn(), error: vi.fn() }, ElMessageBox: { confirm: vi.fn().mockResolvedValue(true) } }))
vi.mock('@element-plus/icons-vue', () => ({ Plus: { render: () => null }, Minus: { render: () => null }, ArrowDown: { render: () => null }, Edit: { render: () => null }, Delete: { render: () => null }, Download: { render: () => null }, Printer: { render: () => null }, Close: { render: () => null }, ZoomIn: { render: () => null }, ZoomOut: { render: () => null } }))

import CrhDiabeteForm from '../CrhDiabeteForm.vue'
import BilanInitialTab from '../BilanInitialTab.vue'
import StagedCollapsibleSection from '@/components/common/StagedCollapsibleSection.vue'

const ChildTabStub = { template: '<div class="child-tab-stub" />', props: ['data', 'readonly'], emits: ['change'] }
const EL_STUBS: Record<string, any> = {
  'el-tabs': { template: '<div class="el-tabs"><slot /></div>' },
  'el-tab-pane': { template: '<div class="el-tab-pane"><slot /><slot name="label" /></div>', props: ['name', 'label'] },
  'el-tag': { template: '<span class="el-tag"><slot /></span>' },
  'el-button': { template: '<button class="el-button" :disabled="disabled" @click="$emit(\'click\', $event)"><slot /></button>', props: ['disabled'], emits: ['click'] },
  'el-alert': { template: '<div class="el-alert"><slot /></div>' },
  AdmissionTab: ChildTabStub, ModeVieAtcdTab: ChildTabStub, FicheDiabeteTab: ChildTabStub,
  ExamensComplementairesTab: ChildTabStub, EvolutionMedicaleTab: ChildTabStub,
  OrdonnanceSortieTab: ChildTabStub, SortieTab: ChildTabStub,
  ParameterHistoryDialog: { template: '<div />', props: ['modelValue'], emits: ['update:modelValue'] },
  HtmlPreviewDialog: { template: '<div />', props: ['open'] },
}

const RICH_HTML = '<p>Douleurs abdominales depuis 3 jours</p>'

describe('diagnostic', () => {
  it('trace commit path', async () => {
    const modelValue = createDefaultFormData()
    const wrapper = mount(CrhDiabeteForm, {
      props: { modelValue, readonly: false, contactId: '1', contactDisplay: 'T' },
      global: { stubs: { ...EL_STUBS, teleport: true } },
    })
    await flushPromises()

    const sections = wrapper.findAllComponents(StagedCollapsibleSection)
    const section = sections[0]
    console.log('DIAG section count:', sections.length)

    const header = section.find('.collapsible-section__header')
    console.log('DIAG header exists:', header.exists(), 'title text:', header.text().trim())
    await header.trigger('click')
    await nextTick()

    section.vm.draft.histoireRecent = RICH_HTML
    await nextTick()
    console.log('DIAG draft after set:', JSON.stringify(section.vm.draft.histoireRecent))
    console.log('DIAG dirty:', section.vm.dirty, 'open:', section.vm.open)

    const btns = section.findAll('.staged-section__footer button, .staged-section__footer el-button')
    console.log('DIAG footer buttons:', btns.map(b => b.text().trim()))
    const saveBtn = btns.find(b => b.text().trim() === 'Enregistrer')
    console.log('DIAG saveBtn found:', !!saveBtn, 'disabled:', saveBtn?.attributes('disabled'))

    // Direct call first (bypasses the button click path):
    console.log('DIAG call save() directly')
    ;(section.vm as any).save()
    await nextTick()
    console.log('DIAG after direct save, formData.bilanInitial.histoireRecent:', JSON.stringify((wrapper.vm as any).formData.bilanInitial.histoireRecent))

    // Reset and try the button path on a fresh draft
    await header.trigger('click')
    await nextTick()
    section.vm.draft.histoireRecent = RICH_HTML
    await nextTick()
    const saveBtn2 = section.findAll('.staged-section__footer button, .staged-section__footer el-button').find(b => b.text().trim() === 'Enregistrer')
    await saveBtn2!.trigger('click')
    await nextTick()
    console.log('DIAG after button click, formData.bilanInitial.histoireRecent:', JSON.stringify((wrapper.vm as any).formData.bilanInitial.histoireRecent))
    console.log('DIAG draftStatus:', (wrapper.vm as any).draftStatus)

    // What happened on the SECTION's modelValue (the tab's data prop)
    console.log('DIAG section modelValue.histoireRecent:', JSON.stringify((section.vm as any).modelValue?.histoireRecent))
    console.log('DIAG props.modelValue same as formData.bilanInitial?', JSON.stringify((wrapper.vm as any).formData.bilanInitial) === JSON.stringify(modelValue.bilanInitial))
    console.log('DIAG props.modelValue.bilanInitial.histoireRecent:', JSON.stringify(modelValue.bilanInitial.histoireRecent))
    console.log('DIAG formData.bilanInitial.histoireRecent:', JSON.stringify((wrapper.vm as any).formData.bilanInitial.histoireRecent))

    // Does the tab think the value is there?
    const tab = wrapper.findComponent(BilanInitialTab)
    console.log('DIAG tab props.data.histoireRecent:', JSON.stringify(tab.props('data').histoireRecent))
    console.log('DIAG same object formData.bilanInitial === tab data:', (wrapper.vm as any).formData.bilanInitial === tab.props('data'))

    const rows = wrapper.findAll('.form-preview__row')
    console.log('DIAG preview rows total:', rows.length, rows.map(r => r.text()))
    expect(true).toBe(true)
  })
})
