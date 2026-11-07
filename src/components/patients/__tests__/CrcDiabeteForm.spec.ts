// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { formatDate } from '@/utils/date'
import type { PrescriptionSortie } from '@/types/crh-diabete'

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

const { mockCreateOrReplaceFromGroup, mockFindCrhGroupOrdonnance } = vi.hoisted(() => ({
  mockCreateOrReplaceFromGroup: vi.fn(),
  mockFindCrhGroupOrdonnance: vi.fn(),
}))

vi.mock('@/composables/useOrdonnanceLibre', () => ({
  useOrdonnanceLibre: () => ({
    createOrReplaceFromGroup: mockCreateOrReplaceFromGroup,
    findCrhGroupOrdonnance: mockFindCrhGroupOrdonnance,
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
  ElMessage: { success: vi.fn(), warning: vi.fn(), error: vi.fn(), info: vi.fn() },
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
  props: ['data', 'readonly', 'documentId'],
  emits: ['change'],
}

// Stub dédié et NOMÉ pour BilanInitialTab — émet open-history / open-multi-history
// (nouveau flux historique via <button class="history-th-btn"> dans les <th>).
const BilanInitialTabStub: any = {
  name: 'BilanInitialTab',
  template: '<div class="bilan-initial-stub" />',
  props: ['data', 'readonly', 'documentId'],
  emits: ['change', 'open-history', 'open-multi-history'],
}

// Stub dédié et NOMÉ pour OrdonnanceSortieTab. Nécessaire car VTU déduplique
// les stubs partageant la même définition (8 onglets → 1 seule instance via
// ChildTabStub) et n'hérite pas la clé du stub comme `name` : sans nom
// explicite, findComponent({ name: 'OrdonnanceSortieTab' }) ne matche rien.
const OrdonnanceSortieTabStub: any = {
  name: 'OrdonnanceSortieTab',
  template: '<div class="child-tab-stub" />',
  props: ['data', 'readonly', 'documentId'],
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
  BilanInitialTab: BilanInitialTabStub,
  ExamensComplementairesTab: ChildTabStub,
  EvolutionMedicaleTab: ChildTabStub,
  OrdonnanceSortieTab: OrdonnanceSortieTabStub,
  SortieTab: ChildTabStub,
  AnnexeTab: ChildTabStub,
  // DossierPatientHeader calls ipcInvoke('sites:list', …) on mount; stub it so
  // the open-history history tests can assert on mockIpcInvoke calls without
  // interference from the header's unrelated IPC fetch.
  DossierPatientHeader: {
    name: 'DossierPatientHeader',
    template: '<div class="dossier-patient-header-stub" />',
    props: ['contactDisplay', 'admission', 'prominent'],
  },
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
  ParameterMultiHistoryDialog: {
    template: `
      <div v-if="modelValue" class="parameter-multi-history-dialog-stub">
        <h4 class="pmhd-title">{{ title }}</h4>
        <ul class="pmhd-series">
          <li v-for="s in series" :key="s.path" class="pmhd-serie">
            {{ s.path }} — {{ s.entries.length }}
          </li>
        </ul>
      </div>
    `,
    props: ['modelValue', 'title', 'series', 'loading'],
    emits: ['update:modelValue'],
  },
}

// ─── Import component ──────────────────────────────────────────────

import CrcDiabeteForm from '../CrcDiabeteForm.vue'

// ─── Test suite ────────────────────────────────────────────────────

// ─── Form rendering (hideHeader prop) ──────────────────────────────

describe('CrcDiabeteForm – form rendering (hideHeader prop)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockActivePatient.value = null
  })

  function createWrapper(extraProps: Record<string, unknown> = {}) {
    return mount(CrcDiabeteForm, {
      props: {
        modelValue: {},
        readonly: false,
        contactId: '1',
        contactDisplay: 'Test Patient',
        ...extraProps,
      },
      global: {
        stubs: EL_STUBS,
      },
    })
  }

  it('renders the crc-form header by default (no hideHeader prop)', () => {
    const wrapper = createWrapper()
    expect(wrapper.find('.crc-form__header').exists()).toBe(true)
  })

  it('does NOT render the crc-form header when hideHeader is true', () => {
    const wrapper = createWrapper({ hideHeader: true })
    expect(wrapper.find('.crc-form__header').exists()).toBe(false)
  })

  it('forwards prominent to DossierPatientHeader and adds crc-form--fullpage when hideHeader is true', () => {
    const wrapper = createWrapper({ hideHeader: true })

    const header = wrapper.findComponent({ name: 'DossierPatientHeader' })
    expect(header.props('prominent')).toBe(true)
    expect(wrapper.find('.crc-form').classes()).toContain('crc-form--fullpage')
  })

  it('does NOT forward prominent and does NOT add crc-form--fullpage when hideHeader is absent', () => {
    const wrapper = createWrapper()

    const header = wrapper.findComponent({ name: 'DossierPatientHeader' })
    expect(header.props('prominent')).toBe(false)
    expect(wrapper.find('.crc-form').classes()).not.toContain('crc-form--fullpage')
  })
})

describe('CrcDiabeteForm – openParameterHistory (historique paramètre via open-history)', () => {
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

  function bilanTab() {
    return wrapper!.findComponent({ name: 'BilanInitialTab' })
  }

  function vitalsDoc(poids: unknown, overrides: Record<string, any> = {}): Record<string, any> {
    return {
      id: 'doc-1',
      documentTypeCode: 'CRC_DIABETE',
      documentTypeLabel: 'CRC Diabète',
      status: 'signed',
      formData: JSON.stringify({
        bilanInitial: {
          vitalSignsHistory: [{ _key: 'vs-1', date: '2025-03-15T10:30:00.000Z', poids }],
        },
      }),
      createdAt: '2025-03-15T10:30:00.000Z',
      ...overrides,
    }
  }

  it('opens the history dialog and calls IPC with patientId when BilanInitialTab emits open-history', async () => {
    mockActivePatient.value = { id: 9 }
    mockIpcInvoke.mockResolvedValue([vitalsDoc(72)])

    wrapper = createWrapper()
    await flushPromises()
    expect(bilanTab().exists()).toBe(true)

    bilanTab().vm.$emit('open-history', 'bilanInitial.examenPhysique.poids')
    await flushPromises()

    expect(mockIpcInvoke).toHaveBeenCalledWith('clinical-documents:list-by-patient', { patientId: 9 })

    const vm = wrapper.vm as any
    expect(vm.historyDialogOpen).toBe(true)
    expect(vm.historyDialogPath).toBe('bilanInitial.examenPhysique.poids')
    expect(vm.historyDialogTitle).toBe('Historique — Poids (kg)')
    expect(vm.historyLoading).toBe(false)

    // The entry is present — only possible if the component queried with the
    // CRC_DIABETE document-type codes (a CRH-only query would return nothing).
    expect(vm.historyEntries).toHaveLength(1)
    expect(vm.historyEntries[0]).toMatchObject({ documentId: 'doc-1', value: 72 })

    // The dialog is rendered with the title and the mocked IPC entries.
    const dialog = wrapper.find('.parameter-history-dialog-stub')
    expect(dialog.exists()).toBe(true)
    expect(dialog.find('.phd-title').text()).toContain('Historique — Poids (kg)')
    expect(dialog.text()).toContain('CRC Diabète')
  })

  it('filters entries by CRC_DIABETE documentType (CRH docs are ignored)', async () => {
    mockActivePatient.value = { id: 9 }
    mockIpcInvoke.mockResolvedValue([
      vitalsDoc(72, { id: 'kept-crc' }),
      vitalsDoc(90, {
        id: 'ignored-crh',
        documentTypeCode: 'CRH_DIABETE',
        documentTypeLabel: 'CRH Diabète',
      }),
    ])

    wrapper = createWrapper()
    await flushPromises()

    bilanTab().vm.$emit('open-history', 'bilanInitial.examenPhysique.poids')
    await flushPromises()

    const vm = wrapper.vm as any
    expect(vm.historyEntries).toHaveLength(1)
    expect(vm.historyEntries[0].documentId).toBe('kept-crc')
    expect(vm.historyEntries[0].value).toBe(72)
  })

  it('is a no-op for unknown paths (getParameterMeta guard)', async () => {
    mockActivePatient.value = { id: 9 }
    mockIpcInvoke.mockResolvedValue([])

    wrapper = createWrapper()
    await flushPromises()

    bilanTab().vm.$emit('open-history', 'path.inconnu.xyz')
    await flushPromises()

    const vm = wrapper.vm as any
    expect(vm.historyDialogOpen).toBe(false)
    expect(vm.historyDialogTitle).toBe('')
    expect(mockIpcInvoke).not.toHaveBeenCalled()
  })

  it('closes the dialog when the IPC history fetch fails', async () => {
    mockActivePatient.value = { id: 9 }
    mockIpcInvoke.mockRejectedValue(new Error('IPC failure'))

    wrapper = createWrapper()
    await flushPromises()

    bilanTab().vm.$emit('open-history', 'bilanInitial.examenPhysique.poids')
    await flushPromises()

    const vm = wrapper.vm as any
    // Regression: an IPC failure must not leave a misleading dialog open.
    expect(vm.historyDialogOpen).toBe(false)
  })
})

describe('CrcDiabeteForm – openMultiHistory (multi-courbes via open-multi-history)', () => {
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

  function bilanTab() {
    return wrapper!.findComponent({ name: 'BilanInitialTab' })
  }

  function douleurDoc(): Record<string, any> {
    return {
      id: 'doc-douleur',
      documentTypeCode: 'CRC_DIABETE',
      documentTypeLabel: 'CRC Diabète',
      status: 'draft',
      formData: JSON.stringify({
        bilanInitial: {
          douleurHistory: [{ _key: 'd-1', date: '2025-03-05T09:00:00.000Z', score: 6 }],
        },
      }),
      createdAt: '2025-03-05T09:00:00.000Z',
    }
  }

  it('opens the multi dialog with the CRC title and a single douleur série (1 seul IPC)', async () => {
    mockActivePatient.value = { id: 9 }
    mockIpcInvoke.mockResolvedValue([douleurDoc()])

    wrapper = createWrapper()
    await flushPromises()

    bilanTab().vm.$emit('open-multi-history', 'douleur')
    await flushPromises()

    expect(mockIpcInvoke).toHaveBeenCalledTimes(1)
    expect(mockIpcInvoke).toHaveBeenCalledWith('clinical-documents:list-by-patient', { patientId: 9 })

    const vm = wrapper.vm as any
    expect(vm.multiHistoryDialogOpen).toBe(true)
    // Titre CRC (vs « Historique CRH — … » côté CRH) — anti-confusion.
    expect(vm.multiHistoryTitle).toBe('Historique CRC — Douleur')
    expect(vm.multiHistoryLoading).toBe(false)
    expect(vm.multiHistorySeries).toHaveLength(1)
    expect(vm.multiHistorySeries[0].path).toBe('bilanInitial.scoreDouleur')
    expect(vm.multiHistorySeries[0].entries).toMatchObject([{ value: 6 }])

    const dialog = wrapper.find('.parameter-multi-history-dialog-stub')
    expect(dialog.exists()).toBe(true)
    expect(dialog.find('.pmhd-title').text()).toBe('Historique CRC — Douleur')
  })

  it('is a no-op for unknown groups (PARAMETER_GROUPS guard)', async () => {
    mockActivePatient.value = { id: 9 }
    mockIpcInvoke.mockResolvedValue([])

    wrapper = createWrapper()
    await flushPromises()

    bilanTab().vm.$emit('open-multi-history', 'groupe-inconnu')
    await flushPromises()

    const vm = wrapper.vm as any
    expect(vm.multiHistoryDialogOpen).toBe(false)
    expect(mockIpcInvoke).not.toHaveBeenCalled()
  })

  it('discards stale multi responses when another group is emitted meanwhile (anti-stale)', async () => {
    mockActivePatient.value = { id: 9 }
    let resolveFirst!: (value: unknown) => void
    mockIpcInvoke
      .mockImplementationOnce(() => new Promise(res => { resolveFirst = res }))
      .mockResolvedValueOnce([douleurDoc()])

    wrapper = createWrapper()
    await flushPromises()

    const vm = wrapper.vm as any

    bilanTab().vm.$emit('open-multi-history', 'vitals')
    await flushPromises()
    // vitals pending → second appel douleur résout aussitôt.
    bilanTab().vm.$emit('open-multi-history', 'douleur')
    await flushPromises()
    expect(vm.multiHistoryTitle).toBe('Historique CRC — Douleur')

    resolveFirst([douleurDoc()])
    await flushPromises()

    expect(vm.multiHistoryTitle).toBe('Historique CRC — Douleur')
    expect(vm.multiHistorySeries).toHaveLength(1)
  })
})

// ─── Re-signature (resigning prop) ───────────────────────────────

describe('CrcDiabeteForm – re-signature (resigning prop)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockConfirm.mockResolvedValue(true)
    mockActivePatient.value = null
  })

  function resigningWrapper() {
    return mount(CrcDiabeteForm, {
      props: {
        modelValue: {},
        readonly: false,
        resigning: true,
        contactId: '1',
        contactDisplay: 'Test Patient',
      },
      global: {
        stubs: EL_STUBS,
      },
    })
  }

  it('shows "Resigner" label on the sign button when resigning is true', async () => {
    const wrapper = resigningWrapper()
    await flushPromises()

    const signBtn = wrapper.findAll('.el-button').find(b => b.text().includes('Resigner'))
    expect(signBtn).toBeDefined()
  })

  it('asks confirmation warning the old signature will be overwritten and emits sign', async () => {
    const wrapper = resigningWrapper()
    await flushPromises()

    const signBtn = wrapper.findAll('.el-button').find(b => b.text().includes('Resigner'))
    await signBtn!.trigger('click')
    await flushPromises()

    expect(mockConfirm).toHaveBeenCalledWith(
      'Resigner ce document ? L\'ancienne signature sera écrasée.',
      'Re-signature',
      expect.objectContaining({ confirmButtonText: 'Resigner', type: 'warning' }),
    )
    expect(wrapper.emitted('sign')).toBeDefined()
  })

  it('does not emit sign when re-sign confirmation is cancelled', async () => {
    mockConfirm.mockRejectedValue(new Error('Cancel'))
    const wrapper = resigningWrapper()
    await flushPromises()

    const signBtn = wrapper.findAll('.el-button').find(b => b.text().includes('Resigner'))
    await signBtn!.trigger('click')
    await flushPromises()

    expect(wrapper.emitted('sign')).toBeUndefined()
  })
})

