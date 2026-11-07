// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import InvoiceFormDialog from '../InvoiceFormDialog.vue'
import { elementPlusStubs } from './elementPlusStubs'

const { mockInvoke, mockElMessage } = vi.hoisted(() => ({
  mockInvoke: vi.fn(),
  mockElMessage: { success: vi.fn(), warning: vi.fn(), error: vi.fn() },
}))

vi.mock('element-plus', () => ({
  ElMessage: mockElMessage,
}))

vi.mock('@/currency/useCurrency', () => ({
  useCurrency: () => ({
    currencyDef: { code: 'GNF', symbol: 'GNF', locale: 'fr-FR', decimals: 0 },
  }),
}))

vi.mock('@/composables/useInsurances', () => ({
  useInsurances: () => ({
    fetchActiveInsurances: () => Promise.resolve([]),
  }),
}))

// Catalogue d'actes neutralisé : ces tests portent sur le champ Patient.
vi.mock('@/composables/useActesFacturables', () => ({
  useActesFacturables: () => ({
    actesFacturables: [],
    loading: false,
    loaded: true,
    ensureLoaded: () => Promise.resolve(),
    findById: () => undefined,
  }),
}))

vi.mock('@/components/patients/RichTextEditor.vue', () => ({
  default: {
    name: 'RichTextEditor',
    props: ['modelValue', 'rows'],
    template: '<textarea class="rich-editor" />',
  },
}))

/**
 * Stubs locaux : `resetFields` est requis par `resetForm()` au `closed` du
 * dialogue, et les éléments décoratifs (`el-divider`, `el-empty`) sont rendus
 * pour éviter les avertissements de résolution.
 */
const dialogStubs = {
  ...elementPlusStubs,
  'el-form': {
    ...elementPlusStubs['el-form'],
    methods: {
      validate: () => Promise.resolve(true),
      resetFields: vi.fn(),
    },
  },
  'el-divider': {
    name: 'ElDivider',
    template: '<hr class="el-divider" />',
  },
  'el-empty': {
    name: 'ElEmpty',
    props: ['description', 'imageSize'],
    template: '<div class="el-empty">{{ description }}</div>',
  },
}

type DialogVm = {
  open: () => Promise<void>
  openEdit: (invoice: any) => Promise<void>
}

function mountDialog(props: { patientId?: number | null } = {}) {
  return mount(InvoiceFormDialog, {
    props,
    global: { stubs: dialogStubs, directives: { loading: {} } },
  })
}

async function openDialog(wrapper: ReturnType<typeof mountDialog>) {
  await (wrapper.vm as unknown as DialogVm).open()
  await flushPromises()
}

function formLabels(wrapper: ReturnType<typeof mountDialog>): string[] {
  return wrapper.findAll('.el-form-item__label').map((label) => label.text().trim())
}

function buttonByText(wrapper: ReturnType<typeof mountDialog>, text: string) {
  return wrapper.findAll('button').find((button) => button.text().trim() === text)
}

async function submit(wrapper: ReturnType<typeof mountDialog>) {
  await buttonByText(wrapper, 'Créer la facture')!.trigger('click')
  await flushPromises()
}

function createCalls() {
  return mockInvoke.mock.calls.filter(([channel]) => channel === 'invoices:create')
}

describe('InvoiceFormDialog — contexte dossier patient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === 'invoices:create') {
        return Promise.resolve({ success: true, data: { numero: 'FA-20261031-0001' } })
      }
      if (channel === 'patients:list') {
        return Promise.resolve({ success: true, data: [] })
      }
      return Promise.resolve({ success: true, data: null })
    })
    vi.stubGlobal('electronAPI', { invoke: mockInvoke })
  })

  it('masque le champ Patient et lie la facture au patient du dossier', async () => {
    const wrapper = mountDialog({ patientId: 42 })
    await openDialog(wrapper)

    // Aucun champ Patient rendu, aucun remplacement ajouté.
    expect(formLabels(wrapper)).not.toContain('Patient')
    expect(wrapper.findAll('.el-select').length).toBeGreaterThan(0) // assurances + type de ligne restent
    expect(wrapper.find('.el-date-picker').exists()).toBe(true)

    // Aucun appel à la liste distante des patients n'est nécessaire.
    expect(mockInvoke).not.toHaveBeenCalledWith('patients:list', expect.anything())

    await submit(wrapper)

    expect(createCalls()).toHaveLength(1)
    expect(createCalls()[0][1]).toEqual(
      expect.objectContaining({ patient_id: 42 }),
    )
    expect(wrapper.emitted('created')).toHaveLength(1)
  })

  it('ré-amorce le patient du dossier après fermeture puis réouverture', async () => {
    const wrapper = mountDialog({ patientId: 42 })
    await openDialog(wrapper)

    wrapper.findComponent({ name: 'ElDialog' }).vm.$emit('closed')
    await nextTick()
    await openDialog(wrapper)

    await submit(wrapper)

    expect(createCalls()).toHaveLength(1)
    expect(createCalls()[0][1]).toEqual(
      expect.objectContaining({ patient_id: 42 }),
    )
  })

  it('ignore un identifiant patient invalide et laisse le champ Patient visible', async () => {
    const wrapper = mountDialog({ patientId: 0 })
    await openDialog(wrapper)

    expect(formLabels(wrapper)).toContain('Patient')
  })
})

