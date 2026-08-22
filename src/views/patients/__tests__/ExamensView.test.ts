// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { computed, nextTick } from 'vue'
import ExamensView from '../ExamensView.vue'
import { formatDateTime } from '@/utils/date'

// ---------------------------------------------------------------------------
// Hoisted mocks — available before any vi.mock() call
// ---------------------------------------------------------------------------
const { mockIpcInvoke } = vi.hoisted(() => ({
  mockIpcInvoke: vi.fn(),
}))

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------
vi.mock('@/utils/ipc', () => ({
  ipcInvoke: mockIpcInvoke,
}))

vi.mock('vue-router', () => ({
  useRoute: vi.fn(() => ({ params: { id: '42' } })),
}))

vi.mock('@element-plus/icons-vue', () => {
  const stub = { render: () => {} }
  return new Proxy({} as Record<string, any>, {
    get(_, key) {
      if (key === 'default') return undefined
      return stub
    },
    has() { return true },
  })
})

vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), warning: vi.fn(), error: vi.fn() },
  ElMessageBox: {
    confirm: vi.fn(() => Promise.resolve()),
    alert: vi.fn(),
  },
}))

vi.mock('@/composables/useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: { value: { id: 1, prenom: 'Admin', nom: 'User', role: 'ADMIN' } },
  })),
}))

vi.mock('@/composables/useUsers', () => ({
  useUsers: vi.fn(() => ({
    users: { value: [] as any[] },
    loadUsers: async () => {
      const users = await mockIpcInvoke('users:list')
      return users
    },
  })),
  getUserDisplayName: vi.fn((m: any) => `${m.prenom} ${m.nom}`),
}))

vi.mock('@/composables/usePatientContext', () => ({
  usePatientContext: vi.fn(() => ({
    activePatient: { value: { id: 42, nom: 'Diallo', prenom: 'Amadou' } },
    age: { value: null },
    hasActivePatient: { value: true },
    setActivePatient: vi.fn(),
    clearPatient: vi.fn(),
  })),
}))

vi.mock('@/components/patients/RichTextEditor.vue', () => ({
  default: {
    name: 'RichTextEditor',
    template: '<div class="rich-editor-mock" />',
    props: ['modelValue', 'readonly', 'rows', 'placeholder'],
    emits: ['update:modelValue', 'change'],
  },
}))

vi.mock('@/composables/useSpecialties', () => ({
  useSpecialties: vi.fn(() => ({
    specialties: { value: [] as any[] },
    fetchSpecialties: async () => {
      return await mockIpcInvoke('specialties:list')
    },
  })),
}))

vi.mock('@/composables/useExamTypes', async () => {
  const vue = await vi.importActual<typeof import('vue')>('vue')
  const allTypes = vue.ref<any[]>([])
  return {
    useExamTypes: vi.fn(() => ({
      allTypes,
      fetchAllByCategory: async (category: string) => {
        const result = await mockIpcInvoke('exam-types:list-all-by-category', { category })
        allTypes.value = Array.isArray(result) ? result : []
      },
    })),
  }
})

vi.mock('@/composables/useExamRequests', async () => {
  const vue = await vi.importActual<typeof import('vue')>('vue')
  const reqs = vue.ref<any[]>([])
  const loading = vue.ref(false)
  const error = vue.ref<string | null>(null)
  return {
    useExamRequests: vi.fn(() => ({
      requests: reqs,
      loading,
      error,
      fetchRequests: async (patientId: number) => {
        loading.value = true
        error.value = null
        try {
          const result = await mockIpcInvoke('exam-request:list', { patientId })
          reqs.value = Array.isArray(result) ? result : []
        } catch (e: any) {
          error.value = e.message
          reqs.value = []
        } finally {
          loading.value = false
        }
      },
      createRequest: async (dto: any) => {
        try {
          const created = await mockIpcInvoke('exam-request:create', dto)
          return created
        } catch (e: any) {
          error.value = e.message
          return null
        }
      },
      updateRequest: async (id: number, dto: any) => {
        try {
          const updated = await mockIpcInvoke('exam-request:update', { id, ...dto })
          return updated
        } catch (e: any) {
          error.value = e.message
          return null
        }
      },
      deleteRequest: async (id: number) => {
        try {
          return await mockIpcInvoke('exam-request:delete', { id })
        } catch (e: any) {
          error.value = e.message
          return false
        }
      },
      realize: async (id: number, resultat?: string) => {
        try {
          return await mockIpcInvoke('exam-request:realize', { id, resultat })
        } catch (e: any) {
          error.value = e.message
          return false
        }
      },
      listAttachments: async (examRequestId: number) => {
        return await mockIpcInvoke('exam-request-attachments:list', { examRequestId })
      },
      createAttachment: async (payload: any) => {
        return await mockIpcInvoke('exam-request-attachments:create', payload)
      },
      deleteAttachment: async (id: number) => {
        return await mockIpcInvoke('exam-request-attachments:delete', { id })
      },
    })),
  }
})

vi.mock('@/components/patients/ExamValidationDialog.vue', () => ({
  default: {
    name: 'ExamValidationDialog',
    template: '<div v-if="visible" class="exam-validation-dialog-mock" />',
    props: ['visible', 'examRequestId', 'examIds'],
    emits: ['update:visible', 'validated'],
  },
}))

vi.mock('@/components/patients/AvisResultDialog.vue', () => ({
  default: {
    name: 'AvisResultDialog',
    template: '<div v-if="visible" class="avis-result-dialog-mock" />',
    props: ['visible', 'examRequestId', 'title'],
    emits: ['update:visible', 'realized'],
  },
}))

