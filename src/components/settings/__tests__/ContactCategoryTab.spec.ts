// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

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

import { useContactCategories } from '@/composables/useContactCategories'
import ContactCategoryTab from '../ContactCategoryTab.vue'

const mockCategories = [
  { id: 1, value: 'consultation', label: 'Consultation', sort_order: 1, is_active: true },
  { id: 2, value: 'urgence', label: 'Urgence', sort_order: 2, is_active: true },
  { id: 3, value: 'hospitalisation', label: 'Hospitalisation', sort_order: 4, is_active: true },
]

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
    template: '<div class="el-table-column"><slot :row="{ id: 1, value: \'consultation\', label: \'Consultation\', sort_order: 1, is_active: true }" /></div>',
    props: ['prop', 'label', 'width', 'minWidth', 'align'],
  },
  'el-switch': {
    template: '<input class="el-switch" type="checkbox" :checked="modelValue" @change="$emit(\'change\', $event.target.checked)" />',
    props: ['modelValue', 'size'],
    emits: ['change'],
  },
  'el-row': { template: '<div class="el-row"><slot /></div>', props: ['justify'] },
  'el-pagination': { template: '<div class="el-pagination" />', props: ['total', 'pageSizes', 'layout', 'currentPage', 'pageSize'] },
  'ContactCategoryFormDialog': { template: '<div class="ccf-dialog" />' },
}

async function waitAsync() {
  await nextTick()
  await nextTick()
  await nextTick()
  await nextTick()
  await nextTick()
}