describe('InvoiceFormDialog — mode modification', () => {
  const detail = {
    id: 7,
    numero: 'F-20261001-0001',
    patient_id: 42,
    patient_nom: 'Fofana',
    patient_prenom: 'Adama',
    date: '2026-10-01',
    montant_total: 127440,
    montant_restant: 127440,
    status: 'en_attente',
    notes: 'note existante',
    remise_pct: 10,
    tva_pct: 18,
    assurance_id: null,
    part_assurance: 0,
    part_patient: 127440,
    items: [
      {
        id: 1,
        invoice_id: 7,
        libelle: 'ENDO — Acte',
        quantite: 2,
        prix_unitaire: 50000,
        montant: 100000,
        type: 'acte',
        acte_id: '12',
      },
      {
        id: 2,
        invoice_id: 7,
        libelle: 'Consultation',
        quantite: 1,
        prix_unitaire: 20000,
        montant: 20000,
        type: 'consultation',
        acte_id: null,
      },
    ],
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === 'invoices:update') {
        return Promise.resolve({ success: true, data: { numero: detail.numero } })
      }
      if (channel === 'invoices:create') {
        return Promise.resolve({ success: true, data: { numero: 'F-20261031-9999' } })
      }
      return Promise.resolve({ success: true, data: null })
    })
    vi.stubGlobal('electronAPI', { invoke: mockInvoke })
  })

  async function openEditDialog(wrapper: ReturnType<typeof mountDialog>) {
    await (wrapper.vm as unknown as DialogVm).openEdit(detail)
    await flushPromises()
  }

  it('pré-remplit les lignes et masque le patient', async () => {
    const wrapper = mountDialog()
    await openEditDialog(wrapper)

    expect(wrapper.find('.el-dialog__title').text()).toBe('Modifier la facture')
    expect(formLabels(wrapper)).not.toContain('Patient')
    expect(wrapper.findAll('.invoice-items__row')).toHaveLength(2)
    // Total recalculé depuis les lignes : 120 000 − 10 % + 18 %.
    expect(wrapper.text()).toMatch(/127\s*440/)
  })

  it('rappelle le numéro et le patient de la facture modifiée', async () => {
    const wrapper = mountDialog()
    await openEditDialog(wrapper)

    const context = wrapper.find('.invoice-edit-context')
    expect(context.text()).toContain('F-20261001-0001')
    expect(context.text()).toContain('Adama Fofana')
    expect(context.text()).toContain('aucun paiement')
  })

  it('soumet invoices:update et émet updated sans créer de facture', async () => {
    const wrapper = mountDialog()
    await openEditDialog(wrapper)

    await buttonByText(wrapper, 'Enregistrer')!.trigger('click')
    await flushPromises()

    const updateCalls = mockInvoke.mock.calls.filter(([channel]) => channel === 'invoices:update')
    expect(updateCalls).toHaveLength(1)
    expect(updateCalls[0][1]).toEqual({
      id: 7,
      notes: 'note existante',
      remise_pct: 10,
      tva_pct: 18,
      assurance_id: null,
      taux_prise_en_charge: undefined,
      items: [
        expect.objectContaining({ libelle: 'ENDO — Acte', quantite: 2, prix_unitaire: 50000, montant: 100000, type: 'acte', acte_id: '12' }),
        expect.objectContaining({ libelle: 'Consultation', quantite: 1, prix_unitaire: 20000, montant: 20000, type: 'consultation', acte_id: null }),
      ],
    })
    expect(createCalls()).toHaveLength(0)
    expect(wrapper.emitted('updated')).toHaveLength(1)
    expect(wrapper.emitted('created')).toBeUndefined()
  })
})

describe('InvoiceFormDialog — contexte comptabilité', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === 'patients:list') {
        return Promise.resolve({ success: true, data: [] })
      }
      if (channel === 'invoices:create') {
        return Promise.resolve({ success: true, data: { numero: 'FA-20261031-0002' } })
      }
      return Promise.resolve({ success: true, data: null })
    })
    vi.stubGlobal('electronAPI', { invoke: mockInvoke })
  })

  it('affiche le champ Patient vide quand aucune prop n’est fournie', async () => {
    const wrapper = mountDialog()
    await openDialog(wrapper)

    expect(formLabels(wrapper)).toContain('Patient')

    const patientSelect = wrapper.findAllComponents({ name: 'ElSelect' })[0]
    expect(patientSelect.props('modelValue')).toBeNull()
  })

  it('bloque la création sans patient sélectionné', async () => {
    const wrapper = mountDialog()
    await openDialog(wrapper)

    await submit(wrapper)

    expect(mockElMessage.error).toHaveBeenCalledWith(
      'Patient non valide. Sélectionnez un patient valide.',
    )
    expect(createCalls()).toHaveLength(0)
    expect(wrapper.emitted('created')).toBeUndefined()
  })
})
