// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { reactive, ref, watch } from 'vue'
import type { PrescriptionSortie } from '@/types/crh-diabete'
import { useMedicaments } from '@/composables/useMedicaments'
import { ElMessage } from 'element-plus'

// ─── Mock Element Plus ─────────────────────────────────────────────

const { mockConfirm } = vi.hoisted(() => ({
  mockConfirm: vi.fn(),
}))
vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), warning: vi.fn(), error: vi.fn() },
  ElMessageBox: { confirm: mockConfirm },
}))

// ─── Mock @element-plus/icons-vue ──────────────────────────────────

vi.mock('@element-plus/icons-vue', () => ({
  Plus: { name: 'Plus', render: () => null },
  Minus: { name: 'Minus', render: () => null },
  ArrowDown: { name: 'ArrowDown', render: () => null },
  Edit: { name: 'Edit', render: () => null },
  Delete: { name: 'Delete', render: () => null },
  Download: { name: 'Download', render: () => null },
  Printer: { name: 'Printer', render: () => null },
  Close: { name: 'Close', render: () => null },
  ZoomIn: { name: 'ZoomIn', render: () => null },
  ZoomOut: { name: 'ZoomOut', render: () => null },
  View: { name: 'View', render: () => null },
}))

vi.mock('@/components/prescriptions/OrdonnancePreview.vue', () => ({
  default: {
    name: 'OrdonnancePreview',
    template: '<div class="ordonnance-preview-mock" />',
    props: ['patientId', 'ordonnanceItems', 'prescriptionIds', 'inlinePrescriptions'],
    methods: {
      open() {},
    },
  },
}))

// ─── Mock RichTextEditor ──────────────────────────────────────────

vi.mock('@/components/patients/RichTextEditor.vue', () => ({
  default: {
    name: 'RichTextEditor',
    template: '<div class="rich-editor-mock" />',
    props: ['modelValue', 'readonly', 'rows', 'placeholder'],
    emits: ['update:modelValue', 'change'],
  },
}))

// ─── Mock IPC + composables (pré-remplissage / options d'examens) ──

const { mockIpcInvoke, examTypesState, specialtiesState, authState, usersState } = vi.hoisted(() => {
  const examTypesState = {
    allTypes: { value: [] as Array<{ id?: number; label: string }> },
    fetchAllByCategory: vi.fn(),
  }
  const specialtiesState = {
    specialties: { value: [] as Array<{ name: string }> },
    fetchSpecialties: vi.fn(),
  }
  const authState = {
    user: { value: null as null | { id: number; nom: string; prenom: string; role: string } },
  }
  const usersState = {
    users: { value: [] as Array<{ id?: number; nom?: string; prenom?: string; role?: string }> },
    loadUsers: vi.fn(),
  }
  return {
    mockIpcInvoke: vi.fn(),
    examTypesState,
    specialtiesState,
    authState,
    usersState,
  }
})

vi.mock('@/utils/ipc', () => ({
  ipcInvoke: mockIpcInvoke,
}))

vi.mock('@/composables/useExamTypes', () => ({
  useExamTypes: () => ({
    allTypes: examTypesState.allTypes,
    fetchAllByCategory: examTypesState.fetchAllByCategory,
  }),
}))

vi.mock('@/composables/useSpecialties', () => ({
  useSpecialties: () => ({
    specialties: specialtiesState.specialties,
    fetchSpecialties: specialtiesState.fetchSpecialties,
  }),
}))

vi.mock('@/composables/useAuth', () => ({
  useAuth: () => ({
    user: authState.user,
  }),
}))

vi.mock('@/composables/useUsers', () => ({
  useUsers: () => ({
    users: usersState.users,
    loadUsers: usersState.loadUsers,
  }),
  getUserDisplayName: (u: { nom?: string; prenom?: string }) =>
    `${u.nom ?? ''} ${u.prenom ?? ''}`.trim(),
}))

// ─── EL Stubs ──────────────────────────────────────────────────────

const ElFormStub = {
  name: 'ElForm',
  template: '<form class="el-form" @submit.prevent><slot /></form>',
  props: ['model', 'rules', 'labelPosition', 'size'],
  methods: {
    validate: vi.fn().mockResolvedValue(true),
    resetFields: vi.fn(),
    clearValidate: vi.fn(),
  },
}

// Version d'el-form qui applique réellement les règles `required` passées via
// `:rules` (utilisée uniquement par les tests de validation conditionnelle).
const ElFormValidatingStub = {
  name: 'ElForm',
  template: '<form class="el-form" @submit.prevent><slot /></form>',
  props: ['model', 'rules', 'labelPosition', 'size'],
  methods: {
    validate(this: any) {
      const rules: Record<string, any[]> = this.rules ?? {}
      const model: Record<string, any> = this.model ?? {}
      for (const field of Object.keys(rules)) {
        const fieldRules = rules[field] ?? []
        const required = fieldRules.some((r: any) => r.required)
        if (!required) continue
        const value = model[field]
        const isEmpty = value === '' || value == null || (Array.isArray(value) && value.length === 0)
        if (isEmpty) return Promise.reject(new Error(`validation failed: ${field}`))
      }
      return Promise.resolve(true)
    },
    resetFields: vi.fn(),
    clearValidate: vi.fn(),
  },
}

// Stub inerte : il rend le `<select>` mais ne lie pas la valeur au DOM.
// Les tests pilotent le v-model via `vm.$emit('update:modelValue', …)`.
const ElSelectStub = {
  name: 'ElSelect',
  template: '<select class="el-select"><slot /></select>',
  props: ['modelValue', 'filterable', 'placeholder', 'multiple', 'collapseTags', 'collapseTagsTooltip'],
  emits: ['update:modelValue'],
}

const ElTreeSelectStub = {
  name: 'ElTreeSelect',
  template: '<select class="el-tree-select" :multiple="multiple"><slot /></select>',
  props: ['modelValue', 'data', 'filterable', 'multiple', 'showCheckbox', 'checkStrictly', 'placeholder', 'collapseTags', 'collapseTagsTooltip', 'nodeKey', 'props'],
  emits: ['update:modelValue'],
}

const EL_STUBS: Record<string, any> = {
  'el-card': {
    template: '<div class="el-card"><slot name="header" /><slot /></div>',
    props: ['shadow'],
  },
  'el-form': ElFormStub,
  'el-select': ElSelectStub,
  'el-tree-select': ElTreeSelectStub,
  'el-date-picker': {
    template: '<input class="el-date-picker" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'type', 'valueFormat', 'placeholder', 'style'],
    emits: ['update:modelValue'],
  },
  'el-option': {
    template: '<option />',
    props: ['label', 'value'],
  },
  'el-input': {
    template: '<input class="el-input" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'placeholder', 'type', 'rows'],
    emits: ['update:modelValue'],
  },
  'el-input-number': {
    name: 'ElInputNumber',
    template: '<input class="el-input-number" type="number" :value="modelValue" @input="$emit(\'update:modelValue\', Number($event.target.value))" />',
    props: ['modelValue', 'min', 'max'],
    emits: ['update:modelValue'],
  },
  'el-button': {
    template: '<button class="el-button" :disabled="disabled" :type="type" @click="$emit(\'click\', $event)"><slot /></button>',
    props: ['disabled', 'type', 'size', 'text', 'icon', 'loading'],
    emits: ['click'],
  },
  'el-tag': {
    template: '<span class="el-tag" :type="type" :effect="effect"><slot /></span>',
    props: ['type', 'size', 'effect', 'round'],
  },
  'el-empty': {
    template: '<div class="el-empty" :description="description"><slot /></div>',
    props: ['description', 'imageSize'],
  },
  'el-switch': {
    template: '<input class="el-switch" type="checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)" />',
    props: ['modelValue'],
    emits: ['update:modelValue'],
  },
  'el-radio-group': {
    name: 'ElRadioGroup',
    template: '<div class="el-radio-group"><slot /></div>',
    props: ['modelValue'],
    emits: ['update:modelValue'],
  },
  'el-radio-button': {
    template: '<label class="el-radio-button"><input type="radio" :value="value" @change="$emit(\'update:modelValue\', value)" /><slot /></label>',
    props: ['value'],
  },
  'el-row': {
    template: '<div class="el-row"><slot /></div>',
    props: ['gutter'],
  },
  'el-col': {
    template: '<div class="el-col"><slot /></div>',
    props: ['span'],
  },
  'el-form-item': {
    template: '<div class="el-form-item"><label>{{ label }}</label><slot /></div>',
    props: ['label', 'prop'],
  },
}

// ─── Fixtures ──────────────────────────────────────────────────────

function createPrescription(overrides: Partial<PrescriptionSortie> = {}): PrescriptionSortie {
  return {
    _key: 'rx-' + Math.random().toString(36).slice(2, 8),
    medicament: 'Amoxicilline 500 mg',
    dosage: '500',
    unite: 'mg',
    voie: 'VO',
    duree: 7,
    formeGalenique: 'Comprimé',
    momentPrises: ['Matin', 'Soir'],
    renouvellement: false,
    nbRenouvellements: 1,
    frequenceType: 'moments',
    frequence: ['Matin', 'Soir'],
    instructions: 'Après le repas',
    ...overrides,
  }
}

// ─── Import component ──────────────────────────────────────────────

import OrdonnanceSortieTab from '../OrdonnanceSortieTab.vue'

// ─── Test suite ────────────────────────────────────────────────────

