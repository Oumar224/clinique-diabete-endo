// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, nextTick } from 'vue'
import type { ModeVieAtcdData, AllergieEntry, AntecedentEntry } from '@/types/crh-diabete'
import { PERSONNELLE_CATEGORIES } from '@/utils/allergy-helpers'

// ─── Mock @tiptap/vue-3 ────────────────────────────────────────────

const mockCan = {
  undo: vi.fn().mockReturnValue(false),
  redo: vi.fn().mockReturnValue(false),
}

const mockEditor = {
  isActive: vi.fn().mockReturnValue(false),
  chain: vi.fn().mockReturnValue({
    focus: vi.fn().mockReturnThis(),
    toggleBold: vi.fn().mockReturnThis(),
    toggleItalic: vi.fn().mockReturnThis(),
    toggleUnderline: vi.fn().mockReturnThis(),
    toggleStrike: vi.fn().mockReturnThis(),
    toggleHighlight: vi.fn().mockReturnThis(),
    toggleHeading: vi.fn().mockReturnThis(),
    toggleBlockquote: vi.fn().mockReturnThis(),
    toggleCode: vi.fn().mockReturnThis(),
    toggleCodeBlock: vi.fn().mockReturnThis(),
    setHorizontalRule: vi.fn().mockReturnThis(),
    toggleBulletList: vi.fn().mockReturnThis(),
    toggleOrderedList: vi.fn().mockReturnThis(),
    sinkListItem: vi.fn().mockReturnThis(),
    liftListItem: vi.fn().mockReturnThis(),
    clearNodes: vi.fn().mockReturnThis(),
    unsetAllMarks: vi.fn().mockReturnThis(),
    undo: vi.fn().mockReturnThis(),
    redo: vi.fn().mockReturnThis(),
    extendMarkRange: vi.fn().mockReturnThis(),
    setLink: vi.fn().mockReturnThis(),
    unsetLink: vi.fn().mockReturnThis(),
    setColor: vi.fn().mockReturnThis(),
    setParagraph: vi.fn().mockReturnThis(),
    setFontFamily: vi.fn().mockReturnThis(),
    unsetFontFamily: vi.fn().mockReturnThis(),
    setFontSize: vi.fn().mockReturnThis(),
    unsetFontSize: vi.fn().mockReturnThis(),
    toggleSubscript: vi.fn().mockReturnThis(),
    toggleSuperscript: vi.fn().mockReturnThis(),
    setTextAlign: vi.fn().mockReturnThis(),
    setImage: vi.fn().mockReturnThis(),
    updateAttributes: vi.fn().mockReturnThis(),
    insertContent: vi.fn().mockReturnThis(),
    run: vi.fn().mockReturnThis(),
  }),
  can: vi.fn().mockReturnValue(mockCan),
  getAttributes: vi.fn().mockImplementation((name?: string) => {
    if (name === 'textStyle') return { color: null, fontFamily: undefined, fontSize: undefined }
    if (name === 'image') return {}
    return { color: null }
  }),
  setEditable: vi.fn(),
  getHTML: vi.fn().mockReturnValue(''),
  commands: { setContent: vi.fn() },
  destroy: vi.fn(),
}

vi.mock('@tiptap/vue-3', () => ({
  useEditor: vi.fn(() => ref(mockEditor)),
  EditorContent: {
    template: '<div class="editor-content" />',
    props: ['editor'],
  },
}))

vi.mock('@tiptap/starter-kit', () => ({ default: {} }))
vi.mock('@tiptap/extension-underline', () => ({ default: {} }))

// ─── Mock composables ──────────────────────────────────────────────

vi.mock('@/composables/useCrhDiabeteCalculations', () => ({
  useCrhDiabeteCalculations: () => ({
    calcAutonomieClass: vi.fn().mockReturnValue({
      classe: 'A',
      description: 'Autonomie complète',
    }),
  }),
}))

// ─── Mock Element Plus ─────────────────────────────────────────────

vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), warning: vi.fn(), error: vi.fn() },
  ElMessageBox: { confirm: vi.fn().mockResolvedValue('confirm') },
}))

import { ElMessageBox } from 'element-plus'

// ─── Mock @element-plus/icons-vue ──────────────────────────────────

vi.mock('@element-plus/icons-vue', () => ({
  Plus: { name: 'Plus', render: () => null },
  Minus: { name: 'Minus', render: () => null },
  ArrowDown: { name: 'ArrowDown', render: () => null },
  Delete: { name: 'Delete', render: () => null },
  Edit: { name: 'Edit', render: () => null },
}))

// ─── EL Stubs ──────────────────────────────────────────────────────

const EL_STUBS: Record<string, any> = {
  'el-form': {
    template: '<form class="el-form" @submit.prevent><slot /></form>',
    props: ['labelPosition', 'class'],
  },
  'el-form-item': {
    template: '<div class="el-form-item" :class="$attrs.class"><label v-if="label">{{ label }}</label><slot /></div>',
    props: ['label', 'prop'],
  },
  'el-divider': {
    template: '<div class="el-divider"><slot /></div>',
    props: ['contentPosition'],
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
    props: ['modelValue', 'filterable', 'placeholder'],
    emits: ['update:modelValue', 'change'],
  },
  'el-option': {
    template: '<option :value="value">{{ label }}</option>',
    props: ['label', 'value'],
  },
  'el-radio-group': {
    template: '<div class="el-radio-group"><slot /></div>',
    props: ['modelValue'],
    emits: ['update:modelValue', 'change'],
  },
  'el-radio': {
    template: '<label class="el-radio"><input type="radio" :value="value" @change="$emit(\'update:modelValue\', value)" /><slot /></label>',
    props: ['value'],
  },
  'el-checkbox': {
    template: '<label class="el-checkbox"><input type="checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)" /><slot /></label>',
    props: ['modelValue'],
    emits: ['update:modelValue', 'change'],
  },
  'el-input': {
    template: '<input class="el-input" :value="modelValue" :disabled="disabled" @input="$emit(\'update:modelValue\', $event.target.value)" @keyup.enter="$emit(\'keyup.enter\')" />',
    props: ['modelValue', 'disabled', 'type', 'rows', 'placeholder'],
    emits: ['update:modelValue', 'keyup.enter'],
  },
  'el-tag': {
    template: '<span class="el-tag" :type="type" :effect="effect"><slot /></span>',
    props: ['type', 'size', 'effect'],
  },
  'el-alert': {
    template: '<div class="el-alert" :title="title" :type="type"><slot /></div>',
    props: ['title', 'type', 'showIcon', 'closable'],
  },
  'el-icon': {
    template: '<span class="el-icon"><slot /></span>',
  },
  'el-badge': {
    template: '<span class="el-badge" :value="value"><slot /></span>',
    props: ['value'],
  },
  'el-empty': {
    template: '<div class="el-empty" :description="description" :image-size="imageSize"><slot /></div>',
    props: ['description', 'imageSize'],
  },
  'el-button': {
    template: '<button class="el-button" :disabled="disabled" :type="type" @click="$emit(\'click\', $event)"><slot /></button>',
    props: ['disabled', 'type', 'size', 'text', 'loading'],
    emits: ['click'],
  },
}

