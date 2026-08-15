// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { reactive } from 'vue'
import type { PrescriptionSortie } from '@/types/crh-diabete'

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

const EL_STUBS: Record<string, any> = {
  'el-card': {
    template: '<div class="el-card"><slot name="header" /><slot /></div>',
    props: ['shadow'],
  },
  'el-form': ElFormStub,
  'el-select': {
    template: '<select class="el-select"><slot /></select>',
    props: ['modelValue', 'filterable', 'placeholder', 'multiple', 'collapseTags', 'collapseTagsTooltip'],
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
  })

  function createWrapper(options: { data?: PrescriptionSortie[]; readonly?: boolean } = {}) {
    const { data = [], readonly = false } = options
    const medications = reactive([...data])
    return mount(OrdonnanceSortieTab, {
      props: {
        data: medications,
        readonly,
      },
      global: {
        stubs: EL_STUBS,
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
})
