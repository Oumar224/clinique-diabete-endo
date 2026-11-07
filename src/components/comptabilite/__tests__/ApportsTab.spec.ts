// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { cloneVNode, h, inject, provide } from 'vue'
import type { Ref } from 'vue'
import type { Mock } from 'vitest'
import type { ApportDto } from '@/composables/useApports'
import ApportsTab from '../ApportsTab.vue'

interface ApportsMock {
  apports: Ref<ApportDto[]>
  loading: Ref<boolean>
  saving: Ref<boolean>
  error: Ref<string | null>
  clearError: Mock
  fetchApports: Mock
  annulerApport: Mock
  deleteApport: Mock
  deleteRemboursement: Mock
}

const { mockElMessage, mockConfirm, dialogOpens, apportsMock } = vi.hoisted(() => ({
  mockElMessage: { success: vi.fn(), warning: vi.fn(), info: vi.fn(), error: vi.fn() },
  mockConfirm: vi.fn(),
  dialogOpens: {
    form: vi.fn(),
    remboursement: vi.fn(),
  },
  apportsMock: {} as ApportsMock,
}))

vi.mock('@/composables/useApports', async () => {
  const { ref } = await import('vue')
  const apports = ref<ApportDto[]>([])
  const loading = ref(false)
  const saving = ref(false)
  const error = ref<string | null>(null)
  const clearError = vi.fn(() => {
    error.value = null
  })
  const fetchApports = vi.fn(() => Promise.resolve(apports.value))
  const annulerApport = vi.fn()
  const deleteApport = vi.fn()
  const deleteRemboursement = vi.fn()

  const state = {
    apports,
    loading,
    saving,
    error,
    clearError,
    fetchApports,
    annulerApport,
    deleteApport,
    deleteRemboursement,
  }
  Object.assign(apportsMock, state)

  return {
    useApports: () => state,
    APPORT_TYPE_LABEL: { fonds_propres: 'Fonds propres', dette: 'Dette' },
    APPORT_STATUT_LABEL: { ouvert: 'Ouvert', rembourse: 'Remboursé', annule: 'Annulé' },
    APPORT_STATUT_TONE: { ouvert: 'info', rembourse: 'success', annule: 'muted' },
  }
})

vi.mock('element-plus', () => ({
  ElMessage: mockElMessage,
  ElMessageBox: { confirm: mockConfirm },
}))

vi.mock('@element-plus/icons-vue', () => ({
  ArrowDown: { name: 'ArrowDown', render: () => null },
  Plus: { name: 'Plus', render: () => null },
  Refresh: { name: 'Refresh', render: () => null },
  Search: { name: 'Search', render: () => null },
}))

vi.mock('@/components/comptabilite/ApportFormDialog.vue', () => ({
  default: {
    name: 'ApportFormDialog',
    template: '<div />',
    emits: ['saved'],
    methods: { open: dialogOpens.form },
  },
}))
vi.mock('@/components/comptabilite/ApportRemboursementDialog.vue', () => ({
  default: {
    name: 'ApportRemboursementDialog',
    template: '<div />',
    emits: ['saved'],
    methods: { open: dialogOpens.remboursement },
  },
}))

const DROPDOWN_COMMAND = Symbol('dropdown-command')