// ─── Import component ──────────────────────────────────────────────

import ModeVieAtcdTab from '../ModeVieAtcdTab.vue'

// ─── Test suite ────────────────────────────────────────────────────

describe('ModeVieAtcdTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockEditor.isActive.mockReturnValue(false)
    mockEditor.getHTML.mockReturnValue('')
    mockCan.undo.mockReturnValue(false)
    mockCan.redo.mockReturnValue(false)
  })

  function createDefaultData(overrides: Partial<ModeVieAtcdData> = {}): ModeVieAtcdData {
    return {
      situationFamiliale: 'Marié',
      isolement: false,
      hebergement: 'Domicile',
      commentaireVie: '',
      autonomieSL: {
        alimentation: 'Autonome',
        hygiene: 'Autonome',
        habillage: 'Autonome',
        deplacement: 'Autonome',
        continence: 'Continence urinaire',
      },
      comprehensionFrancais: true,
      tabagisme: 'Non-fumeur',
      tabagismeDetail: '',
      alcool: false,
      alcoolDetail: '',
      cannabis: false,
      cannabisDetail: '',
      allergies: [],
      antecedents: [],
      ...overrides,
    }
  }

  function createWrapper(options: {
    data?: ModeVieAtcdData
    fieldMeta?: Record<string, string>
  } = {}) {
    const { data = createDefaultData(), fieldMeta } = options

    return mount(ModeVieAtcdTab, {
      props: { data, fieldMeta },
      global: {
        stubs: EL_STUBS,
      },
    })
  }

  function sectionBodies(wrapper: ReturnType<typeof createWrapper>) {
    return wrapper.findAll('.collapsible-section__body')
  }

  async function openSection(wrapper: ReturnType<typeof createWrapper>, index: number) {
    await wrapper.findAll('.collapsible-section__header')[index].trigger('click')
    await nextTick()
  }

  function sectionFooterButtons(wrapper: ReturnType<typeof createWrapper>, index: number) {
    return sectionBodies(wrapper)[index].find('.staged-section__footer').findAll('.el-button')
  }

  async function clickEnregistrer(wrapper: ReturnType<typeof createWrapper>, index: number) {
    await sectionFooterButtons(wrapper, index)[0].trigger('click')
    await nextTick()
  }

  // ─── 0. Inline label pattern ────────────────────────────────────

  it('renders Compréhension, Tabagisme, Alcool, Cannabis with inline label pattern', async () => {
    const wrapper = createWrapper()
    await openSection(wrapper, 2)

    const inlineItems = wrapper.findAll('.form-item-inline')
    expect(inlineItems.length).toBe(4)

    const labels = inlineItems.map(el => el.find('label')?.text())
    expect(labels).toContain('Compréhension du français')
    expect(labels).toContain('Tabagisme')
    expect(labels).toContain('Alcool')
    expect(labels).toContain('Cannabis')
  })

  // ─── 1. Continence radio values ─────────────────────────────────

  describe('continence values', () => {
    it('renders "Continence urinaire" as a radio option', async () => {
      const wrapper = createWrapper()
      await openSection(wrapper, 1)
      expect(wrapper.text()).toContain('Continence urinaire')
    })

    it('renders "Continence fécale" as a radio option', async () => {
      const wrapper = createWrapper()
      await openSection(wrapper, 1)
      expect(wrapper.text()).toContain('Continence fécale')
    })

    it('renders "Tonus pelvien" as a radio option', async () => {
      const wrapper = createWrapper()
      await openSection(wrapper, 1)
      expect(wrapper.text()).toContain('Tonus pelvien')
    })

    it('does NOT render old "Continue" value', async () => {
      const wrapper = createWrapper()
      await openSection(wrapper, 1)
      expect(wrapper.text()).not.toMatch(/^Continue$/)
    })
  })

  // ─── 2. Prise en charge field NOT rendered ──────────────────────

  describe('prise en charge removed', () => {
    it('does NOT render "Prise en charge" label', async () => {
      const wrapper = createWrapper()
      await openSection(wrapper, 2)
      const formItems = wrapper.findAll('.el-form-item')
      const priseEnChargeItem = formItems.find(item => {
        const label = item.find('label')
        return label.exists() && label.text().includes('Prise en charge')
      })
      expect(priseEnChargeItem).toBeUndefined()
    })
  })

  // ─── 3. RichTextEditor components rendered ──────────────────────

  describe('RichTextEditor components', () => {
    it('renders RichTextEditor for commentaireVie', async () => {
      const wrapper = createWrapper()
      await openSection(wrapper, 0)
      const editors = wrapper.findAll('.rich-editor')
      expect(editors.length).toBeGreaterThanOrEqual(1)
    })

    it('does NOT render textarea elements (replaced by RichTextEditor)', async () => {
      const wrapper = createWrapper()
      await openSection(wrapper, 0)
      const textareas = wrapper.findAll('textarea')
      expect(textareas).toHaveLength(0)
    })

    it('renders tabagismeDetail RichTextEditor when tabagisme is not Non-fumeur', async () => {
      const wrapper = createWrapper({
        data: createDefaultData({ tabagisme: 'Fumeur actif' }),
      })
      await openSection(wrapper, 2)
      const editors = wrapper.findAll('.rich-editor')
      // At least 2: commentaireVie + tabagismeDetail
      expect(editors.length).toBeGreaterThanOrEqual(2)
    })

    it('does NOT render tabagismeDetail RichTextEditor when tabagisme is Non-fumeur', async () => {
      const wrapper = createWrapper({
        data: createDefaultData({ tabagisme: 'Non-fumeur' }),
      })
      await openSection(wrapper, 2)
      const editors = wrapper.findAll('.rich-editor')
      // Only commentaireVie
      expect(editors.length).toBe(1)
    })

    it('renders alcoolDetail and cannabisDetail each on their own full-width row (own-line regression)', async () => {
      const wrapper = createWrapper({
        data: createDefaultData({ alcool: true, cannabis: true }),
      })
      await openSection(wrapper, 2)

      const rows = wrapper.findAll('.el-row')
      const alcoolRow = rows.find(r => r.text().includes('Détail consommation alcool'))
      const cannabisRow = rows.find(r => r.text().includes('Détail consommation cannabis'))

      expect(alcoolRow).toBeDefined()
      expect(cannabisRow).toBeDefined()
      expect(alcoolRow).not.toBe(cannabisRow)

      expect(alcoolRow!.findAll('.el-col')).toHaveLength(1)
      expect(alcoolRow!.findAll('.el-form-item')).toHaveLength(1)
      expect(alcoolRow!.find('.el-form-item label').text()).toBe('Détail consommation alcool')

      expect(cannabisRow!.findAll('.el-col')).toHaveLength(1)
      expect(cannabisRow!.findAll('.el-form-item')).toHaveLength(1)
      expect(cannabisRow!.find('.el-form-item label').text()).toBe('Détail consommation cannabis')
    })
  })

  // ─── 4. Other sections rendered ─────────────────────────────────

  describe('other sections', () => {
    it('renders "Entourage & Social" section', () => {
      const wrapper = createWrapper()
      expect(wrapper.text()).toContain('Entourage')
    })

    it('renders "Autonomie & Dépendance" section', () => {
      const wrapper = createWrapper()
      expect(wrapper.text()).toContain('Autonomie')
    })

    it('renders "Habitus / Toxiques" section', () => {
      const wrapper = createWrapper()
      expect(wrapper.text()).toContain('Habitus')
    })

    it('renders "Antécédents" section', () => {
      const wrapper = createWrapper()
      expect(wrapper.text()).toContain('Antécédents')
    })

    it('renders Continence label', () => {
      const wrapper = createWrapper()
      expect(wrapper.text()).toContain('Continence')
    })
  })

  // ─── 5. Allergies — structured array-based ─────────────────────

  describe('allergies (structured)', () => {
    it('renders allergy form inputs (type, libellé)', async () => {
      const wrapper = createWrapper()
      await openSection(wrapper, 3)
      expect(wrapper.text()).toContain('Allergies')
      // Form inputs for new allergie entry
      const inputs = wrapper.findAll('.el-input')
      expect(inputs.length).toBeGreaterThanOrEqual(1)
    })

    it('does NOT show allergy alert when allergies array is empty', async () => {
      const wrapper = createWrapper()
      await openSection(wrapper, 3)
      expect(wrapper.find('.el-alert').exists()).toBe(false)
    })

    it('shows allergy alert when allergies array has entries', async () => {
      const wrapper = createWrapper({
        data: createDefaultData({
          allergies: [{ libelle: 'Pénicilline', type: 'Médicamenteuse' }],
        }),
      })
      await openSection(wrapper, 3)
      expect(wrapper.find('.el-alert').exists()).toBe(true)
    })

    it('offers the five allowed allergy types in the type select', async () => {
      const wrapper = createWrapper()
      await openSection(wrapper, 3)
      const allergyForm = wrapper.findAll('.inline-entry-form')[0]
      const typeSelect = allergyForm.find('select.el-select')
      const options = typeSelect.findAll('option').map(o => o.text())
      expect(options).toEqual(['Médicamenteuse', 'Alimentaire', 'Latex', 'Piqûre', 'Autre'])
    })

    it('renders allergy entries in the list', async () => {
      const wrapper = createWrapper({
        data: createDefaultData({
          allergies: [
            { libelle: 'Pénicilline', type: 'Médicamenteuse' },
            { libelle: 'Arachide', type: 'Alimentaire' },
          ],
        }),
      })
      await openSection(wrapper, 3)
      const entryList = wrapper.find('.entry-list')
      expect(entryList.exists()).toBe(true)
      expect(wrapper.text()).toContain('Pénicilline')
      expect(wrapper.text()).toContain('Arachide')
    })

    it('renders allergy rows with a type badge + libellé and NO year badge', async () => {
      const wrapper = createWrapper({
        data: createDefaultData({
          allergies: [
            { libelle: 'Pénicilline', type: 'Médicamenteuse' },
            { libelle: 'Arachide', type: 'Alimentaire' },
          ],
        }),
      })
      await openSection(wrapper, 3)
      const cards = wrapper.findAll('.entry-card')
      expect(cards).toHaveLength(2)

      const first = cards[0]
      expect(first.find('.entry-type-badge').text()).toBe('Médicamenteuse')
      expect(first.find('.entry-libelle').text()).toBe('Pénicilline')
      // année is gone for allergies — no year badge in the row
      expect(first.find('.entry-annee').exists()).toBe(false)

      const second = cards[1]
      expect(second.find('.entry-type-badge').text()).toBe('Alimentaire')
      expect(second.find('.entry-libelle').text()).toBe('Arachide')
      expect(second.find('.entry-annee').exists()).toBe(false)
    })

    it('addAllergie pushes to the provided list when libellé is filled', async () => {
      const wrapper = createWrapper()
      const vm = wrapper.vm as any

      vm.newAllergie.libelle = 'Aspirine'
      vm.newAllergie.type = 'Médicamenteuse'

      const list: AllergieEntry[] = []
      vm.addAllergie(list)

      expect(list).toHaveLength(1)
      expect(list[0].libelle).toBe('Aspirine')
      expect(list[0].type).toBe('Médicamenteuse')
      // new AllergieEntry shape has no annee field
      expect('annee' in list[0]).toBe(false)
    })

    it('addAllergie does nothing when libellé is empty', async () => {
      const wrapper = createWrapper()
      const vm = wrapper.vm as any

      vm.newAllergie.libelle = '   '
      const list: AllergieEntry[] = []
      vm.addAllergie(list)

      expect(list).toHaveLength(0)
    })

    it('removeAllergie removes entry at given index from the provided list', async () => {
      const wrapper = createWrapper()
      const vm = wrapper.vm as any

      const list: AllergieEntry[] = [
        { libelle: 'Pénicilline', type: 'Médicamenteuse' },
        { libelle: 'Arachide', type: 'Alimentaire' },
      ]
      vm.removeAllergie(list, 0)

      expect(list).toHaveLength(1)
      expect(list[0].libelle).toBe('Arachide')
    })

    it('addAllergie resets form after adding', async () => {
      const wrapper = createWrapper()
      const vm = wrapper.vm as any

      vm.newAllergie.libelle = 'Aspirine'
      const list: AllergieEntry[] = []
      vm.addAllergie(list)

      // Form should be reset
      expect(vm.newAllergie.libelle).toBe('')
      expect(vm.newAllergie.type).toBe('Médicamenteuse')
    })

    it('commits an added allergie to data on Enregistrer', async () => {
      const data = createDefaultData()
      const wrapper = createWrapper({ data })
      await openSection(wrapper, 3)
      const vm = wrapper.vm as any

      vm.newAllergie.libelle = 'Aspirine'
      await nextTick()
      const addBtn = wrapper.findAll('.inline-entry-form')[0].find('button.el-button')
      await addBtn!.trigger('click')
      await nextTick()

      // Draft holds the entry, data is untouched until Enregistrer
      expect(data.allergies).toHaveLength(0)
      const footerButtons = sectionFooterButtons(wrapper, 3)
      expect(footerButtons[0].attributes('disabled')).toBeUndefined()

      await footerButtons[0].trigger('click')
      await nextTick()

      expect(data.allergies).toHaveLength(1)
      expect(data.allergies[0].libelle).toBe('Aspirine')
      expect(wrapper.emitted('change')).toBeTruthy()
    })
  })

  // ─── 6. Antécédents — structured array-based ───────────────────

  describe('antécédents (structured)', () => {
    it('renders antécédents form inputs (année, type, libellé)', async () => {
      const wrapper = createWrapper()
      await openSection(wrapper, 4)
      expect(wrapper.text()).toContain('Antécédents')
    })

    it('type select only offers "Familiale" and "Personnelle" (default "Familiale")', async () => {
      const wrapper = createWrapper()
      await openSection(wrapper, 4)
      const antForm = wrapper.findAll('.inline-entry-form')[1]
      const typeSelect = antForm.find('select.el-select')
      const options = typeSelect.findAll('option').map(o => o.text())
      expect(options).toEqual(['Familiale', 'Personnelle'])

      const vm = wrapper.vm as any
      expect(vm.newAntecedent.type).toBe('Familiale')
      // Default value reflected in the select
      expect(typeSelect.attributes('value')).toBe('Familiale')
    })

    it('uses a free-text libellé input when type is Familiale', async () => {
      const wrapper = createWrapper()
      await openSection(wrapper, 4)
      const antForm = wrapper.findAll('.inline-entry-form')[1]
      // année input + free-text libellé input; only the type select (no libellé select)
      expect(antForm.findAll('input.el-input').length).toBe(2)
      expect(antForm.findAll('select')).toHaveLength(1)
    })

    it('switches the libellé field to a category select + free-text input when type is Personnelle', async () => {
      const wrapper = createWrapper()
      await openSection(wrapper, 4)
      const vm = wrapper.vm as any
      vm.newAntecedent.type = 'Personnelle'
      await nextTick()

      const antForm = wrapper.findAll('.inline-entry-form')[1]
      const selects = antForm.findAll('select')
      expect(selects).toHaveLength(2)
      const categorieSelect = selects[1]
      const options = categorieSelect.findAll('option').map(o => o.text())
      expect(options).toEqual([...PERSONNELLE_CATEGORIES])

      // free-text input is always rendered for Personnelle (année + libellé)
      expect(antForm.findAll('input.el-input').length).toBe(2)
    })

    it('stores the typed libellé with the chosen category', async () => {
      const wrapper = createWrapper()
      await openSection(wrapper, 4)
      const vm = wrapper.vm as any

      vm.newAntecedent.type = 'Personnelle'
      vm.newAntecedentCategorie = 'Médicaux'
      vm.newAntecedentLibre = 'Diabète gestationnel'
      vm.newAntecedent.annee = '2020'
      await nextTick()

      // free-text input is visible (année + libellé)
      const antForm = wrapper.findAll('.inline-entry-form')[1]
      expect(antForm.findAll('input.el-input').length).toBe(2)

      const list: AntecedentEntry[] = []
      vm.addAntecedent(list)

      expect(list).toHaveLength(1)
      expect(list[0]).toEqual({
        libelle: 'Diabète gestationnel',
        annee: '2020',
        type: 'Personnelle',
        categorie: 'Médicaux',
      })
      // the stored libellé is the typed free text, never the category itself
      expect(list[0].libelle).not.toBe('Médicaux')
    })

    it('disables the Add button unless a category AND a libellé are present for Personnelle', async () => {
      const wrapper = createWrapper()
      await openSection(wrapper, 4)
      const vm = wrapper.vm as any
      const addButton = () => wrapper.findAll('.inline-entry-form')[1].find('button.el-button')

      // Familiale + empty libellé → disabled
      expect(addButton().attributes('disabled') !== undefined).toBe(true)

      // Familiale + filled libellé → enabled
      vm.newAntecedent.libelle = 'Diabète'
      await nextTick()
      expect(addButton().attributes('disabled')).toBeUndefined()

      // Personnelle + no category → disabled (even with a libellé typed)
      vm.newAntecedent.type = 'Personnelle'
      vm.newAntecedent.libelle = ''
      vm.newAntecedentLibre = 'Pollen'
      await nextTick()
      expect(addButton().attributes('disabled') !== undefined).toBe(true)

      // Personnelle + category chosen but empty libellé → disabled
      vm.newAntecedentCategorie = 'Chirurgical'
      vm.newAntecedentLibre = ''
      await nextTick()
      expect(addButton().attributes('disabled') !== undefined).toBe(true)

      // Personnelle + category chosen + filled libellé → enabled
      vm.newAntecedentLibre = 'Pollen'
      await nextTick()
      expect(addButton().attributes('disabled')).toBeUndefined()
    })

    it('renders a category badge in the list for entries with a categorie, and none for legacy entries', async () => {
      const wrapper = createWrapper({
        data: createDefaultData({
          antecedents: [
            { libelle: 'Pollen', annee: '2020', type: 'Personnelle', categorie: 'Chirurgical' },
            { libelle: 'HTA', annee: '1998', type: 'Personnelle' },
          ],
        }),
      })
      await openSection(wrapper, 4)

      const cards = wrapper.findAll('.entry-card')
      expect(cards).toHaveLength(2)

      expect(cards[0].find('.entry-categorie').exists()).toBe(true)
      expect(cards[0].find('.entry-categorie').text()).toBe('Chirurgical')
      expect(cards[0].find('.entry-libelle').text()).toBe('Pollen')

      // legacy entry without categorie → libellé alone, no badge
      expect(cards[1].find('.entry-categorie').exists()).toBe(false)
      expect(cards[1].find('.entry-libelle').text()).toBe('HTA')

      // preview uses "année · catégorie : libellé" when the category is present
      const antecedentsPreview = wrapper.findAll('.form-preview')[4]
      const value = antecedentsPreview.find('.form-preview__value').text()
      expect(value).toBe('2020 · Chirurgical : Pollen')
    })

    it('formats the preview like the PDF export: category entries use "année · catégorie : libellé", legacy entries use "année libellé"', () => {
      const wrapper = createWrapper({
        data: createDefaultData({
          antecedents: [
            { libelle: 'Pollen', annee: '2020', type: 'Personnelle', categorie: 'Gynéco-obstétricaux' },
            { libelle: 'Diabète', annee: '2010', type: 'Personnelle' },
          ],
        }),
      })

      const antecedentsPreview = wrapper.findAll('.form-preview')[4]
      const values = antecedentsPreview.findAll('.form-preview__value').map(el => el.text())
      expect(values).toEqual(['2020 · Gynéco-obstétricaux : Pollen', '2010 Diabète'])
    })

    it('never stores the category itself as the libellé (regression: "Autres")', async () => {
      const wrapper = createWrapper()
      const vm = wrapper.vm as any

      vm.newAntecedent.type = 'Personnelle'
      vm.newAntecedentCategorie = 'Autres'
      vm.newAntecedentLibre = 'Hypothyroïdie post-partum'
      vm.newAntecedent.annee = '2022'

      const list: AntecedentEntry[] = []
      vm.addAntecedent(list)

      expect(list).toHaveLength(1)
      expect(list[0].libelle).toBe('Hypothyroïdie post-partum')
      expect(list[0].libelle).not.toBe('Autres')
      expect(list[0].categorie).toBe('Autres')
    })

    it('renders antécédent entries in the list', async () => {
      const wrapper = createWrapper({
        data: createDefaultData({
          antecedents: [
            { libelle: 'Diabète', annee: '2010', type: 'Personnelle' },
            { libelle: 'Appendicite', annee: '2005', type: 'Familiale' },
          ],
        }),
      })
      await openSection(wrapper, 4)
      expect(wrapper.text()).toContain('Diabète')
      expect(wrapper.text()).toContain('Appendicite')
    })

    it('renders antecedent rows grouped under the correct headers', async () => {
      const wrapper = createWrapper({
        data: createDefaultData({
          antecedents: [
            { libelle: 'Diabète', annee: '2010', type: 'Personnelle' },
            { libelle: 'Appendicite', annee: '2005', type: 'Familiale' },
            { libelle: 'HTA', annee: '1998', type: 'Personnelle' },
          ],
        }),
      })
      await openSection(wrapper, 4)

      const titles = wrapper.findAll('.entry-group-title').map(el => el.text())
      expect(titles).toEqual(['Antécédents familiaux', 'Antécédents personnels'])

      const list = wrapper.find('.entry-list')
      const children = Array.from(list.element.children)
      expect(children.map(el => el.className)).toEqual([
        'entry-group-title',
        'entry-card',
        'entry-group-title',
        'entry-card',
        'entry-card',
      ])

      const cards = wrapper.findAll('.entry-card')
      expect(cards).toHaveLength(3)

      const family = cards[0]
      expect(family.find('.entry-annee').text()).toBe('2005')
      expect(family.find('.entry-libelle').text()).toBe('Appendicite')
      expect(family.find('.entry-type-badge').exists()).toBe(false)

      const firstPersonal = cards[1]
      expect(firstPersonal.find('.entry-annee').text()).toBe('2010')
      expect(firstPersonal.find('.entry-libelle').text()).toBe('Diabète')
      expect(firstPersonal.find('.entry-type-badge').exists()).toBe(false)

      const secondPersonal = cards[2]
      expect(secondPersonal.find('.entry-annee').text()).toBe('1998')
      expect(secondPersonal.find('.entry-libelle').text()).toBe('HTA')
      expect(secondPersonal.find('.entry-type-badge').exists()).toBe(false)
    })

    it('renders an entry without a year without a year badge under its group', async () => {
      const wrapper = createWrapper({
        data: createDefaultData({
          antecedents: [
            { libelle: 'Appendicite', annee: '', type: 'Familiale' },
          ],
        }),
      })
      await openSection(wrapper, 4)

      const card = wrapper.find('.entry-card')
      expect(card.find('.entry-annee').exists()).toBe(false)
      expect(card.find('.entry-libelle').text()).toBe('Appendicite')
    })

    it('does NOT render the "Antécédents personnels" header when only family entries exist', async () => {
      const wrapper = createWrapper({
        data: createDefaultData({
          antecedents: [
            { libelle: 'Diabète', annee: '2010', type: 'Familiale' },
            { libelle: 'Appendicite', annee: '', type: 'Familiale' },
          ],
        }),
      })
      await openSection(wrapper, 4)

      const titles = wrapper.findAll('.entry-group-title').map(el => el.text())
      expect(titles).toEqual(['Antécédents familiaux'])
      expect(wrapper.text()).not.toContain('Antécédents personnels')
    })

    it('does NOT render the "Antécédents familiaux" header when only personal entries exist', async () => {
      const wrapper = createWrapper({
        data: createDefaultData({
          antecedents: [
            { libelle: 'HTA', annee: '2001', type: 'Personnelle' },
          ],
        }),
      })
      await openSection(wrapper, 4)

      const titles = wrapper.findAll('.entry-group-title').map(el => el.text())
      expect(titles).toEqual(['Antécédents personnels'])
      expect(wrapper.text()).not.toContain('Antécédents familiaux')
    })

    it('renders the empty state without group headers when no antecedents exist', async () => {
      const wrapper = createWrapper()
      await openSection(wrapper, 4)

      expect(wrapper.find('.entry-group-title').exists()).toBe(false)
      expect(wrapper.text()).toContain('Aucun antécédent renseigné')
    })

    it('renders a newly added entry under the correct group header', async () => {
      const data = createDefaultData({
        antecedents: [{ libelle: 'Appendicite', annee: '2005', type: 'Familiale' }],
      })
      const wrapper = createWrapper({ data })
      await openSection(wrapper, 4)
      const vm = wrapper.vm as any

      vm.newAntecedent.type = 'Personnelle'
      vm.newAntecedentCategorie = 'Autres'
      vm.newAntecedentLibre = 'HTA'
      vm.newAntecedent.annee = '2001'
      await nextTick()
      const addBtn = wrapper.findAll('.inline-entry-form')[1].find('button.el-button')
      await addBtn!.trigger('click')
      await nextTick()

      const titles = wrapper.findAll('.entry-group-title').map(el => el.text())
      expect(titles).toEqual(['Antécédents familiaux', 'Antécédents personnels'])

      const cards = wrapper.findAll('.entry-card')
      expect(cards).toHaveLength(2)
      expect(cards[0].find('.entry-libelle').text()).toBe('Appendicite')
      expect(cards[1].find('.entry-annee').text()).toBe('2001')
      expect(cards[1].find('.entry-libelle').text()).toBe('HTA')
    })

    it('addAntecedent adds entry to the provided list when libellé is filled', async () => {
      const wrapper = createWrapper()
      const vm = wrapper.vm as any

      vm.newAntecedent.libelle = 'Hypertension'
      vm.newAntecedent.annee = '2015'
      vm.newAntecedent.type = 'Familiale'

      const list: AntecedentEntry[] = []
      vm.addAntecedent(list)

      expect(list).toHaveLength(1)
      expect(list[0].libelle).toBe('Hypertension')
      expect(list[0].annee).toBe('2015')
      expect(list[0].type).toBe('Familiale')
    })

    it('addAntecedent does nothing when libellé is empty', async () => {
      const wrapper = createWrapper()
      const vm = wrapper.vm as any

      vm.newAntecedent.libelle = '   '
      const list: AntecedentEntry[] = []
      vm.addAntecedent(list)

      expect(list).toHaveLength(0)
    })

    it('removeAntecedent removes entry at given index from the provided list', async () => {
      const wrapper = createWrapper()
      const vm = wrapper.vm as any

      const list: AntecedentEntry[] = [
        { libelle: 'Diabète', annee: '2010', type: 'Personnelle' },
        { libelle: 'Appendicite', annee: '2005', type: 'Familiale' },
      ]
      vm.removeAntecedent(list, 0)

      expect(list).toHaveLength(1)
      expect(list[0].libelle).toBe('Appendicite')
    })

    it('addAntecedent resets form after adding', async () => {
      const wrapper = createWrapper()
      const vm = wrapper.vm as any

      vm.newAntecedent.libelle = 'Hypertension'
      vm.newAntecedent.annee = '2015'
      const list: AntecedentEntry[] = []
      vm.addAntecedent(list)

      expect(vm.newAntecedent.libelle).toBe('')
      expect(vm.newAntecedent.annee).toBe('')
      expect(vm.newAntecedent.type).toBe('Familiale')

      vm.newAntecedent.type = 'Personnelle'
      vm.newAntecedentCategorie = 'Chirurgical'
      vm.newAntecedentLibre = 'Pollen'
      vm.newAntecedent.annee = '2020'
      vm.addAntecedent(list)

      expect(vm.newAntecedentCategorie).toBe('')
      expect(vm.newAntecedentLibre).toBe('')
      expect(vm.newAntecedent.libelle).toBe('')
      expect(vm.newAntecedent.annee).toBe('')
      expect(vm.newAntecedent.type).toBe('Familiale')
    })

    it('commits an added antécédent to data on Enregistrer', async () => {
      const data = createDefaultData()
      const wrapper = createWrapper({ data })
      await openSection(wrapper, 4)
      const vm = wrapper.vm as any

      vm.newAntecedent.type = 'Personnelle'
      vm.newAntecedentCategorie = 'Autres'
      vm.newAntecedentLibre = 'HTA'
      vm.newAntecedent.annee = '2001'
      await nextTick()
      const addBtn = wrapper.findAll('.inline-entry-form')[1].find('button.el-button')
      await addBtn!.trigger('click')
      await nextTick()

      expect(data.antecedents).toHaveLength(0)
      const footerButtons = sectionFooterButtons(wrapper, 4)
      expect(footerButtons[0].attributes('disabled')).toBeUndefined()

      await footerButtons[0].trigger('click')
      await nextTick()

      expect(data.antecedents).toHaveLength(1)
      expect(data.antecedents[0].libelle).toBe('HTA')
      expect(wrapper.emitted('change')).toBeTruthy()
    })
  })

  // ─── 7. Tabagisme detail visibility ────────────────────────────

  describe('tabagismeDetail', () => {
    it('does NOT render tabagismeDetail when tabagisme is Non-fumeur', async () => {
      const wrapper = createWrapper({
        data: createDefaultData({ tabagisme: 'Non-fumeur' }),
      })
      await openSection(wrapper, 2)
      expect(wrapper.text()).not.toContain('Détail consommation tabac')
    })

    it('renders tabagismeDetail when tabagisme is Fumeur actif', async () => {
      const wrapper = createWrapper({
        data: createDefaultData({ tabagisme: 'Fumeur actif' }),
      })
      await openSection(wrapper, 2)
      expect(wrapper.text()).toContain('Détail consommation tabac')
    })

    it('renders tabagismeDetail when tabagisme is Sevré', async () => {
      const wrapper = createWrapper({
        data: createDefaultData({ tabagisme: 'Sevré' }),
      })
      await openSection(wrapper, 2)
      expect(wrapper.text()).toContain('Détail consommation tabac')
    })
  })

  // ─── 8. Staged sections + FormPreview pattern ────────────────────

  describe('staged sections + FormPreview pattern', () => {
    it('renders all 5 sections with collapsible headers', () => {
      const wrapper = createWrapper()
      const titles = wrapper.findAll('.collapsible-section__title').map(el => el.text())
      expect(titles).toEqual([
        'Entourage & Social',
        'Autonomie & Dépendance (Grille SL)',
        'Habitus / Toxiques & Droits',
        'Allergies',
        'Antécédents',
      ])
    })

    it('sections are collapsed by default and toggle open on header click', async () => {
      const wrapper = createWrapper()
      const firstHeader = wrapper.findAll('.collapsible-section__header')[0]
      const firstBody = sectionBodies(wrapper)[0]
      const firstArrow = wrapper.findAll('.collapsible-section__arrow')[0]

      // Collapsed by default: body hidden via v-show, arrow not in the "open" state
      expect(firstHeader.exists()).toBe(true)
      expect(firstBody.attributes('style') ?? '').toContain('display: none')
      expect(firstArrow.classes()).not.toContain('collapsible-section__arrow--open')

      // Click header → opens
      await firstHeader.trigger('click')
      await nextTick()
      expect(firstBody.attributes('style') ?? '').not.toContain('display: none')
      expect(firstArrow.classes()).toContain('collapsible-section__arrow--open')

      // Click header again → collapsed again
      await firstHeader.trigger('click')
      await nextTick()
      expect(firstBody.attributes('style') ?? '').toContain('display: none')
      expect(firstArrow.classes()).not.toContain('collapsible-section__arrow--open')
    })

    it('asks for confirmation before discarding unsaved changes when collapsing', async () => {
      const confirmSpy = vi.fn().mockRejectedValue('cancel')
      ;(ElMessageBox.confirm as any) = confirmSpy

      const wrapper = createWrapper()
      await openSection(wrapper, 0)
      const select = wrapper.findAll('.el-select')[0]
      await select.setValue('Veuf')
      await nextTick()

      await wrapper.findAll('.collapsible-section__header')[0].trigger('click')
      await nextTick()

      expect(confirmSpy).toHaveBeenCalled()
      // Confirmation refused → section stays open
      expect(sectionBodies(wrapper)[0].attributes('style') ?? '').not.toContain('display: none')
    })

    it('renders a compact FormPreview at the bottom', () => {
      const wrapper = createWrapper()
      const preview = wrapper.find('.form-preview')
      expect(preview.exists()).toBe(true)
      expect(preview.classes()).toContain('form-preview--compact')
    })

    it('commits scalar data to data and preview on Enregistrer', async () => {
      const data = createDefaultData({ situationFamiliale: 'Marié' })
      const wrapper = createWrapper({ data })

      await openSection(wrapper, 0)
      const select = wrapper.findAll('.el-select')[0]
      await select.setValue('Veuf')
      await nextTick()

      // draft edited → data untouched until Enregistrer
      expect(data.situationFamiliale).toBe('Marié')
      await clickEnregistrer(wrapper, 0)

      expect(data.situationFamiliale).toBe('Veuf')
      expect(wrapper.emitted('change')).toBeTruthy()

      const rows = wrapper.findAll('.form-preview__row')
      const familyRow = rows.find(r => r.text().includes('Situation familiale'))
      expect(familyRow).toBeDefined()
      expect(familyRow!.text()).toContain('Veuf')
    })

    it('Annuler discards unsaved changes and closes the section', async () => {
      const data = createDefaultData({ situationFamiliale: 'Marié' })
      const wrapper = createWrapper({ data })

      await openSection(wrapper, 0)
      const select = wrapper.findAll('.el-select')[0]
      await select.setValue('Veuf')
      await nextTick()
      expect(data.situationFamiliale).toBe('Marié')

      const footerButtons = sectionFooterButtons(wrapper, 0)
      await footerButtons[1].trigger('click')
      await nextTick()

      expect(data.situationFamiliale).toBe('Marié')
      expect(wrapper.emitted('change')).toBeFalsy()
      expect(sectionBodies(wrapper)[0].attributes('style') ?? '').toContain('display: none')
    })

    it('scalar section preview shows filled values and hides empty ones', () => {
      const wrapper = createWrapper()
      // "Habitus / Toxiques & Droits" is the 3rd section (index 2); default
      // data: tabagisme='Non-fumeur', all detail fields empty. Its FormPreview
      // renders OUTSIDE the CollapsibleSection → preview index 2 (section order).
      const habitusPreview = wrapper.findAll('.form-preview')[2]
      expect(habitusPreview.exists()).toBe(true)

      const rows = habitusPreview.findAll('.form-preview__row')
      const rowsText = rows.map(r => r.text()).join(' | ')

      // Filled scalar → row shown with its value
      const tabagismeRow = rows.find(r => r.text().includes('Tabagisme'))
      expect(tabagismeRow).toBeDefined()
      expect(tabagismeRow!.text()).toContain('Non-fumeur')

      // Boolean mapped to 'Oui' : null → falsy booleans are HIDDEN (regression F9)
      const alcoolRow = rows.find(r => r.text().includes('Alcool'))
      expect(alcoolRow).toBeUndefined()

      // Boolean set to true → row shown with 'Oui'
      const alcoolWrapper = createWrapper({
        data: createDefaultData({ alcool: true }),
      })
      const alcoolPreview = alcoolWrapper.findAll('.form-preview')[2]
      const alcoolTrueRow = alcoolPreview.findAll('.form-preview__row')
        .find(r => r.text().includes('Alcool'))
      expect(alcoolTrueRow).toBeDefined()
      expect(alcoolTrueRow!.text()).toContain('Oui')

      // Empty detail fields are hidden from the preview
      expect(rowsText).not.toContain('Détail consommation tabac')
      expect(rowsText).not.toContain('Détail consommation alcool')
      expect(rowsText).not.toContain('Détail consommation cannabis')

      // This preview has values → no empty state
      expect(habitusPreview.find('.el-empty').exists()).toBe(false)
    })

    it('renders Allergies and Antécédents FormPreviews outside their collapsibles', () => {
      const wrapper = createWrapper({
        data: createDefaultData({
          allergies: [{ libelle: 'Pénicilline', type: 'Médicamenteuse' }],
          antecedents: [{ libelle: 'Diabète', annee: '2010', type: 'Personnelle' }],
        }),
      })

      const previews = wrapper.findAll('.form-preview')
      expect(previews).toHaveLength(5)
      expect(previews[3].exists()).toBe(true)
      expect(previews[4].exists()).toBe(true)

      const allergiesPreview = previews[3]
      expect(allergiesPreview.find('.form-preview__title').text()).toBe('Allergies')
      const allergiesRow = allergiesPreview.find('.form-preview__row')
      expect(allergiesRow.find('.form-preview__label').text()).toBe('Médicamenteuse')
      expect(allergiesRow.find('.form-preview__value').text()).toBe('Pénicilline')

      const antecedentsPreview = previews[4]
      expect(antecedentsPreview.find('.form-preview__title').text()).toBe('Antécédents')
      const antecedentsRow = antecedentsPreview.find('.form-preview__row')
      expect(antecedentsRow.find('.form-preview__label').text()).toBe('Personnelle')
      expect(antecedentsRow.find('.form-preview__value').text()).toBe('2010 Diabète')
    })
  })

  // ─── 9. Field meta (dernière modification) ────────────────────────

  describe('field meta (dernière modification)', () => {
    let scrollSpy: ReturnType<typeof vi.fn>

    beforeEach(() => {
      scrollSpy = vi.fn()
      // jsdom 24 does not implement Element.prototype.scrollIntoView; install
      // a spy so openSection() can call it, and restore after each test.
      Object.defineProperty(Element.prototype, 'scrollIntoView', {
        value: scrollSpy,
        configurable: true,
        writable: true,
      })
    })

    afterEach(() => {
      delete (Element.prototype as any).scrollIntoView
    })

    it('renders "Modifié le" with a formatted date and a Modifier button for a tracked field', () => {
      const wrapper = createWrapper({
        fieldMeta: { 'modeVieAtcd.situationFamiliale': '2026-06-15T10:30:00.000Z' },
      })

      const row = wrapper.findAll('.form-preview__row')
        .find(r => r.text().includes('Situation familiale'))
      expect(row).toBeDefined()

      expect(row!.find('.form-preview__updated').text())
        .toMatch(/^Modifié le \d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/)

      const btn = row!.find('.form-preview__edit')
      expect(btn.exists()).toBe(true)
      expect(btn.attributes('aria-label')).toBe('Modifier Situation familiale')
    })

    it('re-opens the collapsed section and scrolls to it when Modifier is clicked', async () => {
      const wrapper = createWrapper({
        fieldMeta: { 'modeVieAtcd.situationFamiliale': '2026-06-15T10:30:00.000Z' },
      })

      const body = sectionBodies(wrapper)[0]

      // Prove the section is collapsed BEFORE the click
      expect(body.attributes('style') ?? '').toContain('display: none')

      // The first preview (Entourage & Social) holds the Situation familiale row
      const btn = wrapper.findAll('.form-preview')[0]
        .find('.form-preview__row .form-preview__edit')
      expect(btn.exists()).toBe(true)
      await btn.trigger('click')
      await nextTick()

      // openSection() re-opened the section and scrolled to it
      expect(body.attributes('style') ?? '').not.toContain('display: none')
      expect(scrollSpy).toHaveBeenCalled()
    })

    it('renders "Non modifié" when the field is tracked but has no timestamp', () => {
      const wrapper = createWrapper({ fieldMeta: {} })

      const row = wrapper.findAll('.form-preview__row')
        .find(r => r.text().includes('Situation familiale'))
      expect(row).toBeDefined()
      expect(row!.find('.form-preview__updated').text()).toBe('Non modifié')
    })
  })
})
