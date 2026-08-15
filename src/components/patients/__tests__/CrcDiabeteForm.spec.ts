// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'

// ─── Mock composables ──────────────────────────────────────────────

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
    exportCrcDiabetePdf: vi.fn().mockResolvedValue(undefined),
  }),
}))

vi.mock('@/composables/useMedicalStaff', () => ({
  useMedicalStaff: () => ({
    fetchMedicalStaff: vi.fn().mockResolvedValue([]),
  }),
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
  }),
}))

vi.mock('@/composables/usePatients', () => ({
  usePatients: () => ({
    updatePatient: vi.fn().mockResolvedValue(undefined),
  }),
}))

const mockIpcInvoke = vi.hoisted(() => vi.fn())

vi.mock('@/utils/ipc', () => ({
  ipcInvoke: mockIpcInvoke,
}))

// ─── Mock Element Plus ─────────────────────────────────────────────

const { mockConfirm } = vi.hoisted(() => ({
  mockConfirm: vi.fn(),
}))
vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), warning: vi.fn(), error: vi.fn() },
  ElMessageBox: { confirm: mockConfirm },
}))

// ─── Mock @element-plus/icons-vue (imported by HtmlPreviewDialog) ──

vi.mock('@element-plus/icons-vue', () => ({
  Plus: { name: 'Plus', render: () => null },
  Edit: { name: 'Edit', render: () => null },
  Delete: { name: 'Delete', render: () => null },
  Download: { name: 'Download', render: () => null },
  Printer: { name: 'Printer', render: () => null },
  Close: { name: 'Close', render: () => null },
  ZoomIn: { name: 'ZoomIn', render: () => null },
  ZoomOut: { name: 'ZoomOut', render: () => null },
}))

// ─── Child component stubs ─────────────────────────────────────────

const ChildTabStub = {
  template: '<div class="child-tab-stub" />',
  props: ['data', 'readonly'],
  emits: ['change'],
}

const EL_STUBS: Record<string, any> = {
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
  AdmissionTab: ChildTabStub,
  ModeVieAtcdTab: ChildTabStub,
  FicheDiabeteTab: ChildTabStub,
  BilanInitialTab: ChildTabStub,
  ExamensComplementairesTab: ChildTabStub,
  EvolutionMedicaleTab: ChildTabStub,
  OrdonnanceSortieTab: ChildTabStub,
  SortieTab: ChildTabStub,
  ParameterHistoryDialog: {
    // Renders the dialog payload when open so the form tests can assert the
    // title and the entries fetched via IPC (the real dialog is stubbed).
    template: `
      <div v-if="modelValue" class="parameter-history-dialog-stub">
        <h4 class="phd-title">{{ title }}</h4>
        <ul class="phd-entries">
          <li v-for="entry in entries" :key="entry.documentId" class="phd-entry">
            {{ entry.documentLabel }} — {{ entry.value }}
          </li>
        </ul>
      </div>
    `,
    props: ['modelValue', 'title', 'path', 'loading', 'entries'],
    emits: ['update:modelValue'],
  },
}

// ─── Import component ──────────────────────────────────────────────

import CrcDiabeteForm from '../CrcDiabeteForm.vue'

// ─── Test suite ────────────────────────────────────────────────────

describe('CrcDiabeteForm – onFormCellClick (historique paramètre)', () => {
  let wrapper: ReturnType<typeof createWrapper> | undefined

  beforeEach(() => {
    vi.clearAllMocks()
    mockIpcInvoke.mockReset()
    mockConfirm.mockResolvedValue(true)
    mockActivePatient.value = null
  })

  afterEach(() => {
    wrapper?.unmount()
    document.body.innerHTML = ''
  })

  function createWrapper() {
    return mount(CrcDiabeteForm, {
      props: {
        modelValue: {},
        readonly: false,
        contactId: '1',
        contactDisplay: 'Test Patient',
      },
      global: {
        stubs: EL_STUBS,
      },
    })
  }

  /** Creates a tracked-field cell the user could click (background/label). */
  function makeCell(path: string): HTMLDivElement {
    const cell = document.createElement('div')
    cell.className = 'history-cell'
    cell.setAttribute('data-history-path', path)
    return cell
  }

  /** Dispatches a bubbling click; the root div's @click handler receives it. */
  function clickOn(el: Element): void {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  }

  function crcDoc(overrides: Record<string, any> = {}): Record<string, any> {
    return {
      id: 'doc-1',
      documentTypeCode: 'CRC_DIABETE',
      documentTypeLabel: 'CRC Diabète',
      status: 'signed',
      formData: JSON.stringify({ modeVieAtcd: { isolement: true } }),
      createdAt: '2025-03-15T10:30:00.000Z',
      ...overrides,
    }
  }

  it('opens the history dialog and calls IPC with patientId when clicking a tracked field cell', async () => {
    mockActivePatient.value = { id: 9 }
    mockIpcInvoke.mockResolvedValue([crcDoc()])

    wrapper = createWrapper()
    await flushPromises()

    const cell = makeCell('modeVieAtcd.isolement')
    wrapper.element.appendChild(cell)
    clickOn(cell)
    await flushPromises()

    expect(mockIpcInvoke).toHaveBeenCalledWith('clinical-documents:list-by-patient', { patientId: 9 })

    const vm = wrapper.vm as any
    expect(vm.historyDialogOpen).toBe(true)
    expect(vm.historyDialogTitle).toBe('Historique — Isolement')

    // The entry is present — only possible if the component queried with the
    // CRC_DIABETE document-type codes (a CRH-only query would return nothing).
    expect(vm.historyEntries).toHaveLength(1)
    expect(vm.historyEntries[0]).toMatchObject({ documentId: 'doc-1', value: true })

    // The dialog is rendered with the title and the mocked IPC entries.
    const dialog = wrapper.find('.parameter-history-dialog-stub')
    expect(dialog.exists()).toBe(true)
    expect(dialog.find('.phd-title').text()).toContain('Historique — ')
    expect(dialog.text()).toContain('CRC Diabète')
  })

  it('does NOT open the history dialog when clicking inside an interactive control', async () => {
    mockActivePatient.value = { id: 9 }

    wrapper = createWrapper()
    await flushPromises()

    const cell = makeCell('modeVieAtcd.isolement')
    cell.innerHTML = '<input class="inner-input" type="text" />'
    wrapper.element.appendChild(cell)
    clickOn(cell.querySelector('input')!)

    const vm = wrapper.vm as any
    expect(vm.historyDialogOpen).toBe(false)
    expect(mockIpcInvoke).not.toHaveBeenCalled()
  })

  it('closes the dialog when the IPC history fetch fails', async () => {
    mockActivePatient.value = { id: 9 }
    mockIpcInvoke.mockRejectedValue(new Error('IPC failure'))

    wrapper = createWrapper()
    await flushPromises()

    const cell = makeCell('modeVieAtcd.isolement')
    wrapper.element.appendChild(cell)
    clickOn(cell)
    await flushPromises()

    const vm = wrapper.vm as any
    // Regression: an IPC failure must not leave a misleading dialog open.
    expect(vm.historyDialogOpen).toBe(false)
  })
})
