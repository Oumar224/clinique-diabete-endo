// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------
const { mockInvoke, mockElMessage, mockElMessageBox } = vi.hoisted(() => ({
  mockInvoke: vi.fn(),
  mockElMessage: { success: vi.fn(), error: vi.fn() },
  mockElMessageBox: { confirm: vi.fn(() => Promise.resolve()) },
}))

vi.stubGlobal('electronAPI', { invoke: mockInvoke })

vi.mock('element-plus', () => ({
  ElMessage: mockElMessage,
  ElMessageBox: mockElMessageBox,
}))

vi.mock('@element-plus/icons-vue', () => ({
  Plus: {}, Edit: {}, Delete: {}, Search: {},
}))

// ---------------------------------------------------------------------------
// Real composable — used to reset module-level state between tests
// ---------------------------------------------------------------------------
import { useContactOrigins } from '@/composables/useContactOrigins'
import ContactOriginTab from '../ContactOriginTab.vue'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const mockOrigins = [
  { id: 1, value: 'auto_refere', label: 'Auto-référé / De lui-même', sort_order: 1, is_active: true },
  { id: 2, value: 'centre_sante', label: 'Centre de santé', sort_order: 2, is_active: true },
  { id: 3, value: 'assurance', label: 'Assurance', sort_order: 10, is_active: false },
]

// ---------------------------------------------------------------------------
// Element Plus stubs
// ---------------------------------------------------------------------------
const EL_STUBS: Record<string, any> = {
  'el-input': {
    template: '<input class="el-input" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'clearable', 'placeholder', 'style'],
    emits: ['update:modelValue'],
  },
  'el-button': {
    template: '<button class="el-button" :disabled="loading" @click="$emit(\'click\')"><slot /></button>',
    props: ['loading', 'type', 'icon', 'size', 'text'],
    emits: ['click'],
  },
  'el-icon': { template: '<i class="el-icon"><slot /></i>' },
  'el-alert': {
    template: '<div class="el-alert" v-if="title"><span class="el-alert__title">{{ title }}</span><button class="el-alert__close-btn" @click="$emit(\'close\')"><slot /></button></div>',
    props: ['type', 'title', 'closable'],
    emits: ['close'],
  },
  'el-empty': { template: '<div class="el-empty"><slot />{{ description }}</div>', props: ['description'] },
  'el-table': {
    template: '<div class="el-table"><slot /></div>',
    props: ['data', 'loading', 'border', 'rowKey'],
  },
  'el-table-column': {
    template: '<div class="el-table-column"><slot :row="{ id: 1, value: \'auto_refere\', label: \'Auto-référé\', sort_order: 1, is_active: true }" /></div>',
    props: ['prop', 'label', 'width', 'minWidth', 'align'],
  },
  'el-switch': {
    template: '<input class="el-switch" type="checkbox" :checked="modelValue" @change="$emit(\'change\', $event.target.checked)" />',
    props: ['modelValue', 'size'],
    emits: ['change'],
  },
  'el-row': { template: '<div class="el-row"><slot /></div>', props: ['justify'] },
  'el-pagination': { template: '<div class="el-pagination" />', props: ['total', 'pageSizes', 'layout', 'currentPage', 'pageSize'] },
  'ContactOriginFormDialog': { template: '<div class="cof-dialog" />' },
}

async function waitAsync() {
  await nextTick()
  await nextTick()
  await nextTick()
  await nextTick()
  await nextTick()
}

