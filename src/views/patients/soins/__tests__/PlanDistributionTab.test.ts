// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, nextTick } from 'vue'
import PlanDistributionTab from '../PlanDistributionTab.vue'
import type { BlocHoraire } from '@/types/soins'

const { mockValider, mockSuspendre, mockReprendreSoin, mockGetPlanSoins, mockCreatePrescription, mockUpdatePrescription, mockGetPrescription, mockSuspendrePrescription, mockReprendrePrescription } = vi.hoisted(() => ({
  mockValider: vi.fn(),
  mockSuspendre: vi.fn(),
  mockReprendreSoin: vi.fn(),
  mockGetPlanSoins: vi.fn(),
  mockCreatePrescription: vi.fn(),
  mockUpdatePrescription: vi.fn(),
  mockGetPrescription: vi.fn(),
  mockSuspendrePrescription: vi.fn(),
  mockReprendrePrescription: vi.fn(),
}))

function waitForData() {
  return new Promise(resolve => setTimeout(resolve, 0))
}

vi.mock('vue-router', () => ({
  useRoute: vi.fn(() => ({ params: { id: '42' } })),
}))

vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), warning: vi.fn(), info: vi.fn(), error: vi.fn() },
  ElMessageBox: { prompt: vi.fn(() => Promise.resolve({ value: 'Refus patient' })) },
}))

vi.mock('@element-plus/icons-vue', () => ({
  ArrowLeft: { render: () => {} },
  ArrowRight: { render: () => {} },
  Refresh: { render: () => {} },
  InfoFilled: { render: () => {} },
}))

vi.mock('@/api/planSoins', () => ({
  getPlanSoins: mockGetPlanSoins,
  reprendreSoin: mockReprendreSoin,
  suspendrePrescription: mockSuspendrePrescription,
  reprendrePrescription: mockReprendrePrescription,
}))

vi.mock('@/api/prescription', () => ({
  createPrescription: mockCreatePrescription,
  updatePrescription: mockUpdatePrescription,
  getPrescription: mockGetPrescription,
}))

vi.mock('@/composables/useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: { value: { id: 1, nom: 'Dr Test', prenom: 'Test', email: 'test@test.com', role: 'MEDECIN', service: 'Cardio' } },
  })),
}))

vi.mock('@/composables/usePlanSoins', () => {
  function voieColor(voie: string) {
    switch (voie) {
      case 'PO': return { type: 'warning' as const }
      case 'SC': return { type: 'primary' as const }
      case 'IV': return { type: 'info' as const }
      case 'IM': return { type: 'danger' as const }
      case 'SL': return { type: 'success' as const }
      default: return { type: 'success' as const }
    }
  }
  function isInsulin(medicament: string) {
    const drugs = ['Insuline', 'NOVORAPID', 'TOUJEO', 'LANTUS', 'APIDRA', 'HUMALOG', 'LEVEMIR']
    return drugs.some(d => medicament.toLowerCase().includes(d.toLowerCase()))
  }

  return {
    isInsulin,
    voieColor,
    usePlanSoins: vi.fn(() => ({
      blocs: ref([]),
      loading: ref(false),
      error: ref(null),
      insulinBlocked: ref(false),
      fetchPlan: vi.fn(),
      valider: mockValider,
      suspendre: mockSuspendre,
    })),
  }
})

import { usePlanSoins } from '@/composables/usePlanSoins'
const mockedUsePlanSoins = vi.mocked(usePlanSoins)