// ─── Migration évolutionMedicale → sortie (Feature A) ──────────────

describe('CrcDiabeteForm – migration évolutionMedicale → sortie', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockConfirm.mockResolvedValue(true)
    mockActivePatient.value = null
  })

  function createWrapper(modelValue: Record<string, any> = {}) {
    return mount(CrcDiabeteForm, {
      props: {
        modelValue,
        readonly: false,
        contactId: '1',
        contactDisplay: 'Test Patient',
      },
      global: {
        stubs: EL_STUBS,
      },
    })
  }

  it('carries evolutionMedicale.infoPatientFamille=true to sortie.infoPatientFamille and deletes the legacy key', async () => {
    const wrapper = createWrapper({
      evolutionMedicale: { infoPatientFamille: true },
    })
    await flushPromises()

    const vm = wrapper.vm as any
    expect(vm.formData.sortie.infoPatientFamille).toBe(true)
    expect(vm.formData.evolutionMedicale.infoPatientFamille).toBeUndefined()
  })

  it('does not override an existing sortie.infoPatientFamille', async () => {
    const wrapper = createWrapper({
      evolutionMedicale: { infoPatientFamille: true },
      sortie: { infoPatientFamille: false },
    })
    await flushPromises()

    const vm = wrapper.vm as any
    expect(vm.formData.sortie.infoPatientFamille).toBe(false)
    expect(vm.formData.evolutionMedicale.infoPatientFamille).toBeUndefined()
  })

  it('deletes legacy keys even when false', async () => {
    const wrapper = createWrapper({
      evolutionMedicale: { produitsSanguins: false, bmrBhre: false },
    })
    await flushPromises()

    const vm = wrapper.vm as any
    expect(vm.formData.evolutionMedicale.produitsSanguins).toBeUndefined()
    expect(vm.formData.evolutionMedicale.bmrBhre).toBeUndefined()
    expect(vm.formData.sortie.produitsSanguins).toBe(false)
    expect(vm.formData.sortie.bmrBhre).toBe(false)
  })

  it('leaves evolutionMedicale.journalEvolution untouched', async () => {
    const wrapper = createWrapper({
      evolutionMedicale: {
        infoPatientFamille: true,
        journalEvolution: [{ _key: 'x', content: '<p>Patient stable</p>', date: '', heure: '', user: '' }],
      },
    })
    await flushPromises()

    const vm = wrapper.vm as any
    expect(vm.formData.evolutionMedicale.journalEvolution).toEqual([
      { _key: 'x', content: '<p>Patient stable</p>', date: '', heure: '', user: '' },
    ])
    expect(vm.formData.sortie.infoPatientFamille).toBe(true)
  })

  it('defaults sortie.infoPatientFamille to true after merging empty data', async () => {
    const wrapper = createWrapper({})
    await flushPromises()

    const vm = wrapper.vm as any
    expect(vm.formData.sortie.infoPatientFamille).toBe(true)
    expect(vm.formData.sortie.produitsSanguins).toBe(false)
    expect(vm.formData.sortie.bmrBhre).toBe(false)
  })
})

