// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'
import SortieStockDialog from '../SortieStockDialog.vue'
import { elementPlusStubs } from '../../comptabilite/__tests__/elementPlusStubs'

const { mockSortieManuelle, mockElMessage } = vi.hoisted(() => ({
  mockSortieManuelle: vi.fn(),
  mockElMessage: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('element-plus', () => ({
  ElMessage: mockElMessage,
}))

vi.mock('@/composables/useStock', () => ({
  useStock: () => ({ sortieManuelle: mockSortieManuelle }),
}))

vi.mock('@/composables/useAuth', () => ({
  useAuth: () => ({ user: ref({ id: 7, nom: 'Diallo', prenom: 'Mamadou' }) }),
}))

type SortieParams = {
  medicamentId: number
  label: string
  stockTotal: number
}

type DialogVm = {
  open: (params: SortieParams) => void
}

function mountDialog() {
  return mount(SortieStockDialog, {
    global: { stubs: elementPlusStubs },
  })
}

function openDialog(wrapper: ReturnType<typeof mountDialog>, params: SortieParams) {
  const vm = wrapper.vm as unknown as DialogVm
  vm.open(params)
  return flushPromises()
}

describe('SortieStockDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('reste fermé et ne monte aucun champ quand le stock est nul', async () => {
    const wrapper = mountDialog()
    await openDialog(wrapper, {
      medicamentId: 1,
      label: 'Metformine (Glucophage)',
      stockTotal: 0,
    })

    expect(wrapper.find('.el-dialog').exists()).toBe(false)
    expect(wrapper.find('.el-input-number').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Aucun stock disponible pour cet article.')
  })

  it('monte le formulaire avec les bornes min 1 / max stockTotal quand le stock est disponible', async () => {
    const wrapper = mountDialog()
    await openDialog(wrapper, {
      medicamentId: 1,
      label: 'Metformine (Glucophage)',
      stockTotal: 50,
    })

    expect(wrapper.find('.el-dialog').exists()).toBe(true)
    const input = wrapper.findComponent({ name: 'ElInputNumber' })
    expect(input.exists()).toBe(true)
    expect(input.props('modelValue')).toBe(1)
    expect(input.props('min')).toBe(1)
    expect(input.props('max')).toBe(50)
    expect(input.props('precision')).toBe(0)
    expect(Number(input.props('max'))).toBeGreaterThanOrEqual(Number(input.props('min')))
    // L'article est porté par la prop modelValue du stub el-input (pas du texte).
    const articleInput = wrapper.findAllComponents({ name: 'ElInput' })[0]
    expect(articleInput.props('modelValue')).toBe('Metformine (Glucophage) (stock : 50)')
    expect(wrapper.text()).not.toContain('Aucun stock disponible pour cet article.')
  })
})