const stubs = {
  'el-tag': {
    template: '<span class="el-tag" :class="`el-tag--${type}`"><slot /></span>',
    props: ['type', 'effect', 'size'],
  },
  'el-button': {
    template: '<button class="el-button" :disabled="disabled" @click="$emit(\'click\', $event)"><slot /></button>',
    props: {
      disabled: Boolean,
      type: String,
      size: String,
      icon: String,
    },
    emits: ['click'],
  },
  'el-alert': {
    template: '<div class="el-alert" :class="`el-alert--${type}`">{{ title }}<slot /></div>',
    props: ['type', 'title', 'closable', 'showIcon'],
  },
  'el-empty': {
    template: '<div class="el-empty"><p class="el-empty__description">{{ description }}</p><slot /></div>',
    props: ['description', 'imageSize'],
  },
  'el-icon': {
    template: '<span class="el-icon"><slot /></span>',
  },
  'el-button-group': {
    template: '<div class="el-button-group"><slot /></div>',
  },
  'el-dialog': {
    template: '<div v-if="modelValue" class="el-dialog"><slot /><slot name="footer" /></div>',
    props: ['modelValue', 'title', 'width'],
    emits: ['update:modelValue'],
  },
  'el-form': {
    template: '<form class="el-form"><slot /></form>',
    props: ['model', 'rules', 'labelPosition'],
    methods: {
      validate() { return Promise.resolve(true) },
      clearValidate() {},
      resetFields() {},
    },
  },
  'el-form-item': {
    template: '<div class="el-form-item"><slot /></div>',
    props: ['label', 'prop', 'error'],
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
    template: '<select class="el-select" :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><slot /></select>',
    props: ['modelValue', 'filterable', 'allowCreate', 'style', 'placeholder'],
    emits: ['update:modelValue'],
  },
  'el-option': {
    template: '<option class="el-option" :value="value">{{ label }}</option>',
    props: ['value', 'label'],
  },
  'el-input': {
    template: '<input class="el-input" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" :placeholder="placeholder" />',
    props: ['modelValue', 'placeholder', 'type', 'rows'],
    emits: ['update:modelValue'],
  },
  'el-input-number': {
    template: '<input class="el-input-number" type="number" :value="modelValue" @input="$emit(\'update:modelValue\', Number($event.target.value))" :min="min" :max="max" />',
    props: ['modelValue', 'min', 'max', 'style'],
    emits: ['update:modelValue'],
  },
  'el-switch': {
    template: '<input class="el-switch" type="checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)" />',
    props: ['modelValue'],
    emits: ['update:modelValue'],
  },
  'el-checkbox-group': {
    template: '<div class="el-checkbox-group"><slot /></div>',
    props: ['modelValue'],
    emits: ['update:modelValue'],
  },
  'el-checkbox': {
    template: '<label class="el-checkbox"><input type="checkbox" :value="value" :checked="modelValue?.includes(value)" @change="onChange" />{{ label }}</label>',
    props: ['label', 'value', 'modelValue'],
    emits: ['update:modelValue'],
    methods: {
      onChange(this: any, e: Event) {
        const target = e.target as HTMLInputElement
        this.$emit('change', target.checked ? this.value : null)
      },
    },
  },
}

const DEFAULT_BLOCS: BlocHoraire[] = [
  {
    heure: '08h00',
    soins: [
      { id: 1, medicament: 'Insuline NOVORAPID', dosage: '10 UI', voie: 'SC', statut: 'en_attente' },
      { id: 2, medicament: 'Furosémide', dosage: '40 mg', voie: 'PO', statut: 'en_attente' },
    ],
  },
  {
    heure: '10h00',
    soins: [
      { id: 3, medicament: 'Metformine', dosage: '500 mg', voie: 'PO', statut: 'en_attente' },
      { id: 4, medicament: 'Insuline TOUJEO', dosage: '20 UI', voie: 'SC', statut: 'en_attente' },
    ],
  },
  {
    heure: '14h00',
    soins: [
      { id: 5, medicament: 'Furosémide', dosage: '40 mg', voie: 'PO', statut: 'valide', validePar: 'IDE Diallo', valideA: '18:10' },
    ],
  },
  {
    heure: '18h00',
    soins: [
      { id: 6, medicament: 'Paracétamol', dosage: '500 mg', voie: 'PO', statut: 'suspendu' },
    ],
  },
]

function createMockPlanSoins(overrides: Partial<{
  blocs: BlocHoraire[]
  loading: boolean
  error: string | null
  insulinBlocked: boolean
}> = {}) {
  const merged = { blocs: DEFAULT_BLOCS, loading: false, error: null as string | null, insulinBlocked: false, ...overrides }
  return {
    blocs: ref(merged.blocs),
    loading: ref(merged.loading),
    error: ref(merged.error),
    insulinBlocked: ref(merged.insulinBlocked),
    fetchPlan: vi.fn(),
    valider: mockValider,
    suspendre: mockSuspendre,
  }
}

