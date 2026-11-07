// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { cloneVNode, h } from 'vue'
import DepensesTab from '../DepensesTab.vue'

const { mockIpcInvoke, mockElMessage, mockConfirm, dialogOpens } = vi.hoisted(() => ({
  mockIpcInvoke: vi.fn(),
  mockElMessage: { success: vi.fn(), warning: vi.fn(), info: vi.fn(), error: vi.fn() },
  mockConfirm: vi.fn(),
  dialogOpens: {
    form: vi.fn(),
    payment: vi.fn(),
    categories: vi.fn(),
  },
}))

vi.mock('@/utils/ipc', () => ({
  ipcInvoke: mockIpcInvoke,
}))

vi.mock('element-plus', () => ({
  ElMessage: mockElMessage,
  ElMessageBox: { confirm: mockConfirm },
}))

vi.mock('@element-plus/icons-vue', () => ({
  Delete: { name: 'Delete', render: () => null },
  Edit: { name: 'Edit', render: () => null },
  Money: { name: 'Money', render: () => null },
  Plus: { name: 'Plus', render: () => null },
  RefreshLeft: { name: 'RefreshLeft', render: () => null },
  Search: { name: 'Search', render: () => null },
  Setting: { name: 'Setting', render: () => null },
}))

vi.mock('@/currency/useCurrency', () => ({
  useCurrency: () => ({ formatCurrency: (value: number) => `${value} GNF` }),
}))

vi.mock('@/components/comptabilite/DepenseFormDialog.vue', () => ({
  default: {
    name: 'DepenseFormDialog',
    template: '<div />',
    emits: ['saved'],
    methods: { open: dialogOpens.form },
    props: ['categories'],
  },
}))
vi.mock('@/components/comptabilite/DepensePaiementDialog.vue', () => ({
  default: {
    name: 'DepensePaiementDialog',
    template: '<div />',
    emits: ['paid'],
    methods: { open: dialogOpens.payment },
  },
}))
vi.mock('@/components/comptabilite/DepensesCategoriesDialog.vue', () => ({
  default: {
    name: 'DepensesCategoriesDialog',
    template: '<div />',
    emits: ['changed'],
    methods: { open: dialogOpens.categories },
    props: ['categories'],
  },
}))

const stubs = {
  'el-table': {
    props: ['data'],
    setup(props: any, { slots }: any) {
      return () =>
        h(
          'div',
          { class: 'el-table' },
          (props.data || []).map((row: any, rowIndex: number) =>
            h(
              'div',
              { class: 'el-table__row', key: rowIndex },
              (slots.default?.() ?? []).map((vnode: any, columnIndex: number) =>
                cloneVNode(vnode, { row, key: `${rowIndex}-${columnIndex}` }),
              ),
            ),
          ),
        )
    },
  },
  'el-table-column': {
    template: '<div class="el-table-column"><slot :row="row" /></div>',
    props: ['row', 'label', 'prop', 'width', 'minWidth', 'align', 'fixed', 'size'],
  },
  'el-input': {
    template: '<input class="el-input" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'placeholder', 'clearable'],
    emits: ['update:modelValue', 'clear'],
  },
  'el-date-picker': {
    template: '<input class="el-date-picker" :value="modelValue" />',
    props: ['modelValue', 'type', 'valueFormat', 'startPlaceholder', 'endPlaceholder'],
  },
  'el-select': {
    template: '<select class="el-select"><slot /></select>',
    props: ['modelValue', 'placeholder', 'clearable'],
  },
  'el-option': {
    template: '<option :value="value">{{ label }}</option>',
    props: ['label', 'value'],
  },
  'el-button': {
    template: '<button class="el-button" :disabled="disabled" @click="$emit(\'click\', $event)"><slot /></button>',
    props: ['type', 'text', 'size', 'icon', 'loading', 'disabled'],
    emits: ['click'],
  },
  'el-tag': {
    template: '<span class="el-tag"><slot /></span>',
    props: ['type', 'size', 'round', 'effect'],
  },
}

