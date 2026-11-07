// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import OrdonnanceLibreForm from '@/components/patients/OrdonnanceLibreForm.vue'
import sourceSfc from '@/components/patients/OrdonnanceLibreForm.vue?raw'

// ===========================================================================
// Hoisted mocks
// ===========================================================================
const {
  mockFetchAvailablePrescriptions,
  mockElMessage,
  mockElMessageBox,
  state,
} = vi.hoisted(() => ({
  mockFetchAvailablePrescriptions: vi.fn(),
  mockElMessage: { success: vi.fn(), warning: vi.fn(), info: vi.fn(), error: vi.fn() },
  mockElMessageBox: { confirm: vi.fn(() => Promise.resolve()), alert: vi.fn(() => Promise.resolve()) },
  state: {
    activePatient: { id: 1 } as any,
  },
}))

// ===========================================================================
// Module mocks
// ===========================================================================
vi.mock('vue-router', () => ({
  useRoute: vi.fn(() => ({ params: { id: '1' } })),
}))

vi.mock('element-plus', () => ({
  ElMessage: mockElMessage,
  ElMessageBox: mockElMessageBox,
}))

vi.mock('@element-plus/icons-vue', () => ({
  Delete: { render: () => {} },
  Plus: { render: () => {} },
  Edit: { render: () => {} },
}))

vi.mock('@/composables/usePatientContext', () => ({
  usePatientContext: vi.fn(() => ({
    activePatient: { value: state.activePatient },
  })),
}))

vi.mock('@/composables/useOrdonnanceLibre', async () => {
  const vue = await vi.importActual<typeof import('vue')>('vue')
  return {
    useOrdonnanceLibre: vi.fn(() => ({
      fetchAvailablePrescriptions: mockFetchAvailablePrescriptions,
      ordonnances: vue.ref([]),
      loading: vue.ref(false),
      error: vue.ref(null),
      fetchOrdonnances: vi.fn(),
      deleteOrdonnance: vi.fn(),
    })),
  }
})

vi.mock('@/utils/constants', () => ({
  MOMENTS_OPTIONS: [
    { value: 'Matin', label: 'Matin' },
    { value: 'Midi', label: 'Midi' },
    { value: 'Soir', label: 'Soir' },
    { value: 'Nuit', label: 'Nuit' },
  ],
  FIXED_TIMES_OPTIONS: ['08h00', '12h00', '18h00'],
  INTERVAL_OPTIONS: [4, 6, 8, 12, 24],
}))

vi.mock('@/components/patients/RichTextEditor.vue', () => ({
  default: {
    name: 'RichTextEditor',
    template: '<div class="rich-editor-mock" />',
    props: ['modelValue', 'readonly', 'rows', 'placeholder'],
    emits: ['update:modelValue', 'change'],
  },
}))

vi.mock('@/components/patients/OrdonnanceSortieTab.vue', () => ({
  default: {
    name: 'OrdonnanceSortieTab',
    template: [
      '<div class="ordonnance-sortie-tab">',
      '  <span class="ordonnance-sortie-tab__count">{{ data.length }}</span>',
      '  <button class="ordonnance-sortie-tab__change" @click="$emit(\'change\')">Changer</button>',
      '</div>',
    ].join(''),
    props: ['data', 'readonly', 'patientId'],
    emits: ['change'],
  },
}))

// ===========================================================================
// Helpers
// ===========================================================================
function waitForData() {
  return new Promise(resolve => setTimeout(resolve, 0))
}

// handleSign waits ~100ms before emitting 'sign'
function waitForSign() {
  return new Promise(resolve => setTimeout(resolve, 150))
}