describe('CrcDiabeteForm – onOrdonnanceGenerate (ordonnance par groupe)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockConfirm.mockResolvedValue(true)
    mockActivePatient.value = { id: 7 }
    mockCreateOrReplaceFromGroup.mockResolvedValue({ documentId: 'ord-1', replaced: false })
    mockFindCrhGroupOrdonnance.mockResolvedValue(null)
  })

  const rxMed = (): PrescriptionSortie => ({
    _key: 'k-med-1',
    medicament: 'Metformine 500 mg',
    dosage: '500',
    unite: 'mg',
    voie: 'VO',
    duree: 30,
    dureeType: 'longue',
    formeGalenique: 'Comprimé',
    momentPrises: ['Matin', 'Soir'],
    renouvellement: false,
    nbRenouvellements: 1,
    frequenceType: 'moments',
    frequence: ['Matin', 'Soir'],
    instructions: '',
  })
  const rxSoin = (): PrescriptionSortie => ({
    _key: 'k-soin-1',
    categorie: 'soins',
    medicament: 'Pansement quotidien',
    dosage: '',
    unite: '',
    voie: '',
    duree: 7,
    formeGalenique: '',
    momentPrises: [],
    renouvellement: false,
    nbRenouvellements: 1,
    frequenceType: 'moments',
    frequence: ['1/jour'],
    instructions: '',
  })

  function createWrapper(modelValue: Record<string, any> = {}) {
    return mount(CrcDiabeteForm, {
      props: {
        modelValue,
        readonly: false,
        contactId: '42',
        contactDisplay: 'Test Patient',
        documentId: 'doc-abc',
      },
      global: {
        stubs: EL_STUBS,
      },
    })
  }

  function genButtonTitle(): string {
    return `CRC - ${formatDate(new Date())}`
  }

  it('génère l\'ordonnance du groupe via createOrReplaceFromGroup (replaced:false → "générée")', async () => {
    const wrapper = createWrapper({ ordonnanceSortie: [rxMed(), rxSoin()] })
    await flushPromises()

    const vm = wrapper.vm as any
    await vm.onOrdonnanceGenerate('medicament')

    expect(mockCreateOrReplaceFromGroup).toHaveBeenCalledTimes(1)
    expect(mockCreateOrReplaceFromGroup).toHaveBeenCalledWith(
      expect.objectContaining({
        patientId: 7,
        contactId: '42',
        serviceId: null,
        siteId: null,
        createdBy: '1',
        title: genButtonTitle(),
        sourceDocumentId: 'doc-abc',
        categorie: 'medicament',
      }),
    )
    // Seuls les items du groupe "medicament" sont envoyés (le soin est exclu)
    const param = mockCreateOrReplaceFromGroup.mock.calls[0][0]
    expect(param.items).toHaveLength(1)
    expect(param.items[0]).toMatchObject({ _key: 'k-med-1', medicament: 'Metformine 500 mg' })

    expect(ElMessage.success).toHaveBeenCalledWith(`Ordonnance « ${genButtonTitle()} » générée.`)
    expect(ElMessage.success).toHaveBeenCalledWith('Retrouvez-la dans le menu Ordonnances du patient (hors document).')
  })

