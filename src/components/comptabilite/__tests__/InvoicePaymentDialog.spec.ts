// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import type { Invoice } from '@/composables/useInvoices'
import InvoicePaymentDialog from '../InvoicePaymentDialog.vue'
import { elementPlusStubs } from './elementPlusStubs'

const { mockInvoke, mockElMessage } = vi.hoisted(() => ({
  mockInvoke: vi.fn(),
  mockElMessage: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('element-plus', () => ({
  ElMessage: mockElMessage,
}))

vi.mock('@/currency/useCurrency', () => ({
  useCurrency: () => ({
    formatCurrency: (value: number) => `${value} GNF`,
  }),
}))

vi.mock('@/composables/useExport', () => ({
  useExport: () => ({
    exportReceiptPdf: vi.fn(),
  }),
}))

vi.mock('@/components/comptabilite/ReceiptPrintView.vue', () => ({
  default: {
    name: 'ReceiptPrintView',
    template: '<div class="receipt-print-view" />',
    methods: { openByPayment: vi.fn() },
  },
}))

const PARTIAL_INVOICE: Invoice = {
  id: 10,
  numero: 'FA-20261025-0001',
  patient_id: 7,
  patient_nom: 'Diallo',
  patient_prenom: 'Aminata',
  date: '2026-10-25',
  montant_total: 120_000,
  montant_restant: 50_000,
  status: 'partiel',
}

type DialogVm = {
  open: (invoice: Invoice) => void
}

function mountDialog() {
  return mount(InvoicePaymentDialog, {
    global: { stubs: elementPlusStubs, directives: { loading: {} } },
  })
}

function openDialog(wrapper: ReturnType<typeof mountDialog>, invoice: Invoice) {
  const vm = wrapper.vm as unknown as DialogVm
  vm.open(invoice)
  return flushPromises()
}

function buttonByText(wrapper: ReturnType<typeof mountDialog>, text: string) {
  return wrapper.findAll('button').find((button) => button.text().trim() === text)
}

function emitClosed(wrapper: ReturnType<typeof mountDialog>) {
  wrapper.findComponent({ name: 'ElDialog' }).vm.$emit('closed')
  return nextTick()
}

describe('InvoicePaymentDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockInvoke.mockResolvedValue({ success: true, data: null })
    vi.stubGlobal('electronAPI', { invoke: mockInvoke })
  })

  it('rend la saisie du montant quand il reste un solde à payer', async () => {
    const wrapper = mountDialog()
    await openDialog(wrapper, PARTIAL_INVOICE)

    const input = wrapper.findComponent({ name: 'ElInputNumber' })
    expect(input.exists()).toBe(true)
    expect(input.props('min')).toBe(1)
    expect(input.props('max')).toBe(50_000)
    expect(input.props('precision')).toBe(0)
    expect(Number(input.props('max'))).toBeGreaterThanOrEqual(Number(input.props('min')))
    expect(buttonByText(wrapper, 'Enregistrer le paiement')).toBeTruthy()
  })

  it('masque la saisie et le bouton quand le solde est nul', async () => {
    const wrapper = mountDialog()
    await openDialog(wrapper, { ...PARTIAL_INVOICE, montant_restant: 0, status: 'payé' })

    expect(wrapper.find('.el-input-number').exists()).toBe(false)
    expect(buttonByText(wrapper, 'Enregistrer le paiement')).toBeUndefined()
    expect(wrapper.text()).toContain('Cette facture est entièrement réglée.')
  })

  it('masque la saisie et le bouton quand la facture est annulée', async () => {
    const wrapper = mountDialog()
    await openDialog(wrapper, { ...PARTIAL_INVOICE, status: 'annulé' })

    expect(wrapper.find('.el-input-number').exists()).toBe(false)
    expect(buttonByText(wrapper, 'Enregistrer le paiement')).toBeUndefined()
    expect(wrapper.text()).toContain('Cette facture est annulée.')
    expect(wrapper.text()).not.toContain('Cette facture est entièrement réglée.')
  })

  // Régression : avec `:min="1"` et un reste < 1, Element Plus lève
  // « min should not be greater than max » si le formulaire monte quand même.
  it('ne monte pas le formulaire pour un reste fractionnaire inférieur à 1', async () => {
    const wrapper = mountDialog()
    await openDialog(wrapper, {
      ...PARTIAL_INVOICE,
      montant_restant: 0.5,
      status: 'partiel',
    })

    expect(wrapper.find('.el-input-number').exists()).toBe(false)
    expect(buttonByText(wrapper, 'Enregistrer le paiement')).toBeUndefined()
    expect(wrapper.text()).toContain('Cette facture est entièrement réglée.')
  })

  it('amorce le montant au plancher et garde max >= min pour un reste fractionnaire >= 1', async () => {
    const wrapper = mountDialog()
    await openDialog(wrapper, { ...PARTIAL_INVOICE, montant_restant: 1.5 })

    const input = wrapper.findComponent({ name: 'ElInputNumber' })
    expect(input.exists()).toBe(true)
    expect(input.props('modelValue')).toBe(1)
    expect(input.props('min')).toBe(1)
    expect(input.props('max')).toBe(1.5)
    expect(input.props('precision')).toBe(0)
    expect(Number(input.props('max'))).toBeGreaterThanOrEqual(Number(input.props('min')))
  })

  it('efface le résumé à la fermeture puis ré-amorce le montant à la réouverture', async () => {
    const wrapper = mountDialog()
    await openDialog(wrapper, PARTIAL_INVOICE)

    expect(wrapper.text()).toContain('FA-20261025-0001')
    expect(wrapper.text()).toContain('Aminata Diallo')
    expect(wrapper.find('.el-input-number').exists()).toBe(true)

    await emitClosed(wrapper)

    // resetResult() remet invoice à null : plus de résumé, plus de formulaire.
    expect(wrapper.text()).not.toContain('FA-20261025-0001')
    expect(wrapper.text()).not.toContain('Aminata Diallo')
    expect(wrapper.find('.el-input-number').exists()).toBe(false)

    await openDialog(wrapper, PARTIAL_INVOICE)

    const reopened = wrapper.findComponent({ name: 'ElInputNumber' })
    expect(reopened.exists()).toBe(true)
    expect(reopened.props('modelValue')).toBe(50_000)
    expect(reopened.props('max')).toBe(50_000)
    expect(wrapper.text()).toContain('FA-20261025-0001')
  })

  it('après un paiement partiel : reçu → fermeture → formulaire masqué → réouverture → formulaire ré-amorcé', async () => {
    const partiallyPaidInvoice: Invoice = {
      ...PARTIAL_INVOICE,
      montant_restant: 30_000,
      status: 'partiel',
      payments: [
        {
          id: 11,
          invoice_id: 10,
          montant: 20_000,
          mode_paiement: 'espèces',
          date_paiement: '2026-10-25',
          numero_recu: 'REC-001',
        },
      ],
    }
    mockInvoke.mockResolvedValue({ success: true, data: partiallyPaidInvoice })

    const wrapper = mountDialog()
    await openDialog(wrapper, PARTIAL_INVOICE)
    expect(wrapper.find('.el-input-number').exists()).toBe(true)

    // Paiement partiel de 20 000 sur les 50 000 restants.
    const input = wrapper.findComponent({ name: 'ElInputNumber' })
    input.vm.$emit('update:modelValue', 20_000)
    await nextTick()

    await buttonByText(wrapper, 'Enregistrer le paiement')!.trigger('click')
    await flushPromises()

    expect(mockInvoke).toHaveBeenCalledWith(
      'invoices:add-payment',
      expect.objectContaining({ invoice_id: 10, montant: 20_000 }),
    )
    expect(wrapper.text()).toContain('Reçu REC-001 enregistré')
    expect(wrapper.find('.recu-success').exists()).toBe(true)
    expect(wrapper.find('.el-input-number').exists()).toBe(false)
    expect(buttonByText(wrapper, 'Enregistrer le paiement')).toBeUndefined()

    await emitClosed(wrapper)

    expect(wrapper.find('.recu-success').exists()).toBe(false)
    expect(wrapper.find('.el-input-number').exists()).toBe(false)
    expect(buttonByText(wrapper, 'Enregistrer le paiement')).toBeUndefined()

    // Réouverture sur la facture mise à jour : le reçu a disparu et le
    // formulaire revient avec le nouveau reste (30 000) comme maximum.
    await openDialog(wrapper, partiallyPaidInvoice)

    const reopened = wrapper.findComponent({ name: 'ElInputNumber' })
    expect(reopened.exists()).toBe(true)
    expect(reopened.props('modelValue')).toBe(30_000)
    expect(reopened.props('max')).toBe(30_000)
    expect(reopened.props('min')).toBe(1)
    expect(wrapper.find('.recu-success').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('REC-001')
    expect(wrapper.text()).toContain('30000 GNF')
  })
})