describe('ContactCategoryTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ''

    const cc = useContactCategories()
    cc.categories.value = []
    cc.loading.value = false
    cc.error.value = null

    mockInvoke.mockImplementation((channel: string) => {
      if (channel === 'contact-categories:list') {
        return Promise.resolve({ success: true, data: [] })
      }
      return Promise.resolve({ success: true, data: null })
    })
  })

  function createWrapper() {
    return mount(ContactCategoryTab, {
      global: {
        stubs: EL_STUBS,
        directives: {
          loading: {},
        },
      },
      attachTo: document.body,
    })
  }

  it('affiche le composant sans erreur', () => {
    const wrapper = createWrapper()
    expect(wrapper.exists()).toBe(true)
  })

  it('appelle fetchCategories au montage', async () => {
    createWrapper()
    await waitAsync()
    expect(mockInvoke).toHaveBeenCalledWith('contact-categories:list', undefined)
  })

  it('loading est true après le montage (fetchCategories en cours)', async () => {
    mockInvoke.mockImplementation(() => new Promise(() => {}))
    const wrapper = createWrapper()
    const vm = wrapper.vm as any
    expect(vm.loading).toBe(true)
  })

  it('affiche "Aucun type de contact" quand la liste est vide', async () => {
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === 'contact-categories:list') {
        return Promise.resolve({ success: true, data: [] })
      }
      return Promise.resolve({ success: true, data: null })
    })

    const wrapper = createWrapper()
    await waitAsync()

    expect(wrapper.find('.el-empty').exists()).toBe(true)
    expect(wrapper.text()).toContain('Aucun type de contact')
  })

  it('affiche la liste des catégories dans le tableau', async () => {
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === 'contact-categories:list') {
        return Promise.resolve({ success: true, data: mockCategories })
      }
      return Promise.resolve({ success: true, data: null })
    })

    const wrapper = createWrapper()
    await waitAsync()

    const vm = wrapper.vm as any
    expect(vm.filteredList.length).toBe(3)
    expect(vm.filteredList[0].label).toContain('Consultation')
    expect(vm.filteredList[1].label).toContain('Urgence')
    expect(vm.filteredList[2].label).toContain('Hospitalisation')
  })

  it('affiche l\'alerte d\'erreur quand fetchCategories échoue', async () => {
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

    const cc = useContactCategories()
    expect(cc.error.value).toBe('Erreur temporaire')

    const closeBtn = wrapper.find('.el-alert__close-btn')
    await closeBtn.trigger('click')

    expect(cc.error.value).toBeNull()
  })

  it('filtre les catégories par texte de recherche', async () => {
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === 'contact-categories:list') {
        return Promise.resolve({ success: true, data: mockCategories })
      }
      return Promise.resolve({ success: true, data: null })
    })

    const wrapper = createWrapper()
    await waitAsync()

    const vm = wrapper.vm as any
    expect(vm.filteredList.length).toBe(3)

    vm.searchQuery = 'urgence'
    await nextTick()

    expect(vm.filteredList.length).toBe(1)
    expect(vm.filteredList[0].value).toBe('urgence')
  })

  it('filtre par libellé (insensible à la casse)', async () => {
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === 'contact-categories:list') {
        return Promise.resolve({ success: true, data: mockCategories })
      }
      return Promise.resolve({ success: true, data: null })
    })

    const wrapper = createWrapper()
    await waitAsync()

    const vm = wrapper.vm as any
    vm.searchQuery = 'HOSPITALISATION'
    await nextTick()

    expect(vm.filteredList.length).toBe(1)
    expect(vm.filteredList[0].value).toBe('hospitalisation')
  })

  it('remet la pagination à 1 quand on cherche', async () => {
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === 'contact-categories:list') {
        return Promise.resolve({ success: true, data: mockCategories })
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

  it('ouvre le dialog via openCreate', () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as any

    const dialogOpen = vi.fn()
    vm.dialogRef = { open: dialogOpen }

    vm.openCreate()

    expect(dialogOpen).toHaveBeenCalledWith()
  })

  it('ouvre le dialog en mode édition via openEdit', () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as any

    const dialogOpen = vi.fn()
    vm.dialogRef = { open: dialogOpen }

    const category = mockCategories[1]
    vm.openEdit(category)

    expect(dialogOpen).toHaveBeenCalledWith(category)
  })

  it('appelle updateCategory quand on bascule le switch', async () => {
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === 'contact-categories:list') {
        return Promise.resolve({ success: true, data: mockCategories })
      }
      if (channel === 'contact-categories:update') {
        return Promise.resolve({ success: true, data: { ...mockCategories[0], is_active: false } })
      }
      return Promise.resolve({ success: true, data: null })
    })

    const wrapper = createWrapper()
    await waitAsync()

    const vm = wrapper.vm as any
    await vm.handleToggle(mockCategories[0])

    expect(mockInvoke).toHaveBeenCalledWith('contact-categories:update', { id: 1, is_active: false })
  })

  it('affiche une confirmation avant de supprimer une catégorie', async () => {
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === 'contact-categories:list') {
        return Promise.resolve({ success: true, data: mockCategories })
      }
      if (channel === 'contact-categories:delete') {
        return Promise.resolve({ success: true, data: null })
      }
      return Promise.resolve({ success: true, data: null })
    })

    const wrapper = createWrapper()
    await waitAsync()

    const vm = wrapper.vm as any
    mockElMessageBox.confirm.mockResolvedValueOnce(undefined)

    await vm.handleDelete(mockCategories[0])

    expect(mockElMessageBox.confirm).toHaveBeenCalled()
    expect(mockInvoke).toHaveBeenCalledWith('contact-categories:delete', { id: 1 })
    expect(mockElMessage.success).toHaveBeenCalledWith('Type supprimé')
  })

  it('annule la suppression si l\'utilisateur ferme la confirmation', async () => {
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === 'contact-categories:list') {
        return Promise.resolve({ success: true, data: mockCategories })
      }
      return Promise.resolve({ success: true, data: null })
    })

    const wrapper = createWrapper()
    await waitAsync()

    const vm = wrapper.vm as any
    mockElMessageBox.confirm.mockRejectedValueOnce(new Error('cancel'))

    await vm.handleDelete(mockCategories[0])

    expect(mockElMessageBox.confirm).toHaveBeenCalled()
    expect(mockInvoke).not.toHaveBeenCalledWith('contact-categories:delete', { id: 1 })
  })

  it('paginatedList ne retourne que les éléments de la page courante', async () => {
    const manyCategories = Array.from({ length: 25 }, (_, i) => ({
      id: i + 1,
      value: `cat_${i + 1}`,
      label: `Catégorie ${i + 1}`,
      sort_order: i + 1,
      is_active: true,
    }))

    mockInvoke.mockImplementation((channel: string) => {
      if (channel === 'contact-categories:list') {
        return Promise.resolve({ success: true, data: manyCategories })
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

  it('remet la pagination à 1 quand onSaved est appelé', () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as any
    vm.paginator.currPage = 3

    vm.onSaved()

    expect(vm.paginator.currPage).toBe(1)
  })
})