// ===========================================================================
// Stubs
// ===========================================================================
const stubs = {
  SectionHeader: {
    template: '<div class="section-header"><slot /><slot name="badge" /><slot name="actions" /></div>',
    props: ['label', 'level', 'badge'],
  },
  'el-table': {
    template: [
      '<div class="el-table">',
      '  <div v-for="(item, idx) in (data || [])" :key="idx" class="el-table__row">',
      '    <label class="el-checkbox"><input type="checkbox" :checked="false" /></label>',
      '    <span class="el-table__meds">{{ item.medicament }} \u2014 {{ item.dosage }}</span>',
      '  </div>',
      '</div>',
    ].join(''),
    props: ['data', 'highlightCurrentRow', 'maxHeight', 'style'],
  },
  'el-table-column': {
    template: '<div class="el-table-column"><slot :row="{}" /></div>',
    props: ['prop', 'label', 'width', 'align', 'minWidth'],
  },
  'el-button': {
    template: '<button class="el-button" :disabled="disabled" @click="$emit(\'click\', $event)"><slot /></button>',
    props: ['disabled', 'type', 'size', 'icon', 'text', 'loading'],
    emits: ['click'],
  },
  'el-tag': {
    template: '<span class="el-tag" :class="`el-tag--${type}`"><slot /></span>',
    props: ['type', 'size', 'effect'],
  },
  'el-empty': {
    template: '<div class="el-empty"><p class="el-empty__description">{{ description }}</p></div>',
    props: ['description', 'imageSize'],
  },
  'el-alert': {
    template: '<div class="el-alert" :class="`el-alert--${type}`">{{ title }}<slot /></div>',
    props: ['type', 'title', 'closable', 'showIcon'],
  },
  'el-form': {
    template: '<form class="el-form"><slot /></form>',
    props: ['model', 'rules', 'labelPosition', 'ref'],
    methods: {
      validate() { return Promise.resolve(true) },
      clearValidate() {},
      resetFields() {},
    },
  },
  'el-form-item': {
    template: '<div class="el-form-item"><label>{{ label }}</label><slot /></div>',
    props: ['label', 'prop'],
  },
  'el-row': {
    template: '<div class="el-row"><slot /></div>',
    props: ['gutter'],
  },
  'el-col': {
    template: '<div class="el-col"><slot /></div>',
    props: ['span'],
  },
  'el-select': {
    template: '<select class="el-select" :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><slot /></select>',
    props: ['modelValue', 'filterable', 'placeholder', 'style', 'multiple', 'collapseTags', 'collapseTagsTooltip'],
    emits: ['update:modelValue'],
  },
  'el-option': {
    template: '<option class="el-option" :value="value">{{ label }}</option>',
    props: ['value', 'label'],
  },
  'el-input': {
    template: '<input class="el-input" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" :placeholder="placeholder" />',
    props: ['modelValue', 'placeholder', 'type', 'rows'],
    emits: ['update:modelValue'],
  },
  'el-input-number': {
    template: '<input class="el-input-number" type="number" :value="modelValue" @input="$emit(\'update:modelValue\', Number($event.target.value))" :min="min" :max="max" />',
    props: ['modelValue', 'min', 'max'],
    emits: ['update:modelValue'],
  },
  'el-checkbox': {
    template: '<label class="el-checkbox"><input type="checkbox" :checked="modelValue" @change="$emit(\'change\', $event.target.checked)" /></label>',
    props: ['modelValue', 'disabled', 'label'],
    emits: ['change'],
  },
  'el-switch': {
    template: '<input class="el-switch" type="checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)" />',
    props: ['modelValue'],
    emits: ['update:modelValue'],
  },
  'el-radio-group': {
    template: '<div class="el-radio-group"><slot :modelValue="modelValue" /></div>',
    props: ['modelValue', 'size'],
    emits: ['update:modelValue'],
  },
  'el-radio': {
    template: '<label class="el-radio"><input type="radio" :value="value" :checked="modelValue === value" @change="$emit(\'update:modelValue\', value)" />{{ label }}<slot /></label>',
    props: ['value', 'label', 'modelValue'],
    emits: ['update:modelValue'],
  },
}

