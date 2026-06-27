// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import PlanDistributionTab from '../PlanDistributionTab.vue'
import type { BlocHoraire } from '@/types/soins'

// ---------------------------------------------------------------------------
// Hoisted – mock functions that need to exist before vi.mock runs
// ---------------------------------------------------------------------------
const { mockValider, mockSuspendre } = vi.hoisted(() => ({
  mockValider: vi.fn(),
  mockSuspendre: vi.fn(),
}))

// ---------------------------------------------------------------------------
// Module mocks (hoisted by Vitest)
// ---------------------------------------------------------------------------
vi.mock('vue-router', () => ({
  useRoute: vi.fn(() => ({ params: { id: '42' } })),
}))

vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), warning: vi.fn(), info: vi.fn(), error: vi.fn() },
  ElMessageBox: { prompt: vi.fn(() => Promise.resolve({ value: 'Refus patient' })) },
}))

vi.mock('@element-plus/icons-vue', () => ({
  Clock: { render: () => {} },
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

// After mocks are set up, import the mocked function
import { usePlanSoins } from '@/composables/usePlanSoins'
const mockedUsePlanSoins = vi.mocked(usePlanSoins)

// ---------------------------------------------------------------------------
// Element Plus stub components
// ---------------------------------------------------------------------------
const stubs = {
  'el-card': {
    template: '<div class="el-card"><div class="el-card__header"><slot name="header" /></div><slot /></div>',
  },
  'el-tag': {
    template: '<span class="el-tag" :class="`el-tag--${type}`"><slot /></span>',
    props: ['type', 'effect', 'size'],
  },
  'el-button': {
    template: '<button class="el-button" :disabled="disabled" @click="$emit(\'click\', $event)"><slot /></button>',
    props: ['disabled', 'type', 'size', 'icon'],
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
}

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------
const DEFAULT_BLOCS: BlocHoraire[] = [
  {
    heure: '08h00',
    soins: [
      { id: 1, medicament: 'Insuline NOVORAPID', dosage: '10 UI', voie: 'SC', statut: 'en_attente' },
      { id: 2, medicament: 'Furosémide', dosage: '40 mg', voie: 'PO', statut: 'en_attente' },
    ],
  },
  {
    heure: '12h00',
    soins: [
      { id: 3, medicament: 'Metformine', dosage: '500 mg', voie: 'PO', statut: 'en_attente' },
      { id: 4, medicament: 'Insuline TOUJEO', dosage: '20 UI', voie: 'SC', statut: 'en_attente' },
    ],
  },
  {
    heure: '18h00',
    soins: [
      { id: 5, medicament: 'Furosémide', dosage: '40 mg', voie: 'PO', statut: 'valide', validePar: 'IDE Diallo', valideA: '18:10' },
    ],
  },
  {
    heure: '22h00',
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

// ---------------------------------------------------------------------------
// PlanDistributionTab
// ---------------------------------------------------------------------------
describe('PlanDistributionTab', () => {
  beforeEach(() => {
    mockValider.mockReset()
    mockSuspendre.mockReset()
    mockedUsePlanSoins.mockImplementation(() => createMockPlanSoins())
  })

  // -----------------------------------------------------------------------
  // Rendering – structure
  // -----------------------------------------------------------------------
  describe('rendering', () => {
    it('renders all time blocks as el-card elements', () => {
      const wrapper = mount(PlanDistributionTab, { global: { stubs } })
      expect(wrapper.findAll('.el-card').length).toBe(4)
    })

    it('renders the hour tag for each block', () => {
      const wrapper = mount(PlanDistributionTab, { global: { stubs } })
      const headers = wrapper.findAll('.el-card__header')
      expect(headers[0].text()).toContain('08h00')
      expect(headers[1].text()).toContain('12h00')
      expect(headers[2].text()).toContain('18h00')
      expect(headers[3].text()).toContain('22h00')
    })

    it('renders "médicament(s)" count per block', () => {
      const wrapper = mount(PlanDistributionTab, { global: { stubs } })
      const headers = wrapper.findAll('.el-card__header')
      expect(headers[0].text()).toContain('2 médicament(s)')
      expect(headers[1].text()).toContain('2 médicament(s)')
      expect(headers[2].text()).toContain('1 médicament(s)')
      expect(headers[3].text()).toContain('1 médicament(s)')
    })

    it('displays voie tags with correct text and voieColor mapping', () => {
      const wrapper = mount(PlanDistributionTab, { global: { stubs } })
      const tags = wrapper.findAll('.plan-card__voie-tag')
      expect(tags.length).toBe(6)
      expect(tags[0].classes()).toContain('el-tag--primary')
      expect(tags[0].text()).toBe('SC')
      expect(tags[1].classes()).toContain('el-tag--warning')
      expect(tags[1].text()).toBe('PO')
    })

    it('shows valide status with caregiver name and time', () => {
      const wrapper = mount(PlanDistributionTab, { global: { stubs } })
      expect(wrapper.text()).toContain('IDE Diallo')
      expect(wrapper.text()).toContain('18:10')
    })

    it('shows suspendu status tag', () => {
      const wrapper = mount(PlanDistributionTab, { global: { stubs } })
      expect(wrapper.text()).toContain('Suspendu')
    })

    it('shows en_attente soins with Valider and Suspendre buttons', () => {
      const wrapper = mount(PlanDistributionTab, { global: { stubs } })
      const validerBtns = wrapper.findAll('button.el-button').filter(b => b.text().trim() === 'Valider')
      const suspendreBtns = wrapper.findAll('button.el-button').filter(b => b.text().trim() === 'Suspendre')
      expect(validerBtns.length).toBe(4)
      expect(suspendreBtns.length).toBe(4)
    })
  })

  // -----------------------------------------------------------------------
  // Valider button disabled state
  // -----------------------------------------------------------------------
  describe('valider button disabled state', () => {
    it('disables Valider for insulin drugs when insulinBlocked is true', () => {
      mockedUsePlanSoins.mockImplementation(() => createMockPlanSoins({ insulinBlocked: true }))
      const wrapper = mount(PlanDistributionTab, { global: { stubs } })
      const validerBtns = wrapper.findAll('button.el-button').filter(b => b.text().trim() === 'Valider')
      expect(validerBtns[0].attributes('disabled')).toBeDefined()
      expect(validerBtns[1].attributes('disabled')).toBeUndefined()
    })

    it('enables Valider for insulin when insulinBlocked is false', () => {
      mockedUsePlanSoins.mockImplementation(() => createMockPlanSoins({ insulinBlocked: false }))
      const wrapper = mount(PlanDistributionTab, { global: { stubs } })
      const validerBtns = wrapper.findAll('button.el-button').filter(b => b.text().trim() === 'Valider')
      for (const btn of validerBtns) {
        expect(btn.attributes('disabled')).toBeUndefined()
      }
    })

    it('always enables Valider for non-insulin drugs even when insulinBlocked is true', () => {
      mockedUsePlanSoins.mockImplementation(() => createMockPlanSoins({ insulinBlocked: true }))
      const wrapper = mount(PlanDistributionTab, { global: { stubs } })
      const validerBtns = wrapper.findAll('button.el-button').filter(b => b.text().trim() === 'Valider')
      expect(validerBtns[1].attributes('disabled')).toBeUndefined()
    })
  })

  // -----------------------------------------------------------------------
  // Action delegation
  // -----------------------------------------------------------------------
  describe('action delegation', () => {
    it('calls valider when Valider button is clicked', async () => {
      const wrapper = mount(PlanDistributionTab, { global: { stubs } })
      const validerBtns = wrapper.findAll('button.el-button').filter(b => b.text().trim() === 'Valider')
      await validerBtns[0].trigger('click')
      expect(mockValider).toHaveBeenCalledTimes(1)
    })

    it('does not call valider when disabled button is clicked', async () => {
      mockedUsePlanSoins.mockImplementation(() => createMockPlanSoins({ insulinBlocked: true }))
      const wrapper = mount(PlanDistributionTab, { global: { stubs } })
      const validerBtns = wrapper.findAll('button.el-button').filter(b => b.text().trim() === 'Valider')
      await validerBtns[0].trigger('click')
      expect(mockValider).not.toHaveBeenCalled()
    })

    it('calls suspendre when Suspendre is clicked', async () => {
      const wrapper = mount(PlanDistributionTab, { global: { stubs } })
      const suspendreBtns = wrapper.findAll('button.el-button').filter(b => b.text().trim() === 'Suspendre')
      await suspendreBtns[0].trigger('click')
      expect(mockSuspendre).toHaveBeenCalledTimes(1)
    })
  })

  // -----------------------------------------------------------------------
  // Insulin warning banner
  // -----------------------------------------------------------------------
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

  // -----------------------------------------------------------------------
  // Error display
  // -----------------------------------------------------------------------
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

  // -----------------------------------------------------------------------
  // Empty state
  // -----------------------------------------------------------------------
  describe('empty state', () => {
    it('shows "Aucun soin" for empty blocks', () => {
      mockedUsePlanSoins.mockImplementation(() => createMockPlanSoins({
        blocs: [
          { heure: '08h00', soins: [] },
          { heure: '12h00', soins: [{ id: 3, medicament: 'Metformine', dosage: '500 mg', voie: 'PO', statut: 'en_attente' }] },
        ],
      }))
      const wrapper = mount(PlanDistributionTab, { global: { stubs } })
      expect(wrapper.text()).toContain('Aucun soin')
    })
  })

  // -----------------------------------------------------------------------
  // CSS class for suspendu cards
  // -----------------------------------------------------------------------
  describe('suspendu card styling', () => {
    it('applies plan-card--suspendu to suspended medication cards', () => {
      const wrapper = mount(PlanDistributionTab, { global: { stubs } })
      const cards = wrapper.findAll('.plan-card')
      const suspenduCard = cards.find(c => c.text().includes('Paracétamol'))
      expect(suspenduCard).toBeDefined()
      expect(suspenduCard!.classes()).toContain('plan-card--suspendu')
    })

    it('does not apply plan-card--suspendu to en_attente or valide cards', () => {
      const wrapper = mount(PlanDistributionTab, { global: { stubs } })
      const cards = wrapper.findAll('.plan-card')
      for (const card of cards) {
        if (!card.text().includes('Paracétamol')) {
          expect(card.classes()).not.toContain('plan-card--suspendu')
        }
      }
    })
  })
})