describe('ContactOriginTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ''

    const co = useContactOrigins()
    co.origins.value = []
    co.loading.value = false
    co.error.value = null

    mockInvoke.mockImplementation((channel: string) => {
      if (channel === 'contact-origins:list') {
        return Promise.resolve({ success: true, data: [] })
      }
      return Promise.resolve({ success: true, data: null })
    })
  })

  function createWrapper() {
    return mount(ContactOriginTab, {
      global: {
        stubs: EL_STUBS,
        directives: {
          loading: {},
        },
      },
      attachTo: document.body,
    })
  }

  // -----------------------------------------------------------------------
  // Rendu et cycle de vie
  // -----------------------------------------------------------------------
  it('affiche le composant sans erreur', () => {
    const wrapper = createWrapper()
    expect(wrapper.exists()).toBe(true)
  })

  it('appelle fetchOrigins au montage', async () => {
    createWrapper()
    await waitAsync()
    expect(mockInvoke).toHaveBeenCalledWith('contact-origins:list', undefined)
  })

  it('loading est true après le montage (fetchOrigins en cours)', async () => {
    mockInvoke.mockImplementation(() => new Promise(() => {}))
    const wrapper = createWrapper()
    const vm = wrapper.vm as any
    expect(vm.loading).toBe(true)
  })

  // -----------------------------------------------------------------------
  // Affichage de la liste
  // -----------------------------------------------------------------------
  it('affiche "Aucun mécanisme de contact" quand la liste est vide', async () => {
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === 'contact-origins:list') {
        return Promise.resolve({ success: true, data: [] })
      }
      return Promise.resolve({ success: true, data: null })
    })

    const wrapper = createWrapper()
    await waitAsync()

    expect(wrapper.find('.cde-empty').exists()).toBe(true)
    expect(wrapper.text()).toContain('Aucun mécanisme de contact')
  })

  it('affiche la liste des origines dans le tableau', async () => {
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === 'contact-origins:list') {
        return Promise.resolve({ success: true, data: mockOrigins })
      }
      return Promise.resolve({ success: true, data: null })
    })

    const wrapper = createWrapper()
    await waitAsync()

    const vm = wrapper.vm as any
    expect(vm.filteredList.length).toBe(3)
    expect(vm.filteredList[0].label).toContain('Auto-référé')
    expect(vm.filteredList[1].label).toContain('Centre de santé')
    expect(vm.filteredList[2].label).toContain('Assurance')
  })

  // -----------------------------------------------------------------------
  // Error state
  // -----------------------------------------------------------------------
  it('affiche l\'alerte d\'erreur quand fetchOrigins échoue', async () => {
    mockInvoke.mockRejectedValue(new Error('Erreur de chargement'))

    const wrapper = createWrapper()
    await waitAsync()

    expect(wrapper.find('.el-alert').exists()).toBe(true)
    expect(wrapper.text()).toContain('Erreur de chargement')
  })

  it('efface l\'erreur quand on clique sur fermer', async () => {
    mockInvoke.mockRejectedValue(new Error('Erreur temporaire'))

    const wrapper = createWrapper()
    await waitAsync()

    const co = useContactOrigins()
    expect(co.error.value).toBe('Erreur temporaire')

    const closeBtn = wrapper.find('.el-alert__close-btn')
    await closeBtn.trigger('click')

    expect(co.error.value).toBeNull()
  })

  // -----------------------------------------------------------------------
  // Recherche
  // -----------------------------------------------------------------------
  it('filtre les origines par texte de recherche', async () => {
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === 'contact-origins:list') {
        return Promise.resolve({ success: true, data: mockOrigins })
      }
      return Promise.resolve({ success: true, data: null })
    })

    const wrapper = createWrapper()
    await waitAsync()

    const vm = wrapper.vm as any
    expect(vm.filteredList.length).toBe(3)

    vm.searchQuery = 'assurance'
    await nextTick()

    expect(vm.filteredList.length).toBe(1)
    expect(vm.filteredList[0].value).toBe('assurance')
  })

  it('filtre par libellé (insensible à la casse)', async () => {
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === 'contact-origins:list') {
        return Promise.resolve({ success: true, data: mockOrigins })
      }
      return Promise.resolve({ success: true, data: null })
    })

    const wrapper = createWrapper()
    await waitAsync()

    const vm = wrapper.vm as any
    vm.searchQuery = 'CENTRE'
    await nextTick()

    expect(vm.filteredList.length).toBe(1)
    expect(vm.filteredList[0].value).toBe('centre_sante')
  })

  it('remet la pagination à 1 quand on cherche', async () => {
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === 'contact-origins:list') {
        return Promise.resolve({ success: true, data: mockOrigins })
      }
      return Promise.resolve({ success: true, data: null })
    })

    const wrapper = createWrapper()
    await waitAsync()

    const vm = wrapper.vm as any
    vm.paginator.currPage = 3

    vm.onSearch()

    expect(vm.paginator.currPage).toBe(1)
  })

  // -----------------------------------------------------------------------
  // Actions — Création
  // -----------------------------------------------------------------------
  it('ouvre le dialog via openCreate', () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as any

    const dialogOpen = vi.fn()
    vm.dialogRef = { open: dialogOpen }

    vm.openCreate()

    expect(dialogOpen).toHaveBeenCalledWith()
  })

  // -----------------------------------------------------------------------
  // Actions — Édition
  // -----------------------------------------------------------------------
  it('ouvre le dialog en mode édition via openEdit', () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as any

    const dialogOpen = vi.fn()
    vm.dialogRef = { open: dialogOpen }

    const origin = mockOrigins[1]
    vm.openEdit(origin)

    expect(dialogOpen).toHaveBeenCalledWith(origin)
  })

  // -----------------------------------------------------------------------
  // Actions — Toggle (activer/désactiver)
  // -----------------------------------------------------------------------
  it('appelle updateOrigin quand on bascule le switch', async () => {
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === 'contact-origins:list') {
        return Promise.resolve({ success: true, data: mockOrigins })
      }
      if (channel === 'contact-origins:update') {
        return Promise.resolve({ success: true, data: { ...mockOrigins[0], is_active: false } })
      }
      return Promise.resolve({ success: true, data: null })
    })

    const wrapper = createWrapper()
    await waitAsync()

    const vm = wrapper.vm as any
    await vm.handleToggle(mockOrigins[0])

    expect(mockInvoke).toHaveBeenCalledWith('contact-origins:update', { id: 1, is_active: false })
  })

  // -----------------------------------------------------------------------
  // Actions — Suppression
  // -----------------------------------------------------------------------
  it('affiche une confirmation avant de supprimer une origine', async () => {
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === 'contact-origins:list') {
        return Promise.resolve({ success: true, data: mockOrigins })
      }
      if (channel === 'contact-origins:delete') {
        return Promise.resolve({ success: true, data: null })
      }
      return Promise.resolve({ success: true, data: null })
    })

    const wrapper = createWrapper()
    await waitAsync()

    const vm = wrapper.vm as any
    mockElMessageBox.confirm.mockResolvedValueOnce(undefined)

    await vm.handleDelete(mockOrigins[0])

    expect(mockElMessageBox.confirm).toHaveBeenCalled()
    expect(mockInvoke).toHaveBeenCalledWith('contact-origins:delete', { id: 1 })
    expect(mockElMessage.success).toHaveBeenCalledWith('Mécanisme supprimé')
  })

  it('annule la suppression si l\'utilisateur ferme la confirmation', async () => {
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === 'contact-origins:list') {
        return Promise.resolve({ success: true, data: mockOrigins })
      }
      return Promise.resolve({ success: true, data: null })
    })

    const wrapper = createWrapper()
    await waitAsync()

    const vm = wrapper.vm as any
    mockElMessageBox.confirm.mockRejectedValueOnce(new Error('cancel'))

    await vm.handleDelete(mockOrigins[0])

    expect(mockElMessageBox.confirm).toHaveBeenCalled()
    expect(mockInvoke).not.toHaveBeenCalledWith('contact-origins:delete', { id: 1 })
  })

  // -----------------------------------------------------------------------
  // Pagination
  // -----------------------------------------------------------------------
  it('paginatedList ne retourne que les éléments de la page courante', async () => {
    const manyOrigins = Array.from({ length: 25 }, (_, i) => ({
      id: i + 1,
      value: `origin_${i + 1}`,
      label: `Origine ${i + 1}`,
      sort_order: i + 1,
      is_active: true,
    }))

    mockInvoke.mockImplementation((channel: string) => {
      if (channel === 'contact-origins:list') {
        return Promise.resolve({ success: true, data: manyOrigins })
      }
      return Promise.resolve({ success: true, data: null })
    })

    const wrapper = createWrapper()
    await waitAsync()

    const vm = wrapper.vm as any
    expect(vm.paginatedList.length).toBe(10)
    expect(vm.paginatedList[0].id).toBe(1)
    expect(vm.paginatedList[9].id).toBe(10)

    vm.paginator.currPage = 2
    await nextTick()

    expect(vm.paginatedList.length).toBe(10)
    expect(vm.paginatedList[0].id).toBe(11)
    expect(vm.paginatedList[9].id).toBe(20)
  })

  // -----------------------------------------------------------------------
  // onSaved
  // -----------------------------------------------------------------------
  it('remet la pagination à 1 quand onSaved est appelé', () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as any
    vm.paginator.currPage = 3

    vm.onSaved()

    expect(vm.paginator.currPage).toBe(1)
  })
})
