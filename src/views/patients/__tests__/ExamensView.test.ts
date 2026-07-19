// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import ExamensView from '../ExamensView.vue'

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
  users: { value: [
    { id: 1, prenom: 'Admin', nom: 'User', role: 'ADMIN' },
    { id: 2, prenom: 'Jean', nom: 'Dupont', role: 'MEDECIN' },
  ]},
  loadUsers: vi.fn(() => Promise.resolve()),
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

vi.mock('@/composables/useSpecialties', () => ({
  useSpecialties: vi.fn(() => ({
    specialties: { value: [
      { id: 1, name: 'Cardiologie', code: 'CARDIO', title_prefix: 'Dr', is_active: true },
      { id: 2, name: 'Endocrinologie', code: 'ENDO', title_prefix: 'Dr', is_active: true },
    ]},
    fetchSpecialties: vi.fn(),
  })),
}))

// ---------------------------------------------------------------------------
// Stubs for Element Plus components used in ExamensView
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
    props: ['modelValue', 'placeholder', 'filterable', 'style', 'disabled'],
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
  'el-button-group': {
    template: '<div class="el-button-group"><slot /></div>',
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
    template: '<input class="el-date-picker" :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'type', 'placeholder', 'valueFormat', 'style'],
    emits: ['update:modelValue'],
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
  return d.toISOString()
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
    makeRequest({ id: 3, type: 'avis' as const, specialtyId: 5, specialtyName: 'Endocrinologie', motif: 'Avis endocrinologique', statut: 'realise' as const, prescripteurId: 2, prescripteurNom: 'Dr. Camara', createdAt: dateAt(2, 14) }),
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
      const wrapper = mount(ExamensView, { global: { stubs } })
      await nextTick()
      await waitForData()

      expect(wrapper.find('.examens-view').exists()).toBe(true)
    })

    it('affiche le titre "Demande d\'examens"', async () => {
      const wrapper = mount(ExamensView, { global: { stubs } })
      await nextTick()
      await waitForData()

      expect(wrapper.text()).toContain("Demande d'examens")
    })

    it('affiche l\'en-tête du formulaire avec "Nouvelle demande"', async () => {
      const wrapper = mount(ExamensView, { global: { stubs } })
      await nextTick()
      await waitForData()

      const header = wrapper.find('.examens-view__form-header')
      expect(header.exists()).toBe(true)
      expect(header.text()).toContain('Nouvelle demande')
    })

    it('affiche les boutons de navigation hebdomadaire', async () => {
      const wrapper = mount(ExamensView, { global: { stubs } })
      await nextTick()
      await waitForData()

      const header = wrapper.find('.examens-calendar__header')
      expect(header.exists()).toBe(true)
      const buttons = header.findAll('.el-button')
      expect(buttons.length).toBeGreaterThanOrEqual(3)
    })

    it('affiche la grille du calendrier', async () => {
      const wrapper = mount(ExamensView, { global: { stubs } })
      await nextTick()
      await waitForData()

      expect(wrapper.find('.examens-calendar__grid').exists()).toBe(true)
    })

    it('affiche 7 colonnes de jour', async () => {
      const wrapper = mount(ExamensView, { global: { stubs } })
      await nextTick()
      await waitForData()

      const dayColumns = wrapper.findAll('.examens-calendar__day-column')
      expect(dayColumns).toHaveLength(7)
    })
  })

  // ─── Comportement onMounted ────────────────────────────────────────

  describe('comportement onMounted', () => {
    it('récupère les demandes pour le patient actif au montage', async () => {
      mount(ExamensView, { global: { stubs } })
      await nextTick()
      await waitForData()

      expect(mockIpcInvoke).toHaveBeenCalledWith('exam-request:list', { patientId: 42 })
    })
  })

  // ─── Grille avec créneaux horaires ─────────────────────────────────

  describe('grille avec créneaux horaires', () => {
    it('affiche 9 étiquettes horaires dans chaque colonne de jour', async () => {
      const wrapper = mount(ExamensView, { global: { stubs } })
      await nextTick()
      await waitForData()

      const hourLabels = wrapper.findAll('.examens-calendar__hour-label')
      expect(hourLabels).toHaveLength(63)
    })

    it('affiche les libellés d\'heure au format HH:00', async () => {
      const wrapper = mount(ExamensView, { global: { stubs } })
      await nextTick()
      await waitForData()

      const hourLabels = wrapper.findAll('.examens-calendar__hour-label')
      const texts = hourLabels.map(l => l.text())
      expect(texts).toContain('06:00')
      expect(texts).toContain('08:00')
      expect(texts).toContain('10:00')
      expect(texts).toContain('12:00')
      expect(texts).toContain('14:00')
      expect(texts).toContain('16:00')
      expect(texts).toContain('18:00')
      expect(texts).toContain('20:00')
      expect(texts).toContain('22:00')
    })

    it('affiche 9 cellules horaires par colonne de jour', async () => {
      const wrapper = mount(ExamensView, { global: { stubs } })
      await nextTick()
      await waitForData()

      const hourCells = wrapper.findAll('.examens-calendar__hour-cell')
      expect(hourCells).toHaveLength(63)
    })

    it('colonne du jour courant porte la classe --today', async () => {
      const wrapper = mount(ExamensView, { global: { stubs } })
      await nextTick()
      await waitForData()

      const todayColumns = wrapper.findAll('.examens-calendar__day-column--today')
      expect(todayColumns.length).toBe(1)
    })

    it('en-tête du jour courant porte la classe --today', async () => {
      const wrapper = mount(ExamensView, { global: { stubs } })
      await nextTick()
      await waitForData()

      const todayHeaders = wrapper.findAll('.examens-calendar__day-header--today')
      expect(todayHeaders.length).toBe(1)
    })

    it('la cellule de l\'heure courante porte la classe --now', async () => {
      const wrapper = mount(ExamensView, { global: { stubs } })
      await nextTick()
      await waitForData()

      const nowCells = wrapper.findAll('.examens-calendar__hour-cell--now')
      expect(nowCells.length).toBe(1)
    })

    it('le libellé de l\'heure courante porte la classe --now', async () => {
      const wrapper = mount(ExamensView, { global: { stubs } })
      await nextTick()
      await waitForData()

      const nowLabels = wrapper.findAll('.examens-calendar__hour-label--now')
      expect(nowLabels.length).toBe(1)
    })
  })

  // ─── Navigation hebdomadaire ───────────────────────────────────────

  describe('navigation hebdomadaire', () => {
    it('affiche le libellé de semaine au format "JJ/MM — JJ/MM"', async () => {
      const wrapper = mount(ExamensView, { global: { stubs } })
      await nextTick()
      await waitForData()

      const label = wrapper.find('.examens-calendar__week-label')
      expect(label.exists()).toBe(true)
      expect(label.text()).toMatch(/\d{2}\/\d{2} — \d{2}\/\d{2}/)
    })

    it('le bouton précédent change la semaine affichée', async () => {
      const wrapper = mount(ExamensView, { global: { stubs } })
      await nextTick()
      await waitForData()

      const navButtons = wrapper.findAll('.examens-calendar__header .el-button')
      const labelEl = navButtons[1]
      const labelBefore = labelEl.text()

      await navButtons[0].trigger('click')
      await nextTick()

      expect(labelEl.text()).not.toBe(labelBefore)
    })

    it('le bouton suivant change la semaine affichée', async () => {
      const wrapper = mount(ExamensView, { global: { stubs } })
      await nextTick()
      await waitForData()

      const navButtons = wrapper.findAll('.examens-calendar__header .el-button')
      const labelEl = navButtons[1]
      const labelBefore = labelEl.text()

      await navButtons[2].trigger('click')
      await nextTick()

      expect(labelEl.text()).not.toBe(labelBefore)
    })

    it('le bouton "Aujourd\'hui" réinitialise la semaine après navigation', async () => {
      const wrapper = mount(ExamensView, { global: { stubs } })
      await nextTick()
      await waitForData()

      const navButtons = wrapper.findAll('.examens-calendar__header .el-button')
      const labelEl = navButtons[1]
      const labelOriginal = labelEl.text()

      await navButtons[0].trigger('click')
      await nextTick()
      const afterPrev = labelEl.text()
      expect(afterPrev).not.toBe(labelOriginal)

      await navButtons[3].trigger('click')
      await nextTick()
      const afterToday = labelEl.text()
      expect(afterToday).toBe(labelOriginal)
    })
  })

  // ─── Cartes de demande dans les créneaux ───────────────────────────

  describe('cartes de demande dans les créneaux', () => {
    it('affiche les cartes dans les cellules horaires correspondant à leur createdAt', async () => {
      const requests = defaultMockRequests()
      setupRequestsMock(requests)

      const wrapper = mount(ExamensView, { global: { stubs } })
      await nextTick()
      await waitForData()

      const cards = wrapper.findAll('.examens-calendar__card')
      expect(cards.length).toBe(3)
    })

    it('chaque carte affiche le libellé du type', async () => {
      const requests = defaultMockRequests()
      setupRequestsMock(requests)

      const wrapper = mount(ExamensView, { global: { stubs } })
      await nextTick()
      await waitForData()

      const cards = wrapper.findAll('.examens-calendar__card')
      const cardTexts = cards.map(c => c.text())
      expect(cardTexts.some(t => t.includes('Imagerie'))).toBe(true)
      expect(cardTexts.some(t => t.includes('Laboratoire'))).toBe(true)
      expect(cardTexts.some(t => t.includes('Avis'))).toBe(true)
    })

    it('les badges de statut affichent le libellé et la classe de couleur corrects', async () => {
      const requests = defaultMockRequests()
      setupRequestsMock(requests)

      const wrapper = mount(ExamensView, { global: { stubs } })
      await nextTick()
      await waitForData()

      const badges = wrapper.findAll('.examens-calendar__statut-badge')
      expect(badges).toHaveLength(3)

      expect(badges[0].classes()).toContain('el-tag--warning')
      expect(badges[0].text()).toContain('En attente')

      expect(badges[1].classes()).toContain('el-tag--primary')
      expect(badges[1].text()).toContain('En cours')

      expect(badges[2].classes()).toContain('el-tag--success')
      expect(badges[2].text()).toContain('Réalisé')
    })

    it('la carte imagerie porte la classe --imagerie', async () => {
      const requests = defaultMockRequests()
      setupRequestsMock(requests)

      const wrapper = mount(ExamensView, { global: { stubs } })
      await nextTick()
      await waitForData()

      const imagerieCards = wrapper.findAll('.examens-calendar__card--imagerie')
      expect(imagerieCards.length).toBe(1)
    })

    it('la carte laboratoire porte la classe --laboratoire', async () => {
      const requests = defaultMockRequests()
      setupRequestsMock(requests)

      const wrapper = mount(ExamensView, { global: { stubs } })
      await nextTick()
      await waitForData()

      const laboratoireCards = wrapper.findAll('.examens-calendar__card--laboratoire')
      expect(laboratoireCards.length).toBe(1)
    })

    it('la carte avis porte la classe --avis', async () => {
      const requests = defaultMockRequests()
      setupRequestsMock(requests)

      const wrapper = mount(ExamensView, { global: { stubs } })
      await nextTick()
      await waitForData()

      const avisCards = wrapper.findAll('.examens-calendar__card--avis')
      expect(avisCards.length).toBe(1)
    })

    it('chaque carte affiche le point coloré avec la classe appropriée', async () => {
      const requests = defaultMockRequests()
      setupRequestsMock(requests)

      const wrapper = mount(ExamensView, { global: { stubs } })
      await nextTick()
      await waitForData()

      expect(wrapper.findAll('.examens-calendar__type-dot--imagerie').length).toBe(1)
      expect(wrapper.findAll('.examens-calendar__type-dot--laboratoire').length).toBe(1)
      expect(wrapper.findAll('.examens-calendar__type-dot--avis').length).toBe(1)
    })
  })

  // ─── Cellules vides ────────────────────────────────────────────────

  describe('cellules vides', () => {
    it('affiche "Nouveau" dans les cellules sans demande', async () => {
      const wrapper = mount(ExamensView, { global: { stubs } })
      await nextTick()
      await waitForData()

      const emptyCells = wrapper.findAll('.examens-calendar__empty-cell')
      expect(emptyCells.length).toBe(63)
      emptyCells.forEach(cell => {
        expect(cell.find('.examens-calendar__empty-text').exists()).toBe(true)
        expect(cell.text()).toBe('Nouveau')
      })
    })

    it('les cellules avec demandes n\'affichent pas le texte "Nouveau"', async () => {
      const requests = defaultMockRequests()
      setupRequestsMock(requests)

      const wrapper = mount(ExamensView, { global: { stubs } })
      await nextTick()
      await waitForData()

      const emptyCells = wrapper.findAll('.examens-calendar__empty-cell')
      // 2 requests on day 0 hour 10 slot, 1 request on day 2 hour 14 slot
      expect(emptyCells.length).toBe(61)
    })
  })

  // ─── Dialogue d'édition ────────────────────────────────────────────

  describe('dialogue d\'édition', () => {
    it('le clic sur une carte ouvre le dialogue d\'édition', async () => {
      const requests = defaultMockRequests()
      setupRequestsMock(requests)

      const wrapper = mount(ExamensView, { global: { stubs } })
      await nextTick()
      await waitForData()

      expect(wrapper.find('.el-dialog').exists()).toBe(false)

      await wrapper.find('.examens-calendar__card').trigger('click')
      await nextTick()

      expect(wrapper.find('.el-dialog').exists()).toBe(true)
    })

    it('le dialogue pré-remplit avec les données de la demande', async () => {
      const requests = defaultMockRequests()
      setupRequestsMock(requests)

      const wrapper = mount(ExamensView, { global: { stubs } })
      await nextTick()
      await waitForData()

      await wrapper.find('.examens-calendar__card').trigger('click')
      await nextTick()

      const dialogBody = wrapper.find('.el-dialog__body')
      expect(dialogBody.exists()).toBe(true)
      expect(dialogBody.text()).toContain('Imagerie')
    })

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

      await wrapper.find('.examens-calendar__card').trigger('click')
      await nextTick()

      ;(wrapper.vm as any).editForm.statut = 'realise'
      await nextTick()

      const enregistrerBtn = wrapper.findAll('.el-dialog__footer .el-button').find(
        (b: any) => b.text().trim() === 'Enregistrer'
      )
      expect(enregistrerBtn).toBeDefined()
      await enregistrerBtn!.trigger('click')
      await waitForData()
      await nextTick()

      const updateCalls = mockIpcInvoke.mock.calls.filter(
        (c: any[]) => c[0] === 'exam-request:update'
      )
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
        if (channel === 'exam-request:update') return { id: 1, ...requests[0], ...args }
        if (channel === 'specialties:list') return []
        if (channel === 'users:list') return []
        if (channel === 'exam-types:list-all-by-category') return []
        return []
      })

      const wrapper = mount(ExamensView, { global: { stubs } })
      await nextTick()
      await waitForData()

      await wrapper.find('.examens-calendar__card').trigger('click')
      await nextTick()

      ;(wrapper.vm as any).editForm.plannedDate = '2026-07-15'
      ;(wrapper.vm as any).editForm.plannedHour = 10
      await nextTick()

      const enregistrerBtn = wrapper.findAll('.el-dialog__footer .el-button').find(
        (b: any) => b.text().trim() === 'Enregistrer'
      )
      await enregistrerBtn!.trigger('click')
      await waitForData()
      await nextTick()

      const updateCalls = mockIpcInvoke.mock.calls.filter(
        (c: any[]) => c[0] === 'exam-request:update'
      )
      const updateArgs = updateCalls[0][1]
      expect(updateArgs).toHaveProperty('plannedDate', '2026-07-15')
      expect(updateArgs).toHaveProperty('plannedHour', 10)
    })

    it('annuler ferme le dialogue sans sauvegarder', async () => {
      const requests = defaultMockRequests()
      setupRequestsMock(requests)

      const wrapper = mount(ExamensView, { global: { stubs } })
      await nextTick()
      await waitForData()

      await wrapper.find('.examens-calendar__card').trigger('click')
      await nextTick()
      expect(wrapper.find('.el-dialog').exists()).toBe(true)

      const annulerBtn = wrapper.findAll('.el-dialog__footer .el-button').find(
        (b: any) => b.text().trim() === 'Annuler'
      )
      expect(annulerBtn).toBeDefined()
      await annulerBtn!.trigger('click')
      await nextTick()

      expect(wrapper.find('.el-dialog').exists()).toBe(false)

      const updateCalls = mockIpcInvoke.mock.calls.filter(
        (c: any[]) => c[0] === 'exam-request:update'
      )
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

      await wrapper.find('.examens-calendar__card').trigger('click')
      await nextTick()
      expect(wrapper.find('.el-dialog').exists()).toBe(true)

      const supprimerBtn = wrapper.findAll('.el-dialog__footer .el-button').find(
        (b: any) => b.text().trim() === 'Supprimer'
      )
      expect(supprimerBtn).toBeDefined()
      await supprimerBtn!.trigger('click')

      await waitForData()
      await nextTick()

      const deleteCalls = mockIpcInvoke.mock.calls.filter(
        (c: any[]) => c[0] === 'exam-request:delete'
      )
      expect(deleteCalls.length).toBeGreaterThanOrEqual(1)
      expect(deleteCalls[0][1]).toHaveProperty('id', 1)

      expect(wrapper.find('.el-dialog').exists()).toBe(false)
    })

    it('le bouton "Supprimer" confirme via ElMessageBox avant de supprimer', async () => {
      const requests = defaultMockRequests()
      setupRequestsMock(requests)

      const wrapper = mount(ExamensView, { global: { stubs } })
      await nextTick()
      await waitForData()

      await wrapper.find('.examens-calendar__card').trigger('click')
      await nextTick()

      const supprimerBtn = wrapper.findAll('.el-dialog__footer .el-button').find(
        (b: any) => b.text().trim() === 'Supprimer'
      )
      await supprimerBtn!.trigger('click')

      const { ElMessageBox } = await import('element-plus')
      expect(ElMessageBox.confirm).toHaveBeenCalled()
    })
  })

  // ─── Formulaire pliable ────────────────────────────────────────────

  describe('formulaire pliable', () => {
    it('le formulaire commence replié (contenu masqué)', async () => {
      const wrapper = mount(ExamensView, { global: { stubs } })
      await nextTick()
      await waitForData()

      expect(wrapper.vm.formOpen).toBe(false)
    })

    it('le clic sur l\'en-tête déplie le formulaire', async () => {
      const wrapper = mount(ExamensView, { global: { stubs } })
      await nextTick()
      await waitForData()

      await wrapper.find('.examens-view__form-header').trigger('click')
      await nextTick()

      expect(wrapper.find('.examens-view__form-body').exists()).toBe(true)

      const buttons = wrapper.findAll('.el-button')
      const envoyerBtn = buttons.find(b => b.text().trim() === 'Envoyer la demande')
      expect(envoyerBtn).toBeDefined()
    })

    it('le second clic replie le formulaire', async () => {
      const wrapper = mount(ExamensView, { global: { stubs } })
      await nextTick()
      await waitForData()

      await wrapper.find('.examens-view__form-header').trigger('click')
      await nextTick()
      expect(wrapper.vm.formOpen).toBe(true)

      await wrapper.find('.examens-view__form-header').trigger('click')
      await nextTick()
      expect(wrapper.vm.formOpen).toBe(false)
    })

    it('affiche le sélecteur de prescripteur quand le formulaire est déplié', async () => {
      const wrapper = mount(ExamensView, { global: { stubs } })
      await nextTick()
      await waitForData()

      await wrapper.find('.examens-view__form-header').trigger('click')
      await nextTick()

      const selects = wrapper.findAll('.el-select')
      expect(selects.length).toBeGreaterThanOrEqual(1)
    })

    it('affiche trois radios de type de demande quand le formulaire est déplié', async () => {
      const wrapper = mount(ExamensView, { global: { stubs } })
      await nextTick()
      await waitForData()

      await wrapper.find('.examens-view__form-header').trigger('click')
      await nextTick()

      const radios = wrapper.findAll('.el-radio')
      expect(radios.length).toBe(3)
    })

    it('affiche les options Imagerie, Laboratoire et Avis spécialisé', async () => {
      const wrapper = mount(ExamensView, { global: { stubs } })
      await nextTick()
      await waitForData()

      await wrapper.find('.examens-view__form-header').trigger('click')

      expect(wrapper.text()).toContain('Imagerie')
      expect(wrapper.text()).toContain('Radio, Scanner, IRM')
      expect(wrapper.text()).toContain('Examen de laboratoire')
      expect(wrapper.text()).toContain('Avis spécialisé')
    })
  })

  // ─── Création rapide depuis une cellule ────────────────────────────

  describe('création rapide depuis une cellule', () => {
    it('le clic sur une cellule vide ouvre le formulaire et pré-remplit la date et l\'heure', async () => {
      const wrapper = mount(ExamensView, { global: { stubs } })
      await nextTick()
      await waitForData()

      expect(wrapper.vm.formOpen).toBe(false)

      await wrapper.find('.examens-calendar__empty-cell').trigger('click')
      await nextTick()

      expect(wrapper.vm.formOpen).toBe(true)

      expect(wrapper.vm.form.plannedDate).not.toBeNull()
      expect(wrapper.vm.form.plannedHour).not.toBeNull()
    })

    it('pré-remplit plannedDate au format YYYY-MM-DD', async () => {
      const wrapper = mount(ExamensView, { global: { stubs } })
      await nextTick()
      await waitForData()

      await wrapper.find('.examens-calendar__empty-cell').trigger('click')
      await nextTick()

      expect(wrapper.vm.form.plannedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })

    it('pré-remplit plannedHour avec une heure valide (6, 8, 10, etc.)', async () => {
      const wrapper = mount(ExamensView, { global: { stubs } })
      await nextTick()
      await waitForData()

      await wrapper.find('.examens-calendar__empty-cell').trigger('click')
      await nextTick()

      expect([6, 8, 10, 12, 14, 16, 18, 20, 22]).toContain(wrapper.vm.form.plannedHour)
    })
  })

  // ─── Soumission du formulaire ──────────────────────────────────────

  describe('soumission du formulaire', () => {
    it('appelle createRequest via IPC avec les champs obligatoires', async () => {
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

      wrapper.vm.form.type = 'imagerie'
      await nextTick()
      wrapper.vm.form.prescripteur = 2
      wrapper.vm.form.examen = 10
      wrapper.vm.form.motif = 'Douleur thoracique'
      await nextTick()

      await wrapper.vm.onEnvoyer()
      await waitForData()
      await nextTick()

      const createCalls = mockIpcInvoke.mock.calls.filter(
        (c: any[]) => c[0] === 'exam-request:create'
      )
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

      const createCalls = mockIpcInvoke.mock.calls.filter(
        (c: any[]) => c[0] === 'exam-request:create'
      )
      const createArgs = createCalls[0][1]
      expect(createArgs).toHaveProperty('plannedDate', '2026-07-15')
      expect(createArgs).toHaveProperty('plannedHour', 10)
    })

    it('envoie les champs specialtyId pour le type avis', async () => {
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

      wrapper.vm.form.type = 'avis'
      await nextTick()
      wrapper.vm.form.prescripteur = 2
      wrapper.vm.form.specialtyId = 1
      wrapper.vm.form.motif = 'Avis cardiologique'
      await nextTick()

      await wrapper.vm.onEnvoyer()
      await waitForData()
      await nextTick()

      const createCalls = mockIpcInvoke.mock.calls.filter(
        (c: any[]) => c[0] === 'exam-request:create'
      )
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

      wrapper.vm.form.type = 'laboratoire'
      await nextTick()
      wrapper.vm.form.prescripteur = 2
      wrapper.vm.form.examens = [101, 102]
      await nextTick()

      await wrapper.vm.onEnvoyer()
      await waitForData()
      await nextTick()

      const createCalls = mockIpcInvoke.mock.calls.filter(
        (c: any[]) => c[0] === 'exam-request:create'
      )
      const createArgs = createCalls[0][1]
      expect(createArgs).toHaveProperty('type', 'laboratoire')
      expect(createArgs).toHaveProperty('examIds')
      expect(createArgs.examIds).toEqual([101, 102])
    })

    it('affiche un message de succès après création', async () => {
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
      const wrapper = mount(ExamensView, { global: { stubs } })
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