const DEPENSES = [
  {
    id: 1,
    date: '2026-10-05',
    categorieId: 1,
    categorieNom: 'Fournitures',
    categorieCouleur: '#e74c3c',
    libelle: 'Gants',
    montant: 50000,
    statutPaiement: 'credit',
    source: 'manuel',
    fournisseurNom: 'MediShop',
  },
  {
    id: 2,
    date: '2026-10-06',
    categorieId: 2,
    categorieNom: 'Pharmacie',
    categorieCouleur: '#2ecc71',
    libelle: 'Achat stock',
    montant: 120000,
    statutPaiement: 'payee',
    source: 'stock_entree',
    fournisseurNom: 'Pharma Distribution',
    modePaiement: 'virement',
    datePaiement: '2026-10-06',
  },
]

const CATEGORIES = [
  { id: 1, nom: 'Fournitures', code: 'fournitures', couleur: '#e74c3c', actif: true, ordre: 0 },
  { id: 2, nom: 'Pharmacie', code: 'pharmacie', couleur: '#2ecc71', actif: true, ordre: 1 },
]

function mountTab() {
  return mount(DepensesTab, {
    global: {
      stubs,
      directives: { loading: {} },
    },
  })
}

function buttonByText(wrapper: ReturnType<typeof mountTab>, text: string) {
  return wrapper.findAll('button').find((button) => button.text().trim() === text)
}

describe('DepensesTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockConfirm.mockResolvedValue(undefined)
    mockIpcInvoke.mockImplementation((channel: string) => {
      if (channel === 'depense:list') return Promise.resolve(DEPENSES)
      if (channel === 'depense:synthese') {
        return Promise.resolve({ total: 170000, totalPaye: 120000, totalCredit: 50000, count: 2 })
      }
      if (channel === 'depense:categories') return Promise.resolve(CATEGORIES)
      if (channel === 'depense:delete') return Promise.resolve({ deleted: true })
      return Promise.resolve(null)
    })
  })

  it('charge les dépenses, la synthèse et les catégories du mois courant', async () => {
    const wrapper = mountTab()
    await flushPromises()

    expect(mockIpcInvoke).toHaveBeenCalledWith(
      'depense:list',
      expect.objectContaining({
        dateDebut: expect.stringMatching(/^\d{4}-\d{2}-01$/),
        dateFin: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        search: undefined,
      }),
    )
    expect(mockIpcInvoke).toHaveBeenCalledWith('depense:synthese', expect.any(Object))
    expect(mockIpcInvoke).toHaveBeenCalledWith('depense:categories', { includeInactive: true })

    const values = wrapper.findAll('.summary-card__value').map((node) => node.text())
    expect(values).toEqual(['170000 GNF', '120000 GNF', '50000 GNF', '2'])
    expect(wrapper.text()).toContain('Achat pharmacie')
    expect(wrapper.text()).toContain('Manuelle')
    expect(wrapper.text()).toContain('À crédit')
    expect(wrapper.text()).toContain('MediShop')
  })

  it('ouvre les dialogues de création, paiement et catégories', async () => {
    const wrapper = mountTab()
    await flushPromises()

    await buttonByText(wrapper, 'Nouvelle dépense')!.trigger('click')
    expect(dialogOpens.form).toHaveBeenCalled()

    await buttonByText(wrapper, 'Catégories')!.trigger('click')
    expect(dialogOpens.categories).toHaveBeenCalled()

    await buttonByText(wrapper, 'Marquer payée')!.trigger('click')
    expect(dialogOpens.payment).toHaveBeenCalledWith(DEPENSES[0])
  })

  it('supprime uniquement une dépense manuelle après confirmation', async () => {
    const wrapper = mountTab()
    await flushPromises()

    expect(wrapper.findAll('button').filter((button) => button.text().trim() === 'Supprimer')).toHaveLength(1)

    await buttonByText(wrapper, 'Supprimer')!.trigger('click')
    await flushPromises()

    expect(mockConfirm).toHaveBeenCalled()
    expect(mockIpcInvoke).toHaveBeenCalledWith('depense:delete', { id: 1 })
    expect(mockElMessage.success).toHaveBeenCalledWith('Dépense supprimée')
    expect(mockIpcInvoke.mock.calls.filter(([channel]) => channel === 'depense:list')).toHaveLength(2)
  })
})