it('est câblé sur l\'événement generate du tab OrdonnanceSortie (via le stub)', async () => {
      const wrapper = createWrapper({ ordonnanceSortie: [rxMed()] })
      await flushPromises()

      // Le tab OrdonnanceSortie est stubé (ChildTabStub partagé par 8 onglets) ;
      // VTU nomme le stub d'après la clé du composant : { name: 'OrdonnanceSortieTab' }.
      const ordonnanceTab = wrapper.findComponent({ name: 'OrdonnanceSortieTab' })
      expect(ordonnanceTab.exists()).toBe(true)
      ordonnanceTab.vm.$emit('generate', 'medicament')
      await flushPromises()

      expect(mockCreateOrReplaceFromGroup).toHaveBeenCalledTimes(1)
      expect(mockCreateOrReplaceFromGroup.mock.calls[0][0].categorie).toBe('medicament')
    })

  it('affiche le message de remplacement quand replaced=true', async () => {
    mockCreateOrReplaceFromGroup.mockResolvedValue({ documentId: 'ord-1', replaced: true })
    const wrapper = createWrapper({ ordonnanceSortie: [rxMed()] })
    await flushPromises()

    await (wrapper.vm as any).onOrdonnanceGenerate('medicament')

    expect(ElMessage.info).toHaveBeenCalledWith(`L'ordonnance « ${genButtonTitle()} » existante a été remplacée.`)
    expect(ElMessage.success).toHaveBeenCalledWith('Retrouvez-la dans le menu Ordonnances du patient (hors document).')
  })

  it('affiche un warning et n\'appelle AUCUN IPC quand le groupe est vide', async () => {
    const wrapper = createWrapper({ ordonnanceSortie: [rxSoin()] })
    await flushPromises()

    await (wrapper.vm as any).onOrdonnanceGenerate('medicament')

    expect(ElMessage.warning).toHaveBeenCalledWith('Aucune prescription dans ce groupe')
    expect(mockCreateOrReplaceFromGroup).not.toHaveBeenCalled()
    expect(mockFindCrhGroupOrdonnance).not.toHaveBeenCalled()
  })

  it('demande confirmation quand une ordonnance du groupe existe déjà, puis génère', async () => {
    mockFindCrhGroupOrdonnance.mockResolvedValue({ id: 5, form_data: '{}' })
    const wrapper = createWrapper({ ordonnanceSortie: [rxSoin()] })
    await flushPromises()

    await (wrapper.vm as any).onOrdonnanceGenerate('soins')

    expect(mockFindCrhGroupOrdonnance).toHaveBeenCalledWith(7, 'doc-abc', 'soins')
    expect(mockConfirm).toHaveBeenCalledWith(
      'Une ordonnance existe déjà pour ce groupe (celle-ci sera remplacée). Continuer ?',
      'Remplacer l\'ordonnance',
      { type: 'warning' },
    )
    expect(mockCreateOrReplaceFromGroup).toHaveBeenCalledTimes(1)
  })

  it('n\'appelle PAS createOrReplaceFromGroup quand l\'utilisateur refuse la confirmation', async () => {
    mockFindCrhGroupOrdonnance.mockResolvedValue({ id: 5, form_data: '{}' })
    mockConfirm.mockRejectedValue(new Error('Cancel'))
    const wrapper = createWrapper({ ordonnanceSortie: [rxSoin()] })
    await flushPromises()

    await (wrapper.vm as any).onOrdonnanceGenerate('soins')

    expect(mockFindCrhGroupOrdonnance).toHaveBeenCalledWith(7, 'doc-abc', 'soins')
    expect(mockConfirm).toHaveBeenCalled()
    expect(mockCreateOrReplaceFromGroup).not.toHaveBeenCalled()
  })

  it('affiche un warning quand aucun patient n\'est actif', async () => {
    mockActivePatient.value = null
    const wrapper = createWrapper({ ordonnanceSortie: [rxMed()] })
    await flushPromises()

    await (wrapper.vm as any).onOrdonnanceGenerate('medicament')

    expect(ElMessage.warning).toHaveBeenCalledWith('Aucun patient actif')
    expect(mockCreateOrReplaceFromGroup).not.toHaveBeenCalled()
  })

  it('affiche une erreur quand createOrReplaceFromGroup rejette', async () => {
    mockCreateOrReplaceFromGroup.mockRejectedValue(new Error('IPC de secours KO'))
    const wrapper = createWrapper({ ordonnanceSortie: [rxMed()] })
    await flushPromises()

    await (wrapper.vm as any).onOrdonnanceGenerate('medicament')

    expect(ElMessage.error).toHaveBeenCalledWith('IPC de secours KO')
  })

  it('filtre les items du groupe "examen" (label et motif conservés)', async () => {
    const rxExamen = (): PrescriptionSortie => ({
      _key: 'k-ex-1',
      categorie: 'examen',
      examen: 'Scanner cérébral',
      motif: 'Céphalées',
      medicament: '',
      dosage: '',
      unite: '',
      voie: '',
      duree: 7,
      formeGalenique: '',
      momentPrises: [],
      renouvellement: false,
      nbRenouvellements: 1,
      frequenceType: 'moments',
      frequence: [],
      instructions: '',
    })
    const wrapper = createWrapper({ ordonnanceSortie: [rxMed(), rxExamen()] })
    await flushPromises()

    await (wrapper.vm as any).onOrdonnanceGenerate('examen')

    expect(mockCreateOrReplaceFromGroup).toHaveBeenCalledTimes(1)
    const param = mockCreateOrReplaceFromGroup.mock.calls[0][0]
    expect(param.categorie).toBe('examen')
    expect(param.items).toHaveLength(1)
    expect(param.items[0]).toMatchObject({ categorie: 'examen', examen: 'Scanner cérébral', motif: 'Céphalées' })
  })
})