const stubs = {
  'el-table': {
    props: ['data'],
    setup(props: { data?: unknown[] }, { slots }: { slots: { default?: () => unknown[] } }) {
      return () =>
        h(
          'div',
          { class: 'el-table' },
          (props.data ?? []).map((row, rowIndex) =>
            h(
              'div',
              { class: 'el-table__row', key: rowIndex },
              (slots.default?.() ?? []).map((vnode, columnIndex) =>
                cloneVNode(vnode as never, { row, key: `${rowIndex}-${columnIndex}` }),
              ),
            ),
          ),
        )
    },
  },
  'el-table-column': {
    template: '<div class="el-table-column"><slot :row="row" /></div>',
    props: ['row', 'label', 'prop', 'width', 'minWidth', 'align', 'fixed', 'size', 'type'],
  },
  'el-input': {
    template: '<input class="el-input" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'placeholder', 'clearable'],
    emits: ['update:modelValue', 'clear'],
  },
  'el-select': {
    template: '<select class="el-select"><slot /></select>',
    props: ['modelValue', 'placeholder', 'clearable'],
  },
  'el-option': {
    template: '<option :value="value">{{ label }}</option>',
    props: ['label', 'value'],
  },
  'el-date-picker': {
    template: '<input class="el-date-picker" :value="modelValue" />',
    props: ['modelValue', 'type', 'valueFormat', 'clearable'],
  },
  'el-button': {
    template: '<button class="el-button" :disabled="disabled" @click="$emit(\'click\', $event)"><slot /></button>',
    props: ['type', 'text', 'size', 'icon', 'loading', 'disabled', 'title'],
    emits: ['click'],
  },
  'el-alert': {
    template: '<div class="el-alert"><span class="el-alert__title">{{ title }}</span><slot /></div>',
    props: ['title', 'type', 'closable', 'showIcon'],
  },
  'el-icon': {
    template: '<span class="el-icon"><slot /></span>',
  },
  'el-dropdown': {
    emits: ['command'],
    setup(_props: unknown, { slots, emit }: { slots: Record<string, (() => unknown) | undefined>; emit: (event: string, payload: unknown) => void }) {
      provide(DROPDOWN_COMMAND, (command: unknown) => emit('command', command))
      return () => h('div', { class: 'el-dropdown' }, [slots.default?.(), slots.dropdown?.()])
    },
  },
  'el-dropdown-menu': {
    template: '<div class="el-dropdown-menu"><slot /></div>',
  },
  'el-dropdown-item': {
    props: ['command', 'divided', 'disabled'],
    setup(props: { command?: unknown }, { slots }: { slots: { default?: () => unknown } }) {
      const send = inject<(command: unknown) => void>(DROPDOWN_COMMAND, () => {})
      return () =>
        h(
          'button',
          { class: 'el-dropdown-item', onClick: () => send(props.command) },
          slots.default?.(),
        )
    },
  },
}

const OPEN_APPORT: ApportDto = {
  id: 1,
  reference: 'AP-20261005-0001',
  type: 'dette',
  libelle: 'Avance trésorerie',
  montant: 100000,
  dateApport: '2026-10-05',
  modePaiement: 'virement',
  statut: 'ouvert',
  montantRembourse: 0,
  resteARembourser: 100000,
  remboursements: [
    {
      id: 7,
      apportId: 1,
      montant: 25000,
      dateRemboursement: '2026-10-10',
      modePaiement: 'espèces',
      reference: 'RB-001',
      notes: null,
    },
  ],
}

const CANCELLED_APPORT: ApportDto = {
  id: 2,
  reference: 'AP-20261006-0001',
  type: 'fonds_propres',
  libelle: 'Apport annulé',
  montant: 50000,
  dateApport: '2026-10-06',
  modePaiement: 'espèces',
  statut: 'annule',
  montantRembourse: 0,
  resteARembourser: 0,
  remboursements: [],
}

function mountTab() {
  return mount(ApportsTab, {
    global: {
      stubs,
      directives: { loading: {} },
    },
  })
}

function dropdownItemByText(wrapper: ReturnType<typeof mountTab>, text: string) {
  return wrapper.findAll('.el-dropdown-item').find((item) => item.text().trim() === text)
}