describe('PlanDistributionTab', () => {
  beforeEach(() => {
    mockValider.mockReset()
    mockSuspendre.mockReset()
    mockReprendreSoin.mockReset()
    mockGetPlanSoins.mockReset()
    mockCreatePrescription.mockReset()
    mockUpdatePrescription.mockReset()
    mockGetPrescription.mockReset()
    mockSuspendrePrescription.mockReset()
    mockReprendrePrescription.mockReset()
    mockGetPlanSoins.mockResolvedValue({
      id: 1,
      patientId: 42,
      date: '2026-07-01',
      blocs: DEFAULT_BLOCS,
      createdBy: 1,
      createdAt: '',
      updatedAt: '',
    })
    mockedUsePlanSoins.mockImplementation(() => createMockPlanSoins())
  })

  describe('rendering', () => {
    it('renders 63 hour headers (7 days × 9 hours)', async () => {
      const wrapper = mount(PlanDistributionTab, { global: { stubs } })
      await waitForData()
      const hourHeaders = wrapper.findAll('.plan-distribution__hour-header')
      expect(hourHeaders.length).toBe(63)
    })

    it('renders 7 date headers with day names and dates', async () => {
      const wrapper = mount(PlanDistributionTab, { global: { stubs } })
      await waitForData()
      const dateHeaders = wrapper.findAll('.plan-distribution__date-header')
      expect(dateHeaders.length).toBe(7)
      dateHeaders.forEach(h => {
        expect(h.find('.plan-distribution__date-header-name').exists()).toBe(true)
        expect(h.find('.plan-distribution__date-header-date').exists()).toBe(true)
      })
    })

    it('renders medication voie text inside voie cells', async () => {
      const wrapper = mount(PlanDistributionTab, { global: { stubs } })
      await waitForData()
      const voieCells = wrapper.findAll('.plan-distribution__voie-cell')
      expect(voieCells.length).toBe(5)
      const voieTexts = voieCells.map(c => c.text())
      expect(voieTexts.filter(t => t.includes('SC')).length).toBeGreaterThan(0)
      expect(voieTexts.filter(t => t.includes('PO')).length).toBeGreaterThan(0)
    })

    it('shows valide status with caregiver name and time', async () => {
      const wrapper = mount(PlanDistributionTab, { global: { stubs } })
      await waitForData()
      expect(wrapper.text()).toContain('IDE Diallo')
      expect(wrapper.text()).toContain('18:10')
    })

    it('shows suspendu status text', async () => {
      const wrapper = mount(PlanDistributionTab, { global: { stubs } })
      await waitForData()
      expect(wrapper.text()).toContain('Suspendu')
    })

    it('shows en_attente soins with Valider and Suspendre buttons across all 7 days', async () => {
      const wrapper = mount(PlanDistributionTab, { global: { stubs } })
      await waitForData()
      const validerBtns = wrapper.findAll('button.el-button').filter(b => b.text().trim() === 'Valider')
      const suspendreBtns = wrapper.findAll('button.el-button').filter(b => b.text().trim() === 'Suspendre')
      expect(validerBtns.length).toBe(28)
      expect(suspendreBtns.length).toBe(28)
    })
  })

  describe('valider button disabled state', () => {
    it('disables Valider for insulin drugs when insulinBlocked is true', async () => {
      mockedUsePlanSoins.mockImplementation(() => createMockPlanSoins({ insulinBlocked: true }))
      const wrapper = mount(PlanDistributionTab, { global: { stubs } })
      await waitForData()
      const validerBtns = wrapper.findAll('button.el-button').filter(b => b.text().trim() === 'Valider')
      // Buttons grouped by medication row in DOM order:
      // [0-6] NOVORAPID (insulin), [7-13] Furosémide, [14-20] Metformine, [21-27] TOUJEO (insulin)
      expect((validerBtns[0].element as HTMLButtonElement).disabled).toBe(true)
      expect((validerBtns[7].element as HTMLButtonElement).disabled).toBe(false)
    })

    it('enables Valider for insulin when insulinBlocked is false', async () => {
      mockedUsePlanSoins.mockImplementation(() => createMockPlanSoins({ insulinBlocked: false }))
      const wrapper = mount(PlanDistributionTab, { global: { stubs } })
      await waitForData()
      const validerBtns = wrapper.findAll('button.el-button').filter(b => b.text().trim() === 'Valider')
      for (const btn of validerBtns) {
        expect((btn.element as HTMLButtonElement).disabled).toBe(false)
      }
    })

    it('always enables Valider for non-insulin drugs even when insulinBlocked is true', async () => {
      mockedUsePlanSoins.mockImplementation(() => createMockPlanSoins({ insulinBlocked: true }))
      const wrapper = mount(PlanDistributionTab, { global: { stubs } })
      await waitForData()
      const validerBtns = wrapper.findAll('button.el-button').filter(b => b.text().trim() === 'Valider')
      // Furosémide at day0 (index 7)
      expect((validerBtns[7].element as HTMLButtonElement).disabled).toBe(false)
    })
  })

  describe('action delegation', () => {
    it('calls valider when Valider button is clicked', async () => {
      const wrapper = mount(PlanDistributionTab, { global: { stubs } })
      await waitForData()
      const validerBtns = wrapper.findAll('button.el-button').filter(b => b.text().trim() === 'Valider')
      await validerBtns[0].trigger('click')
      expect(mockValider).toHaveBeenCalledTimes(1)
    })

    it('does not call valider when disabled button is clicked', async () => {
      mockedUsePlanSoins.mockImplementation(() => createMockPlanSoins({ insulinBlocked: true }))
      const wrapper = mount(PlanDistributionTab, { global: { stubs } })
      await waitForData()
      const validerBtns = wrapper.findAll('button.el-button').filter(b => b.text().trim() === 'Valider')
      await validerBtns[0].trigger('click')
      expect(mockValider).not.toHaveBeenCalled()
    })

    it('calls suspendre when Suspendre is clicked', async () => {
      const wrapper = mount(PlanDistributionTab, { global: { stubs } })
      await waitForData()
      const suspendreBtns = wrapper.findAll('button.el-button').filter(b => b.text().trim() === 'Suspendre')
      await suspendreBtns[0].trigger('click')
      expect(mockSuspendre).toHaveBeenCalledTimes(1)
    })
  })

  describe('reprendre button', () => {
    it('shows Reprendre button on suspended medication cards across all 7 days', async () => {
      const wrapper = mount(PlanDistributionTab, { global: { stubs } })
      await waitForData()
      const reprendreBtns = wrapper.findAll('button.el-button').filter(b => b.text().trim() === 'Reprendre')
      expect(reprendreBtns.length).toBe(7)
    })

    it('calls reprendreSoin API when Reprendre button is clicked', async () => {
      mockReprendreSoin.mockResolvedValue({
        id: 6, medicament: 'Paracétamol', dosage: '500 mg', voie: 'PO', statut: 'en_attente',
      })
      const wrapper = mount(PlanDistributionTab, { global: { stubs } })
      await waitForData()
      const reprendreBtns = wrapper.findAll('button.el-button').filter(b => b.text().trim() === 'Reprendre')
      await reprendreBtns[0].trigger('click')
      await waitForData()
      expect(mockReprendreSoin).toHaveBeenCalledTimes(1)
      expect(mockReprendreSoin).toHaveBeenCalledWith(6)
    })
  })

  describe('insulin warning banner', () => {
    it('shows the insulin alert when insulinBlocked is true', () => {
      mockedUsePlanSoins.mockImplementation(() => createMockPlanSoins({ insulinBlocked: true }))
      const wrapper = mount(PlanDistributionTab, { global: { stubs } })
      expect(wrapper.find('.el-alert').exists()).toBe(true)
      expect(wrapper.text()).toContain('glycémie')
    })

    it('hides the insulin alert when insulinBlocked is false', () => {
      mockedUsePlanSoins.mockImplementation(() => createMockPlanSoins({ insulinBlocked: false }))
      const wrapper = mount(PlanDistributionTab, { global: { stubs } })
      expect(wrapper.find('.el-alert').exists()).toBe(false)
    })
  })

  describe('error display', () => {
    it('shows error alert when error is set', () => {
      mockedUsePlanSoins.mockImplementation(() => createMockPlanSoins({ error: 'Erreur réseau' }))
      const wrapper = mount(PlanDistributionTab, { global: { stubs } })
      expect(wrapper.text()).toContain('Erreur réseau')
    })

    it('hides error alert when error is null', () => {
      mockedUsePlanSoins.mockImplementation(() => createMockPlanSoins({ error: null }))
      const wrapper = mount(PlanDistributionTab, { global: { stubs } })
      expect(wrapper.text()).not.toContain('Erreur')
    })
  })

  describe('empty state', () => {
    it('shows empty description when there are no blocs', async () => {
      mockGetPlanSoins.mockResolvedValue(null)
      const wrapper = mount(PlanDistributionTab, { global: { stubs } })
      await waitForData()
      expect(wrapper.text()).toContain('Aucun soin')
    })
  })

  describe('suspendu card styling', () => {
    it('applies plan-distribution__rdv--cancelled class to suspended medication cards across all 7 days', async () => {
      const wrapper = mount(PlanDistributionTab, { global: { stubs } })
      await waitForData()
      const cancelledCards = wrapper.findAll('.plan-distribution__rdv--cancelled')
      expect(cancelledCards.length).toBe(7)
      cancelledCards.forEach(c => {
        expect(c.text()).toContain('⛔')
      })
    })

    it('does not apply plan-distribution__rdv--cancelled to en_attente or valide cards', async () => {
      const wrapper = mount(PlanDistributionTab, { global: { stubs } })
      await waitForData()
      const allCards = wrapper.findAll('.plan-distribution__rdv')
      const nonCancelled = allCards.filter(c => !c.classes().includes('plan-distribution__rdv--cancelled'))
      expect(nonCancelled.length).toBe(allCards.length - 7)
    })
  })

  describe('week navigation', () => {
    it('renders week navigation with prev/next buttons', () => {
      const wrapper = mount(PlanDistributionTab, { global: { stubs } })
      const groups = wrapper.findAll('.el-button-group')
      expect(groups.length).toBe(1)
      const buttons = groups[0].findAll('button.el-button')
      expect(buttons.length).toBe(3)
    })
  })

  describe('prescription dialog — unite field', () => {
    it('renders unite select with options in the prescription dialog', async () => {
      const wrapper = mount(PlanDistributionTab, { global: { stubs } })
      await waitForData()

      const prescrireBtn = wrapper.findAll('button.el-button').find(b => b.text().trim() === '+ Prescrire')
      await prescrireBtn!.trigger('click')
      await nextTick()

      const dialog = wrapper.find('.el-dialog')
      expect(dialog.exists()).toBe(true)
      expect(dialog.text()).toContain('cp')
      expect(dialog.text()).toContain('UI')
      expect(dialog.text()).toContain('mg')
      expect(dialog.text()).toContain('mL')
    })

    it('combines dosage and unite on create', async () => {
      mockCreatePrescription.mockResolvedValue({ itemsGenerated: 3 })

      const wrapper = mount(PlanDistributionTab, { global: { stubs } })
      await waitForData()

      const prescrireBtn = wrapper.findAll('button.el-button').find(b => b.text().trim() === '+ Prescrire')
      await prescrireBtn!.trigger('click')
      await nextTick()

      const dialog = wrapper.find('.el-dialog')
      const selects = dialog.findAll('select.el-select')

      await selects[0].setValue('Paracétamol')
      await selects[1].setValue('mg')
      await selects[2].setValue('PO')

      const inputs = dialog.findAll('input.el-input')
      await inputs[0].setValue('500')

      await nextTick()

      const submitBtn = dialog.findAll('button.el-button').find(b => b.text().trim() === 'Prescrire')
      await submitBtn!.trigger('click')
      await waitForData()

      expect(mockCreatePrescription).toHaveBeenCalled()
      const callArgs = mockCreatePrescription.mock.calls[0][1]
      expect(callArgs.dosage).toBe('500 mg')
    })

    it('parses dosage and pre-fills unite on edit', async () => {
      const mockPrescription = {
        id: 1,
        patientId: 42,
        medicament: 'Insuline NOVORAPID',
        dosage: '10 UI',
        voie: 'SC',
        duree: 30,
        frequence: ['Matin', 'Soir'],
        prn: false,
        instructions: '',
        datePrescription: '04/07/2026',
        prescripteurId: 1,
        prescripteurNom: 'Dr Test',
        prescripteurRole: 'MEDECIN',
        statut: 'active',
        createdAt: '2026-07-04T10:00:00.000Z',
        updatedAt: '2026-07-04T10:00:00.000Z',
      }
      mockGetPrescription.mockResolvedValue(mockPrescription)
      mockUpdatePrescription.mockResolvedValue({ itemsGenerated: 1 })

      mockGetPlanSoins.mockResolvedValue({
        id: 1,
        patientId: 42,
        date: '2026-07-01',
        blocs: [{
          heure: '08h00',
          soins: [
            { id: 1, medicament: 'Insuline NOVORAPID', dosage: '10 UI', voie: 'SC', statut: 'en_attente', prescriptionId: 1 },
          ],
        }],
        createdBy: 1,
        createdAt: '',
        updatedAt: '',
      })

      const wrapper = mount(PlanDistributionTab, { global: { stubs } })
      await waitForData()

      const rxBadges = wrapper.findAll('.plan-distribution__rx-badge')
      await rxBadges[0].trigger('click')
      await waitForData()
      await nextTick()

      const dialog = wrapper.find('.el-dialog')
      expect(dialog.exists()).toBe(true)
      expect(dialog.text()).toContain('Enregistrer')

      const inputs = dialog.findAll('input.el-input')
      expect((inputs[0].element as HTMLInputElement).value).toBe('10')
    })

    it('sends combined dosage on edit submit', async () => {
      const mockPrescription = {
        id: 1,
        patientId: 42,
        medicament: 'Furosémide',
        dosage: '40 mg',
        voie: 'PO',
        duree: 30,
        frequence: ['Matin', 'Midi', 'Soir'],
        prn: false,
        instructions: '',
        datePrescription: '04/07/2026',
        prescripteurId: 1,
        prescripteurNom: 'Dr Test',
        prescripteurRole: 'MEDECIN',
        statut: 'active',
        createdAt: '2026-07-04T10:00:00.000Z',
        updatedAt: '2026-07-04T10:00:00.000Z',
      }
      mockGetPrescription.mockResolvedValue(mockPrescription)
      mockUpdatePrescription.mockResolvedValue({ itemsGenerated: 1 })

      mockGetPlanSoins.mockResolvedValue({
        id: 1,
        patientId: 42,
        date: '2026-07-01',
        blocs: [{
          heure: '08h00',
          soins: [
            { id: 1, medicament: 'Furosémide', dosage: '40 mg', voie: 'PO', statut: 'en_attente', prescriptionId: 1 },
          ],
        }],
        createdBy: 1,
        createdAt: '',
        updatedAt: '',
      })

      const wrapper = mount(PlanDistributionTab, { global: { stubs } })
      await waitForData()

      const rxBadges = wrapper.findAll('.plan-distribution__rx-badge')
      await rxBadges[0].trigger('click')
      await waitForData()
      await nextTick()

      const dialog = wrapper.find('.el-dialog')

      const inputs = dialog.findAll('input.el-input')
      await inputs[0].setValue('80')

      await nextTick()

      const submitBtn = dialog.findAll('button.el-button').find(b => b.text().trim() === 'Enregistrer')
      await submitBtn!.trigger('click')
      await waitForData()

      expect(mockUpdatePrescription).toHaveBeenCalled()
      const callArgs = mockUpdatePrescription.mock.calls[0][1]
      expect(callArgs.dosage).toBe('80 mg')
    })
  })

  describe('prescription-level suspend resume', () => {
    const ACTIVE_RX_BLOCS: BlocHoraire[] = [
      {
        heure: '08h00',
        soins: [
          { id: 1, medicament: 'Insuline NOVORAPID', dosage: '10 UI', voie: 'SC', statut: 'en_attente', prescriptionId: 1 },
        ],
      },
    ]

    const SUSPENDED_RX_BLOCS: BlocHoraire[] = [
      {
        heure: '08h00',
        soins: [
          { id: 2, medicament: 'Insuline NOVORAPID', dosage: '10 UI', voie: 'SC', statut: 'suspendu', prescriptionId: 1 },
        ],
      },
    ]

    it('shows pause icon for active prescription', async () => {
      mockGetPlanSoins.mockResolvedValue({
        id: 1,
        patientId: 42,
        date: '2026-07-01',
        blocs: ACTIVE_RX_BLOCS,
        createdBy: 1,
        createdAt: '',
        updatedAt: '',
      })
      const wrapper = mount(PlanDistributionTab, { global: { stubs } })
      await waitForData()

      const action = wrapper.find('.plan-distribution__prescription-action')
      expect(action.exists()).toBe(true)
      expect(action.classes()).toContain('plan-distribution__prescription-action--pause')
      expect(action.text()).toBe('‖')
      expect(action.attributes('title')).toBe('Suspendre toute la prescription')
    })

    it('shows play icon for fully suspended prescription', async () => {
      mockGetPlanSoins.mockResolvedValue({
        id: 1,
        patientId: 42,
        date: '2026-07-01',
        blocs: SUSPENDED_RX_BLOCS,
        createdBy: 1,
        createdAt: '',
        updatedAt: '',
      })
      const wrapper = mount(PlanDistributionTab, { global: { stubs } })
      await waitForData()

      const action = wrapper.find('.plan-distribution__prescription-action')
      expect(action.exists()).toBe(true)
      expect(action.classes()).toContain('plan-distribution__prescription-action--play')
      expect(action.text()).toBe('▶')
      expect(action.attributes('title')).toBe('Reprendre toute la prescription')
    })

    it('calls suspendrePrescription when pause icon is clicked on active prescription', async () => {
      mockSuspendrePrescription.mockResolvedValue([
        { id: 1, medicament: 'Insuline NOVORAPID', dosage: '10 UI', voie: 'SC', statut: 'suspendu', prescriptionId: 1 },
      ])
      mockGetPlanSoins.mockResolvedValue({
        id: 1,
        patientId: 42,
        date: '2026-07-01',
        blocs: ACTIVE_RX_BLOCS,
        createdBy: 1,
        createdAt: '',
        updatedAt: '',
      })
      const wrapper = mount(PlanDistributionTab, { global: { stubs } })
      await waitForData()

      const action = wrapper.find('.plan-distribution__prescription-action')
      await action.trigger('click')
      await waitForData()

      expect(mockSuspendrePrescription).toHaveBeenCalledTimes(1)
      expect(mockSuspendrePrescription).toHaveBeenCalledWith(1, 'Refus patient')
    })

    it('calls reprendrePrescription when play icon is clicked on suspended prescription', async () => {
      mockReprendrePrescription.mockResolvedValue([
        { id: 2, medicament: 'Insuline NOVORAPID', dosage: '10 UI', voie: 'SC', statut: 'en_attente', prescriptionId: 1 },
      ])
      mockGetPlanSoins.mockResolvedValue({
        id: 1,
        patientId: 42,
        date: '2026-07-01',
        blocs: SUSPENDED_RX_BLOCS,
        createdBy: 1,
        createdAt: '',
        updatedAt: '',
      })
      const wrapper = mount(PlanDistributionTab, { global: { stubs } })
      await waitForData()

      const action = wrapper.find('.plan-distribution__prescription-action')
      await action.trigger('click')
      await waitForData()

      expect(mockReprendrePrescription).toHaveBeenCalledTimes(1)
      expect(mockReprendrePrescription).toHaveBeenCalledWith(1)
    })

    it('does not show action icon when row has no prescriptionId', async () => {
      mockGetPlanSoins.mockResolvedValue({
        id: 1,
        patientId: 42,
        date: '2026-07-01',
        blocs: DEFAULT_BLOCS,
        createdBy: 1,
        createdAt: '',
        updatedAt: '',
      })
      const wrapper = mount(PlanDistributionTab, { global: { stubs } })
      await waitForData()

      const action = wrapper.find('.plan-distribution__prescription-action')
      expect(action.exists()).toBe(false)
    })
  })
})