describe('CrcDiabeteForm – onOrdonnanceGenerateItem (ordonnance individuelle)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockConfirm.mockResolvedValue(true)
    mockActivePatient.value = { id: 7 }
    mockCreateOrReplaceFromGroup.mockResolvedValue({ documentId: 'ord-1', replaced: false })
    mockFindCrhGroupOrdonnance.mockResolvedValue(null)
  })

  const rxAvis1 = (): PrescriptionSortie => ({
    _key: 'k-avis-1',
    categorie: 'avis',
    specialite: 'Cardiologue',
    motif: 'Bilan cardiaque',
    medicament: '',
    dosage: '',
    unite: '',
    voie: '',
    duree: 7,
    formeGalenique: '',
    momentPrises: [],
    renouvellement: false,
    nbRenouvellements: 1,
    frequenceType: 'moments',
    frequence: [],
    instructions: '',
  })
  const rxSoin1 = (): PrescriptionSortie => ({
    _key: 'k-soin-1',
    categorie: 'soins',
    medicament: 'Pansement quotidien',
    dosage: '',
    unite: '',
    voie: '',
    duree: 7,
    formeGalenique: '',
    momentPrises: [],
    renouvellement: false,
    nbRenouvellements: 1,
    frequenceType: 'moments',
    frequence: ['1/jour'],
    instructions: '',
  })

  function createWrapper(modelValue: Record<string, any> = {}) {
    return mount(CrcDiabeteForm, {
      props: {
        modelValue,
        readonly: false,
        contactId: '42',
        contactDisplay: 'Test Patient',
        documentId: 'doc-abc',
      },
      global: {
        stubs: EL_STUBS,
      },
    })
  }

  it('génère une ordonnance single-item avis (fingerprint + titre avec libellé)', async () => {
    const wrapper = createWrapper({ ordonnanceSortie: [rxAvis1(), rxSoin1()] })
    await flushPromises()

    await (wrapper.vm as any).onOrdonnanceGenerateItem('avis', 'k-avis-1')

    expect(mockCreateOrReplaceFromGroup).toHaveBeenCalledTimes(1)
    const param = mockCreateOrReplaceFromGroup.mock.calls[0][0]
    expect(param.categorie).toBe('avis')
    expect(param.items).toHaveLength(1)
    expect(param.sourceDocumentId).toBe('doc-abc:avis:k-avis-1')
    expect(param.title).toContain('Cardiologue')
    expect(param.title).toMatch(/^CRC - .* - \d{2}\/\d{2}\/\d{4}$/)
  })

  it('génère une ordonnance single-item soins via payload objet', async () => {
    const wrapper = createWrapper({ ordonnanceSortie: [rxAvis1(), rxSoin1()] })
    await flushPromises()

    await (wrapper.vm as any).onOrdonnanceGenerateItem({ categorie: 'soins', key: 'k-soin-1' })

    expect(mockCreateOrReplaceFromGroup).toHaveBeenCalledTimes(1)
    const param = mockCreateOrReplaceFromGroup.mock.calls[0][0]
    expect(param.sourceDocumentId).toBe('doc-abc:soins:k-soin-1')
    expect(param.title).toContain('Pansement quotidien')
  })

  it('le bouton de groupe reste inchangé (tous les items en même temps)', async () => {
    const wrapper = createWrapper({ ordonnanceSortie: [rxAvis1(), rxSoin1()] })
    await flushPromises()

    await (wrapper.vm as any).onOrdonnanceGenerate('avis')

    const param = mockCreateOrReplaceFromGroup.mock.calls[0][0]
    expect(param.sourceDocumentId).toBe('doc-abc')
    expect(param.items).toHaveLength(1)
  })

  it('est câblé sur l\'événement generate-item du tab OrdonnanceSortie', async () => {
    const wrapper = createWrapper({ ordonnanceSortie: [rxSoin1()] })
    await flushPromises()

    const ordonnanceTab = wrapper.findComponent({ name: 'OrdonnanceSortieTab' })
    expect(ordonnanceTab.exists()).toBe(true)
    ordonnanceTab.vm.$emit('generate-item', { categorie: 'soins', key: 'k-soin-1' })
    await flushPromises()

    expect(mockCreateOrReplaceFromGroup).toHaveBeenCalledTimes(1)
    expect(mockCreateOrReplaceFromGroup.mock.calls[0][0].sourceDocumentId).toBe('doc-abc:soins:k-soin-1')
  })
})