describe('ApportsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockConfirm.mockResolvedValue(undefined)
    apportsMock.apports.value = []
    apportsMock.loading.value = false
    apportsMock.saving.value = false
    apportsMock.error.value = null
  })

  it('affiche un total d’apports explicitement brut', async () => {
    apportsMock.apports.value = [OPEN_APPORT, CANCELLED_APPORT]
    const wrapper = mountTab()
    await flushPromises()

    const labels = wrapper.findAll('.cde-summary__label').map((node) => node.text())
    expect(labels).toEqual([
      'Total apports (brut)',
      'Fonds propres',
      'Dettes ouvertes',
      'Remboursé',
    ])
  })

  it('émet changed après une annulation réussie', async () => {
    apportsMock.apports.value = [OPEN_APPORT]
    apportsMock.annulerApport.mockResolvedValue({ ...OPEN_APPORT, statut: 'annule' })
    const wrapper = mountTab()
    await flushPromises()

    await dropdownItemByText(wrapper, "Annuler l'apport")!.trigger('click')
    await flushPromises()

    expect(mockConfirm).toHaveBeenCalledWith(
      "Annuler l'apport AP-20261005-0001 ?",
      "Annuler l'apport",
      expect.objectContaining({ type: 'warning' }),
    )
    expect(apportsMock.annulerApport).toHaveBeenCalledWith(1)
    expect(mockElMessage.success).toHaveBeenCalledWith('Apport annulé')
    expect(apportsMock.fetchApports).toHaveBeenCalledTimes(2)
    expect(wrapper.emitted('changed')).toHaveLength(1)
  })

  it('émet changed après une suppression réussie', async () => {
    apportsMock.apports.value = [CANCELLED_APPORT]
    apportsMock.deleteApport.mockResolvedValue(true)
    const wrapper = mountTab()
    await flushPromises()

    await dropdownItemByText(wrapper, 'Supprimer')!.trigger('click')
    await flushPromises()

    expect(mockConfirm).toHaveBeenCalledWith(
      "Supprimer définitivement l'apport AP-20261006-0001 ?",
      "Supprimer l'apport",
      expect.objectContaining({ type: 'warning' }),
    )
    expect(apportsMock.deleteApport).toHaveBeenCalledWith(2)
    expect(mockElMessage.success).toHaveBeenCalledWith('Apport supprimé')
    expect(apportsMock.fetchApports).toHaveBeenCalledTimes(2)
    expect(wrapper.emitted('changed')).toHaveLength(1)
  })

  it('n’émet pas changed quand la mutation échoue', async () => {
    apportsMock.apports.value = [OPEN_APPORT, CANCELLED_APPORT]
    apportsMock.annulerApport.mockResolvedValue(null)
    apportsMock.deleteApport.mockResolvedValue(false)
    const wrapper = mountTab()
    await flushPromises()

    await dropdownItemByText(wrapper, "Annuler l'apport")!.trigger('click')
    await flushPromises()
    await dropdownItemByText(wrapper, 'Supprimer')!.trigger('click')
    await flushPromises()

    expect(mockElMessage.error).toHaveBeenCalledWith('Annulation impossible')
    expect(mockElMessage.error).toHaveBeenCalledWith('Suppression impossible')
    expect(wrapper.emitted('changed')).toBeUndefined()
  })

  it('émet changed quand le dialogue de formulaire signale un enregistrement', async () => {
    apportsMock.apports.value = [OPEN_APPORT]
    const wrapper = mountTab()
    await flushPromises()

    const formDialog = wrapper.findComponent({ name: 'ApportFormDialog' })
    expect(formDialog.exists()).toBe(true)
    formDialog.vm.$emit('saved')
    await flushPromises()

    expect(apportsMock.fetchApports).toHaveBeenCalledTimes(2)
    expect(wrapper.emitted('changed')).toHaveLength(1)
  })

  it('émet changed après la suppression d’un remboursement', async () => {
    apportsMock.apports.value = [OPEN_APPORT]
    apportsMock.deleteRemboursement.mockResolvedValue({ ...OPEN_APPORT, remboursements: [] })
    const wrapper = mountTab()
    await flushPromises()

    const removeButton = wrapper
      .findAll('.apports-tab__remboursements button')
      .find((button) => button.text().trim() === 'Supprimer')
    expect(removeButton).toBeTruthy()

    await removeButton!.trigger('click')
    await flushPromises()

    expect(mockConfirm).toHaveBeenCalledWith(
      'Supprimer ce remboursement ? Le statut de la dette sera recalculé.',
      'Supprimer le remboursement',
      expect.objectContaining({ type: 'warning' }),
    )
    expect(apportsMock.deleteRemboursement).toHaveBeenCalledWith(7)
    expect(mockElMessage.success).toHaveBeenCalledWith('Remboursement supprimé')
    expect(apportsMock.fetchApports).toHaveBeenCalledTimes(2)
    expect(wrapper.emitted('changed')).toHaveLength(1)
  })
})
