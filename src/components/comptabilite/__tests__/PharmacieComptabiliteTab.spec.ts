// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { cloneVNode, h } from 'vue'
import PharmacieComptabiliteTab from '../PharmacieComptabiliteTab.vue'
import { formatMontant } from '../format'

const { mockIpcInvoke, mockElMessage } = vi.hoisted(() => ({
  mockIpcInvoke: vi.fn(),
  mockElMessage: {
    success: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('@/utils/ipc', () => ({
  ipcInvoke: mockIpcInvoke,
}))

vi.mock('element-plus', () => ({
  ElMessage: mockElMessage,
}))

vi.mock('@element-plus/icons-vue', () => ({
  Refresh: { name: 'Refresh', render: () => null },
}))

vi.mock('@/currency/useCurrency', () => ({
  useCurrency: () => ({ formatCurrency: (value: number) => `${value} GNF` }),
}))

vi.mock('@/composables/useAuth', () => ({
  useAuth: () => ({ user: { value: { id: 7, nom: 'Testeur', prenom: 'Alpha' } } }),
}))

const stubs = {
  'el-table': {
    props: ['data', 'emptyText'],
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
  'el-button': {
    template: '<button class="el-button" :disabled="disabled" @click="$emit(\'click\', $event)"><slot /></button>',
    props: ['type', 'text', 'size', 'icon', 'loading', 'disabled'],
    emits: ['click'],
  },
  'el-tag': {
    template: '<span class="el-tag"><slot /></span>',
    props: ['type', 'size', 'round', 'effect'],
  },
  'el-tooltip': {
    template: '<span class="el-tooltip"><slot /></span>',
    props: ['content', 'placement'],
  },
  'el-date-picker': {
    template: '<input class="el-date-picker" :value="modelValue" />',
    props: ['modelValue', 'type', 'valueFormat', 'placeholder', 'clearable'],
  },
  'el-select': {
    template: '<select class="el-select"><slot /></select>',
    props: ['modelValue', 'placeholder', 'clearable'],
  },
  'el-option': {
    template: '<option :value="value">{{ label }}</option>',
    props: ['label', 'value'],
  },
  'el-input': {
    template: '<input class="el-input" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'placeholder', 'maxlength'],
    emits: ['update:modelValue'],
  },
  'el-input-number': {
    template: '<input class="el-input-number" :value="modelValue" @input="$emit(\'update:modelValue\', Number($event.target.value))" />',
    props: ['modelValue', 'min', 'max', 'step', 'precision', 'controlsPosition'],
    emits: ['update:modelValue'],
  },
  'el-form': {
    template: '<form class="el-form" @submit.prevent><slot /></form>',
  },
  'el-form-item': {
    template:
      '<div class="el-form-item"><span class="el-form-item__label">{{ label }}</span><div class="el-form-item__content"><slot /></div><span v-if="error" class="el-form-item__error">{{ error }}</span></div>',
    props: ['label', 'required', 'error'],
  },
  'el-alert': {
    template: '<div class="el-alert"><span class="el-alert__title">{{ title }}</span><slot /></div>',
    props: ['title', 'type', 'closable', 'showIcon'],
  },
  'el-radio-group': {
    template: '<div class="el-radio-group"><slot /></div>',
    props: ['modelValue', 'size'],
  },
  'el-radio-button': {
    template: '<label class="el-radio-button"><slot /></label>',
    props: ['value', 'label'],
  },
  'el-dialog': {
    props: ['modelValue', 'title', 'width', 'closeOnClickModal'],
    emits: ['update:modelValue'],
    template: `
      <div v-if="modelValue" class="el-dialog">
        <div class="el-dialog__title">{{ title }}</div>
        <div class="el-dialog__body"><slot /></div>
        <div class="el-dialog__footer"><slot name="footer" /></div>
      </div>
    `,
  },
}

const SYNTHESE = {
  dateDebut: '2026-10-01',
  dateFin: '2026-10-31',
  caFacture: 500000,
  encaisse: 300000,
  creances: 200000,
  gratuiteCount: 1,
  gratuiteValeur: 120000,
  gratuiteCout: 80000,
  coutTotal: 330000,
  coutFacture: 250000,
  margeBrute: 250000,
  margeNette: 170000,
  achats: 400000,
  achatsPayes: 250000,
  achatsCredit: 150000,
  topMedicamentsCA: [
    { medicamentId: 1, libelle: 'Metformine', quantite: 50, ca: 350000, cout: 210000, marge: 140000 },
  ],
  topMedicamentsQuantite: [
    { medicamentId: 1, libelle: 'Metformine', quantite: 50, ca: 350000, cout: 210000, marge: 140000 },
  ],
  topMotifsGratuits: [
    { motif: 'indigent', count: 1, valeur: 120000, cout: 80000 },
  ],
  creancesParPatient: [],
}

const VENTES = [
  {
    id: 10,
    dateVente: '2026-10-05',
    typeVente: 'facturee',
    statut: 'servie',
    patient: { id: 1, nom: 'Diallo', prenom: 'Awa' },
    lignes: [
      {
        id: 100,
        delivranceId: 10,
        medicamentId: 500,
        libelle: 'Metformine',
        quantiteDemandee: 30,
        quantiteServie: 30,
        prixUnitaire: 5000,
        montant: 150000,
        coutAchatTotal: 90000,
      },
    ],
    paiements: [],
    montantTotal: 150000,
    montantPaye: 50000,
    reste: 100000,
    statutFinancier: 'credit',
    prixManquant: false,
  },
  {
    id: 11,
    dateVente: '2026-10-07',
    typeVente: 'facturee',
    statut: 'servie',
    patient: { id: 2, nom: 'Barry', prenom: 'Mamadou' },
    lignes: [
      {
        id: 101,
        delivranceId: 11,
        medicamentId: 500,
        libelle: 'Metformine',
        quantiteDemandee: 20,
        quantiteServie: 20,
        prixUnitaire: 10000,
        montant: 200000,
        coutAchatTotal: 120000,
      },
    ],
    paiements: [],
    montantTotal: 200000,
    montantPaye: 200000,
    reste: 0,
    statutFinancier: 'payee',
    prixManquant: false,
  },
  {
    id: 12,
    dateVente: '2026-10-09',
    typeVente: 'gratuite',
    motifGratuite: 'indigent',
    statut: 'servie',
    patient: { id: 3, nom: 'Camara', prenom: 'Fatou' },
    lignes: [
      {
        id: 102,
        delivranceId: 12,
        medicamentId: 600,
        libelle: 'Insuline',
        quantiteDemandee: 10,
        quantiteServie: 10,
        prixUnitaire: 12000,
        montant: 120000,
        coutAchatTotal: 80000,
      },
    ],
    paiements: [],
    montantTotal: 120000,
    montantPaye: 0,
    reste: 0,
    statutFinancier: 'gratuite',
    prixManquant: false,
  },
]

const VENTES_CREDIT = [
  {
    patientId: 1,
    patientNom: 'Diallo',
    patientPrenom: 'Awa',
    nbVentes: 1,
    montantTotal: 150000,
    montantPaye: 50000,
    reste: 100000,
    datePremiereVente: '2026-10-05',
    dateDerniereVente: '2026-10-05',
  },
]

const SYNTHESE_DEPENSE_TOTALE = {
  total: 400000,
  totalPaye: 250000,
  totalCredit: 150000,
  count: 3,
  parCategorie: [],
  parFournisseur: [{ fournisseurNom: 'Pharma Distribution', total: 400000, count: 3 }],
}

const SYNTHESE_DEPENSE_PAYEE = {
  ...SYNTHESE_DEPENSE_TOTALE,
  total: 250000,
  totalPaye: 250000,
  totalCredit: 0,
  count: 2,
  parFournisseur: [{ fournisseurNom: 'Pharma Distribution', total: 250000, count: 2 }],
}

const SYNTHESE_DEPENSE_CREDIT = {
  ...SYNTHESE_DEPENSE_TOTALE,
  total: 150000,
  totalPaye: 0,
  totalCredit: 150000,
  count: 1,
  parFournisseur: [{ fournisseurNom: 'Pharma Distribution', total: 150000, count: 1 }],
}

function mountTab() {
  return mount(PharmacieComptabiliteTab, {
    global: {
      stubs,
      directives: { loading: {} },
    },
  })
}

function tables(wrapper: ReturnType<typeof mountTab>) {
  return wrapper.findAll('.el-table')
}

describe('PharmacieComptabiliteTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIpcInvoke.mockImplementation((channel: string, params: any) => {
      if (channel === 'dispensation:synthese-comptable') return Promise.resolve(SYNTHESE)
      if (channel === 'dispensation:ventes') {
        if (params?.patientId != null) return Promise.resolve([VENTES[0]])
        return Promise.resolve(VENTES)
      }
      if (channel === 'dispensation:ventes-credit') return Promise.resolve(VENTES_CREDIT)
      if (channel === 'depense:synthese') {
        if (params?.statutPaiement === 'payee') return Promise.resolve(SYNTHESE_DEPENSE_PAYEE)
        if (params?.statutPaiement === 'credit') return Promise.resolve(SYNTHESE_DEPENSE_CREDIT)
        return Promise.resolve(SYNTHESE_DEPENSE_TOTALE)
      }
      if (channel === 'dispensation:encaisser') {
        return Promise.resolve({
          ...VENTES[0],
          montantPaye: 150000,
          reste: 0,
          statutFinancier: 'payee',
        })
      }
      return Promise.resolve(null)
    })
  })

  it('interroge les canaux de comptabilité pharmacie avec la période du mois courant', async () => {
    mountTab()
    await flushPromises()

    expect(mockIpcInvoke).toHaveBeenCalledWith(
      'dispensation:synthese-comptable',
      expect.objectContaining({
        dateDebut: expect.stringMatching(/^\d{4}-\d{2}-01$/),
        dateFin: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      }),
      expect.objectContaining({ silent: true }),
    )
    expect(mockIpcInvoke).toHaveBeenCalledWith(
      'dispensation:ventes',
      expect.objectContaining({
        dateDebut: expect.stringMatching(/^\d{4}-\d{2}-01$/),
        dateFin: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      }),
      expect.objectContaining({ silent: true }),
    )
    expect(mockIpcInvoke).toHaveBeenCalledWith(
      'dispensation:ventes-credit',
      expect.objectContaining({
        dateDebut: expect.stringMatching(/^\d{4}-\d{2}-01$/),
        dateFin: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      }),
      expect.objectContaining({ silent: true }),
    )
    expect(mockIpcInvoke).toHaveBeenCalledWith(
      'depense:synthese',
      expect.objectContaining({ source: 'stock_entree' }),
      expect.objectContaining({ silent: true }),
    )
  })

  it('rend les cartes de synthèse à partir du DTO backend', async () => {
    const wrapper = mountTab()
    await flushPromises()

    const values = wrapper.findAll('.summary-card__value').map((node) => node.text())
    expect(values).toEqual([
      '500000 GNF',
      '300000 GNF',
      '200000 GNF',
      '120000 GNF',
      '250000 GNF',
      '170000 GNF',
      '400000 GNF',
    ])
    expect(wrapper.text()).toContain('1 patient(s) à recouvrer')
    expect(wrapper.text()).toContain('CA facturé')
  })

  it('rend le tableau des ventes de la période', async () => {
    const wrapper = mountTab()
    await flushPromises()

    const ventes = tables(wrapper)[0]
    expect(ventes.findAll('.el-table__row')).toHaveLength(3)
    expect(ventes.text()).toContain('05/10/2026')
    expect(ventes.text()).toContain('Awa Diallo')
    expect(ventes.text()).toContain('Facturée')
    expect(ventes.text()).toContain('Gratuité')
    expect(ventes.text()).toContain('Indigent')
    expect(ventes.text()).toContain(formatMontant(150000))
    expect(ventes.text()).toContain(formatMontant(50000))
    expect(ventes.text()).toContain(formatMontant(100000))
    expect(ventes.text()).toContain('À crédit')
    expect(ventes.text()).toContain('Payée')
  })

  it('rend le top médicaments avec quantité, CA, coût et marge', async () => {
    const wrapper = mountTab()
    await flushPromises()

    const top = tables(wrapper)[1]
    expect(top.findAll('.el-table__row')).toHaveLength(1)
    expect(top.text()).toContain('Metformine')
    expect(top.text()).toContain('50')
    expect(top.text()).toContain(formatMontant(350000))
    expect(top.text()).toContain(formatMontant(210000))
    expect(top.text()).toContain(formatMontant(140000))
  })

  it('rend les gratuités par motif avec valeur et coût', async () => {
    const wrapper = mountTab()
    await flushPromises()

    const motifs = tables(wrapper)[2]
    expect(motifs.findAll('.el-table__row')).toHaveLength(1)
    expect(motifs.text()).toContain('Indigent')
    expect(motifs.text()).toContain(formatMontant(120000))
    expect(motifs.text()).toContain(formatMontant(80000))
  })

  it('rend les créances par patient avec la première et la dernière vente', async () => {
    const wrapper = mountTab()
    await flushPromises()

    const creances = tables(wrapper)[3]
    expect(creances.findAll('.el-table__row')).toHaveLength(1)
    expect(creances.text()).toContain('Awa Diallo')
    expect(creances.text()).toContain(formatMontant(100000))
    expect(creances.text()).toContain('05/10/2026')
  })

  it('rend les achats par fournisseur avec total, payé et à crédit', async () => {
    const wrapper = mountTab()
    await flushPromises()

    const achats = tables(wrapper)[4]
    expect(achats.findAll('.el-table__row')).toHaveLength(1)
    expect(achats.text()).toContain('Pharma Distribution')
    expect(achats.text()).toContain(formatMontant(400000))
    expect(achats.text()).toContain(formatMontant(250000))
    expect(achats.text()).toContain(formatMontant(150000))
  })

  it('ouvre le dialogue d’encaissement sur une vente à crédit', async () => {
    const wrapper = mountTab()
    await flushPromises()

    expect(wrapper.find('.el-dialog').exists()).toBe(false)

    const ventes = tables(wrapper)[0]
    const encaisser = ventes.findAll('button').find((button) => button.text().trim() === 'Encaisser')
    expect(encaisser).toBeDefined()
    await encaisser!.trigger('click')
    await flushPromises()

    const dialog = wrapper.find('.el-dialog')
    expect(dialog.exists()).toBe(true)
    expect(dialog.text()).toContain('Awa Diallo')
    expect(dialog.text()).toContain('Reste à payer')
    expect(dialog.text()).toContain('100000 GNF')
  })

  it('n’affiche pas d’encaissement sur une vente déjà payée', async () => {
    const wrapper = mountTab()
    await flushPromises()

    const ventes = tables(wrapper)[0]
    const boutons = ventes.findAll('button').filter((button) => button.text().trim() === 'Encaisser')
    expect(boutons).toHaveLength(1)
  })

  it('enregistre l’encaissement via le canal backend puis recharge les données', async () => {
    const wrapper = mountTab()
    await flushPromises()

    const ventes = tables(wrapper)[0]
    const encaisser = ventes.findAll('button').find((button) => button.text().trim() === 'Encaisser')
    await encaisser!.trigger('click')
    await flushPromises()

    const submit = wrapper.findAll('.el-dialog__footer button').find((b) => b.text().trim() === 'Encaisser')
    expect(submit).toBeDefined()
    await submit!.trigger('click')
    await flushPromises()

    expect(mockIpcInvoke).toHaveBeenCalledWith(
      'dispensation:encaisser',
      expect.objectContaining({
        delivranceId: 10,
        montant: 100000,
        modePaiement: 'espèces',
      }),
      expect.objectContaining({ silent: true }),
    )
    expect(mockElMessage.success).toHaveBeenCalledWith('Paiement enregistré')
    expect(
      mockIpcInvoke.mock.calls.filter(([channel]) => channel === 'dispensation:synthese-comptable'),
    ).toHaveLength(2)
  })

  it('refuse un montant encaissé supérieur au reste dû', async () => {
    const wrapper = mountTab()
    await flushPromises()

    const ventes = tables(wrapper)[0]
    const encaisser = ventes.findAll('button').find((button) => button.text().trim() === 'Encaisser')
    await encaisser!.trigger('click')
    await flushPromises()

    await wrapper.find('.el-input-number').setValue('999999')
    await flushPromises()

    expect(wrapper.find('.el-form-item__error').text()).toBe('Le montant ne peut pas dépasser le reste dû.')
    const submit = wrapper.findAll('.el-dialog__footer button').find((b) => b.text().trim() === 'Encaisser')
    expect((submit!.element as HTMLButtonElement).disabled).toBe(true)
  })

  it('affiche une erreur sans casser le reste de l’onglet', async () => {
    mockIpcInvoke.mockImplementation((channel: string, _params?: unknown) => {
      if (channel === 'dispensation:synthese-comptable') {
        return Promise.reject(new Error('Synthèse indisponible'))
      }
      if (channel === 'dispensation:ventes') return Promise.resolve(VENTES)
      if (channel === 'dispensation:ventes-credit') return Promise.resolve(VENTES_CREDIT)
      if (channel === 'depense:synthese') return Promise.resolve(SYNTHESE_DEPENSE_TOTALE)
      return Promise.resolve(null)
    })

    const wrapper = mountTab()
    await flushPromises()

    expect(wrapper.find('.el-alert').text()).toContain('Synthèse indisponible')
    // Les tableaux restent rendus même si un canal a échoué.
    expect(tables(wrapper)[0].findAll('.el-table__row')).toHaveLength(3)
  })
})