// ===========================================================================
// Factory helpers
// ===========================================================================
const defaultProps = {
  document: { id: 'doc-1', contactId: '1', status: 'draft', formData: null },
  documentType: { id: 'type-1', code: 'ORDONNANCE_LIBRE', label: 'Ordonnance Libre' },
  readonly: false,
  contactDisplay: 'Hospitalisation - 01/01/2024',
}

// ===========================================================================
// Tests
// ===========================================================================
describe('OrdonnanceLibreForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    state.activePatient = { id: 1 }
    mockFetchAvailablePrescriptions.mockResolvedValue([])
  })

  // -----------------------------------------------------------------------
  // Document header
  // -----------------------------------------------------------------------
  describe('document header', () => {
    it('renders document header with title and status tag', async () => {
      const wrapper = mount(OrdonnanceLibreForm, {
        props: defaultProps,
        global: { stubs },
      })

      await nextTick()
      await waitForData()
      await nextTick()

      expect(wrapper.find('.ordonnance-libre-form__title').text()).toBe('Ordonnance Libre')
      expect(wrapper.find('.el-tag').text()).toBe('Brouillon')
    })

    it('shows Signé tag for signed documents', async () => {
      const props = {
        ...defaultProps,
        document: { ...defaultProps.document, status: 'signed' },
      }
      const wrapper = mount(OrdonnanceLibreForm, {
        props,
        global: { stubs },
      })

      await nextTick()
      await waitForData()
      await nextTick()

      expect(wrapper.find('.el-tag').text()).toBe('Signé')
    })
  })

  // -----------------------------------------------------------------------
  // OrdonnanceSortieTab integration
  // -----------------------------------------------------------------------
  describe('OrdonnanceSortieTab integration', () => {
    it('renders OrdonnanceSortieTab with patient id from context', async () => {
      const wrapper = mount(OrdonnanceLibreForm, {
        props: defaultProps,
        global: { stubs },
      })

      await nextTick()
      await waitForData()
      await nextTick()

      const tab = wrapper.findComponent({ name: 'OrdonnanceSortieTab' })
      expect(tab.exists()).toBe(true)
      expect(tab.props('patientId')).toBe(1)
      expect(tab.props('readonly')).toBe(false)
    })

    it('loads ordonnanceSortie from document formData', async () => {
      const props = {
        ...defaultProps,
        document: {
          ...defaultProps.document,
          formData: {
            ordonnanceSortie: [
              {
                _key: 'k1',
                categorie: 'medicament',
                medicament: 'Metformine 500 mg',
                dosage: '500',
                unite: 'mg',
                voie: 'VO',
                duree: 7,
                dureeType: 'courte',
                frequence: ['Matin'],
                frequenceType: 'moments',
                instructions: '',
                formeGalenique: '',
                momentPrises: [],
                renouvellement: false,
                nbRenouvellements: 1,
              },
            ],
          },
        },
      }

      const wrapper = mount(OrdonnanceLibreForm, {
        props,
        global: { stubs },
      })

      await nextTick()
      await waitForData()
      await nextTick()

      expect((wrapper.vm as any).ordonnanceItems.length).toBe(1)
      expect((wrapper.vm as any).ordonnanceItems[0].medicament).toBe('Metformine 500 mg')
      // Cloné, pas référencé : les mutations du tab ne touchent pas formData
      expect((wrapper.vm as any).ordonnanceItems[0]).not.toBe(props.document.formData.ordonnanceSortie[0])
    })

    it('leaves ordonnanceItems empty for legacy docs (inlinePrescriptions only)', async () => {
      const props = {
        ...defaultProps,
        document: {
          ...defaultProps.document,
          formData: {
            inlinePrescriptions: [{ medicament: 'Ancien médicament' }],
            linkedPrescriptionIds: [],
          },
        },
      }

      const wrapper = mount(OrdonnanceLibreForm, {
        props,
        global: { stubs },
      })

      await nextTick()
      await waitForData()
      await nextTick()

      expect((wrapper.vm as any).ordonnanceItems.length).toBe(0)
    })

    it('shows zero badge when ordonnanceItems is empty', async () => {
      const wrapper = mount(OrdonnanceLibreForm, {
        props: defaultProps,
        global: { stubs },
      })

      await nextTick()
      await waitForData()
      await nextTick()

      expect(wrapper.find('.ordonnance-sortie-tab__count').text()).toBe('0')
    })
  })

  // -----------------------------------------------------------------------
  // buildFormData / ordonnanceSortie serialization
  // -----------------------------------------------------------------------
  describe('ordonnanceSortie data flow', () => {
    it('buildFormData serializes a deep-cloned ordonnanceSortie', async () => {
      const wrapper = mount(OrdonnanceLibreForm, {
        props: defaultProps,
        global: { stubs },
      })

      await nextTick()
      await waitForData()
      await nextTick()

      ;(wrapper.vm as any).ordonnanceItems.push({
        _key: 'k2',
        categorie: 'examen',
        medicament: '',
        dosage: '',
        unite: '',
        voie: '',
        duree: 7,
        dureeType: 'courte',
        frequence: [],
        frequenceType: 'moments',
        instructions: '',
        formeGalenique: '',
        momentPrises: [],
        renouvellement: false,
        nbRenouvellements: 1,
        examen: 'NFS',
        motif: '',
      })
      const fd = (wrapper.vm as any).buildFormData()

      expect(fd.ordonnanceSortie).toHaveLength(1)
      expect(fd.ordonnanceSortie[0].examen).toBe('NFS')
      expect(fd.title).toBe('Ordonnance Libre')
      expect(fd.ordonnanceSortie[0]).not.toBe((wrapper.vm as any).ordonnanceItems[0])
    })

    it('buildFormData deep-clones : muter le tableau source après build ne change pas le snapshot', async () => {
      const wrapper = mount(OrdonnanceLibreForm, {
        props: defaultProps,
        global: { stubs },
      })

      await nextTick()
      await waitForData()
      await nextTick()

      ;(wrapper.vm as any).ordonnanceItems.push({
        _key: 'k-deep',
        categorie: 'soins',
        medicament: 'Pansement quotidien',
        dosage: '',
        unite: '',
        voie: '',
        duree: 7,
        dureeType: 'courte',
        frequence: ['Matin'],
        frequenceType: 'moments',
        instructions: '',
        formeGalenique: '',
        momentPrises: [],
        renouvellement: false,
        nbRenouvellements: 1,
        objectifClinique: '<p>Objectif A</p>',
        consignesSpecifiques: '',
      })
      const fd = (wrapper.vm as any).buildFormData()

      // Muter l'item SOURCE après le build : le clone ne doit PAS être affecté
      ;(wrapper.vm as any).ordonnanceItems[0].medicament = 'Muté après build'
      ;(wrapper.vm as any).ordonnanceItems[0].objectifClinique = '<p>Objectif MUTÉ</p>'

      expect(fd.ordonnanceSortie[0].medicament).toBe('Pansement quotidien')
      expect(fd.ordonnanceSortie[0].objectifClinique).toBe('<p>Objectif A</p>')
    })

    it('change emitted by the tab marks the form dirty through buildFormData', async () => {
      const wrapper = mount(OrdonnanceLibreForm, {
        props: defaultProps,
        global: { stubs },
      })

      await nextTick()
      await waitForData()
      await nextTick()

      await wrapper.find('.ordonnance-sortie-tab__change').trigger('click')
      await nextTick()

      // Le tab mute data puis émet 'change' ; le formulaire n'a rien à stocker
      // de plus — buildFormData() lit ordonnanceItems à l'enregistrement.
      expect(wrapper.emitted('change')).toBeUndefined()
    })
  })

  // -----------------------------------------------------------------------
  // Relecture d'un document existant
  // -----------------------------------------------------------------------
  describe('relecture document existant', () => {
    it('charges ordonnanceSortie from formData on mount', async () => {
      const props = {
        ...defaultProps,
        document: {
          ...defaultProps.document,
          formData: {
            ordonnanceSortie: [
              {
                _key: 'k3',
                categorie: 'soins',
                medicament: 'Pansement quotidien',
                dosage: '',
                unite: '',
                voie: '',
                duree: 7,
                dureeType: 'courte',
                frequence: ['Matin'],
                frequenceType: 'moments',
                instructions: '',
                formeGalenique: '',
                momentPrises: [],
                renouvellement: false,
                nbRenouvellements: 1,
                nbSeances: 2,
                objectifClinique: '',
                consignesSpecifiques: '',
                dispositifsMedicaux: '',
                professionnelCible: '',
              },
            ],
          },
        },
      }

      const wrapper = mount(OrdonnanceLibreForm, {
        props,
        global: { stubs },
      })

      await nextTick()
      await waitForData()
      await nextTick()

      expect((wrapper.vm as any).ordonnanceItems.length).toBe(1)
      expect((wrapper.vm as any).ordonnanceItems[0].categorie).toBe('soins')
      expect((wrapper.vm as any).ordonnanceItems[0].nbSeances).toBe(2)
    })
  })

  // -----------------------------------------------------------------------
  // Save / emit
  // -----------------------------------------------------------------------
  describe('save actions', () => {
    it('emits save with correct formData on handleSaveDraft', async () => {
      const wrapper = mount(OrdonnanceLibreForm, {
        props: defaultProps,
        global: { stubs },
      })

      await nextTick()
      await waitForData()
      await nextTick()

      const saveBtn = wrapper.findAll('button.el-button').find(b => b.text().trim() === 'Enregistrer Brouillon')
      expect(saveBtn).toBeTruthy()
      await saveBtn!.trigger('click')
      await waitForData()
      await nextTick()

      expect(wrapper.emitted('save')).toBeTruthy()
      expect(wrapper.emitted('save')![0]).toEqual([
        expect.objectContaining({
          ordonnanceSortie: [],
          title: 'Ordonnance Libre',
        }),
      ])
    })
  })

  // -----------------------------------------------------------------------
  // Readonly mode
  // -----------------------------------------------------------------------
  describe('readonly mode', () => {
    it('does not show form when readonly', async () => {
      const wrapper = mount(OrdonnanceLibreForm, {
        props: { ...defaultProps, readonly: true },
        global: { stubs },
      })

      await nextTick()
      await waitForData()
      await nextTick()

      const tab = wrapper.findComponent({ name: 'OrdonnanceSortieTab' })
      expect(tab.exists()).toBe(true)
      expect(tab.props('readonly')).toBe(true)
      expect(wrapper.find('.ordonnance-libre-form__footer').exists()).toBe(false)
      expect(wrapper.find('.el-alert').exists()).toBe(true)
      expect(wrapper.text()).toContain('Ce document est verrouillé en lecture seule.')
    })
  })

  // -----------------------------------------------------------------------
  // Footer
  // -----------------------------------------------------------------------
  describe('footer', () => {
    it('shows footer actions when not readonly', async () => {
      const wrapper = mount(OrdonnanceLibreForm, {
        props: defaultProps,
        global: { stubs },
      })

      await nextTick()
      await waitForData()
      await nextTick()

      expect(wrapper.find('.ordonnance-libre-form__footer').exists()).toBe(true)
      expect(wrapper.text()).toContain('Enregistrer Brouillon')
      expect(wrapper.text()).toContain('Signer')
    })

    it('renders the footer with position: sticky so it stays visible when scrolling', async () => {
      const wrapper = mount(OrdonnanceLibreForm, {
        props: defaultProps,
        global: { stubs },
      })

      await nextTick()
      await waitForData()
      await nextTick()

      const footer = wrapper.find('.ordonnance-libre-form__footer')
      expect(footer.exists()).toBe(true)

      // jsdom ne fait ni layout ni injection de CSS (Vitest ne traite pas les
      // <style> des SFC par défaut) : on ne peut pas mesurer la position.
      // Contract-test sur la déclaration source : le sélecteur scopé du footer
      // doit déclarer `position: sticky` + `bottom: 0`.
      const css = (sourceSfc.match(/<style[^>]*>([\s\S]*?)<\/style>/g) || [])
        .join('\n')
        .replace(/\s+/g, ' ')
      expect(css).toContain('.ordonnance-libre-form__footer')
      expect(css).toMatch(/\.ordonnance-libre-form__footer[^{]*\{[^}]*position: sticky/)
      expect(css).toMatch(/\.ordonnance-libre-form__footer[^{]*\{[^}]*bottom: 0/)
    })
  })

  // -----------------------------------------------------------------------
  // Sign / re-sign
  // -----------------------------------------------------------------------
  describe('sign / re-sign', () => {
    it('shows "Signer" label and confirms before signing a draft document', async () => {
      mockFetchAvailablePrescriptions.mockResolvedValue([])
      const wrapper = mount(OrdonnanceLibreForm, {
        props: defaultProps,
        global: { stubs },
      })

      await nextTick()
      await waitForData()
      await nextTick()

      const signBtn = wrapper.findAll('button.el-button').find(b => b.text().includes('Signer'))
      expect(signBtn).toBeDefined()
      await signBtn!.trigger('click')
      await waitForSign()
      await nextTick()

      expect(mockElMessageBox.confirm).toHaveBeenCalledWith(
        'Êtes-vous sûr de vouloir signer et verrouiller ce document ? Cette action est irréversible.',
        'Confirmation de signature',
        expect.objectContaining({ type: 'warning', confirmButtonText: 'Signer' }),
      )
      expect(wrapper.emitted('save')).toBeDefined()
      expect(wrapper.emitted('sign')).toBeDefined()
    })

    it('shows "Resigner" label and warns the old signature will be overwritten for a signed document', async () => {
      mockFetchAvailablePrescriptions.mockResolvedValue([])
      const wrapper = mount(OrdonnanceLibreForm, {
        props: {
          ...defaultProps,
          document: { ...defaultProps.document, status: 'signed' },
        },
        global: { stubs },
      })

      await nextTick()
      await waitForData()
      await nextTick()

      const signBtn = wrapper.findAll('button.el-button').find(b => b.text().includes('Resigner'))
      expect(signBtn).toBeDefined()
      await signBtn!.trigger('click')
      await waitForSign()
      await nextTick()

      expect(mockElMessageBox.confirm).toHaveBeenCalledWith(
        'Resigner ce document ? L\'ancienne signature sera écrasée.',
        'Re-signature',
        expect.objectContaining({ type: 'warning', confirmButtonText: 'Resigner' }),
      )
      expect(wrapper.emitted('sign')).toBeDefined()
    })

    it('does not emit sign when confirmation is cancelled', async () => {
      mockFetchAvailablePrescriptions.mockResolvedValue([])
      mockElMessageBox.confirm.mockRejectedValueOnce(new Error('cancel'))
      const wrapper = mount(OrdonnanceLibreForm, {
        props: {
          ...defaultProps,
          document: { ...defaultProps.document, status: 'signed' },
        },
        global: { stubs },
      })

      await nextTick()
      await waitForData()
      await nextTick()

      const signBtn = wrapper.findAll('button.el-button').find(b => b.text().includes('Resigner'))
      await signBtn!.trigger('click')
      await waitForSign()
      await nextTick()

      expect(wrapper.emitted('sign')).toBeUndefined()
    })
  })
})