vi.mock('@/components/patients/ExamRequestDetailDialog.vue', () => ({
  default: {
    name: 'ExamRequestDetailDialog',
    template: '<div v-if="visible" class="exam-detail-dialog-mock" />',
    props: ['visible', 'request'],
    emits: ['update:visible'],
  },
}))

// ---------------------------------------------------------------------------
// Stubs for Element Plus components used in ExamensView
//
// The el-table stub renders one .el-table__row per item and wraps the default
// slot (the el-table-column stubs) in a RowSlotProvider that provides the row
// via provide/inject. Each el-table-column stub then re-exposes that row as a
// scoped slot so the real column templates (#default="{ row }") render.
// ---------------------------------------------------------------------------
const stubs = {
  'el-alert': {
    template: '<div class="el-alert" :class="`el-alert--${type}`">{{ title }}<slot /></div>',
    props: ['type', 'title', 'closable', 'showIcon'],
    emits: ['close'],
  },
  'el-form': {
    template: '<form class="el-form"><slot /></form>',
    props: ['model', 'rules', 'labelPosition'],
    methods: {
      validate() { return Promise.resolve(true) },
      clearValidate() {},
      resetFields() {},
    },
  },
  'el-form-item': {
    template: '<div class="el-form-item" :prop="prop"><label v-if="label" class="el-form-item__label">{{ label }}</label><div class="el-form-item__content"><slot /></div></div>',
    props: ['label', 'prop'],
  },
  'el-select': {
    template: '<select class="el-select" :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><slot /></select>',
    props: ['modelValue', 'placeholder', 'filterable', 'style', 'disabled', 'clearable'],
    emits: ['update:modelValue'],
  },
  'el-option': {
    template: '<option class="el-option" :value="value">{{ label }}</option>',
    props: ['value', 'label'],
  },
  'el-radio-group': {
    template: '<div class="el-radio-group"><slot /></div>',
    props: ['modelValue', 'size', 'disabled'],
    emits: ['update:modelValue'],
  },
  'el-radio': {
    template: '<label class="el-radio"><input type="radio" :value="value" :checked="modelValue === value" :disabled="disabled" @change="$emit(\'update:modelValue\', value)" /><slot /></label>',
    props: ['value', 'size', 'border', 'disabled', 'modelValue'],
    emits: ['update:modelValue'],
  },
  'el-input': {
    template: '<input class="el-input" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" :placeholder="placeholder" :type="type" :rows="rows" />',
    props: ['modelValue', 'placeholder', 'type', 'rows'],
    emits: ['update:modelValue'],
  },
  'el-button': {
    template: '<button class="el-button" :type="attrType" :disabled="disabled" :loading="loading" @click="$emit(\'click\', $event)"><slot /></button>',
    props: ['type', 'disabled', 'loading', 'size', 'icon', 'text', 'danger'],
    computed: {
      attrType() { return this.type === 'primary' ? 'submit' : 'button' },
    },
    emits: ['click'],
  },
  'el-tag': {
    template: '<span class="el-tag" :class="`el-tag--${type}`"><slot /></span>',
    props: ['type', 'size', 'effect'],
  },
  'el-tree-select': {
    template: '<div class="el-tree-select" />',
    props: ['modelValue', 'data', 'multiple', 'filterable', 'placeholder', 'checkStrictly', 'nodeKey'],
    emits: ['update:modelValue'],
  },
  'el-empty': {
    template: '<div class="el-empty"><p>{{ description }}</p><slot /></div>',
    props: ['description'],
  },
  'el-icon': {
    template: '<i class="el-icon"><slot /></i>',
  },
  'el-dialog': {
    template: '<div class="el-dialog" v-if="modelValue"><div class="el-dialog__header"><slot name="header" /></div><div class="el-dialog__body"><slot /></div><div class="el-dialog__footer"><slot name="footer" /></div></div>',
    props: ['modelValue', 'title', 'width', 'closeOnClickModal'],
    emits: ['update:modelValue'],
  },
  'el-row': {
    template: '<div class="el-row"><slot /></div>',
    props: ['gutter'],
  },
  'el-col': {
    template: '<div class="el-col"><slot /></div>',
    props: ['span'],
  },
  'el-date-picker': {
    template: '<input class="el-date-picker" :value="displayValue" @change="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'type', 'placeholder', 'valueFormat', 'style'],
    emits: ['update:modelValue'],
    computed: {
      displayValue() {
        return Array.isArray(this.modelValue) ? this.modelValue.join(' → ') : this.modelValue
      },
    },
  },
  'el-table': {
    name: 'ElTableStub',
    components: {
      RowSlotProvider: {
        name: 'RowSlotProvider',
        props: ['row'],
        provide() { return { tableRow: computed(() => this.row) } },
        template: '<slot />',
      },
    },
    template: [
      '<div class="el-table">',
      '  <div v-for="(item, idx) in (data || [])" :key="item.id ?? idx" class="el-table__row" @click="$emit(\'row-click\', item)">',
      '    <RowSlotProvider :row="item"><slot /></RowSlotProvider>',
      '  </div>',
      '</div>',
    ].join(''),
    props: ['data', 'size', 'emptyText'],
    emits: ['row-click'],
  },
  'el-table-column': {
    name: 'ElTableColumnStub',
    inject: ['tableRow'],
    template: '<div class="el-table-column"><slot :row="tableRow" /></div>',
    props: ['label', 'prop', 'width', 'minWidth', 'fixed'],
  },
  'el-popconfirm': {
    template: '<span class="el-popconfirm"><slot name="reference" /><button class="el-popconfirm__confirm" @click="$emit(\'confirm\')">OK</button></span>',
    props: ['title', 'confirmButtonText', 'cancelButtonText'],
    emits: ['confirm', 'cancel'],
  },
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function waitForData() {
  return new Promise(resolve => setTimeout(resolve, 0))
}

function dateAt(daysOffset: number, hour: number): string {
  const d = new Date()
  d.setDate(d.getDate() + daysOffset)
  d.setHours(hour, 0, 0, 0)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  // Return ISO-like string in local timezone so the component parses it correctly
  return `${y}-${m}-${day}T${hh}:00:00.000`
}

function todayStr(): string {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function makeRequest(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    patientId: 42,
    type: 'imagerie' as const,
    examenId: 10,
    examenLabel: 'Radiographie thoracique',
    motif: 'Douleur thoracique',
    statut: 'en_attente' as const,
    prescripteurId: 1,
    prescripteurNom: 'Dr. Diallo',
    createdAt: dateAt(0, 10),
    plannedDate: null as string | null,
    plannedHour: null as number | null,
    ...overrides,
  }
}

function defaultMockRequests() {
  return [
    makeRequest({ id: 1, createdAt: dateAt(0, 10) }),
    makeRequest({ id: 2, type: 'laboratoire' as const, motif: 'Bilan annuel', statut: 'en_cours' as const, prescripteurNom: 'Dr. Camara', createdAt: dateAt(0, 10) }),
    makeRequest({ id: 3, type: 'avis' as const, specialtyId: 5, specialtyName: 'Endocrinologie', motif: 'Avis endocrinologique', statut: 'realise' as const, prescripteurId: 2, prescripteurNom: 'Dr. Camara', createdAt: dateAt(-1, 14) }),
  ]
}

function setupRequestsMock(requests?: any[]) {
  mockIpcInvoke.mockImplementation(async (channel: string) => {
    if (channel === 'exam-request:list') return requests ?? []
    if (channel === 'specialties:list') return []
    if (channel === 'users:list') return []
    if (channel === 'exam-types:list-all-by-category') return []
    return []
  })
}

function mountView(requests?: any[]) {
  setupRequestsMock(requests)
  const wrapper = mount(ExamensView, { global: { stubs } })
  return wrapper
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('ExamensView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ''
    setupRequestsMock()
  })

  // ─── Affichage initial ─────────────────────────────────────────────

  describe('affichage initial', () => {
    it('affiche le conteneur principal', async () => {
      const wrapper = mountView()
      await nextTick()
      await waitForData()

      expect(wrapper.find('.examens-view').exists()).toBe(true)
    })

    it('affiche le titre "Demande d\'examens"', async () => {
      const wrapper = mountView()
      await nextTick()
      await waitForData()

      expect(wrapper.text()).toContain("Demande d'examens")
    })

    it('affiche le bouton "+ Nouvelle demande"', async () => {
      const wrapper = mountView()
      await nextTick()
      await waitForData()

      const buttons = wrapper.findAll('.el-button')
      expect(buttons.some(b => b.text().includes('Nouvelle demande'))).toBe(true)
    })

    it('affiche le bouton "Actualiser"', async () => {
      const wrapper = mountView()
      await nextTick()
      await waitForData()

      const buttons = wrapper.findAll('.el-button')
      expect(buttons.some(b => b.text().trim() === 'Actualiser')).toBe(true)
    })

    it('affiche la rangée de filtres (période, type, statut)', async () => {
      const wrapper = mountView()
      await nextTick()
      await waitForData()

      expect(wrapper.find('.examens-view__filters').exists()).toBe(true)
      expect(wrapper.find('.el-date-picker').exists()).toBe(true)
      const selects = wrapper.findAll('.el-select')
      expect(selects.length).toBeGreaterThanOrEqual(2)
    })

    it('affiche la table des demandes', async () => {
      const wrapper = mountView()
      await nextTick()
      await waitForData()

      expect(wrapper.find('.examens-view__table').exists()).toBe(true)
    })
  })

  // ─── Comportement onMounted ────────────────────────────────────────

  describe('comportement onMounted', () => {
    it('récupère les demandes pour le patient actif au montage', async () => {
      mountView()
      await nextTick()
      await waitForData()

      expect(mockIpcInvoke).toHaveBeenCalledWith('exam-request:list', { patientId: 42 })
    })
  })

  // ─── Table avec demandes ───────────────────────────────────────────

  describe('table avec demandes', () => {
    it('affiche une ligne par demande', async () => {
      const wrapper = mountView(defaultMockRequests())
      await nextTick()
      await waitForData()

      expect(wrapper.findAll('.el-table__row')).toHaveLength(3)
    })

    it('affiche le libellé du type pour chaque ligne', async () => {
      const wrapper = mountView(defaultMockRequests())
      await nextTick()
      await waitForData()

      const rows = wrapper.findAll('.el-table__row')
      expect(rows[0].text()).toContain('Imagerie')
      expect(rows[1].text()).toContain('Laboratoire')
      expect(rows[2].text()).toContain('Avis spécialisé')
    })

    it('affiche le badge de statut avec le libellé et la couleur corrects', async () => {
      const wrapper = mountView(defaultMockRequests())
      await nextTick()
      await waitForData()

      const rows = wrapper.findAll('.el-table__row')
      expect(rows[0].text()).toContain('En attente')
      expect(rows[1].text()).toContain('En cours')
      expect(rows[2].text()).toContain('Réalisé')

      const tags = wrapper.findAll('.el-tag')
      const statutTags = tags.filter(t => ['En attente', 'En cours', 'Réalisé', 'Annulé'].includes(t.text()))
      const realiseTag = statutTags.find(t => t.text() === 'Réalisé')
      expect(realiseTag!.classes()).toContain('el-tag--success')
      const attenteTag = statutTags.find(t => t.text() === 'En attente')
      expect(attenteTag!.classes()).toContain('el-tag--warning')
      const coursTag = statutTags.find(t => t.text() === 'En cours')
      expect(coursTag!.classes()).toContain('el-tag--primary')
    })

    it('affiche les tags de type avec des couleurs distinctes', async () => {
      const wrapper = mountView(defaultMockRequests())
      await nextTick()
      await waitForData()

      const tags = wrapper.findAll('.el-tag')
      const typeTags = tags.filter(t => ['Imagerie', 'Laboratoire', 'Avis spécialisé'].includes(t.text()))
      const imagerieTag = typeTags.find(t => t.text() === 'Imagerie')
      expect(imagerieTag!.classes()).toContain('el-tag--primary')
      const laboTag = typeTags.find(t => t.text() === 'Laboratoire')
      expect(laboTag!.classes()).toContain('el-tag--success')
      const avisTag = typeTags.find(t => t.text() === 'Avis spécialisé')
      expect(avisTag!.classes()).toContain('el-tag--warning')
    })

    it('affiche le libellé de l\'examen / spécialité', async () => {
      const wrapper = mountView(defaultMockRequests())
      await nextTick()
      await waitForData()

      const rows = wrapper.findAll('.el-table__row')
      expect(rows[0].text()).toContain('Radiographie thoracique')
      expect(rows[2].text()).toContain('Endocrinologie')
    })

    it('affiche le prescripteur', async () => {
      const wrapper = mountView(defaultMockRequests())
      await nextTick()
      await waitForData()

      const rows = wrapper.findAll('.el-table__row')
      expect(rows[0].text()).toContain('Dr. Diallo')
      expect(rows[1].text()).toContain('Dr. Camara')
    })

    it('affiche "—" dans la colonne Réalisation quand non réalisé', async () => {
      const wrapper = mountView(defaultMockRequests())
      await nextTick()
      await waitForData()

      const rows = wrapper.findAll('.el-table__row')
      expect(rows[0].text()).toContain('—')
    })

    it('affiche la date de réalisation quand réalisé', async () => {
      const requests = defaultMockRequests()
      requests[2] = makeRequest({
        id: 3,
        type: 'avis' as const,
        statut: 'realise' as const,
        realizedAt: dateAt(-1, 14),
      })
      const wrapper = mountView(requests)
      await nextTick()
      await waitForData()

      const rows = wrapper.findAll('.el-table__row')
      const realizeRow = rows.find(r => r.text().includes('Réalisé'))
      // La colonne "Réalisation" affiche la date de réalisation (pas de "—")
      expect(realizeRow!.text()).toContain(formatDateTime(dateAt(-1, 14)))
    })

    it('affiche la date et l\'heure planifiées quand renseignées', async () => {
      const requests = defaultMockRequests()
      requests[1] = makeRequest({
        id: 2,
        type: 'laboratoire' as const,
        statut: 'en_cours' as const,
        plannedDate: '2026-07-15',
        plannedHour: 10,
      })
      const wrapper = mountView(requests)
      await nextTick()
      await waitForData()

      const rows = wrapper.findAll('.el-table__row')
      expect(rows[1].text()).toContain('15/07/2026')
      expect(rows[1].text()).toContain('10:00')
    })
  })

  // ─── Filtres ───────────────────────────────────────────────────────

  describe('filtres client-side', () => {
    it('filtre par type', async () => {
      const wrapper = mountView(defaultMockRequests())
      await nextTick()
      await waitForData()

      wrapper.vm.typeFilter = 'imagerie'
      await nextTick()

      expect(wrapper.findAll('.el-table__row')).toHaveLength(1)
      expect(wrapper.find('.el-table__row').text()).toContain('Imagerie')
    })

    it('filtre par statut', async () => {
      const wrapper = mountView(defaultMockRequests())
      await nextTick()
      await waitForData()

      wrapper.vm.statutFilter = 'en_cours'
      await nextTick()

      expect(wrapper.findAll('.el-table__row')).toHaveLength(1)
      expect(wrapper.find('.el-table__row').text()).toContain('En cours')
    })

    it('filtre par période de création (createdAt)', async () => {
      const wrapper = mountView(defaultMockRequests())
      await nextTick()
      await waitForData()

      wrapper.vm.dateRange = [todayStr(), todayStr()]
      await nextTick()

      // Deux demandes créées aujourd'hui, une hier
      expect(wrapper.findAll('.el-table__row')).toHaveLength(2)
    })

    it('combine les filtres type + statut', async () => {
      const wrapper = mountView(defaultMockRequests())
      await nextTick()
      await waitForData()

      wrapper.vm.typeFilter = 'laboratoire'
      wrapper.vm.statutFilter = 'en_cours'
      await nextTick()

      expect(wrapper.findAll('.el-table__row')).toHaveLength(1)
    })

    it('effacer les filtres restaure toutes les lignes', async () => {
      const wrapper = mountView(defaultMockRequests())
      await nextTick()
      await waitForData()

      wrapper.vm.typeFilter = 'imagerie'
      await nextTick()
      expect(wrapper.findAll('.el-table__row')).toHaveLength(1)

      wrapper.vm.typeFilter = ''
      await nextTick()
      expect(wrapper.findAll('.el-table__row')).toHaveLength(3)
    })
  })

  // ─── Actions de ligne ──────────────────────────────────────────────

  describe('actions de ligne', () => {
    it('affiche le bouton "Réaliser" uniquement pour les demandes non réalisées / non annulées', async () => {
      const wrapper = mountView(defaultMockRequests())
      await nextTick()
      await waitForData()

      const realizeBtns = wrapper.findAll('.examens-view__realize-btn')
      expect(realizeBtns).toHaveLength(2)
    })

    it('le clic sur une ligne ouvre le dialogue de détail', async () => {
      const wrapper = mountView(defaultMockRequests())
      await nextTick()
      await waitForData()

      expect(wrapper.find('.exam-detail-dialog-mock').exists()).toBe(false)

      await wrapper.find('.el-table__row').trigger('click')
      await nextTick()

      expect(wrapper.find('.exam-detail-dialog-mock').exists()).toBe(true)
    })

    it('"Réaliser" sur une demande laboratoire ouvre le dialogue de validation', async () => {
      const wrapper = mountView(defaultMockRequests())
      await nextTick()
      await waitForData()

      const rows = wrapper.findAll('.el-table__row')
      const labRow = rows[1]
      await labRow.find('.examens-view__realize-btn').trigger('click')
      await nextTick()

      expect(wrapper.find('.exam-validation-dialog-mock').exists()).toBe(true)
      expect(wrapper.vm.validationRequestId).toBe(2)
      expect(wrapper.vm.validationExamIds).toEqual([])
    })

    it('"Réaliser" sur une demande imagerie ouvre le dialogue de compte-rendu', async () => {
      const wrapper = mountView(defaultMockRequests())
      await nextTick()
      await waitForData()

      const rows = wrapper.findAll('.el-table__row')
      await rows[0].find('.examens-view__realize-btn').trigger('click')
      await nextTick()

      expect(wrapper.find('.avis-result-dialog-mock').exists()).toBe(true)
      expect(wrapper.vm.avisRequestId).toBe(1)
    })

    it('"Réaliser" sur une demande avis ouvre le dialogue de compte-rendu', async () => {
      const requests = defaultMockRequests()
      requests[2] = makeRequest({ id: 3, type: 'avis' as const, statut: 'en_attente' as const })
      const wrapper = mountView(requests)
      await nextTick()
      await waitForData()

      const rows = wrapper.findAll('.el-table__row')
      await rows[2].find('.examens-view__realize-btn').trigger('click')
      await nextTick()

      expect(wrapper.find('.avis-result-dialog-mock').exists()).toBe(true)
    })

    it('le bouton "Modifier" ouvre le dialogue d\'édition pré-rempli', async () => {
      const wrapper = mountView(defaultMockRequests())
      await nextTick()
      await waitForData()

      const rows = wrapper.findAll('.el-table__row')
      const modifyBtn = rows[0].findAll('.el-button').find(b => b.text().trim() === 'Modifier')
      await modifyBtn!.trigger('click')
      await nextTick()

      expect(wrapper.find('.el-dialog').exists()).toBe(true)
      expect(wrapper.vm.editForm.type).toBe('imagerie')
      expect(wrapper.vm.editForm.examenId).toBe(10)
      expect(wrapper.vm.editRequestId).toBe(1)
    })

    it('le clic sur "Réaliser" / "Modifier" n\'ouvre pas le dialogue de détail', async () => {
      const wrapper = mountView(defaultMockRequests())
      await nextTick()
      await waitForData()

      const rows = wrapper.findAll('.el-table__row')
      const modifyBtn = rows[0].findAll('.el-button').find(b => b.text().trim() === 'Modifier')
      await modifyBtn!.trigger('click')
      await nextTick()

      expect(wrapper.find('.exam-detail-dialog-mock').exists()).toBe(false)
    })

    it('la confirmation du popconfirm "Supprimer" appelle deleteRequest', async () => {
      mockIpcInvoke.mockImplementation(async (channel: string, args?: any) => {
        if (channel === 'exam-request:list') return defaultMockRequests()
        if (channel === 'exam-request:delete') return true
        if (channel === 'specialties:list') return []
        if (channel === 'users:list') return []
        if (channel === 'exam-types:list-all-by-category') return []
        return []
      })

      const wrapper = mount(ExamensView, { global: { stubs } })
      await nextTick()
      await waitForData()

      const rows = wrapper.findAll('.el-table__row')
      await rows[1].find('.el-popconfirm__confirm').trigger('click')
      await waitForData()
      await nextTick()

      const deleteCalls = mockIpcInvoke.mock.calls.filter((c: any[]) => c[0] === 'exam-request:delete')
      expect(deleteCalls.length).toBeGreaterThanOrEqual(1)
      expect(deleteCalls[0][1]).toHaveProperty('id', 2)
    })
  })

  // ─── Dialogue de création ──────────────────────────────────────────

  describe('dialogue de création', () => {
    it('le bouton "+ Nouvelle demande" ouvre le dialogue', async () => {
      const wrapper = mountView()
      await nextTick()
      await waitForData()

      expect(wrapper.vm.createDialogVisible).toBe(false)

      const buttons = wrapper.findAll('.el-button')
      await buttons.find(b => b.text().includes('Nouvelle demande'))!.trigger('click')
      await nextTick()

      expect(wrapper.vm.createDialogVisible).toBe(true)
      expect(wrapper.find('.el-dialog').exists()).toBe(true)
    })

    it('affiche trois radios de type dans le dialogue', async () => {
      const wrapper = mountView()
      await nextTick()
      await waitForData()

      wrapper.vm.createDialogVisible = true
      await nextTick()

      const radios = wrapper.findAll('.el-radio')
      expect(radios.length).toBe(3)
      expect(wrapper.text()).toContain('Imagerie')
      expect(wrapper.text()).toContain('Laboratoire')
      expect(wrapper.text()).toContain('Avis spécialisé')
    })

    it('appelle createRequest via IPC avec les champs obligatoires (imagerie)', async () => {
      mockIpcInvoke.mockImplementation(async (channel: string, args?: any) => {
        if (channel === 'exam-request:list') return []
        if (channel === 'exam-request:create') return { id: 10, patientId: 42, type: 'imagerie', statut: 'en_attente' }
        if (channel === 'specialties:list') return []
        if (channel === 'users:list') return []
        if (channel === 'exam-types:list-all-by-category') return []
        return []
      })

      const wrapper = mount(ExamensView, { global: { stubs } })
      await nextTick()
      await waitForData()

      wrapper.vm.createDialogVisible = true
      await nextTick()
      wrapper.vm.form.type = 'imagerie'
      await nextTick()
      wrapper.vm.form.prescripteur = 2
      wrapper.vm.form.examen = 10
      wrapper.vm.form.motif = 'Douleur thoracique'
      await nextTick()

      await wrapper.vm.onEnvoyer()
      await waitForData()
      await nextTick()

      const createCalls = mockIpcInvoke.mock.calls.filter((c: any[]) => c[0] === 'exam-request:create')
      expect(createCalls.length).toBeGreaterThanOrEqual(1)
      const createArgs = createCalls[0][1]
      expect(createArgs).toHaveProperty('patientId', 42)
      expect(createArgs).toHaveProperty('type', 'imagerie')
      expect(createArgs).toHaveProperty('prescripteurId', 2)
      expect(createArgs).toHaveProperty('examenId', 10)
      expect(createArgs).toHaveProperty('motif', 'Douleur thoracique')
    })

    it('envoie les champs plannedDate et plannedHour', async () => {
      mockIpcInvoke.mockImplementation(async (channel: string, args?: any) => {
        if (channel === 'exam-request:list') return []
        if (channel === 'exam-request:create') return { id: 10, patientId: 42, type: 'imagerie', statut: 'en_attente' }
        if (channel === 'specialties:list') return []
        if (channel === 'users:list') return []
        if (channel === 'exam-types:list-all-by-category') return []
        return []
      })

      const wrapper = mount(ExamensView, { global: { stubs } })
      await nextTick()
      await waitForData()

      wrapper.vm.createDialogVisible = true
      await nextTick()
      wrapper.vm.form.type = 'imagerie'
      await nextTick()
      wrapper.vm.form.prescripteur = 2
      wrapper.vm.form.examen = 10
      wrapper.vm.form.motif = 'Test'
      wrapper.vm.form.plannedDate = '2026-07-15'
      wrapper.vm.form.plannedHour = 10
      await nextTick()

      await wrapper.vm.onEnvoyer()
      await waitForData()
      await nextTick()

      const createCalls = mockIpcInvoke.mock.calls.filter((c: any[]) => c[0] === 'exam-request:create')
      const createArgs = createCalls[0][1]
      expect(createArgs).toHaveProperty('plannedDate', '2026-07-15')
      expect(createArgs).toHaveProperty('plannedHour', 10)
    })

    it('envoie specialtyId pour le type avis', async () => {
      mockIpcInvoke.mockImplementation(async (channel: string, args?: any) => {
        if (channel === 'exam-request:list') return []
        if (channel === 'exam-request:create') return { id: 11, patientId: 42, type: 'avis', statut: 'en_attente' }
        if (channel === 'specialties:list') return []
        if (channel === 'users:list') return []
        if (channel === 'exam-types:list-all-by-category') return []
        return []
      })

      const wrapper = mount(ExamensView, { global: { stubs } })
      await nextTick()
      await waitForData()

      wrapper.vm.createDialogVisible = true
      await nextTick()
      wrapper.vm.form.type = 'avis'
      await nextTick()
      wrapper.vm.form.prescripteur = 2
      wrapper.vm.form.specialtyId = 1
      wrapper.vm.form.motif = 'Avis cardiologique'
      await nextTick()

      await wrapper.vm.onEnvoyer()
      await waitForData()
      await nextTick()

      const createCalls = mockIpcInvoke.mock.calls.filter((c: any[]) => c[0] === 'exam-request:create')
      const createArgs = createCalls[0][1]
      expect(createArgs).toHaveProperty('type', 'avis')
      expect(createArgs).toHaveProperty('specialtyId', 1)
      expect(createArgs).toHaveProperty('motif', 'Avis cardiologique')
    })

    it('envoie examIds pour le type laboratoire', async () => {
      mockIpcInvoke.mockImplementation(async (channel: string, args?: any) => {
        if (channel === 'exam-request:list') return []
        if (channel === 'exam-request:create') return { id: 12, patientId: 42, type: 'laboratoire', statut: 'en_attente' }
        if (channel === 'specialties:list') return []
        if (channel === 'users:list') return []
        if (channel === 'exam-types:list-all-by-category') return []
        return []
      })

      const wrapper = mount(ExamensView, { global: { stubs } })
      await nextTick()
      await waitForData()

      wrapper.vm.createDialogVisible = true
      await nextTick()
      wrapper.vm.form.type = 'laboratoire'
      await nextTick()
      wrapper.vm.form.prescripteur = 2
      wrapper.vm.form.examens = [101, 102]
      await nextTick()

      await wrapper.vm.onEnvoyer()
      await waitForData()
      await nextTick()

      const createCalls = mockIpcInvoke.mock.calls.filter((c: any[]) => c[0] === 'exam-request:create')
      const createArgs = createCalls[0][1]
      expect(createArgs).toHaveProperty('type', 'laboratoire')
      expect(createArgs).toHaveProperty('examIds')
      expect(createArgs.examIds).toEqual([101, 102])
    })

    it('ferme le dialogue et affiche un message de succès après création', async () => {
      mockIpcInvoke.mockImplementation(async (channel: string, args?: any) => {
        if (channel === 'exam-request:list') return []
        if (channel === 'exam-request:create') return { id: 10, patientId: 42, type: 'imagerie', statut: 'en_attente' }
        if (channel === 'specialties:list') return []
        if (channel === 'users:list') return []
        if (channel === 'exam-types:list-all-by-category') return []
        return []
      })

      const wrapper = mount(ExamensView, { global: { stubs } })
      await nextTick()
      await waitForData()

      wrapper.vm.createDialogVisible = true
      await nextTick()
      wrapper.vm.form.type = 'imagerie'
      await nextTick()
      wrapper.vm.form.prescripteur = 2
      wrapper.vm.form.examen = 10
      wrapper.vm.form.motif = 'Test'
      await nextTick()

      await wrapper.vm.onEnvoyer()
      await waitForData()
      await nextTick()

      const { ElMessage } = await import('element-plus')
      expect(ElMessage.success).toHaveBeenCalledWith('Demande envoyée')
      expect(wrapper.vm.createDialogVisible).toBe(false)
    })
  })

  // ─── Dialogue d'édition ────────────────────────────────────────────

  describe('dialogue d\'édition', () => {
    it('la sauvegarde appelle updateRequest via IPC et ferme le dialogue', async () => {
      const requests = defaultMockRequests()
      mockIpcInvoke.mockImplementation(async (channel: string, args?: any) => {
        if (channel === 'exam-request:list') return requests
        if (channel === 'exam-request:update') return { id: 1, ...requests[0], ...args }
        if (channel === 'specialties:list') return []
        if (channel === 'users:list') return []
        if (channel === 'exam-types:list-all-by-category') return []
        return []
      })

      const wrapper = mount(ExamensView, { global: { stubs } })
      await nextTick()
      await waitForData()

      wrapper.vm.onEditRequest(requests[0])
      await nextTick()

      wrapper.vm.editForm.statut = 'realise'
      await nextTick()

      const enregistrerBtn = wrapper.findAll('.el-dialog__footer .el-button').find(
        (b: any) => b.text().trim() === 'Enregistrer'
      )
      expect(enregistrerBtn).toBeDefined()
      await enregistrerBtn!.trigger('click')
      await waitForData()
      await nextTick()

      const updateCalls = mockIpcInvoke.mock.calls.filter((c: any[]) => c[0] === 'exam-request:update')
      expect(updateCalls.length).toBeGreaterThanOrEqual(1)
      const updateArgs = updateCalls[0][1]
      expect(updateArgs).toHaveProperty('statut', 'realise')
      expect(updateArgs).toHaveProperty('id', 1)

      expect(wrapper.find('.el-dialog').exists()).toBe(false)
    })

    it('la sauvegarde envoie plannedDate et plannedHour', async () => {
      const requests = defaultMockRequests()
      mockIpcInvoke.mockImplementation(async (channel: string, args?: any) => {
        if (channel === 'exam-request:list') return requests
        if (channel === 'exam-request:update') return { id: 1, ...args }
        if (channel === 'specialties:list') return []
        if (channel === 'users:list') return []
        if (channel === 'exam-types:list-all-by-category') return []
        return []
      })

      const wrapper = mount(ExamensView, { global: { stubs } })
      await nextTick()
      await waitForData()

      wrapper.vm.onEditRequest(requests[0])
      await nextTick()

      wrapper.vm.editForm.plannedDate = '2026-07-15'
      wrapper.vm.editForm.plannedHour = 10
      await nextTick()

      const enregistrerBtn = wrapper.findAll('.el-dialog__footer .el-button').find(
        (b: any) => b.text().trim() === 'Enregistrer'
      )
      await enregistrerBtn!.trigger('click')
      await waitForData()
      await nextTick()

      const updateCalls = mockIpcInvoke.mock.calls.filter((c: any[]) => c[0] === 'exam-request:update')
      const updateArgs = updateCalls[0][1]
      expect(updateArgs).toHaveProperty('plannedDate', '2026-07-15')
      expect(updateArgs).toHaveProperty('plannedHour', 10)
    })

    it('annuler ferme le dialogue sans sauvegarder', async () => {
      const wrapper = mountView(defaultMockRequests())
      await nextTick()
      await waitForData()

      wrapper.vm.onEditRequest(defaultMockRequests()[0])
      await nextTick()
      expect(wrapper.find('.el-dialog').exists()).toBe(true)

      const annulerBtn = wrapper.findAll('.el-dialog__footer .el-button').find(
        (b: any) => b.text().trim() === 'Annuler'
      )
      expect(annulerBtn).toBeDefined()
      await annulerBtn!.trigger('click')
      await nextTick()

      expect(wrapper.find('.el-dialog').exists()).toBe(false)

      const updateCalls = mockIpcInvoke.mock.calls.filter((c: any[]) => c[0] === 'exam-request:update')
      expect(updateCalls).toHaveLength(0)
    })

    it('le bouton "Supprimer" appelle deleteRequest via IPC et ferme le dialogue', async () => {
      const requests = defaultMockRequests()
      mockIpcInvoke.mockImplementation(async (channel: string, args?: any) => {
        if (channel === 'exam-request:list') return requests
        if (channel === 'exam-request:delete') return true
        if (channel === 'specialties:list') return []
        if (channel === 'users:list') return []
        if (channel === 'exam-types:list-all-by-category') return []
        return []
      })

      const wrapper = mount(ExamensView, { global: { stubs } })
      await nextTick()
      await waitForData()

      wrapper.vm.onEditRequest(requests[0])
      await nextTick()
      expect(wrapper.find('.el-dialog').exists()).toBe(true)

      const supprimerBtn = wrapper.findAll('.el-dialog__footer .el-button').find(
        (b: any) => b.text().trim() === 'Supprimer'
      )
      expect(supprimerBtn).toBeDefined()
      await supprimerBtn!.trigger('click')

      await waitForData()
      await nextTick()

      const deleteCalls = mockIpcInvoke.mock.calls.filter((c: any[]) => c[0] === 'exam-request:delete')
      expect(deleteCalls.length).toBeGreaterThanOrEqual(1)
      expect(deleteCalls[0][1]).toHaveProperty('id', 1)

      expect(wrapper.find('.el-dialog').exists()).toBe(false)
    })

    it('le bouton "Supprimer" confirme via ElMessageBox avant de supprimer', async () => {
      const wrapper = mountView(defaultMockRequests())
      await nextTick()
      await waitForData()

      wrapper.vm.onEditRequest(defaultMockRequests()[0])
      await nextTick()

      const supprimerBtn = wrapper.findAll('.el-dialog__footer .el-button').find(
        (b: any) => b.text().trim() === 'Supprimer'
      )
      await supprimerBtn!.trigger('click')

      const { ElMessageBox } = await import('element-plus')
      expect(ElMessageBox.confirm).toHaveBeenCalled()
    })
  })

  // ─── Validation du motif rich-text ────────────────────────────────

  describe('validation du motif rich-text', () => {
    async function mountWithType(type: string) {
      const wrapper = mountView()
      await nextTick()
      await waitForData()
      wrapper.vm.form.type = type
      await nextTick()
      return wrapper
    }

    /** Accède au validateur de la règle « motif » (imagerie / avis). */
    function getMotifValidator(wrapper: ReturnType<typeof mount>) {
      const rules = wrapper.vm.formRules as unknown as {
        motif: Array<{ validator: (rule: null, value: unknown, callback: (error?: Error | string) => void) => void }>
      }
      return rules.motif[0].validator
    }

    async function validateMotif(wrapper: ReturnType<typeof mount>, value: string) {
      return await new Promise<Error | string | undefined>(resolve => {
        getMotifValidator(wrapper)(null, value, err => resolve(err))
      })
    }

    it('rejette un motif rich-text vide (<p></p>) pour le type imagerie', async () => {
      const wrapper = await mountWithType('imagerie')
      expect(await validateMotif(wrapper, '<p></p>')).toBeInstanceOf(Error)
    })

    it("rejette un motif rich-text composé uniquement d'espaces insécables", async () => {
      const wrapper = await mountWithType('imagerie')
      expect(await validateMotif(wrapper, '<p>&nbsp;</p>')).toBeInstanceOf(Error)
    })

    it('rejette un motif ne contenant que des espaces', async () => {
      const wrapper = await mountWithType('imagerie')
      expect(await validateMotif(wrapper, '   ')).toBeInstanceOf(Error)
    })

    it('accepte un motif texte non vide', async () => {
      const wrapper = await mountWithType('imagerie')
      expect(await validateMotif(wrapper, 'Douleur thoracique')).toBeUndefined()
    })

    it('accepte un motif rich-text non vide', async () => {
      const wrapper = await mountWithType('imagerie')
      expect(await validateMotif(wrapper, '<p><strong>Douleur</strong> thoracique</p>')).toBeUndefined()
    })

    it('rejette un motif rich-text vide pour le type avis', async () => {
      const wrapper = await mountWithType('avis')
      expect(await validateMotif(wrapper, '<p></p>')).toBeInstanceOf(Error)
    })
  })

  // ─── Gestion des erreurs ───────────────────────────────────────────

  describe('gestion des erreurs', () => {
    it('affiche une alerte quand une erreur API se produit', async () => {
      mockIpcInvoke.mockImplementation(async (channel: string) => {
        if (channel === 'exam-request:list') throw new Error('Erreur réseau')
        if (channel === 'specialties:list') return []
        if (channel === 'users:list') return []
        if (channel === 'exam-types:list-all-by-category') return []
        return []
      })

      const wrapper = mount(ExamensView, { global: { stubs } })
      await nextTick()
      await waitForData()

      const alert = wrapper.find('.el-alert--error')
      expect(alert.exists()).toBe(true)
      expect(alert.text()).toContain('Erreur réseau')
    })

    it('l\'alerte d\'erreur est absente quand il n\'y a pas d\'erreur', async () => {
      const wrapper = mountView()
      await nextTick()
      await waitForData()

      expect(wrapper.find('.el-alert--error').exists()).toBe(false)
    })

    it('cache l\'alerte d\'erreur quand error redevient null', async () => {
      mockIpcInvoke.mockImplementation(async (channel: string) => {
        if (channel === 'exam-request:list') throw new Error('Erreur réseau')
        if (channel === 'specialties:list') return []
        if (channel === 'users:list') return []
        if (channel === 'exam-types:list-all-by-category') return []
        return []
      })

      const wrapper = mount(ExamensView, { global: { stubs } })
      await nextTick()
      await waitForData()

      expect(wrapper.find('.el-alert--error').exists()).toBe(true)

      wrapper.vm.error = null
      await nextTick()

      expect(wrapper.find('.el-alert--error').exists()).toBe(false)
    })
  })
})