describe('OrdonnanceSortieTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockConfirm.mockResolvedValue(true)
    authState.user.value = null
    usersState.users.value = []
    usersState.loadUsers.mockResolvedValue(undefined)
  })

  function createWrapper(options: {
    data?: PrescriptionSortie[]
    readonly?: boolean
    patientId?: number | null
    dateEntree?: string
    provide?: Record<string, unknown>
    stubs?: Record<string, unknown>
  } = {}) {
    const { data = [], readonly = false, patientId, dateEntree, provide, stubs } = options
    const medications = reactive([...data])
    return mount(OrdonnanceSortieTab, {
      props: {
        data: medications,
        readonly,
        patientId,
        dateEntree,
      },
      global: {
        stubs: { ...EL_STUBS, ...stubs },
        provide,
      },
    })
  }

  // ─── Rendu initial ─────────────────────────────────────────────

  describe('rendu initial', () => {
    it('affiche "Ordonnance de Sortie" dans le header', () => {
      const wrapper = createWrapper()
      expect(wrapper.text()).toContain('Ordonnance de Sortie')
    })

    it('affiche le bouton "Nouveau" quand readonly=false', () => {
      const wrapper = createWrapper({ readonly: false })
      const buttons = wrapper.findAll('.el-button')
      const nouveauBtn = buttons.find(b => b.text().includes('Nouveau'))
      expect(nouveauBtn).toBeDefined()
    })

    it('n\'affiche PAS le bouton "Nouveau" quand readonly=true', () => {
      const wrapper = createWrapper({ readonly: true })
      const buttons = wrapper.findAll('.el-button')
      const nouveauBtn = buttons.find(b => b.text().includes('Nouveau'))
      expect(nouveauBtn).toBeUndefined()
    })

    it('affiche el-empty "Aucune prescription" quand data=[]', () => {
      const wrapper = createWrapper({ data: [] })
      const empty = wrapper.find('.el-empty')
      expect(empty.exists()).toBe(true)
      expect(empty.attributes('description')).toBe('Aucune prescription de sortie')
    })

    it('renders no native textarea elements (replaced by RichTextEditor)', async () => {
      const wrapper = createWrapper()
      const nouveauBtn = wrapper.findAll('.el-button').find(b => b.text().includes('Nouveau'))
      expect(nouveauBtn).toBeDefined()
      await nouveauBtn!.trigger('click')
      // Instructions / motif are RichTextEditor fields — a native <textarea>
      // would let users inject raw HTML bypassing the editor
      expect(wrapper.find('textarea').exists()).toBe(false)
    })
  })

  // ─── Ajout de prescription ─────────────────────────────────────

  describe('ajout de prescription', () => {
    it('cliquer "Nouveau" ouvre le formulaire', async () => {
      const wrapper = createWrapper()
      const nouveauBtn = wrapper.findAll('.el-button').find(b => b.text().includes('Nouveau'))
      expect(nouveauBtn).toBeDefined()
      await nouveauBtn!.trigger('click')

      // Le formulaire devrait apparaître
      expect(wrapper.find('.ordonnance-form-card').exists()).toBe(true)
      expect(wrapper.text()).toContain('Nouvelle prescription')
    })

    it('remplit le formulaire et soumet → prescription ajoutée au tableau', async () => {
      const wrapper = createWrapper()
      // Ouvrir le formulaire
      const nouveauBtn = wrapper.findAll('.el-button').find(b => b.text().includes('Nouveau'))
      await nouveauBtn!.trigger('click')
      await flushPromises()

      // Simuler la validation du formulaire (le stub el-form.validate retourne true)
      // Le bouton "Ajouter" devrait être visible
      const submitBtn = wrapper.findAll('.el-button').find(b => b.text().includes('Ajouter'))
      expect(submitBtn).toBeDefined()

      // Cliquer sur Ajouter
      await submitBtn!.trigger('click')
      await flushPromises()

      // La prescription devrait être ajoutée (même si les champs sont vides,
      // le validateur stub retourne true)
      // Le formulaire devrait se fermer
      expect(wrapper.find('.ordonnance-form-card').exists()).toBe(false)
    })

    it('émet l\'événement change après ajout', async () => {
      const wrapper = createWrapper()
      // Ouvrir le formulaire
      const nouveauBtn = wrapper.findAll('.el-button').find(b => b.text().includes('Nouveau'))
      await nouveauBtn!.trigger('click')
      await flushPromises()

      // Soumettre
      const submitBtn = wrapper.findAll('.el-button').find(b => b.text().includes('Ajouter'))
      await submitBtn!.trigger('click')
      await flushPromises()

      expect(wrapper.emitted('change')).toBeDefined()
      expect(wrapper.emitted('change')!.length).toBe(1)
    })

    it('le formulaire se ferme après ajout', async () => {
      const wrapper = createWrapper()
      // Ouvrir
      const nouveauBtn = wrapper.findAll('.el-button').find(b => b.text().includes('Nouveau'))
      await nouveauBtn!.trigger('click')
      expect(wrapper.find('.ordonnance-form-card').exists()).toBe(true)

      // Soumettre
      const submitBtn = wrapper.findAll('.el-button').find(b => b.text().includes('Ajouter'))
      await submitBtn!.trigger('click')
      await flushPromises()

      expect(wrapper.find('.ordonnance-form-card').exists()).toBe(false)
    })
  })

  // ─── Édition de prescription ───────────────────────────────────

  describe('édition de prescription', () => {
    it('cliquer "Modifier" pré-remplit le formulaire', async () => {
      const rx = createPrescription({ medicament: 'Metformine 500 mg', dosage: '500' })
      const wrapper = createWrapper({ data: [rx] })

      // Cliquer sur Modifier
      const editBtn = wrapper.findAll('.el-button').find(b => b.text().includes('Modifier'))
      expect(editBtn).toBeDefined()
      await editBtn!.trigger('click')
      await flushPromises()

      // Le formulaire devrait s'ouvrir avec le titre "Modifier la prescription"
      expect(wrapper.find('.ordonnance-form-card').exists()).toBe(true)
      expect(wrapper.text()).toContain('Modifier la prescription')
    })

    it('modifier et soumettre → la prescription est mise à jour', async () => {
      const rx = createPrescription({ medicament: 'Metformine 500 mg' })
      const wrapper = createWrapper({ data: [rx] })

      // Modifier
      const editBtn = wrapper.findAll('.el-button').find(b => b.text().includes('Modifier'))
      await editBtn!.trigger('click')
      await flushPromises()

      // Soumettre (Mettre à jour)
      const submitBtn = wrapper.findAll('.el-button').find(b => b.text().includes('Mettre à jour'))
      expect(submitBtn).toBeDefined()
      await submitBtn!.trigger('click')
      await flushPromises()

      // Le formulaire se ferme
      expect(wrapper.find('.ordonnance-form-card').exists()).toBe(false)
      // Le change event est émis
      expect(wrapper.emitted('change')).toBeDefined()
    })

    it('préserve _key lors de l\'édition', async () => {
      const originalKey = 'test-key-123'
      const rx = createPrescription({ _key: originalKey, medicament: 'Metformine 500 mg' })
      const wrapper = createWrapper({ data: [rx] })

      // Modifier
      const editBtn = wrapper.findAll('.el-button').find(b => b.text().includes('Modifier'))
      await editBtn!.trigger('click')
      await flushPromises()

      // Soumettre
      const submitBtn = wrapper.findAll('.el-button').find(b => b.text().includes('Mettre à jour'))
      await submitBtn!.trigger('click')
      await flushPromises()

      // Vérifier que le _key est préservé dans le tableau
      expect(rx._key).toBe(originalKey)
    })
  })

  // ─── Suppression de prescription ───────────────────────────────

  describe('suppression de prescription', () => {
    it('confirmer la suppression retire la prescription du tableau', async () => {
      const rx = createPrescription()
      const wrapper = createWrapper({ data: [rx] })

      // Vérifier qu'on a 1 prescription affichée
      expect(wrapper.findAll('.rx-card')).toHaveLength(1)

      // Cliquer sur Supprimer
      const deleteBtn = wrapper.findAll('.el-button').find(b => b.text().includes('Supprimer'))
      expect(deleteBtn).toBeDefined()
      await deleteBtn!.trigger('click')
      await flushPromises()

      // Le mock confirm retourne true, donc la suppression devrait avoir lieu
      expect(mockConfirm).toHaveBeenCalled()
    })

    it('émet change après suppression confirmée', async () => {
      const rx = createPrescription()
      const wrapper = createWrapper({ data: [rx] })

      const deleteBtn = wrapper.findAll('.el-button').find(b => b.text().includes('Supprimer'))
      await deleteBtn!.trigger('click')
      await flushPromises()

      expect(wrapper.emitted('change')).toBeDefined()
    })

    it('n\'supprime PAS si l\'utilisateur annule', async () => {
      mockConfirm.mockRejectedValue(new Error('Cancel'))
      const rx = createPrescription()
      const wrapper = createWrapper({ data: [rx] })

      const deleteBtn = wrapper.findAll('.el-button').find(b => b.text().includes('Supprimer'))
      await deleteBtn!.trigger('click')
      await flushPromises()

      // Pas de change émis
      expect(wrapper.emitted('change')).toBeUndefined()
      // La prescription est toujours là
      expect(wrapper.findAll('.rx-card')).toHaveLength(1)
    })
  })

  // ─── Annulation ────────────────────────────────────────────────

  describe('annulation', () => {
    it('ouvrir le formulaire puis cliquer "Annuler" ferme le formulaire', async () => {
      const wrapper = createWrapper()

      // Ouvrir
      const nouveauBtn = wrapper.findAll('.el-button').find(b => b.text().includes('Nouveau'))
      await nouveauBtn!.trigger('click')
      expect(wrapper.find('.ordonnance-form-card').exists()).toBe(true)

      // Annuler
      const cancelBtn = wrapper.findAll('.el-button').find(b => b.text().includes('Annuler'))
      expect(cancelBtn).toBeDefined()
      await cancelBtn!.trigger('click')

      expect(wrapper.find('.ordonnance-form-card').exists()).toBe(false)
    })

    it('l\'annulation n\'émet pas change', async () => {
      const wrapper = createWrapper()

      // Ouvrir
      const nouveauBtn = wrapper.findAll('.el-button').find(b => b.text().includes('Nouveau'))
      await nouveauBtn!.trigger('click')

      // Annuler
      const cancelBtn = wrapper.findAll('.el-button').find(b => b.text().includes('Annuler'))
      await cancelBtn!.trigger('click')

      expect(wrapper.emitted('change')).toBeUndefined()
    })
  })

  // ─── Readonly ──────────────────────────────────────────────────

  describe('readonly', () => {
    it('en mode readonly, pas de bouton "Nouveau"', () => {
      const wrapper = createWrapper({ readonly: true })
      const buttons = wrapper.findAll('.el-button')
      const nouveauBtn = buttons.find(b => b.text().includes('Nouveau'))
      expect(nouveauBtn).toBeUndefined()
    })

    it('en mode readonly, pas de boutons Modifier/Supprimer sur les cartes', () => {
      const rx = createPrescription()
      const wrapper = createWrapper({ data: [rx], readonly: true })

      const buttons = wrapper.findAll('.el-button')
      const editBtn = buttons.find(b => b.text().includes('Modifier'))
      const deleteBtn = buttons.find(b => b.text().includes('Supprimer'))
      expect(editBtn).toBeUndefined()
      expect(deleteBtn).toBeUndefined()
    })
  })


  // ─── Compteur ──────────────────────────────────────────────────
  describe('compteur', () => {
    it('le badge header affiche le bon nombre', () => {
      const rx1 = createPrescription({ _key: '1' })
      const rx2 = createPrescription({ _key: '2' })
      const wrapper = createWrapper({ data: [rx1, rx2] })

      const headerTags = wrapper.findAll('.ordonnance-tab__header .el-tag')
      expect(headerTags.length).toBeGreaterThanOrEqual(1)
      expect(headerTags[0].text()).toBe('2')
    })

    it('le résumé en bas affiche le bon nombre', () => {
      const rx1 = createPrescription({ _key: '1' })
      const rx2 = createPrescription({ _key: '2' })
      const rx3 = createPrescription({ _key: '3' })
      const wrapper = createWrapper({ data: [rx1, rx2, rx3] })

      const summary = wrapper.find('.ordonnance-summary')
      expect(summary.exists()).toBe(true)
      expect(summary.text()).toContain('3')
      expect(summary.text()).toContain('médicament(s)')
    })

    it('le compteur de renouvellements est correct', () => {
      const rx1 = createPrescription({ _key: '1', renouvellement: true, nbRenouvellements: 3 })
      const rx2 = createPrescription({ _key: '2', renouvellement: false })
      const rx3 = createPrescription({ _key: '3', renouvellement: true, nbRenouvellements: 2 })
      const wrapper = createWrapper({ data: [rx1, rx2, rx3] })

      const summary = wrapper.find('.ordonnance-summary')
      expect(summary.text()).toContain('2')
      expect(summary.text()).toContain('renouvellement')
    })

    it('pas de compteur de renouvellement si aucun renouvellement', () => {
      const rx1 = createPrescription({ _key: '1', renouvellement: false })
      const wrapper = createWrapper({ data: [rx1] })

      const summary = wrapper.find('.ordonnance-summary')
      expect(summary.text()).not.toContain('renouvellement')
    })
  })

  // ─── Affichage des prescriptions ───────────────────────────────

  describe('affichage des prescriptions', () => {
    it('affiche les cartes de prescription avec medicament et dosage', () => {
      const rx = createPrescription({
        medicament: 'Metformine 500 mg',
        dosage: '500',
        unite: 'mg',
        voie: 'VO',
        duree: 7,
      })
      const wrapper = createWrapper({ data: [rx] })

      const card = wrapper.find('.rx-card')
      expect(card.exists()).toBe(true)
      expect(card.text()).toContain('Metformine 500 mg')
      expect(card.text()).toContain('500')
      expect(card.text()).toContain('mg')
    })

    it('affiche le tag renouvellement si applicable', () => {
      const rx = createPrescription({
        renouvellement: true,
        nbRenouvellements: 3,
      })
      const wrapper = createWrapper({ data: [rx] })

      const card = wrapper.find('.rx-card')
      expect(card.text()).toContain('Renouvellement')
      expect(card.text()).toContain('3')
    })

    it('une carte soins n\'affiche ni voie ni dosage, même si les données en contiennent', () => {
      const rx = createPrescription({
        _key: 'k-soin',
        categorie: 'soins',
        medicament: 'Pansement quotidien',
        dosage: '500',
        unite: 'mg',
        voie: 'VO',
        frequence: ['1/jour'],
      })
      const wrapper = createWrapper({ data: [rx] })

      const card = wrapper.find('.rx-card')
      expect(card.text()).toContain('Pansement quotidien')
      expect(card.text()).toContain('1/jour')
      expect(card.text()).not.toContain('VO')
      expect(card.text()).not.toContain('500')
      expect(card.text()).not.toContain('Comprimé')
      expect(card.text()).not.toContain('Matin')
      expect(card.find('.rx-card__dosage').exists()).toBe(false)
    })

    it('le formulaire soins ne montre pas les champs Voie, Dosage et Unité', async () => {
      const wrapper = createWrapper()
      const group = wrapper.findAll('.ordonnance-group').find(g =>
        g.find('.ordonnance-group__title').text().toLowerCase().includes('soins'),
      )!
      await group.findAll('.el-button').find(b => b.text().includes('Ajouter'))!.trigger('click')
      await flushPromises()

      const labels = wrapper.findAll('.el-form-item label').map(l => l.text())
      expect(labels).not.toContain('Voie')
      expect(labels).not.toContain('Dosage')
      expect(labels).not.toContain('Unité')
      expect(labels).not.toContain('Forme galénique')
      expect(labels).not.toContain('Consignes de prise')
      expect(labels).toContain('Durée (jours)')
      expect(labels).toContain('Soin')
    })

    it('une soumission soins ne conserve de voie ni de dosage, même hérités du formulaire', async () => {
      const wrapper = createWrapper()
      const group = wrapper.findAll('.ordonnance-group').find(g =>
        g.find('.ordonnance-group__title').text().toLowerCase().includes('soins'),
      )!
      await group.findAll('.el-button').find(b => b.text().includes('Ajouter'))!.trigger('click')
      await flushPromises()

      ;(wrapper.vm as any).form.categorie = 'medicament'
      ;(wrapper.vm as any).form.dosage = '500'
      ;(wrapper.vm as any).form.unite = 'mg'
      ;(wrapper.vm as any).form.voie = 'VO'
      ;(wrapper.vm as any).form.categorie = 'soins'
      ;(wrapper.vm as any).form.medicament = 'Pansement quotidien'
      ;(wrapper.vm as any).form.frequence = ['1/jour']
      await flushPromises()

      const submitBtn = wrapper.find('.ordonnance-form-card__actions')
        .findAll('.el-button').find(b => b.text().includes('Ajouter'))!
      await submitBtn.trigger('click')
      await flushPromises()

      const committed = wrapper.props('data') as PrescriptionSortie[]
      expect(committed[0]).toMatchObject({
        categorie: 'soins',
        medicament: 'Pansement quotidien',
        dosage: '',
        unite: '',
        voie: '',
        formeGalenique: '',
        momentPrises: [],
        frequence: ['1/jour'],
      })
    })

    it('n\'affiche pas le tag renouvellement si renouvellement=false', () => {
      const rx = createPrescription({ renouvellement: false })
      const wrapper = createWrapper({ data: [rx] })

      const card = wrapper.find('.rx-card')
      expect(card.text()).not.toContain('Renouvellement')
    })

    it('affiche les instructions si présentes', () => {
      const rx = createPrescription({ instructions: 'Prender après le repas' })
      const wrapper = createWrapper({ data: [rx] })

      const card = wrapper.find('.rx-card')
      expect(card.text()).toContain('Prender après le repas')
    })

    it('affiche le résumé des prescriptions (colonne droite)', () => {
      const rx1 = createPrescription({ _key: '1' })
      const rx2 = createPrescription({ _key: '2' })
      const wrapper = createWrapper({ data: [rx1, rx2] })

      const previewTags = wrapper.findAll('.ordonnance-tab__preview-col .el-tag')
      expect(previewTags.length).toBeGreaterThanOrEqual(1)
      expect(previewTags[0].text()).toBe('2')
    })
  })

  // ─── Staged (draft local → commit sur validation) ──────────────

  describe('staged (draft local → commit sur validation)', () => {
    it('les saisies du formulaire ne touchent PAS data avant validation', async () => {
      const data = reactive([])
      const wrapper = createWrapper({ data })

      const nouveauBtn = wrapper.findAll('.el-button').find(b => b.text().includes('Nouveau'))
      await nouveauBtn!.trigger('click')
      await flushPromises()

      const dosageInput = wrapper.findAll('.el-input')[0]
      await dosageInput.setValue('750')
      await flushPromises()

      // Le formulaire est un draft local : data reste vide
      expect(data).toHaveLength(0)
      expect(wrapper.emitted('change')).toBeUndefined()
    })

    it('valider commit le draft dans data et émet change une seule fois', async () => {
      const wrapper = createWrapper()

      const nouveauBtn = wrapper.findAll('.el-button').find(b => b.text().includes('Nouveau'))
      await nouveauBtn!.trigger('click')
      await flushPromises()

      const dosageInput = wrapper.findAll('.el-input')[0]
      await dosageInput.setValue('750')
      await flushPromises()

      const submitBtn = wrapper.findAll('.el-button').find(b => b.text().includes('Ajouter'))
      await submitBtn!.trigger('click')
      await flushPromises()

      const committed = wrapper.props('data')
      expect(committed).toHaveLength(1)
      expect(committed[0].dosage).toBe('750')
      expect(wrapper.emitted('change')).toHaveLength(1)
    })

    it('le titre du formulaire reflète le mode création vs édition', async () => {
      const rx = createPrescription({ medicament: 'Metformine 500 mg' })
      const wrapper = createWrapper({ data: [rx] })

      const nouveauBtn = wrapper.findAll('.el-button').find(b => b.text().includes('Nouveau'))
      await nouveauBtn!.trigger('click')
      await flushPromises()
      expect(wrapper.text()).toContain('Nouvelle prescription')

      await wrapper.findAll('.el-button').find(b => b.text().includes('Annuler'))!.trigger('click')
      await flushPromises()

      const editBtn = wrapper.findAll('.el-button').find(b => b.text().includes('Modifier'))
      await editBtn!.trigger('click')
      await flushPromises()
      expect(wrapper.text()).toContain('Modifier la prescription')
    })
  })

  // ─── Groupes (partitionnement 4 catégories) ─────────────────────

  describe('groupes de catégories', () => {
    function groupByTitle(wrapper: ReturnType<typeof createWrapper>, needle: string) {
      const group = wrapper.findAll('.ordonnance-group').find(g =>
        g.find('.ordonnance-group__title').text().toLowerCase().includes(needle),
      )
      expect(group).toBeDefined()
      return group!
    }

    it('affiche les 4 groupes (Médicaments, Soins, Demandes d\'examens, Avis spécialisés)', () => {
      const med = createPrescription({ _key: 'k-med', medicament: 'Amoxicilline 500 mg' })
      const soin = createPrescription({ _key: 'k-soin', categorie: 'soins', medicament: 'Pansement quotidien' })
      const examen = createPrescription({ _key: 'k-examen', categorie: 'examen', examen: 'Scanner cérébral', medicament: '' })
      const avis = createPrescription({ _key: 'k-avis', categorie: 'avis', specialite: 'Cardiologue', medicament: '' })
      const wrapper = createWrapper({ data: [med, soin, examen, avis] })

      const groups = wrapper.findAll('.ordonnance-group')
      expect(groups).toHaveLength(4)

      const titles = groups.map(g => g.find('.ordonnance-group__title').text().toLowerCase())
      expect(titles[0]).toContain('médicaments')
      expect(titles[1]).toContain('soins')
      expect(titles[2]).toContain('demandes d\'examens')
      expect(titles[3]).toContain('avis spécialisés')
    })

    it('chaque item apparaît sous son groupe', () => {
      const med = createPrescription({ _key: 'k-med', medicament: 'Amoxicilline 500 mg' })
      const soin = createPrescription({ _key: 'k-soin', categorie: 'soins', medicament: 'Pansement quotidien' })
      const examen = createPrescription({ _key: 'k-examen', categorie: 'examen', examen: 'Scanner cérébral', medicament: '' })
      const avis = createPrescription({ _key: 'k-avis', categorie: 'avis', specialite: 'Cardiologue', medicament: '' })
      const wrapper = createWrapper({ data: [med, soin, examen, avis] })

      const titles = (g: ReturnType<typeof createWrapper>) =>
        g.findAll('.rx-card__medicament').map(c => c.text())

      expect(titles(groupByTitle(wrapper, 'médicaments'))).toEqual(['Amoxicilline 500 mg'])
      expect(titles(groupByTitle(wrapper, 'soins'))).toEqual(['Pansement quotidien'])
      expect(titles(groupByTitle(wrapper, 'demandes d\'examens'))).toEqual(['Scanner cérébral'])
      expect(titles(groupByTitle(wrapper, 'avis spécialisés'))).toEqual(['Cardiologue'])
    })

    it('un item legacy sans categorie atterrit sous MÉDICAMENTS', () => {
      const legacy = createPrescription({ _key: 'k-legacy', medicament: 'Ancienne prescription' })
      const soin = createPrescription({ _key: 'k-soin', categorie: 'soins', medicament: 'Pansement' })
      const wrapper = createWrapper({ data: [legacy, soin] })

      const medGroup = groupByTitle(wrapper, 'médicaments')
      expect(medGroup.findAll('.rx-card__medicament').map(c => c.text())).toEqual(['Ancienne prescription'])
      // le badge du groupe compte l'item legacy
      expect(medGroup.find('.el-tag').text()).toBe('1')
      // le résumé compte 1 médicament (l'item legacy) et 1 soin
      expect(wrapper.find('.ordonnance-summary').text()).toContain('1 médicament(s)')
      expect(wrapper.find('.ordonnance-summary').text()).toContain('1 soin(s)')
    })
  })

  // ─── Bouton "Générer" par groupe → émet generate avec la catégorie ──

  describe('bouton "Générer" par groupe', () => {
    function groupByTitle(wrapper: ReturnType<typeof createWrapper>, needle: string) {
      const group = wrapper.findAll('.ordonnance-group').find(g =>
        g.find('.ordonnance-group__title').text().toLowerCase().includes(needle),
      )
      expect(group).toBeDefined()
      return group!
    }

    it('affiche le bouton "Générer" pour chaque groupe non vide', () => {
      const med = createPrescription({ _key: 'k-med', medicament: 'Amoxicilline 500 mg' })
      const soin = createPrescription({ _key: 'k-soin', categorie: 'soins', medicament: 'Pansement quotidien' })
      const wrapper = createWrapper({ data: [med, soin] })

      const medGroup = groupByTitle(wrapper, 'médicaments')
      const soinGroup = groupByTitle(wrapper, 'soins')

      expect(medGroup.findAll('.el-button').find(b => b.text().includes('Générer'))).toBeDefined()
      expect(soinGroup.findAll('.el-button').find(b => b.text().includes('Générer'))).toBeDefined()
    })

    it('n\'affiche PAS "Générer" pour un groupe vide', () => {
      const med = createPrescription({ _key: 'k-med', medicament: 'Amoxicilline 500 mg' })
      const wrapper = createWrapper({ data: [med] })

      const examenGroup = groupByTitle(wrapper, "demandes d'examens")
      const avisGroup = groupByTitle(wrapper, 'avis spécialisés')

      expect(examenGroup.findAll('.el-button').find(b => b.text().includes('Générer'))).toBeUndefined()
      expect(avisGroup.findAll('.el-button').find(b => b.text().includes('Générer'))).toBeUndefined()
    })

    it('affiche "Générer" en mode readonly avec ≥1 item', () => {
      const med = createPrescription({ _key: 'k-med', medicament: 'Amoxicilline 500 mg' })
      const wrapper = createWrapper({ data: [med], readonly: true })

      const medGroup = groupByTitle(wrapper, 'médicaments')
      expect(medGroup.findAll('.el-button').find(b => b.text().includes('Générer'))).toBeDefined()
    })

    it('émet "generate" avec la catégorie du groupe au clic', async () => {
      const med = createPrescription({ _key: 'k-med', medicament: 'Amoxicilline 500 mg' })
      const soin = createPrescription({ _key: 'k-soin', categorie: 'soins', medicament: 'Pansement quotidien' })
      const wrapper = createWrapper({ data: [med, soin] })

      const medGroup = groupByTitle(wrapper, 'médicaments')
      const medGenBtn = medGroup.findAll('.el-button').find(b => b.text().includes('Générer'))!
      await medGenBtn.trigger('click')

      const soinGroup = groupByTitle(wrapper, 'soins')
      const soinGenBtn = soinGroup.findAll('.el-button').find(b => b.text().includes('Générer'))!
      await soinGenBtn.trigger('click')

      expect(wrapper.emitted('generate')).toBeDefined()
      expect(wrapper.emitted('generate')!.map(e => e[0])).toEqual(['medicament', 'soins'])
    })

    it('n\'émet PAS "generate" si le groupe est vide (pas de bouton)', () => {
      const wrapper = createWrapper({ data: [createPrescription()] })
      expect(wrapper.emitted('generate')).toBeUndefined()
    })
  })

  // ─── Bouton "Ajouter" par groupe → catégorie pré-réglée ─────────

  describe('bouton "Ajouter" par groupe (catégorie pré-réglée)', () => {
    async function openGroupForm(wrapper: ReturnType<typeof createWrapper>, needle: string) {
      const group = wrapper.findAll('.ordonnance-group').find(g =>
        g.find('.ordonnance-group__title').text().toLowerCase().includes(needle),
      )!
      const addBtn = group.findAll('.el-button').find(b => b.text().includes('Ajouter'))!
      await addBtn.trigger('click')
      await flushPromises()
    }

    async function submitForm(wrapper: ReturnType<typeof createWrapper>) {
      const submitBtn = wrapper.find('.ordonnance-form-card__actions')
        .findAll('.el-button').find(b => b.text().includes('Ajouter'))!
      await submitBtn.trigger('click')
      await flushPromises()
    }

    it('groupe SOINS → l\'item soumis porte categorie "soins"', async () => {
      const wrapper = createWrapper()
      await openGroupForm(wrapper, 'soins')
      expect(wrapper.find('.ordonnance-form-card').exists()).toBe(true)
      await submitForm(wrapper)

      const committed = wrapper.props('data') as PrescriptionSortie[]
      expect(committed).toHaveLength(1)
      expect(committed[0].categorie).toBe('soins')
    })

    it('groupe DEMANDES D\'EXAMENS → l\'item soumis porte categorie "examen"', async () => {
      const wrapper = createWrapper()
      await openGroupForm(wrapper, 'demandes d\'examens')
      await submitForm(wrapper)

      const committed = wrapper.props('data') as PrescriptionSortie[]
      expect(committed).toHaveLength(1)
      expect(committed[0].categorie).toBe('examen')
    })

    it('groupe AVIS SPÉCIALISÉS → l\'item soumis porte categorie "avis"', async () => {
      const wrapper = createWrapper()
      await openGroupForm(wrapper, 'avis spécialisés')
      await submitForm(wrapper)

      const committed = wrapper.props('data') as PrescriptionSortie[]
      expect(committed).toHaveLength(1)
      expect(committed[0].categorie).toBe('avis')
    })
  })

  // ─── Validation conditionnelle par catégorie ────────────────────

  describe('validation conditionnelle par catégorie', () => {
    function createValidatingWrapper(options: { data?: PrescriptionSortie[] } = {}) {
      return createWrapper({ ...options, stubs: { 'el-form': ElFormValidatingStub } })
    }

    async function openGroupForm(wrapper: ReturnType<typeof createWrapper>, needle: string) {
      const group = wrapper.findAll('.ordonnance-group').find(g =>
        g.find('.ordonnance-group__title').text().toLowerCase().includes(needle),
      )!
      const addBtn = group.findAll('.el-button').find(b => b.text().includes('Ajouter'))!
      await addBtn.trigger('click')
      await flushPromises()
    }

    async function submitForm(wrapper: ReturnType<typeof createWrapper>) {
      const submitBtn = wrapper.find('.ordonnance-form-card__actions')
        .findAll('.el-button').find(b => b.text().includes('Ajouter'))!
      await submitBtn.trigger('click')
      await flushPromises()
    }

    /** Remplit le el-select du champ labelé `fieldLabel` puis renvoie le wrapper. */
    async function setSelectValue(wrapper: ReturnType<typeof createWrapper>, fieldLabel: string, value: string) {
      const formItem = wrapper.findAll('.el-form-item').find(i => i.text().includes(fieldLabel))!
      const select = formItem.findComponent(ElSelectStub)
      if (select.exists()) {
        (select.vm as any).$emit('update:modelValue', value)
        return
      }
      const tree = formItem.findComponent(ElTreeSelectStub)
      ;(tree.vm as any).$emit('update:modelValue', value)
    }

    /** Alimente le référentiel imagerie interne + sélectionne l'examen (tree-select en ids). */
    function selectImagerieExamen(wrapper: ReturnType<typeof createWrapper>, id: number, label: string) {
      const vm = wrapper.vm as any
      vm.imageriesDisponibles = [{ id, label, category_id: 1, is_active: true }]
      vm.form.examenId = id
      vm.form.examen = label
    }

    it('un examen sans valeur n\'est pas soumis (formulaire reste ouvert)', async () => {
      const wrapper = createValidatingWrapper()
      await openGroupForm(wrapper, 'demandes d\'examens')
      await submitForm(wrapper)

      expect(wrapper.props('data')).toHaveLength(0)
      expect(wrapper.find('.ordonnance-form-card').exists()).toBe(true)
    })

    it('un examen avec valeur est accepté → { categorie: "examen", examen, motif }', async () => {
      const wrapper = createValidatingWrapper()
      await openGroupForm(wrapper, 'demandes d\'examens')

      selectImagerieExamen(wrapper, 10, 'IRM cérébrale')
      await wrapper.findComponent({ name: 'RichTextEditor' }).vm.$emit('update:modelValue', 'Céphalées')
      ;(wrapper.vm as any).form.prescripteur = 'DIALLO Mamadou'
      await submitForm(wrapper)

      const committed = wrapper.props('data') as PrescriptionSortie[]
      expect(committed).toHaveLength(1)
      expect(committed[0]).toMatchObject({ categorie: 'examen', examenType: 'imagerie', examen: 'IRM cérébrale', motif: 'Céphalées' })
    })

    it('un avis sans spécialité n\'est pas soumis', async () => {
      const wrapper = createValidatingWrapper()
      await openGroupForm(wrapper, 'avis spécialisés')
      await submitForm(wrapper)

      expect(wrapper.props('data')).toHaveLength(0)
      expect(wrapper.find('.ordonnance-form-card').exists()).toBe(true)
    })

    it('un avis avec spécialité est accepté → { categorie: "avis", specialite, motif }', async () => {
      const wrapper = createValidatingWrapper()
      await openGroupForm(wrapper, 'avis spécialisés')

      await setSelectValue(wrapper, 'Spécialité', 'Cardiologue')
      await wrapper.findComponent({ name: 'RichTextEditor' }).vm.$emit('update:modelValue', 'Bilan cardiaque')
      ;(wrapper.vm as any).form.prescripteur = 'DIALLO Mamadou'
      await submitForm(wrapper)

      const committed = wrapper.props('data') as PrescriptionSortie[]
      expect(committed).toHaveLength(1)
      expect(committed[0]).toMatchObject({ categorie: 'avis', specialite: 'Cardiologue', motif: 'Bilan cardiaque' })
    })
  })

  // ─── Ajout + édition examen/avis ────────────────────────────────

  describe('ajout + édition d\'un examen et d\'un avis', () => {
    async function openGroupForm(wrapper: ReturnType<typeof createWrapper>, needle: string) {
      const group = wrapper.findAll('.ordonnance-group').find(g =>
        g.find('.ordonnance-group__title').text().toLowerCase().includes(needle),
      )!
      const addBtn = group.findAll('.el-button').find(b => b.text().includes('Ajouter'))!
      await addBtn.trigger('click')
      await flushPromises()
    }

    async function submitForm(wrapper: ReturnType<typeof createWrapper>, buttonText: string) {
      const submitBtn = wrapper.find('.ordonnance-form-card__actions')
        .findAll('.el-button').find(b => b.text().includes(buttonText))!
      await submitBtn.trigger('click')
      await flushPromises()
    }

    async function setSelectValue(wrapper: ReturnType<typeof createWrapper>, fieldLabel: string, value: string) {
      const formItem = wrapper.findAll('.el-form-item').find(i => i.text().includes(fieldLabel))!
      const select = formItem.findComponent(ElSelectStub)
      if (select.exists()) {
        (select.vm as any).$emit('update:modelValue', value)
        return
      }
      const tree = formItem.findComponent(ElTreeSelectStub)
      ;(tree.vm as any).$emit('update:modelValue', value)
    }

    function selectImagerieExamen(wrapper: ReturnType<typeof createWrapper>, id: number, label: string) {
      const vm = wrapper.vm as any
      vm.imageriesDisponibles = [{ id, label, category_id: 1, is_active: true }]
      vm.form.examenId = id
      vm.form.examen = label
    }

    it('ajoute puis édite un examen : champs conservés et _key préservé', async () => {
      const wrapper = createWrapper()

      // Ajout (imagerie via tree-select en ids → libellé résolu à la soumission)
      await openGroupForm(wrapper, 'demandes d\'examens')
      selectImagerieExamen(wrapper, 10, 'IRM cérébrale')
      await wrapper.findComponent({ name: 'RichTextEditor' }).vm.$emit('update:modelValue', 'Céphalées')
      await submitForm(wrapper, 'Ajouter')

      const committed = wrapper.props('data') as PrescriptionSortie[]
      expect(committed).toHaveLength(1)
      expect(committed[0]).toMatchObject({ categorie: 'examen', examenType: 'imagerie', examen: 'IRM cérébrale', motif: 'Céphalées' })
      const examenKey = committed[0]._key

      // Édition : le formulaire est pré-rempli
      const examenCard = wrapper.findAll('.rx-card').find(c => c.text().includes('IRM cérébrale'))!
      const editBtn = examenCard.findAll('.el-button').find(b => b.text().includes('Modifier'))!
      await editBtn.trigger('click')
      await flushPromises()

      const vm = wrapper.vm as any
      expect(vm.form.categorie).toBe('examen')
      expect(vm.form.examenType).toBe('imagerie')
      expect(vm.form.motif).toBe('Céphalées')

      // Modification du motif puis mise à jour
      await wrapper.findComponent({ name: 'RichTextEditor' }).vm.$emit('update:modelValue', 'Nouveau motif')
      await submitForm(wrapper, 'Mettre à jour')

      const updated = wrapper.props('data') as PrescriptionSortie[]
      expect(updated).toHaveLength(1)
      expect(updated[0]._key).toBe(examenKey)
      expect(updated[0]).toMatchObject({ categorie: 'examen', examenType: 'imagerie', examen: 'IRM cérébrale', motif: 'Nouveau motif' })
    })

    it('ajoute puis édite un avis : spécialité et motif conservés, _key préservé', async () => {
      const wrapper = createWrapper()

      // Ajout
      await openGroupForm(wrapper, 'avis spécialisés')
      await setSelectValue(wrapper, 'Spécialité', 'Cardiologue')
      await wrapper.findComponent({ name: 'RichTextEditor' }).vm.$emit('update:modelValue', 'Bilan cardiaque')
      await submitForm(wrapper, 'Ajouter')

      const committed = wrapper.props('data') as PrescriptionSortie[]
      expect(committed).toHaveLength(1)
      expect(committed[0]).toMatchObject({ categorie: 'avis', specialite: 'Cardiologue', motif: 'Bilan cardiaque' })
      const avisKey = committed[0]._key

      // Édition : le formulaire est pré-rempli
      const avisCard = wrapper.findAll('.rx-card').find(c => c.text().includes('Cardiologue'))!
      const editBtn = avisCard.findAll('.el-button').find(b => b.text().includes('Modifier'))!
      await editBtn.trigger('click')
      await flushPromises()

      const vm = wrapper.vm as any
      expect(vm.form.categorie).toBe('avis')
      expect(vm.form.specialite).toBe('Cardiologue')
      expect(vm.form.motif).toBe('Bilan cardiaque')

      // Modification du motif puis mise à jour
      await wrapper.findComponent({ name: 'RichTextEditor' }).vm.$emit('update:modelValue', 'Nouveau motif avis')
      await submitForm(wrapper, 'Mettre à jour')

      const updated = wrapper.props('data') as PrescriptionSortie[]
      expect(updated).toHaveLength(1)
      expect(updated[0]._key).toBe(avisKey)
      expect(updated[0]).toMatchObject({ categorie: 'avis', specialite: 'Cardiologue', motif: 'Nouveau motif avis' })
    })
  })

  // ─── Pré-remplissage loadDefaults ────────────────────────────────

  describe('pré-remplissage loadDefaults', () => {
    const LAB_TYPES = [
      { id: 1, label: 'NFS' },
      { id: 2, label: 'Ionogramme' },
    ]
    const PRESCRIPTIONS = [
      // actif, prescrit avant dateEntree → inclus
      { id: 1, patientId: 7, type: 'medicament', medicament: 'Metformine 500 mg', dosage: '500', voie: 'PO', duree: 7, frequence: ['Matin', 'Soir'], statut: 'active', datePrescription: '2025-01-10' },
      // actif mais prescrit après dateEntree → exclu
      { id: 2, patientId: 7, type: 'medicament', medicament: 'Furosémide 40 mg', dosage: '40', voie: 'PO', duree: 7, frequence: ['Matin'], statut: 'active', datePrescription: '2026-01-10' },
      // inactif → exclu
      { id: 3, patientId: 7, type: 'medicament', medicament: 'Ancien arrêté', dosage: '', voie: '', duree: 7, frequence: [], statut: 'inactive', datePrescription: '2024-01-01' },
      // soin actif → inclus (pas de filtre de date)
      { id: 4, patientId: 7, type: 'soins', medicament: 'Pansement quotidien', dosage: '', voie: '', duree: 7, frequence: ['1/jour'], statut: 'active' },
    ]
    const REQUESTS = [
      { id: 1, patientId: 7, type: 'imagerie', examenLabel: 'Scanner cérébral', motif: 'Céphalées', statut: 'en_attente' },
      { id: 2, patientId: 7, type: 'laboratoire', examIds: [1, 2], motif: 'Bilan biologique', statut: 'en_attente' },
      { id: 3, patientId: 7, type: 'avis', specialtyName: 'Cardiologie', motif: 'Bilan cardiaque', statut: 'en_attente' },
      { id: 4, patientId: 7, type: 'imagerie', examenLabel: 'Radio annulée', motif: 'x', statut: 'annule' },
    ]

    beforeEach(() => {
      examTypesState.allTypes.value = []
      specialtiesState.specialties.value = []
      mockIpcInvoke.mockImplementation(async (channel: string) => {
        if (channel === 'prescription:list') return PRESCRIPTIONS
        if (channel === 'exam-request:list') return REQUESTS
        if (channel === 'exam-types:list-all-by-category') return LAB_TYPES
        if (channel === 'specialties:list') return []
        return null
      })
      examTypesState.fetchAllByCategory.mockImplementation(async (category: string) => {
        examTypesState.allTypes.value = category === 'laboratoire' ? LAB_TYPES : []
      })
      specialtiesState.fetchSpecialties.mockResolvedValue(undefined)
    })

    it('pré-remplit avec les prescriptions actives et les demandes non annulées', async () => {
      const wrapper = createWrapper({ patientId: 7, dateEntree: '2025-02-01' })
      await flushPromises()

      expect(mockIpcInvoke).toHaveBeenCalledWith('prescription:list', { patientId: 7 })
      expect(mockIpcInvoke).toHaveBeenCalledWith('exam-request:list', { patientId: 7 })

      const data = wrapper.props('data') as PrescriptionSortie[]
      // Metformine (medicament actif avant l'entrée) + Pansement (soin actif)
      // + Scanner (imagerie) + NFS, Ionogramme (laboratoire) + Cardiologie (avis)
      expect(data).toHaveLength(5)

      expect(data.some(d => d.categorie === 'medicament' && d.medicament === 'Metformine 500 mg')).toBe(true)
      // prescrit après la date d'entrée → exclu
      expect(data.some(d => d.categorie === 'medicament' && d.medicament === 'Furosémide 40 mg')).toBe(false)
      // statut inactif → exclu
      expect(data.some(d => d.categorie === 'medicament' && d.medicament === 'Ancien arrêté')).toBe(false)
      expect(data.some(d => d.categorie === 'soins' && d.medicament === 'Pansement quotidien')).toBe(true)

      const imagerie = data.find(d => d.categorie === 'examen' && d.examen === 'Scanner cérébral')
      expect(imagerie).toBeDefined()
      expect(imagerie!.motif).toBe('Céphalées')

      // labels de laboratoire résolus via examIds (id → label)
      expect(data.some(d => d.categorie === 'examen' && d.examen === 'NFS, Ionogramme')).toBe(true)

      const avis = data.find(d => d.categorie === 'avis')
      expect(avis).toBeDefined()
      expect(avis!.specialite).toBe('Cardiologie') // specialtyName prioritaire sur specialite

      // demande annulée → exclue
      expect(data.some(d => d.examen === 'Radio annulée')).toBe(false)
    })

    it('un second clic sur "Recharger les éléments par défaut" ne duplique pas', async () => {
      const wrapper = createWrapper({ patientId: 7, dateEntree: '2025-02-01' })
      await flushPromises()
      const before = (wrapper.props('data') as PrescriptionSortie[]).length
      expect(before).toBe(5)

      const reloadBtn = wrapper.findAll('.el-button').find(b => b.text().includes('Recharger les éléments par défaut'))!
      await reloadBtn.trigger('click')
      await flushPromises()

      expect((wrapper.props('data') as PrescriptionSortie[])).toHaveLength(before)
      // aucun nouveau 'change' pour un rechargement sans nouveauté
      expect(wrapper.emitted('change')).toHaveLength(1)
    })

    it('en mode readonly, aucun appel IPC au montage', async () => {
      const wrapper = createWrapper({ patientId: 7, dateEntree: '2025-02-01', readonly: true })
      await flushPromises()
      expect(mockIpcInvoke).not.toHaveBeenCalled()
    })

    it('sans patientId, pas de pré-remplissage au montage', async () => {
      const wrapper = createWrapper({ dateEntree: '2025-02-01' })
      await flushPromises()
      expect(mockIpcInvoke).not.toHaveBeenCalled()
    })

    it('émet "change" après le pré-remplissage', async () => {
      const wrapper = createWrapper({ patientId: 7, dateEntree: '2025-02-01' })
      await flushPromises()

      expect(wrapper.emitted('change')).toBeDefined()
      expect(wrapper.emitted('change')!.length).toBe(1)
    })

    it('bascule le flag vitalSyncInProgress autour de la mutation', async () => {
      const syncRef = ref(false)
      let sawTrue = false
      watch(syncRef, (v) => { if (v) sawTrue = true }, { flush: 'sync' })

      const wrapper = createWrapper({
        patientId: 7,
        dateEntree: '2025-02-01',
        provide: { vitalSyncInProgress: syncRef },
      })
      await flushPromises()

      expect((wrapper.props('data') as PrescriptionSortie[])).toHaveLength(5)
      expect(sawTrue).toBe(true) // le flag est passé à true pendant la mutation
      expect(syncRef.value).toBe(false) // puis remis à false par le microtask
    })

    it('une erreur IPC affiche un warning et ne crashe pas', async () => {
      mockIpcInvoke.mockRejectedValue(new Error('IPC KO'))
      const wrapper = createWrapper({ patientId: 7, dateEntree: '2025-02-01' })
      await flushPromises()

      expect(ElMessage.warning).toHaveBeenCalledWith('IPC KO')
      expect(wrapper.props('data')).toHaveLength(0)
      // le formulaire reste accessible (pas de crash)
      expect(wrapper.find('.ordonnance-tab').exists()).toBe(true)
    })
  })

  // ─── Type de traitement (dureeType) ─────────────────────────────

  describe('type de traitement (dureeType)', () => {
    async function openGroupForm(wrapper: ReturnType<typeof createWrapper>, needle: string) {
      const group = wrapper.findAll('.ordonnance-group').find(g =>
        g.find('.ordonnance-group__title').text().toLowerCase().includes(needle),
      )!
      const addBtn = group.findAll('.el-button').find(b => b.text().includes('Ajouter'))!
      await addBtn.trigger('click')
      await flushPromises()
    }

    async function submitForm(wrapper: ReturnType<typeof createWrapper>) {
      const submitBtn = wrapper.find('.ordonnance-form-card__actions')
        .findAll('.el-button').find(b => b.text().includes('Ajouter'))!
      await submitBtn.trigger('click')
      await flushPromises()
    }

    async function setDureeType(wrapper: ReturnType<typeof createWrapper>, value: 'courte' | 'longue') {
      const formItem = wrapper.findAll('.el-form-item').find(i => i.text().includes('Type de traitement'))!
      const radioGroup = formItem.findComponent({ name: 'ElRadioGroup' })
      ;(radioGroup.vm as any).$emit('update:modelValue', value)
    }

    it('affiche le radio "Type de traitement" avec "Courte durée" par défaut', async () => {
      const wrapper = createWrapper()
      await openGroupForm(wrapper, 'médicaments')

      const formItem = wrapper.findAll('.el-form-item').find(i => i.text().includes('Type de traitement'))!
      expect(formItem.text()).toContain('Courte durée')
      expect(formItem.text()).toContain('Longue durée')
      expect((wrapper.vm as any).form.dureeType).toBe('courte')
    })

    it('sélectionner "Longue durée" marque le médicament ; soins et examens restent en "courte"', async () => {
      const wrapper = createWrapper()
      await openGroupForm(wrapper, 'médicaments')
      await setDureeType(wrapper, 'longue')
      await submitForm(wrapper)

      const data = wrapper.props('data') as PrescriptionSortie[]
      expect(data).toHaveLength(1)
      expect(data[0].categorie).toBe('medicament')
      expect(data[0].dureeType).toBe('longue')

      await openGroupForm(wrapper, 'soins')
      await submitForm(wrapper)
      expect((wrapper.props('data') as PrescriptionSortie[])[1].dureeType).toBe('courte')

      await openGroupForm(wrapper, 'demandes d\'examens')
      await submitForm(wrapper)
      const finalData = wrapper.props('data') as PrescriptionSortie[]
      expect(finalData).toHaveLength(3)
      expect(finalData[2].categorie).toBe('examen')
      expect(finalData[2].dureeType).toBe('courte')
    })

    it('pré-remplit le radio avec "Longue durée" lors de l\'édition d\'une prescription longue', async () => {
      const rx = createPrescription({ dureeType: 'longue' })
      const wrapper = createWrapper({ data: [rx] })

      const editBtn = wrapper.findAll('.el-button').find(b => b.text().includes('Modifier'))
      expect(editBtn).toBeDefined()
      await editBtn!.trigger('click')
      await flushPromises()

      expect((wrapper.vm as any).form.dureeType).toBe('longue')
    })

    it('préserve dureeType lors du pré-remplissage loadDefaults (toPrescriptionItem)', async () => {
      mockIpcInvoke.mockImplementation(async (channel: string) => {
        if (channel === 'prescription:list') {
          return [
            { id: 1, patientId: 7, type: 'medicament', medicament: 'Metformine 500 mg', dosage: '500', voie: 'PO', duree: 7, frequence: ['Matin', 'Soir'], statut: 'active', datePrescription: '2025-01-10', dureeType: 'longue' },
            { id: 2, patientId: 7, type: 'medicament', medicament: 'Paracétamol 500 mg', dosage: '500', voie: 'PO', duree: 7, frequence: ['Matin'], statut: 'active', datePrescription: '2025-01-10' },
          ]
        }
        if (channel === 'exam-request:list') return []
        return null
      })

      const wrapper = createWrapper({ patientId: 7, dateEntree: '2025-02-01' })
      await flushPromises()

      const data = wrapper.props('data') as PrescriptionSortie[]
      expect(data.find(d => d.medicament === 'Metformine 500 mg')!.dureeType).toBe('longue')
      expect(data.find(d => d.medicament === 'Paracétamol 500 mg')!.dureeType).toBe('courte')
    })

    it('affiche le tag "Longue durée" sur la carte quand dureeType est présent, aucun tag sinon', () => {
      const longue = createPrescription({ _key: 'k-longue', medicament: 'Insuline Glargine', dureeType: 'longue' })
      const sansType = createPrescription({ _key: 'k-sans', medicament: 'Paracétamol 500 mg' })
      const wrapper = createWrapper({ data: [longue, sansType] })

      const longueCard = wrapper.findAll('.rx-card').find(c => c.text().includes('Insuline Glargine'))!
      const longueTag = longueCard.findAll('.el-tag').find(t => t.text() === 'Longue durée')
      expect(longueTag).toBeDefined()
      expect(longueTag!.attributes('type')).toBe('warning')

      const sansCard = wrapper.findAll('.rx-card').find(c => c.text().includes('Paracétamol 500 mg'))!
      expect(sansCard.text()).not.toContain('Longue durée')
      expect(sansCard.text()).not.toContain('Courte durée')
    })
  })

  // ─── Les 5 nouveaux champs soins (alignement écran Prescriptions) ──
  //
  // Le formulaire soins a été enrichi avec nbSeances, objectifClinique,
  // consignesSpecifiques (RichTextEditor), dispositifsMedicaux (multi-select)
  // et professionnelCible (select). On teste que :
  //  • le formulaire soins affiche bien les 5 nouveaux libellés ;
  //  • enregistrer un soin rempli émet l'item avec ces 5 champs correctement ;
  //  • la carte préview affiche ces champs pour un soin chargé.

  describe('nouveaux champs soins (nbSeances, objectif, consignes, dispositifs, professionnel)', () => {
    async function openSoinsForm(wrapper: ReturnType<typeof createWrapper>) {
      const group = wrapper.findAll('.ordonnance-group').find(g =>
        g.find('.ordonnance-group__title').text().toLowerCase().includes('soins'),
      )!
      await group.findAll('.el-button').find(b => b.text().includes('Ajouter'))!.trigger('click')
      await flushPromises()
    }

    async function submitForm(wrapper: ReturnType<typeof createWrapper>) {
      const submitBtn = wrapper.find('.ordonnance-form-card__actions')
        .findAll('.el-button').find(b => b.text().includes('Ajouter'))!
      await submitBtn.trigger('click')
      await flushPromises()
    }

    async function setSelectValue(wrapper: ReturnType<typeof createWrapper>, fieldLabel: string, value: unknown) {
      const formItem = wrapper.findAll('.el-form-item').find(i => i.text().includes(fieldLabel))!
      const select = formItem.findComponent(ElSelectStub)
      ;(select.vm as any).$emit('update:modelValue', value)
    }

    it('le formulaire soins affiche les 5 nouveaux libellés', async () => {
      const wrapper = createWrapper()
      await openSoinsForm(wrapper)

      const labels = wrapper.findAll('.el-form-item label').map(l => l.text())
      expect(labels).toContain('Nb séances')
      expect(labels).toContain('Objectif clinique')
      expect(labels).toContain('Consignes spécifiques')
      expect(labels).toContain('Dispositifs médicaux & Voies d\'abord')
      expect(labels).toContain('Professionnel cible')
      // toujours pas de champs voies/dosage pour soins (décision antérieure,
      // vérifiée par le test « le formulaire soins ne montre pas les champs... »)
    })

    it('enregistre un soin rempli → l\'item émis contient les 5 champs', async () => {
      const wrapper = createWrapper()
      await openSoinsForm(wrapper)

      ;(wrapper.vm as any).form.medicament = 'Soin riche quotidien'
      ;(wrapper.vm as any).form.frequence = ['1/jour']
      // nbSeances : champ el-input-number
      ;(wrapper.vm as any).form.nbSeances = 3
      // objectif / consignes : RichTextEditor → strings rich non vides
      ;(wrapper.vm as any).form.objectifClinique = '<p>Objectif <strong>riche</strong></p>'
      ;(wrapper.vm as any).form.consignesSpecifiques = '<p>À faire à jeun</p>'
      // dispositifs : multi-select → array dans le formulaire, joinée à la soumission
      await setSelectValue(wrapper, 'Dispositifs médicaux & Voies d\'abord', ['Compresses stériles', 'Seringue'])
      // professionnel : select simple
      await setSelectValue(wrapper, 'Professionnel cible', 'Infirmier référent')
      await flushPromises()

      await submitForm(wrapper)

      const committed = wrapper.props('data') as PrescriptionSortie[]
      expect(committed).toHaveLength(1)
      expect(committed[0]).toMatchObject({
        categorie: 'soins',
        medicament: 'Soin riche quotidien',
        nbSeances: 3,
        objectifClinique: '<p>Objectif <strong>riche</strong></p>',
        consignesSpecifiques: '<p>À faire à jeun</p>',
        dispositifsMedicaux: 'Compresses stériles, Seringue',
        professionnelCible: 'Infirmier référent',
      })
    })

    it('la carte préview d\'un soin chargé affiche séances, rich content, dispositifs et professionnel', () => {
      const rx = createPrescription({
        _key: 'k-soin-complet',
        categorie: 'soins',
        medicament: 'Pansement quotidien',
        frequence: ['1/jour'],
        instructions: '', // sinon la fixture rend aussi un bloc rich "Après le repas"
        nbSeances: 3,
        objectifClinique: '<p>Favoriser <strong>la cicatrisation</strong></p>',
        consignesSpecifiques: '<p>À faire à jeun</p>',
        dispositifsMedicaux: 'Compresses stériles, Seringue',
        professionnelCible: 'Infirmier référent',
      })
      const wrapper = createWrapper({ data: [rx] })

      const card = wrapper.findAll('.rx-card').find(c => c.text().includes('Pansement quotidien'))!
      expect(card.text()).toContain('Nb séances : 3')
      // les rich content (objectif/consignes) sont rendus via v-html SANS libellé
      const richDetails = card.findAll('.rx-card__details--rich')
      expect(richDetails).toHaveLength(2)
      expect(richDetails[0].text()).toContain('Favoriser')
      expect(richDetails[0].text()).toContain('la cicatrisation') // le <strong> devient du texte
      expect(richDetails[0].find('strong').exists()).toBe(true)
      expect(richDetails[1].text()).toContain('À faire à jeun')
      // les champs à libellé sont affichés tels quels
      expect(card.text()).toContain('Dispositifs & Voies d\'abord : Compresses stériles, Seringue')
      expect(card.text()).toContain('Professionnel cible : Infirmier référent')
    })

    it('une carte soins avec nbSeances=0 affiche « Nb séances : 0 » et pas de bloc rich pour un objectif vide', () => {
      const rx = createPrescription({
        _key: 'k-soin-zero',
        categorie: 'soins',
        medicament: 'Pansement quotidien',
        frequence: ['1/jour'],
        instructions: '',
        nbSeances: 0,
        objectifClinique: '<p></p>',
        consignesSpecifiques: '<p><br></p>',
      })
      const wrapper = createWrapper({ data: [rx] })

      const card = wrapper.findAll('.rx-card').find(c => c.text().includes('Pansement quotidien'))!
      // nbSeances=0 est cohérent partout : le garde `rx.nbSeances != null` garde le libellé
      expect(card.text()).toContain('Nb séances : 0')
      // rich vide (`<p></p>` / `<p><br></p>`) ⇒ AUCUN bloc rich objectif/consignes rendu
      expect(card.findAll('.rx-card__details--rich')).toHaveLength(0)
      expect(card.find('.rx-card__details--rich').exists()).toBe(false)
    })
  })

  // ─── Examens Imagerie vs Laboratoire (alignement ExamensView) ───

  describe('examens imagerie vs laboratoire', () => {
    async function openExamenForm(wrapper: ReturnType<typeof createWrapper>) {
      const group = wrapper.findAll('.ordonnance-group').find(g =>
        g.find('.ordonnance-group__title').text().toLowerCase().includes('demandes d\'examens'),
      )!
      await group.findAll('.el-button').find(b => b.text().includes('Ajouter'))!.trigger('click')
      await flushPromises()
    }

    async function submitForm(wrapper: ReturnType<typeof createWrapper>) {
      const submitBtn = wrapper.find('.ordonnance-form-card__actions')
        .findAll('.el-button').find(b => b.text().includes('Ajouter'))!
      await submitBtn.trigger('click')
      await flushPromises()
    }

    it('le formulaire examen affiche le radio Imagerie/Laboratoire (défaut imagerie)', async () => {
      const wrapper = createWrapper()
      await openExamenForm(wrapper)

      const vm = wrapper.vm as any
      expect(vm.form.examenType).toBe('imagerie')
      const labels = wrapper.findAll('.el-form-item label').map(l => l.text())
      expect(labels).toContain("Type d'examen")
      expect(wrapper.text()).toContain('Imagerie')
      expect(wrapper.text()).toContain('Laboratoire')
    })

    it('basculer sur laboratoire affiche le multi-choix d’analyses (et inversement)', async () => {
      const wrapper = createWrapper()
      await openExamenForm(wrapper)

      const vm = wrapper.vm as any
      // Imagerie par défaut : arbre simple, champ "Examen demandé".
      expect(wrapper.find('.el-tree-select').attributes('multiple')).toBeUndefined()
      expect(wrapper.text()).toContain('Examen demandé')

      // Bascule laboratoire : arbre multiple avec cases à cocher.
      vm.form.examenType = 'laboratoire'
      await flushPromises()
      const laboTree = wrapper.find('.el-tree-select')
      expect(laboTree.attributes('multiple')).toBeDefined()
      expect(wrapper.text()).toContain('Analyses demandées')

      // Retour imagerie : arbre simple à nouveau.
      vm.form.examenType = 'imagerie'
      await flushPromises()
      expect(wrapper.find('.el-tree-select').attributes('multiple')).toBeUndefined()
    })

    it('imagerie exige examenId (formRules) et motif clinique requis', async () => {
      const wrapper = createWrapper()
      await openExamenForm(wrapper)

      const vm = wrapper.vm as any
      expect(vm.form.examenType).toBe('imagerie')
      const rules = vm.formRules ?? (vm as any).$options
      // formRules est un computed exposé sur vm
      const formRules = (wrapper.vm as any).formRules
      expect(formRules.examenId).toBeDefined()
      expect(formRules.motif).toBeDefined()
      expect(formRules.examensIds).toBeUndefined()
    })

    it('laboratoire exige examensIds et motif optionnel', async () => {
      const wrapper = createWrapper()
      await openExamenForm(wrapper)

      const vm = wrapper.vm as any
      vm.form.examenType = 'laboratoire'
      await flushPromises()

      const formRules = (wrapper.vm as any).formRules
      expect(formRules.examensIds).toBeDefined()
      expect(formRules.examenId).toBeUndefined()
      expect(formRules.motif).toBeUndefined()
    })

    it('soumission laboratoire → { examenType, examens[], examen join }', async () => {
      const wrapper = createWrapper()
      await openExamenForm(wrapper)

      const vm = wrapper.vm as any
      vm.form.examenType = 'laboratoire'
      vm.analysesDisponibles = [
        { id: 1, label: 'NFS', category_id: 2, is_active: true },
        { id: 2, label: 'Ionogramme', category_id: 2, is_active: true },
      ]
      vm.form.examensIds = [1, 2]
      vm.form.motif = ''
      await flushPromises()
      await submitForm(wrapper)

      const committed = wrapper.props('data') as PrescriptionSortie[]
      expect(committed).toHaveLength(1)
      expect(committed[0]).toMatchObject({
        categorie: 'examen',
        examenType: 'laboratoire',
        examens: ['NFS', 'Ionogramme'],
        examen: 'NFS, Ionogramme',
      })
    })

    it('preview différencie Imagerie / Laboratoire avec tags et legacy sans tag', () => {
      const imagerie = createPrescription({ _key: 'k-img', categorie: 'examen', medicament: '', examenType: 'imagerie', examen: 'Scanner cérébral', examens: [], motif: '<p>Céphalées</p>' })
      const labo = createPrescription({ _key: 'k-labo', categorie: 'examen', medicament: '', examenType: 'laboratoire', examen: 'NFS, Ionogramme', examens: ['NFS', 'Ionogramme'], motif: '' })
      const legacy = createPrescription({ _key: 'k-legacy-ex', categorie: 'examen', medicament: '', examen: 'Ancien examen libre', motif: '' })
      // @ts-expect-error legacy sans examenType (compat)
      delete legacy.examenType
      const wrapper = createWrapper({ data: [imagerie, labo, legacy] })

      const group = wrapper.findAll('.ordonnance-group').find(g =>
        g.find('.ordonnance-group__title').text().toLowerCase().includes('demandes d\'examens'),
      )!
      expect(group.text()).toContain('Imagerie')
      expect(group.text()).toContain('Laboratoire')

      const imgCard = wrapper.findAll('.rx-card').find(c => c.text().includes('Scanner cérébral'))!
      expect(imgCard.text()).toContain('Imagerie')
      const laboCard = wrapper.findAll('.rx-card').find(c => c.text().includes('NFS'))!
      expect(laboCard.text()).toContain('Laboratoire')
      expect(laboCard.text()).toContain('NFS, Ionogramme')
      const legacyCard = wrapper.findAll('.rx-card').find(c => c.text().includes('Ancien examen libre'))!
      expect(legacyCard.text()).not.toContain('Imagerie')
      expect(legacyCard.text()).not.toContain('Laboratoire')
    })

    it('loadDefaults renseigne examenType + examens (labo) / examen (imagerie)', async () => {
      examTypesState.allTypes.value = []
      mockIpcInvoke.mockImplementation(async (channel: string) => {
        if (channel === 'prescription:list') return []
        if (channel === 'exam-request:list') {
          return [
            { id: 1, patientId: 7, type: 'imagerie', examenLabel: 'Scanner cérébral', motif: 'Céphalées', statut: 'en_attente' },
            { id: 2, patientId: 7, type: 'laboratoire', examIds: [1, 2], motif: '', statut: 'en_attente' },
          ]
        }
        return null
      })
      examTypesState.fetchAllByCategory.mockImplementation(async (category: string) => {
        examTypesState.allTypes.value = category === 'laboratoire'
          ? [{ id: 1, label: 'NFS' }, { id: 2, label: 'Ionogramme' }]
          : []
      })
      const wrapper = createWrapper({ patientId: 7, dateEntree: '2025-02-01' })
      await flushPromises()

      const data = wrapper.props('data') as PrescriptionSortie[]
      const img = data.find(d => d.examen === 'Scanner cérébral')
      expect(img).toMatchObject({ categorie: 'examen', examenType: 'imagerie' })
      const labo = data.find(d => d.examen === 'NFS, Ionogramme')
      expect(labo).toMatchObject({ categorie: 'examen', examenType: 'laboratoire', examens: ['NFS', 'Ionogramme'] })
    })
  })

  // ─── Référentiels sérialisés + reclassement auto ────────────────

  describe('référentiels examen sérialisés et reclassement', () => {
    const IMAG = [{ id: 10, label: 'Radiographie thoracique' }]
    const LABO = [{ id: 20, label: 'Biochimie du sang' }, { id: 21, label: 'Glycémie' }]

    beforeEach(() => {
      examTypesState.allTypes.value = []
      examTypesState.fetchAllByCategory.mockImplementation(async (category: string) => {
        examTypesState.allTypes.value = category === 'imagerie' ? [...IMAG] : [...LABO]
      })
    })

    it('deux chargements concurrents ne mélangent pas les listes', async () => {
      const wrapper = createWrapper({ data: [] })
      const vm = wrapper.vm as any

      // Deux appels concurrents partagent la même chaîne de chargement.
      await Promise.all([vm.loadCategoryOptions('examen'), vm.loadCategoryOptions('examen')])
      await flushPromises()

      expect(vm.imageriesDisponibles).toEqual(IMAG)
      expect(vm.analysesDisponibles).toEqual(LABO)
      // Un seul fetch par catégorie malgré les 2 appels concurrents.
      const calls = (examTypesState.fetchAllByCategory as any).mock.calls.map((c: any[]) => c[0])
      expect(calls.filter((c: string) => c === 'imagerie')).toHaveLength(1)
      expect(calls.filter((c: string) => c === 'laboratoire')).toHaveLength(1)
    })

    it('reclasse au montage un item labo stocké en imagerie + émet change', async () => {
      const bad = createPrescription({
        _key: 'k-bad', categorie: 'examen', medicament: '',
        examenType: 'imagerie', examen: 'Biochimie du sang, Glycémie',
        examens: ['Biochimie du sang', 'Glycémie'], motif: '',
      })
      const wrapper = createWrapper({ data: [bad] })
      await flushPromises()

      const data = wrapper.props('data') as PrescriptionSortie[]
      expect(data[0].examenType).toBe('laboratoire')
      expect(data[0].examens).toEqual(['Biochimie du sang', 'Glycémie'])
      expect(wrapper.emitted('change')).toBeTruthy()

      const group = wrapper.findAll('.ordonnance-group').find(g =>
        g.find('.ordonnance-group__title').text().toLowerCase().includes('demandes d\'examens'),
      )!
      expect(group.text()).toContain('Laboratoire')
    })

    it('ne touche pas un item correctement classé ni un legacy ambigu', async () => {
      const ok = createPrescription({
        _key: 'k-ok', categorie: 'examen', medicament: '',
        examenType: 'imagerie', examen: 'Radiographie thoracique', examens: [], motif: '',
      })
      const unknown = createPrescription({
        _key: 'k-unk', categorie: 'examen', medicament: '', examen: 'Truc inconnu', motif: '',
      })
      // @ts-expect-error legacy sans examenType (compat)
      delete unknown.examenType
      const wrapper = createWrapper({ data: [ok, unknown] })
      await flushPromises()

      const data = wrapper.props('data') as PrescriptionSortie[]
      expect(data[0].examenType).toBe('imagerie')
      expect(data[1].examenType).toBeUndefined()
      expect(wrapper.emitted('change')).toBeUndefined()
    })

    it('l’édition d’un legacy labo pré-sélectionne le sous-type laboratoire', async () => {
      const legacy = createPrescription({
        _key: 'k-leg', categorie: 'examen', medicament: '',
        examen: 'Biochimie du sang, Glycémie', motif: '',
      })
      // @ts-expect-error legacy sans examenType (compat)
      delete legacy.examenType
      // readonly : pas de réparation auto au montage, l’inférence se fait à l’édition
      const wrapper = createWrapper({ data: [legacy], readonly: true })
      await flushPromises()

      await (wrapper.vm as any).editPrescription(0)
      await flushPromises()

      const vm = wrapper.vm as any
      expect(vm.form.examenType).toBe('laboratoire')
      expect(vm.form.examensIds).toEqual([20, 21])
    })
  })

  // ─── Bouton "Générer" par carte avis/soins → émet generate-item ──

  describe('bouton "Générer" par carte (avis/soins)', () => {
    it('affiche un bouton "Générer" sur chaque carte avis et soins', () => {      const avis = createPrescription({ _key: 'k-avis-1', categorie: 'avis', medicament: '', specialite: 'Cardiologue' })
      const soin = createPrescription({ _key: 'k-soin-1', categorie: 'soins', medicament: 'Pansement quotidien' })
      const med = createPrescription({ _key: 'k-med-1', medicament: 'Metformine 500 mg' })
      const wrapper = createWrapper({ data: [avis, soin, med] })

      const avisCard = wrapper.findAll('.rx-card').find(c => c.text().includes('Cardiologue'))!
      expect(avisCard.findAll('.el-button').find(b => b.text().includes('Générer'))).toBeDefined()
      const soinCard = wrapper.findAll('.rx-card').find(c => c.text().includes('Pansement'))!
      expect(soinCard.findAll('.el-button').find(b => b.text().includes('Générer'))).toBeDefined()
    })

    it('émet "generate-item" {categorie, key} au clic sur une carte avis', async () => {
      const avis = createPrescription({ _key: 'k-avis-1', categorie: 'avis', medicament: '', specialite: 'Cardiologue' })
      const wrapper = createWrapper({ data: [avis] })

      const card = wrapper.findAll('.rx-card').find(c => c.text().includes('Cardiologue'))!
      const btn = card.findAll('.el-button').find(b => b.text().includes('Générer'))!
      await btn.trigger('click')

      expect(wrapper.emitted('generate-item')).toBeDefined()
      expect(wrapper.emitted('generate-item')![0][0]).toEqual({ categorie: 'avis', key: 'k-avis-1' })
    })

    it('émet "generate-item" {categorie, key} au clic sur une carte soins', async () => {
      const soin = createPrescription({ _key: 'k-soin-1', categorie: 'soins', medicament: 'Pansement quotidien' })
      const wrapper = createWrapper({ data: [soin] })

      const card = wrapper.findAll('.rx-card').find(c => c.text().includes('Pansement'))!
      const btn = card.findAll('.el-button').find(b => b.text().includes('Générer'))!
      await btn.trigger('click')

      expect(wrapper.emitted('generate-item')![0][0]).toEqual({ categorie: 'soins', key: 'k-soin-1' })
    })

    it('le bouton de groupe "Générer" reste présent (tous en même temps)', () => {
      const avis = createPrescription({ _key: 'k-avis-1', categorie: 'avis', medicament: '', specialite: 'Cardiologue' })
      const wrapper = createWrapper({ data: [avis] })

      const group = wrapper.findAll('.ordonnance-group').find(g =>
        g.find('.ordonnance-group__title').text().toLowerCase().includes('avis'),
      )!
      expect(group.findAll('.el-button').find(b => b.text() === 'Générer')).toBeDefined()
    })

    it('affiche "Générer" + aperçu sur chaque carte examen et médicament aussi', async () => {
      const img = createPrescription({ _key: 'k-img', categorie: 'examen', medicament: '', examenType: 'imagerie', examen: 'Scanner cérébral', examens: [] })
      const med = createPrescription({ _key: 'k-med', medicament: 'Metformine 500 mg' })
      const wrapper = createWrapper({ data: [img, med], patientId: 7 })

      for (const needle of ['Scanner cérébral', 'Metformine']) {
        const card = wrapper.findAll('.rx-card').find(c => c.text().includes(needle))!
        expect(card.findAll('.el-button').find(b => b.text().includes('Générer'))).toBeDefined()
        expect(card.find('.preview-eye-btn').exists()).toBe(true)
      }

      const card = wrapper.findAll('.rx-card').find(c => c.text().includes('Scanner'))!
      await card.findAll('.el-button').find(b => b.text().includes('Générer'))!.trigger('click')
      expect(wrapper.emitted('generate-item')![0][0]).toEqual({ categorie: 'examen', key: 'k-img' })

      await card.find('.preview-eye-btn').trigger('click')
      await flushPromises()
      const preview = wrapper.findComponent({ name: 'OrdonnancePreview' })
      expect(preview.props('ordonnanceItems')).toHaveLength(1)
    })
  })

  // ─── Bouton "Aperçu PDF" ─────────────────────────────────────────

  describe('bouton "Aperçu PDF"', () => {
    it('est désactivé sans patientId ou avec data vide', () => {
      const emptyNoPatient = createWrapper({ data: [], patientId: null })
      const btn1 = emptyNoPatient.findAll('.ordonnance-tab__header-actions .el-button')
        .find(b => b.text().includes('Aperçu PDF'))!
      expect(btn1.attributes('disabled')).toBeDefined()

      const med = createPrescription({ _key: 'k-med' })
      const noPatient = createWrapper({ data: [med], patientId: null })
      const btn2 = noPatient.findAll('.ordonnance-tab__header-actions .el-button')
        .find(b => b.text().includes('Aperçu PDF'))!
      expect(btn2.attributes('disabled')).toBeDefined()
    })

    it('ouvre le preview avec :patientId + :ordonnance-items', async () => {
      const med = createPrescription({ _key: 'k-med', medicament: 'Metformine 500 mg' })
      const wrapper = createWrapper({ data: [med], patientId: 7 })
      const preview = wrapper.findComponent({ name: 'OrdonnancePreview' })
      expect(preview.exists()).toBe(true)
      expect(preview.props('patientId')).toBe(7)
      expect(preview.props('ordonnanceItems')).toHaveLength(1)

      const btn = wrapper.findAll('.ordonnance-tab__header-actions .el-button')
        .find(b => b.text().includes('Aperçu PDF'))!
      const openSpy = vi.spyOn(preview.vm as any, 'open')
      await btn.trigger('click')
      await flushPromises()
      expect(openSpy).toHaveBeenCalled()
    })

    it('ouvre le preview du groupe seul via le bouton aperçu du groupe', async () => {
      const med1 = createPrescription({ _key: 'k1', medicament: 'Metformine 500 mg' })
      const med2 = createPrescription({ _key: 'k2', medicament: 'Amlodipine 5 mg' })
      const avis = createPrescription({ _key: 'k-avis', categorie: 'avis', specialite: 'Cardiologue', medicament: '' })
      const wrapper = createWrapper({ data: [med1, med2, avis], patientId: 7 })
      const preview = wrapper.findComponent({ name: 'OrdonnancePreview' })
      const openSpy = vi.spyOn(preview.vm as any, 'open')

      const groupHeader = wrapper.findAll('.ordonnance-group__header')
        .find(h => h.text().includes('Médicaments'))!
      const eyeBtn = groupHeader.find('.preview-eye-btn')!
      await eyeBtn.trigger('click')
      await flushPromises()

      expect(preview.props('ordonnanceItems')).toHaveLength(2)
      expect(openSpy).toHaveBeenCalled()
    })

    it('ouvre le preview d’une seule carte avis et réinitialise à la fermeture', async () => {
      const avis1 = createPrescription({ _key: 'k-a1', categorie: 'avis', specialite: 'Cardiologue', medicament: '' })
      const avis2 = createPrescription({ _key: 'k-a2', categorie: 'avis', specialite: 'Néphrologue', medicament: '' })
      const wrapper = createWrapper({ data: [avis1, avis2], patientId: 7 })
      const preview = wrapper.findComponent({ name: 'OrdonnancePreview' })
      const openSpy = vi.spyOn(preview.vm as any, 'open')

      const cards = wrapper.findAll('.rx-card--avis')
      expect(cards).toHaveLength(2)
      const eyeBtn = cards[0].find('.preview-eye-btn')!
      await eyeBtn.trigger('click')
      await flushPromises()

      expect(preview.props('ordonnanceItems')).toHaveLength(1)
      expect(preview.props('ordonnanceItems')[0].specialite).toBe('Cardiologue')
      expect(openSpy).toHaveBeenCalled()

      await preview.vm.$emit('close')
      await flushPromises()
      expect(preview.props('ordonnanceItems')).toHaveLength(2)
    })
  })

  // ─── Prescripteur + planification (alignement ExamensView) ─────────

  describe('prescripteur + planification (examen/avis)', () => {
    async function openGroupForm(wrapper: ReturnType<typeof createWrapper>, needle: string) {
      const group = wrapper.findAll('.ordonnance-group').find(g =>
        g.find('.ordonnance-group__title').text().toLowerCase().includes(needle),
      )!
      const addBtn = group.findAll('.el-button').find(b => b.text().includes('Ajouter'))!
      await addBtn.trigger('click')
      await flushPromises()
    }

    async function submitForm(wrapper: ReturnType<typeof createWrapper>, buttonText = 'Ajouter') {
      const submitBtn = wrapper.find('.ordonnance-form-card__actions')
        .findAll('.el-button').find(b => b.text().includes(buttonText))!
      await submitBtn.trigger('click')
      await flushPromises()
    }

    function selectImagerieExamen(wrapper: ReturnType<typeof createWrapper>, id: number, label: string) {
      const vm = wrapper.vm as any
      vm.imageriesDisponibles = [{ id, label, category_id: 1, is_active: true }]
      vm.form.examenId = id
      vm.form.examen = label
    }

    it('défaut prescripteur = nom affiché utilisateur courant', async () => {
      authState.user.value = { id: 1, nom: 'DIALLO', prenom: 'Mamadou', role: 'MEDECIN' }
      usersState.users.value = [{ id: 1, nom: 'DIALLO', prenom: 'Mamadou', role: 'MEDECIN' }]
      const wrapper = createWrapper()
      await openGroupForm(wrapper, 'demandes d\'examens')
      expect((wrapper.vm as any).form.prescripteur).toBe('DIALLO Mamadou')
    })

    it('formRules : prescripteur requis pour examen (imagerie + labo) et avis', async () => {
      const wrapper = createWrapper()
      await openGroupForm(wrapper, 'demandes d\'examens')
      expect((wrapper.vm as any).formRules.prescripteur).toBeDefined()
      ;(wrapper.vm as any).form.examenType = 'laboratoire'
      await flushPromises()
      expect((wrapper.vm as any).formRules.prescripteur).toBeDefined()
      expect((wrapper.vm as any).formRules.examensIds).toBeDefined()

      await (wrapper.vm as any).cancelForm()
      await openGroupForm(wrapper, 'avis spécialisés')
      expect((wrapper.vm as any).formRules.prescripteur).toBeDefined()
      expect((wrapper.vm as any).formRules.specialite).toBeDefined()
    })

    it('examen sans prescripteur n\'est pas soumis (validating stub)', async () => {
      const wrapper = createWrapper({ stubs: { 'el-form': ElFormValidatingStub } })
      await openGroupForm(wrapper, 'demandes d\'examens')
      selectImagerieExamen(wrapper, 10, 'IRM cérébrale')
      await wrapper.findComponent({ name: 'RichTextEditor' }).vm.$emit('update:modelValue', 'Céphalées')
      ;(wrapper.vm as any).form.prescripteur = ''
      await submitForm(wrapper)
      expect(wrapper.props('data')).toHaveLength(0)
      expect(wrapper.find('.ordonnance-form-card').exists()).toBe(true)
    })

    it('submit examen stocke le prescripteur', async () => {
      const wrapper = createWrapper()
      await openGroupForm(wrapper, 'demandes d\'examens')
      selectImagerieExamen(wrapper, 10, 'IRM cérébrale')
      await wrapper.findComponent({ name: 'RichTextEditor' }).vm.$emit('update:modelValue', 'Céphalées')
      ;(wrapper.vm as any).form.prescripteur = 'DIALLO Mamadou'
      await submitForm(wrapper)

      const committed = wrapper.props('data') as PrescriptionSortie[]
      expect(committed).toHaveLength(1)
      expect(committed[0]).toMatchObject({
        categorie: 'examen',
        prescripteur: 'DIALLO Mamadou',
      })
    })

    it('submit avis stocke le prescripteur', async () => {
      const wrapper = createWrapper()
      await openGroupForm(wrapper, 'avis spécialisés')
      const formItem = wrapper.findAll('.el-form-item').find(i => i.text().includes('Spécialité'))!
      ;(formItem.findComponent(ElSelectStub).vm as any).$emit('update:modelValue', 'Cardiologue')
      await wrapper.findComponent({ name: 'RichTextEditor' }).vm.$emit('update:modelValue', 'Bilan cardiaque')
      ;(wrapper.vm as any).form.prescripteur = 'DIALLO Mamadou'
      await submitForm(wrapper)

      const committed = wrapper.props('data') as PrescriptionSortie[]
      expect(committed).toHaveLength(1)
      expect(committed[0]).toMatchObject({
        categorie: 'avis',
        specialite: 'Cardiologue',
        prescripteur: 'DIALLO Mamadou',
      })
    })

    it('edit remplit le prescripteur', async () => {
      const rx = createPrescription({
        _key: 'k-ex',
        categorie: 'examen',
        medicament: '',
        examenType: 'imagerie',
        examen: 'Scanner cérébral',
        prescripteur: 'DIALLO Mamadou',
      })
      const wrapper = createWrapper({ data: [rx] })
      const card = wrapper.findAll('.rx-card').find(c => c.text().includes('Scanner cérébral'))!
      await card.findAll('.el-button').find(b => b.text().includes('Modifier'))!.trigger('click')
      await flushPromises()

      const vm = wrapper.vm as any
      expect(vm.form.prescripteur).toBe('DIALLO Mamadou')
    })

    it('preview affiche la ligne méta prescripteur, et rien quand vide', () => {
      const full = createPrescription({
        _key: 'k-full', categorie: 'examen', medicament: '',
        examenType: 'imagerie', examen: 'Scanner complet', examens: [],
        prescripteur: 'DIALLO Mamadou',
      })
      const prescripteurOnly = createPrescription({
        _key: 'k-pre', categorie: 'avis', medicament: '',
        specialite: 'Cardiologue', prescripteur: 'DIALLO Mamadou',
      })
      const empty = createPrescription({
        _key: 'k-empty', categorie: 'examen', medicament: '',
        examenType: 'laboratoire', examen: 'NFS', examens: ['NFS'],
      })
      const wrapper = createWrapper({ data: [full, prescripteurOnly, empty] })

      const fullCard = wrapper.findAll('.rx-card').find(c => c.text().includes('Scanner complet'))!
      expect(fullCard.text()).toContain('Prescrit par DIALLO Mamadou')
      expect(fullCard.find('.rx-card__details--meta').exists()).toBe(true)

      const preCard = wrapper.findAll('.rx-card').find(c => c.text().includes('Cardiologue'))!
      expect(preCard.text()).toContain('Prescrit par DIALLO Mamadou')
      expect(preCard.find('.rx-card__details--meta').exists()).toBe(true)

      const emptyCard = wrapper.findAll('.rx-card').find(c => c.text().includes('NFS'))!
      expect(emptyCard.find('.rx-card__details--meta').exists()).toBe(false)
    })

    it('loadDefaults pré-remplit le prescripteur depuis la demande', async () => {
      mockIpcInvoke.mockImplementation(async (channel: string) => {
        if (channel === 'prescription:list') return []
        if (channel === 'exam-request:list') {
          return [
            { id: 1, patientId: 7, type: 'imagerie', examenLabel: 'Scanner cérébral', motif: 'Céphalées', statut: 'en_attente', prescripteurNom: 'DIALLO Mamadou' },
          ]
        }
        return null
      })
      const wrapper = createWrapper({ patientId: 7, dateEntree: '2025-02-01' })
      await flushPromises()

      const data = wrapper.props('data') as PrescriptionSortie[]
      expect(data).toHaveLength(1)
      expect(data[0]).toMatchObject({
        categorie: 'examen',
        prescripteur: 'DIALLO Mamadou',
      })
    })
  })

  // ─── Pharmacie : catalogue & quantité ────────────────────────────

  describe('pharmacie : catalogue & quantité', () => {
    async function openMedicamentForm(wrapper: ReturnType<typeof createWrapper>) {
      const group = wrapper.findAll('.ordonnance-group').find(g =>
        g.find('.ordonnance-group__title').text().toLowerCase().includes('médicaments'),
      )!
      const addBtn = group.findAll('.el-button').find(b => b.text().includes('Ajouter'))!
      await addBtn.trigger('click')
      await flushPromises()
    }

    async function submitMedicamentForm(wrapper: ReturnType<typeof createWrapper>) {
      const submitBtn = wrapper.find('.ordonnance-form-card__actions')
        .findAll('.el-button').find(b => b.text().includes('Ajouter'))!
      await submitBtn.trigger('click')
      await flushPromises()
    }

    function formItem(wrapper: ReturnType<typeof createWrapper>, label: string) {
      return wrapper.findAll('.el-form-item').find(f => f.find('label').text() === label)!
    }

    function catalogueIpc(catalogue: Array<Record<string, any>> | undefined) {
      mockIpcInvoke.mockImplementation(async (channel: string) => {
        if (channel === 'medicament:list') return catalogue
        return undefined
      })
    }

    afterEach(() => {
      // Le catalogue useMedicaments est partagé au niveau module : on le
      // vide pour ne pas fuiter vers les autres tests du fichier.
      useMedicaments().medicaments.value = []
    })

    it('fetches the catalogue on openAddForm when empty', async () => {
      catalogueIpc([])
      const wrapper = createWrapper()
      await openMedicamentForm(wrapper)

      expect(mockIpcInvoke).toHaveBeenCalledWith('medicament:list', { actif: true })
    })

    it('uses catalogue options when available', async () => {
      catalogueIpc([
        { id: 11, dci: 'Metformine', dosage: '500 mg' },
        { id: 12, dci: 'Amoxicilline', dosage: '500 mg' },
      ])
      const wrapper = createWrapper()
      await openMedicamentForm(wrapper)

      const options = formItem(wrapper, 'Médicament').findComponent(ElSelectStub).findAll('option')
      expect(options).toHaveLength(2)
    })

    it('falls back to the local list when the catalogue is empty or errors', async () => {
      catalogueIpc(undefined)
      const wrapper = createWrapper()
      await openMedicamentForm(wrapper)

      expect(formItem(wrapper, 'Médicament').findComponent(ElSelectStub).findAll('option')).toHaveLength(16)

      mockIpcInvoke.mockImplementation(async (channel: string) => {
        if (channel === 'medicament:list') throw new Error('boom')
        return undefined
      })
      useMedicaments().medicaments.value = []
      const wrapper2 = createWrapper()
      await openMedicamentForm(wrapper2)

      expect(formItem(wrapper2, 'Médicament').findComponent(ElSelectStub).findAll('option')).toHaveLength(16)
    })

    it('suggests quantite = frequence × duree', async () => {
      catalogueIpc([])
      const wrapper = createWrapper()
      await openMedicamentForm(wrapper)

      const frequenceSelect = formItem(wrapper, 'Fréquence').findComponent(ElSelectStub)
      await frequenceSelect.vm.$emit('update:modelValue', ['Matin', 'Soir'])
      await flushPromises()

      expect(formItem(wrapper, 'Quantité totale').findComponent({ name: 'ElInputNumber' }).element.value).toBe('14')
      expect(wrapper.find('.quantite-hint').text()).toContain('Suggestion : 14')
    })

    it('preserves a manual quantite when frequence changes (dirty-flag)', async () => {
      catalogueIpc([])
      const wrapper = createWrapper()
      await openMedicamentForm(wrapper)

      const frequenceSelect = formItem(wrapper, 'Fréquence').findComponent(ElSelectStub)
      await frequenceSelect.vm.$emit('update:modelValue', ['Matin', 'Soir'])
      await flushPromises()
      expect(formItem(wrapper, 'Quantité totale').findComponent({ name: 'ElInputNumber' }).element.value).toBe('14')

      const quantiteInput = formItem(wrapper, 'Quantité totale').findComponent({ name: 'ElInputNumber' })
      await quantiteInput.setValue('20')
      await quantiteInput.vm.$emit('change')
      await frequenceSelect.vm.$emit('update:modelValue', ['Matin', 'Midi', 'Soir'])
      await flushPromises()

      expect(formItem(wrapper, 'Quantité totale').findComponent({ name: 'ElInputNumber' }).element.value).toBe('20')
    })

    it('recalculates the suggestion when not dirty', async () => {
      catalogueIpc([])
      const wrapper = createWrapper()
      await openMedicamentForm(wrapper)

      const frequenceSelect = formItem(wrapper, 'Fréquence').findComponent(ElSelectStub)
      await frequenceSelect.vm.$emit('update:modelValue', ['Matin', 'Soir'])
      await flushPromises()
      await frequenceSelect.vm.$emit('update:modelValue', ['Matin', 'Midi', 'Soir'])
      await flushPromises()

      expect(formItem(wrapper, 'Quantité totale').findComponent({ name: 'ElInputNumber' }).element.value).toBe('21')
    })

    it('stores quantite in the submitted item and shows the Qté tag on the card', async () => {
      catalogueIpc([])
      const wrapper = createWrapper()
      await openMedicamentForm(wrapper)

      const medicamentSelect = formItem(wrapper, 'Médicament').findComponent(ElSelectStub)
      await medicamentSelect.vm.$emit('update:modelValue', 'Paracétamol 500 mg')
      const frequenceSelect = formItem(wrapper, 'Fréquence').findComponent(ElSelectStub)
      await frequenceSelect.vm.$emit('update:modelValue', ['Matin', 'Soir'])
      await flushPromises()
      await submitMedicamentForm(wrapper)

      const committed = wrapper.props('data') as PrescriptionSortie[]
      expect(committed).toHaveLength(1)
      expect(committed[0].quantite).toBe(14)
      expect(wrapper.find('.rx-card').text()).toContain('Qté : 14')
    })
  })
})
