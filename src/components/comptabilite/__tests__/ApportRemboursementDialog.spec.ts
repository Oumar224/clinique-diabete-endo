// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
import type { ApportDto } from '@/composables/useApports'
import ApportRemboursementDialog from '../ApportRemboursementDialog.vue'
import { elementPlusStubs } from './elementPlusStubs'

const { mockRembourserApport, mockElMessage } = vi.hoisted(() => ({
  mockRembourserApport: vi.fn(),
  mockElMessage: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('element-plus', () => ({
  ElMessage: mockElMessage,
}))

vi.mock('@/composables/useApports', () => ({
  useApports: () => ({
    rembourserApport: mockRembourserApport,
    saving: ref(false),
    error: ref<string | null>(null),
  }),
}))

const PARTIAL_DEBT: ApportDto = {
  id: 1,
  reference: 'AP-20261005-0001',
  type: 'dette',
  libelle: 'Avance trésorerie',
  montant: 100_000,
  dateApport: '2026-10-05',
  modePaiement: 'virement',
  statut: 'ouvert',
  montantRembourse: 40_000,
  resteARembourser: 60_000,
  remboursements: [],
}

const PAID_DEBT: ApportDto = {
  ...PARTIAL_DEBT,
  id: 2,
  reference: 'AP-20261006-0001',
  statut: 'rembourse',
  montantRembourse: 100_000,
  resteARembourser: 0,
}

type DialogVm = {
  open: (target: ApportDto) => void
}

function mountDialog() {
  return mount(ApportRemboursementDialog, {
    global: { stubs: elementPlusStubs, directives: { loading: {} } },
  })
}

function openDialog(wrapper: ReturnType<typeof mountDialog>, target: ApportDto) {
  const vm = wrapper.vm as unknown as DialogVm
  vm.open(target)
  return flushPromises()
}

function emitClosed(wrapper: ReturnType<typeof mountDialog>) {
  wrapper.findComponent({ name: 'ElDialog' }).vm.$emit('closed')
  return nextTick()
}

describe('ApportRemboursementDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('rend le montant remboursable quand il reste une dette à rembourser', async () => {
    const wrapper = mountDialog()
    await openDialog(wrapper, PARTIAL_DEBT)

    const input = wrapper.findComponent({ name: 'ElInputNumber' })
    expect(input.exists()).toBe(true)
    expect(input.props('min')).toBe(1)
    expect(input.props('max')).toBe(60_000)
    expect(Number(input.props('max'))).toBeGreaterThanOrEqual(Number(input.props('min')))
    expect(wrapper.text()).not.toContain('Cette dette est entièrement remboursée.')
    expect(wrapper.findAll('button').some((b) => b.text().trim() === 'Rembourser')).toBe(true)
  })

  it('affiche l’état « entièrement remboursée » sans champ montant quand le reste est nul', async () => {
    const wrapper = mountDialog()
    await openDialog(wrapper, PAID_DEBT)

    expect(wrapper.text()).toContain('Cette dette est entièrement remboursée.')
    expect(wrapper.find('.el-input-number').exists()).toBe(false)
    expect(wrapper.findAll('button').some((b) => b.text().trim() === 'Rembourser')).toBe(false)
  })

  it('ne remonte plus le champ montant après la fermeture du dialogue', async () => {
    const wrapper = mountDialog()
    await openDialog(wrapper, PARTIAL_DEBT)
    expect(wrapper.find('.el-input-number').exists()).toBe(true)

    await emitClosed(wrapper)

    expect(wrapper.find('.el-input-number').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Cette dette est entièrement remboursée.')
    expect(wrapper.text()).not.toContain('Reste dû')

    // Réouverture sur une dette soldée : toujours aucun champ.
    await openDialog(wrapper, PAID_DEBT)
    expect(wrapper.text()).toContain('Cette dette est entièrement remboursée.')
    expect(wrapper.find('.el-input-number').exists()).toBe(false)
  })
})
