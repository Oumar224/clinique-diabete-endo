// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import InvoicePrintView from '../InvoicePrintView.vue'
import type { Invoice } from '@/composables/useInvoices'

const { mockGetInvoice, mockExportInvoicesExcel } = vi.hoisted(() => ({
  mockGetInvoice: vi.fn(),
  mockExportInvoicesExcel: vi.fn(),
}))

vi.mock('element-plus', () => ({}))

vi.mock('@/composables/useInvoices', () => ({
  getInvoice: mockGetInvoice,
}))

vi.mock('@/composables/useExport', () => ({
  useExport: () => ({
    exportInvoicesExcel: mockExportInvoicesExcel,
  }),
}))

vi.mock('@/composables/useHospitalInfo', () => ({
  useHospitalInfo: () => ({ info: ref({ name: 'Clinique Test' }), loadInfo: vi.fn() }),
}))

vi.mock('@/composables/useLogo', () => ({
  useLogo: () => ({ logoUrl: ref(null) }),
}))

vi.mock('@/currency/useCurrency', () => ({
  useCurrency: () => ({ formatCurrency: (value: number) => `${value} GNF` }),
}))

vi.mock('@/components/common/HospitalHeader.vue', () => ({
  default: {
    name: 'HospitalHeader',
    props: ['info', 'logo', 'docTitle', 'docRef', 'docDate'],
    template:
      '<div class="hospital-header"><span class="hospital-header__doc-ref">{{ docRef }}</span><span class="hospital-header__doc-date">{{ docDate }}</span></div>',
  },
}))

const stubs = {
  'el-dialog': {
    template: '<div class="el-dialog"><slot /><slot name="footer" /></div>',
    props: ['modelValue', 'title', 'fullscreen'],
  },
  'el-button': {
    template: '<button class="el-button" @click="$emit(\'click\')"><slot /></button>',
    props: ['type', 'icon', 'loading', 'disabled'],
    emits: ['click'],
  },
}

function buildInvoice(overrides: Partial<Invoice> = {}): Invoice {
  return {
    id: 12,
    numero: 'F-20261024-0002',
    patient_id: 42,
    patient_nom: 'Fofana',
    patient_prenom: 'Adama',
    patient_nip: 'NIP-0007',
    date: '2026-10-24',
    montant_total: 40000,
    montant_restant: 0,
    status: 'payé',
    mode_paiement: 'especes',
    items: [
      { libelle: 'teste', quantite: 1, prix_unitaire: 40000, montant: 40000, type: 'consultation' },
    ],
    payments: [],
    ...overrides,
  }
}

function mountView() {
  return mount(InvoicePrintView, {
    global: { stubs, directives: { loading: {} } },
  })
}

type ViewApi = { open: (invoice: Invoice) => Promise<void> }

async function openInvoice(invoice: Invoice) {
  const wrapper = mountView()
  await (wrapper.vm as unknown as ViewApi).open(invoice)
  await flushPromises()
  return wrapper
}

describe('InvoicePrintView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetInvoice.mockImplementation(async (id: number) => buildInvoice({ id }))
    mockExportInvoicesExcel.mockResolvedValue(true)
  })

  it('affiche la date en mots et en chiffres, l’IP et le mode en clair', async () => {
    const wrapper = await openInvoice(buildInvoice())

    expect(wrapper.find('.hospital-header__doc-date').text()).toBe(
      'Date : 24 octobre 2026 (24/10/2026)',
    )

    const meta = wrapper.find('.print-invoice-meta')
    expect(meta.exists()).toBe(true)
    expect(meta.text()).toContain('Patient :')
    expect(meta.text()).toContain('Adama Fofana')
    expect(meta.text()).toContain('IP :')
    expect(meta.text()).toContain('NIP-0007')
    expect(meta.text()).toContain('Mode :')
    expect(meta.text()).toContain('Espèces')
  })

  it('retombe sur l’identifiant interne quand le NIP est absent', async () => {
    const wrapper = await openInvoice(
      buildInvoice({ patient_nip: undefined, mode_paiement: null, assurance_nom: undefined }),
    )

    const cells = wrapper.findAll('.print-invoice-meta > div')
    expect(cells).toHaveLength(2)
    expect(cells[1].text()).toContain('IP :')
    expect(cells[1].text()).toContain('42')
  })

  it('force la rangée horizontale (sinon la colonne héritée annule la hauteur des cellules)', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/components/comptabilite/InvoicePrintView.vue'),
      'utf8',
    )
    const start = source.indexOf('.print-patient.print-invoice-meta')
    const rule = source.slice(start, start + 260)

    expect(rule).toContain('flex-direction: row')
  })

  it('affiche l’assurance quand la facture en porte une', async () => {
    const wrapper = await openInvoice(buildInvoice({ assurance_nom: 'CNSS' }))

    expect(wrapper.find('.print-invoice-meta').text()).toContain('Assurance :')
    expect(wrapper.find('.print-invoice-meta').text()).toContain('CNSS')
  })
})
