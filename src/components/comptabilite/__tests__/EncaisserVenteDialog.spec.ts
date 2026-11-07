// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
import type { VentePharmacieDto } from '@/composables/usePharmacieComptabilite'
import EncaisserVenteDialog from '../EncaisserVenteDialog.vue'
import { elementPlusStubs } from './elementPlusStubs'

const { mockEncaisser, mockElMessage } = vi.hoisted(() => ({
  mockEncaisser: vi.fn(),
  mockElMessage: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('element-plus', () => ({
  ElMessage: mockElMessage,
}))

vi.mock('@/composables/usePharmacieComptabilite', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/composables/usePharmacieComptabilite')>()
  return {
    ...actual,
    usePharmacieComptabilite: () => ({
      encaisser: mockEncaisser,
      saving: ref(false),
    }),
  }
})

vi.mock('@/composables/useAuth', () => ({
  useAuth: () => ({ user: ref({ id: 7, nom: 'Diallo', prenom: 'Mamadou' }) }),
}))

vi.mock('@/currency/useCurrency', () => ({
  useCurrency: () => ({
    formatCurrency: (value: number) => `${value} GNF`,
  }),
}))

const CREDIT_SALE: VentePharmacieDto = {
  id: 42,
  dateVente: '2026-10-25',
  typeVente: 'facturee',
  statut: 'servie',
  patient: { id: 7, nom: 'Diallo', prenom: 'Aminata' },
  lignes: [],
  paiements: [],
  montantTotal: 80_000,
  montantPaye: 35_000,
  reste: 45_000,
  statutFinancier: 'partielle',
  prixManquant: false,
}

type DialogVm = {
  open: (vente: VentePharmacieDto) => void
}

function mountDialog() {
  return mount(EncaisserVenteDialog, {
    global: { stubs: elementPlusStubs, directives: { loading: {} } },
  })
}

function openDialog(wrapper: ReturnType<typeof mountDialog>, vente: VentePharmacieDto) {
  const vm = wrapper.vm as unknown as DialogVm
  vm.open(vente)
  return flushPromises()
}

function emitClosed(wrapper: ReturnType<typeof mountDialog>) {
  wrapper.findComponent({ name: 'ElDialog' }).vm.$emit('closed')
  return nextTick()
}

describe('EncaisserVenteDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rend la saisie du montant quand il reste un solde à encaisser', async () => {
    const wrapper = mountDialog()
    await openDialog(wrapper, CREDIT_SALE)

    const input = wrapper.findComponent({ name: 'ElInputNumber' })
    expect(input.exists()).toBe(true)
    expect(input.props('min')).toBe(1)
    expect(input.props('max')).toBe(45_000)
    expect(Number(input.props('max'))).toBeGreaterThanOrEqual(Number(input.props('min')))
    expect(wrapper.text()).toContain('Aminata Diallo')
  })

  it('masque la saisie quand le reste à payer est nul', async () => {
    const wrapper = mountDialog()
    await openDialog(wrapper, {
      ...CREDIT_SALE,
      montantPaye: 80_000,
      reste: 0,
      statutFinancier: 'payee',
    })

    expect(wrapper.find('.el-input-number').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Montant encaissé (GNF)')
    expect(wrapper.text()).toContain('Cette vente est entièrement réglée.')
  })

  it('masque la saisie après la fermeture du dialogue', async () => {
    const wrapper = mountDialog()
    await openDialog(wrapper, CREDIT_SALE)
    expect(wrapper.find('.el-input-number').exists()).toBe(true)

    await emitClosed(wrapper)

    expect(wrapper.find('.el-input-number').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Aminata Diallo')
  })
})
