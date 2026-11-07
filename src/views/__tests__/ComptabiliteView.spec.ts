// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import ComptabiliteView from '../ComptabiliteView.vue'

const { mockIpcInvoke, userRef } = vi.hoisted(() => ({
  mockIpcInvoke: vi.fn(),
  userRef: { value: null as { role?: string } | null },
}))

vi.mock('@/utils/ipc', () => ({
  ipcInvoke: mockIpcInvoke,
}))

vi.mock('@/composables/useAuth', () => ({
  useAuth: () => ({ user: userRef }),
}))

vi.mock('@/currency/useCurrency', () => ({
  useCurrency: () => ({
    formatCurrency: (value: number) => `${value} GNF`,
    loadCurrency: vi.fn().mockResolvedValue(undefined),
  }),
}))

vi.mock('@/components/comptabilite/FacturesTab.vue', () => ({
  default: { name: 'FacturesTab', template: '<div data-test="factures-tab" />' },
}))
vi.mock('@/components/comptabilite/SalairesTab.vue', () => ({
  default: { name: 'SalairesTab', template: '<div data-test="salaires-tab" />' },
}))
vi.mock('@/components/comptabilite/DepensesTab.vue', () => ({
  default: { name: 'DepensesTab', template: '<div data-test="depenses-tab" />' },
}))
vi.mock('@/components/comptabilite/ApportsTab.vue', () => ({
  default: { name: 'ApportsTab', template: '<div data-test="apports-tab" />', emits: ['changed'] },
}))
vi.mock('@/components/comptabilite/PharmacieComptabiliteTab.vue', () => ({
  default: { name: 'PharmacieComptabiliteTab', template: '<div data-test="pharmacie-tab" />' },
}))

const stubs = {
  'el-tabs': {
    template: '<div class="el-tabs"><slot /></div>',
    props: ['modelValue'],
    emits: ['update:modelValue'],
  },
  'el-tab-pane': {
    template: '<section class="el-tab-pane" :data-name="name"><span class="tab-label">{{ label }}</span><slot /></section>',
    props: ['label', 'name', 'lazy'],
  },
  'el-date-picker': {
    template: '<input class="el-date-picker" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'type', 'valueFormat', 'clearable'],
    emits: ['update:modelValue', 'change'],
  },
  'el-alert': {
    template: '<div class="el-alert" :data-title="title">{{ title }}<slot /></div>',
    props: ['title', 'type', 'closable', 'showIcon'],
  },
  'el-button': {
    template: '<button class="el-button" @click="$emit(\'click\', $event)"><slot /></button>',
    props: ['type', 'text', 'size', 'loading'],
    emits: ['click'],
  },
}

function mountView() {
  return mount(ComptabiliteView, {
    global: {
      stubs,
      directives: { loading: {} },
    },
  })
}

describe('ComptabiliteView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    userRef.value = { role: 'COMPTABLE' }
    mockIpcInvoke.mockImplementation((channel: string) => {
      if (channel === 'caisse:synthese') {
        return Promise.resolve({ entrees: 100000, sorties: 40000, solde: 60000, count: 3 })
      }
      if (channel === 'dispensation:synthese-comptable') {
        return Promise.resolve({ creances: 25000 })
      }
      if (channel === 'depense:synthese') {
        return Promise.resolve({ total: 80000, totalPaye: 65000, totalCredit: 15000, count: 5 })
      }
      return Promise.resolve(null)
    })
  })

  it('affiche la synthèse, les onglets et la période mensuelle pour ADMIN/COMPTABLE', async () => {
    const wrapper = mountView()
    await flushPromises()
    await flushPromises()

    const values = wrapper.findAll('.summary-card__value').map((node) => node.text())
    expect(values).toEqual(['60000 GNF', '100000 GNF', '25000 GNF', '15000 GNF'])

    const labels = wrapper.findAll('.tab-label').map((node) => node.text())
    expect(labels).toEqual(['Factures', 'Salaires', 'Dépenses', 'Apports', 'Pharmacie'])
    expect(wrapper.find('[data-test="factures-tab"]').exists()).toBe(true)

    expect(mockIpcInvoke).toHaveBeenCalledWith(
      'caisse:synthese',
      expect.objectContaining({
        dateDebut: expect.stringMatching(/^\d{4}-\d{2}-01$/),
        dateFin: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      }),
      { silent: true },
    )
    expect(mockIpcInvoke).toHaveBeenCalledWith(
      'dispensation:synthese-comptable',
      expect.any(Object),
      { silent: true },
    )
    expect(mockIpcInvoke).toHaveBeenCalledWith(
      'depense:synthese',
      expect.any(Object),
      { silent: true },
    )
  })

  it('recharge la synthèse caisse quand ApportsTab signale un changement', async () => {
    const wrapper = mountView()
    await flushPromises()
    await flushPromises()

    const caisseCallsBefore = mockIpcInvoke.mock.calls.filter(([channel]) => channel === 'caisse:synthese')
    expect(caisseCallsBefore).toHaveLength(1)

    mockIpcInvoke.mockClear()

    const apportsTab = wrapper.findComponent({ name: 'ApportsTab' })
    expect(apportsTab.exists()).toBe(true)
    apportsTab.vm.$emit('changed')
    await flushPromises()

    const caisseCallsAfter = mockIpcInvoke.mock.calls.filter(([channel]) => channel === 'caisse:synthese')
    expect(caisseCallsAfter).toHaveLength(1)
    expect(caisseCallsAfter[0][1]).toEqual({
      dateDebut: expect.stringMatching(/^\d{4}-\d{2}-01$/),
      dateFin: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    })
    expect(caisseCallsAfter[0][2]).toEqual({ silent: true })
  })

  it('conserve uniquement les factures pour un rôle non gestionnaire', async () => {
    userRef.value = { role: 'MEDECIN' }
    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.find('[data-test="factures-tab"]').exists()).toBe(true)
    expect(wrapper.find('.el-tabs').exists()).toBe(false)
    expect(wrapper.find('.comptabilite__summary').exists()).toBe(false)
    expect(mockIpcInvoke).not.toHaveBeenCalled()
  })

  it('affiche un avertissement non bloquant si une synthèse échoue', async () => {
    mockIpcInvoke.mockImplementation((channel: string) => {
      if (channel === 'caisse:synthese') return Promise.reject(new Error('caisse indisponible'))
      if (channel === 'dispensation:synthese-comptable') return Promise.resolve({ creances: 0 })
      if (channel === 'depense:synthese') return Promise.resolve({ total: 0, totalPaye: 0, totalCredit: 0, count: 0 })
      return Promise.resolve(null)
    })

    const wrapper = mountView()
    await flushPromises()
    await flushPromises()

    expect(wrapper.find('.el-alert').exists()).toBe(true)
    expect(wrapper.text()).toContain('Certaines synthèses sont indisponibles')
    expect(wrapper.find('[data-test="factures-tab"]').exists()).toBe(true)
  })
})
