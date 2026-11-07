// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref, nextTick } from 'vue'
import { ElMessageBox } from 'element-plus'
import type { EvolutionMedicaleData, EvolutionJournalEntry } from '@/types/crh-diabete'

// ─── Mock RichTextEditor ──────────────────────────────────────────

vi.mock('@/components/patients/RichTextEditor.vue', () => ({
  default: {
    name: 'RichTextEditor',
    template: '<div class="rich-editor-mock" />',
    props: ['modelValue', 'readonly', 'rows', 'placeholder'],
    emits: ['update:modelValue', 'change'],
  },
}))

// ─── Mock Element Plus ─────────────────────────────────────────────

vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), warning: vi.fn(), error: vi.fn() },
  ElMessageBox: { confirm: vi.fn().mockResolvedValue('confirm') },
}))

// ─── Mock @element-plus/icons-vue ──────────────────────────────────

vi.mock('@element-plus/icons-vue', () => ({
  Plus: { name: 'Plus', render: () => null },
  Minus: { name: 'Minus', render: () => null },
  ArrowDown: { name: 'ArrowDown', render: () => null },
  Edit: { name: 'Edit', render: () => null },
  Delete: { name: 'Delete', render: () => null },
}))

// ─── Mock useAuth (auteur « Prénom Nom » des entrées du journal) ────

vi.mock('@/composables/useAuth', () => ({
  useAuth: () => ({
    user: ref({ id: 1, nom: 'Diallo', prenom: 'Mamadou', role: 'MEDECIN' }),
  }),
}))

// ─── Mock IPC + composables (pré-remplissage des avis) ──────────────

const { mockIpcInvoke, specialtiesState } = vi.hoisted(() => {
  const specialtiesState = {
    specialties: {
      value: [
        { id: 1, name: 'Cardiologie', code: 'CAR', title_prefix: '', is_active: true },
      ] as Array<{ id?: number; name: string; code: string; title_prefix: string; is_active: boolean }>,
    },
    fetchSpecialties: vi.fn(),
  }
  return { mockIpcInvoke: vi.fn(), specialtiesState }
})

vi.mock('@/utils/ipc', () => ({
  ipcInvoke: mockIpcInvoke,
}))

vi.mock('@/composables/useSpecialties', () => ({
  useSpecialties: () => ({
    specialties: specialtiesState.specialties,
    fetchSpecialties: specialtiesState.fetchSpecialties,
  }),
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
  'el-row': {
    template: '<div class="el-row"><slot /></div>',
    props: ['gutter'],
  },
  'el-col': {
    template: '<div class="el-col"><slot /></div>',
    props: ['span'],
  },
  'el-checkbox': {
    template: '<label class="el-checkbox"><input type="checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)" /><slot /></label>',
    props: ['modelValue'],
    emits: ['update:modelValue', 'change'],
  },
  'el-tag': {
    template: '<span class="el-tag" :type="type" :effect="effect"><slot /></span>',
    props: ['type', 'size', 'effect'],
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
    template: '<button type="button" class="el-button" :disabled="disabled" @click="$emit(\'click\', $event)"><slot /></button>',
    props: ['disabled', 'type', 'size', 'text'],
    emits: ['click'],
  },
  'el-select': {
    template: '<select class="el-select" :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><slot /></select>',
    props: ['modelValue'],
    emits: ['update:modelValue'],
  },
  'el-option': {
    template: '<option :value="value" :label="label" />',
    props: ['value', 'label'],
  },
  'el-date-picker': {
    template: '<input class="el-date-picker" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue'],
    emits: ['update:modelValue'],
  },
  'el-input': {
    template: '<input class="el-input" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue'],
    emits: ['update:modelValue'],
  },
}

// ─── Import component ──────────────────────────────────────────────

import EvolutionMedicaleTab from '../EvolutionMedicaleTab.vue'

// ─── Test suite ────────────────────────────────────────────────────

describe('EvolutionMedicaleTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function createDefaultData(overrides: Partial<EvolutionMedicaleData> = {}): EvolutionMedicaleData {
    return {
      journalEvolution: [],
      ...overrides,
    }
  }

  function createWrapper(options: {
    data?: EvolutionMedicaleData
    fieldMeta?: Record<string, string>
    patientId?: number | null
    readonly?: boolean
  } = {}) {
    const { data = createDefaultData(), fieldMeta, patientId = null, readonly = false } = options

    return mount(EvolutionMedicaleTab, {
      props: { data, fieldMeta, patientId, readonly },
      global: {
        stubs: EL_STUBS,
      },
    })
  }

  function sectionBodies(wrapper: ReturnType<typeof createWrapper>) {
    return wrapper.findAll('.collapsible-section__body')
  }

  /** Scope to the « Journal de l'Évolution » FormPreview. */
  function journalPreview(wrapper: ReturnType<typeof createWrapper>) {
    const previews = wrapper.findAll('.form-preview')
    const journal = previews.find(p => p.find('.form-preview__title').text().includes('Journal'))
    expect(journal).toBeDefined()
    return journal!
  }

  function journalRows(wrapper: ReturnType<typeof createWrapper>) {
    return journalPreview(wrapper).findAll('.form-preview__row')
  }

  /** Emits rich text through the RichTextEditor mock like a real edit. */
  async function typeJournalEntry(wrapper: ReturnType<typeof createWrapper>, html: string) {
    const editor = wrapper.findComponent({ name: 'RichTextEditor' })
    editor.vm.$emit('update:modelValue', html)
    await nextTick()
  }

  // ─── 0. Réglementaires moved out of Évolution (Feature A) ──────

  describe('événements réglementaires (Feature A)', () => {
    it('does NOT render "Événements réglementaires"', () => {
      const wrapper = createWrapper()

      // No section header title containing the feature name
      const titles = wrapper.findAll('.collapsible-section__title').map(el => el.text())
      expect(titles.some(t => t.includes('Événements réglementaires'))).toBe(false)
      expect(wrapper.text()).not.toContain('Événements réglementaires')

      // No réglementaires checkbox anywhere in the tab
      expect(wrapper.findAll('.el-checkbox')).toHaveLength(0)

      // No FormPreview titled with the feature name
      const previewTitles = wrapper.findAll('.form-preview__title').map(el => el.text())
      expect(previewTitles.some(t => t.includes('Événements réglementaires'))).toBe(false)
    })

    it('renders no checkbox inputs', () => {
      const wrapper = createWrapper()
      expect(wrapper.findAll('.el-checkbox')).toHaveLength(0)
    })
  })

  // ─── 1. Per-entry journal preview with timestamps + author ────

  it('shows one preview row per journal entry with the timestamp as label', () => {
    const wrapper = createWrapper({
      data: createDefaultData({
        journalEvolution: [
          { _key: 'e1', content: '<p>Entrée un</p>', date: '2026-01-12', heure: '10:30', user: '' },
          { _key: 'e2', content: '<p>Entrée deux</p>', date: '2026-01-12', heure: '14:00', user: 'Mamadou Diallo' },
        ],
      }),
    })

    // la prévisualisation trie les entrées de la plus récente à la plus ancienne
    const rows = journalRows(wrapper)
    expect(rows).toHaveLength(2)
    // l'auteur est suffixé après « · » quand il est présent
    expect(rows[0].find('.form-preview__label').text()).toBe('12/01/2026 14:00 · Mamadou Diallo')
    expect(rows[0].find('.form-preview__value').text()).toBe('Entrée deux')
    expect(rows[1].find('.form-preview__label').text()).toBe('12/01/2026 10:30')
    expect(rows[1].find('.form-preview__value').text()).toBe('Entrée un')
  })

  // ─── 2. Entries without a timestamp → Entrée #N ───────────────

  it('labels an entry without a timestamp as Entrée #1 with the whole content as value', () => {
    const wrapper = createWrapper({
      data: createDefaultData({
        journalEvolution: [
          { _key: 'e1', content: '<p>texte libre</p>', date: '', heure: '', user: '' },
        ],
      }),
    })

    const rows = journalRows(wrapper)
    expect(rows).toHaveLength(1)
    expect(rows[0].find('.form-preview__label').text()).toBe('Entrée #1')
    expect(rows[0].find('.form-preview__value').text()).toBe('texte libre')
  })

  it('numbers untimestamped entries sequentially (Entrée #1, Entrée #2)', () => {
    const wrapper = createWrapper({
      data: createDefaultData({
        journalEvolution: [
          { _key: 'e1', content: '<p>Première ligne</p>', date: '', heure: '', user: '' },
          { _key: 'e2', content: '<p>Deuxième ligne</p>', date: '', heure: '', user: '' },
        ],
      }),
    })

    const rows = journalRows(wrapper)
    expect(rows).toHaveLength(2)
    expect(rows[0].find('.form-preview__label').text()).toBe('Entrée #1')
    expect(rows[0].find('.form-preview__value').text()).toBe('Première ligne')
    expect(rows[1].find('.form-preview__label').text()).toBe('Entrée #2')
    expect(rows[1].find('.form-preview__value').text()).toBe('Deuxième ligne')
  })

  // ─── 3. Empty journal → empty state ───────────────────────────

  it('shows no preview rows for an empty journal (empty state)', () => {
    const wrapper = createWrapper({
      data: createDefaultData({ journalEvolution: [] }),
    })

    const journal = journalPreview(wrapper)
    expect(journal.findAll('.form-preview__row')).toHaveLength(0)
    expect(journal.find('.el-empty').exists()).toBe(true)
  })

  // ─── 4. Timestamp + trailing text inside one entry ────────────

  it('labels a timed entry with DD/MM/YYYY HH:MM and shows the content as value', () => {
    const wrapper = createWrapper({
      data: createDefaultData({
        journalEvolution: [
          { _key: 'e1', content: '<p>Patient stable — sortie envisagée dans 48h</p>', date: '2026-01-12', heure: '10:30', user: '' },
        ],
      }),
    })

    const rows = journalRows(wrapper)
    expect(rows).toHaveLength(1)
    expect(rows[0].find('.form-preview__label').text()).toBe('12/01/2026 10:30')
    expect(rows[0].find('.form-preview__value').text()).toBe('Patient stable — sortie envisagée dans 48h')
  })

  // ─── 5. Staged model (Enregistrer) ──────────────────────────────

  describe('staged model', () => {
    it('sections are collapsed by default', () => {
      const wrapper = createWrapper()
      for (const body of sectionBodies(wrapper)) {
        expect(body.attributes('style') ?? '').toContain('display: none')
      }
    })

    it('keeps edits in the draft until Enregistrer is clicked', async () => {
      const data = createDefaultData()
      const wrapper = createWrapper({ data })
      const header = wrapper.findAll('.collapsible-section__header')[0]
      await header.trigger('click')
      await nextTick()
      await typeJournalEntry(wrapper, '<p>Entrée en cours</p>')
      // No preview row yet — the value is only in the draft
      expect(wrapper.findAll('.form-preview__row')).toHaveLength(0)
      // and nothing is committed to the data model before Enregistrer
      expect(data.journalEvolution).toHaveLength(0)
    })

    it('commits the new entry with auto date/heure + author on the card Enregistrer and updates the preview', async () => {
      const data = createDefaultData()
      const wrapper = createWrapper({ data })
      const header = wrapper.findAll('.collapsible-section__header')[0]
      await header.trigger('click')
      await nextTick()
      await typeJournalEntry(wrapper, '<p>Entrée en cours</p>')

      const saveBtn = wrapper.findAll('.journal-card__actions .el-button')
        .find(b => b.text().trim() === 'Enregistrer')
      expect(saveBtn).toBeDefined()
      await saveBtn!.trigger('click')
      await nextTick()

      // Une seule entrée commitée, avec date/heure auto-capturées et auteur connecté
      expect(data.journalEvolution).toHaveLength(1)
      expect(data.journalEvolution[0]).toMatchObject({
        content: '<p>Entrée en cours</p>',
        user: 'Mamadou Diallo',
      })
      expect(data.journalEvolution[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(data.journalEvolution[0].heure).toMatch(/^\d{2}:\d{2}$/)
      expect(data.journalEvolution[0]._key).toBeTruthy()

      const rows = journalRows(wrapper)
      expect(rows).toHaveLength(1)
      expect(rows[0].find('.form-preview__value').text()).toBe('Entrée en cours')
      expect(rows[0].find('.form-preview__label').text())
        .toMatch(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2} · Mamadou Diallo$/)
      expect(wrapper.emitted('change')).toBeDefined()
    })

    it('re-opens the section in edit mode via Modifier and commits edits in place', async () => {
      const data = createDefaultData({
        journalEvolution: [
          { _key: 'e1', content: '<p>Original</p>', date: '2026-01-12', heure: '10:30', user: 'Mamadou Diallo' },
        ],
      })
      const wrapper = createWrapper({ data })

      const editBtn = journalPreview(wrapper).find('.form-preview__row .form-preview__edit')
      expect(editBtn.exists()).toBe(true)
      await editBtn.trigger('click')
      await nextTick()

      // La section rouvre sur l'entrée éditée (mode « Modifier l'entrée »)
      const card = wrapper.find('.journal-card')
      expect(card.exists()).toBe(true)
      expect(card.attributes('data-entry-key')).toBe('e1')
      expect(card.find('.journal-card__title').text()).toBe("Modifier l'entrée")

      await typeJournalEntry(wrapper, '<p>Modifié</p>')
      const saveBtn = wrapper.findAll('.journal-card__actions .el-button')
        .find(b => b.text().trim() === 'Enregistrer')
      expect(saveBtn).toBeDefined()
      await saveBtn!.trigger('click')
      await nextTick()

      // Édition en place : pas de nouvelle entrée, métadonnées d'origine conservées
      expect(data.journalEvolution).toHaveLength(1)
      expect(data.journalEvolution[0]).toEqual({
        _key: 'e1',
        content: '<p>Modifié</p>',
        date: '2026-01-12',
        heure: '10:30',
        user: 'Mamadou Diallo',
      })

      const rows = journalRows(wrapper)
      expect(rows).toHaveLength(1)
      expect(rows[0].find('.form-preview__value').text()).toBe('Modifié')
    })
  })

  // ─── 5bis. Ghost-entry regression: delete from preview while open ──

  describe('ghost-entry regression (delete while section open)', () => {
    it('does NOT resurrect a deleted entry when saving after deleting from the preview while the section is open', async () => {
      const data = createDefaultData({
        journalEvolution: [
          { _key: 'e1', content: '<p>Première</p>', date: '2026-01-12', heure: '10:30', user: 'Mamadou Diallo' },
          { _key: 'e2', content: '<p>Deuxième</p>', date: '2026-01-12', heure: '14:00', user: 'Mamadou Diallo' },
        ],
      })
      const wrapper = createWrapper({ data })

      // Open the Journal section so the draft is populated
      const header = wrapper.findAll('.collapsible-section__header')[0]
      await header.trigger('click')
      await nextTick()

      // Preview sorts by date+heure desc → row[0]=e2 (14:00), row[1]=e1 (10:30)
      const rows = journalRows(wrapper)
      expect(rows).toHaveLength(2)

      // Delete e1 (the less recent entry, row[1]) from the external preview while the section is open
      await rows[1].find('.form-preview__delete').trigger('click')
      await nextTick()

      // e1 is gone from the data
      expect(data.journalEvolution).toHaveLength(1)
      expect(data.journalEvolution[0]._key).toBe('e2')

      // Save from the card-level button (no footer because hideFooter=true)
      const saveBtn = wrapper.findAll('.journal-card__actions .el-button')
        .find(b => b.text().trim() === 'Enregistrer')
      expect(saveBtn).toBeDefined()
      await saveBtn!.trigger('click')
      await nextTick()

      // The deleted entry must NOT be resurrected — only e2 plus the new creating entry survive
      const keys = data.journalEvolution.map(e => e._key)
      expect(keys).not.toContain('e1')
      expect(keys).toContain('e2')
    })

    it('deleting entry Y from the preview while editing X preserves X edits and does NOT resurrect Y on save', async () => {
      const data = createDefaultData({
        journalEvolution: [
          { _key: 'X', content: '<p>Original X</p>', date: '2026-01-12', heure: '10:30', user: 'Mamadou Diallo' },
          { _key: 'Y', content: '<p>Original Y</p>', date: '2026-01-12', heure: '14:00', user: 'Mamadou Diallo' },
        ],
      })
      const wrapper = createWrapper({ data })

      // Enter edit mode on X via Modifier (also opens the Journal section and populates the draft)
      const xRow = journalRows(wrapper).find(r => r.find('.form-preview__value').text() === 'Original X')
      expect(xRow).toBeDefined()
      await xRow!.find('.form-preview__edit').trigger('click')
      await nextTick()

      // The card shows edit mode on X
      const card = wrapper.find('.journal-card')
      expect(card.attributes('data-entry-key')).toBe('X')
      expect(card.find('.journal-card__title').text()).toBe("Modifier l'entrée")

      // Type an in-progress (not yet saved) edit into X
      await typeJournalEntry(wrapper, '<p>Édition en cours de X</p>')
      await nextTick()

      // Preview sorts by date+heure desc → Y (14:00) comes before X (10:30)
      const yRow = journalRows(wrapper).find(r => r.find('.form-preview__value').text() === 'Original Y')
      expect(yRow).toBeDefined()
      await yRow!.find('.form-preview__delete').trigger('click')
      await nextTick()

      // Y is removed from the data model
      expect(data.journalEvolution.map(e => e._key)).toEqual(['X'])

      // Save from the card-level Enregistrer (commits the still-open draft)
      const saveBtn = wrapper.findAll('.journal-card__actions .el-button')
        .find(b => b.text().trim() === 'Enregistrer')
      expect(saveBtn).toBeDefined()
      await saveBtn!.trigger('click')
      await nextTick()

      // X keeps its in-progress edit; Y is NOT resurrected (targeted removal)
      expect(data.journalEvolution).toHaveLength(1)
      expect(data.journalEvolution[0]._key).toBe('X')
      expect(data.journalEvolution[0].content).toBe('<p>Édition en cours de X</p>')
    })
  })

  // ─── 5quinquies. Pending create-content guard (unsaved-changes) ──

  describe('pending create-content guard (unsaved-changes)', () => {
    it('prompts for confirmation when collapsing in create mode with non-empty content, and clears the create content on confirmed discard', async () => {
      const wrapper = createWrapper()
      // Open the Journal section in create mode
      const header = wrapper.findAll('.collapsible-section__header')[0]
      await header.trigger('click')
      await nextTick()
      expect(sectionBodies(wrapper)[0].attributes('style') ?? '').not.toContain('display: none')

      // Type non-empty content in create mode (creating.content → pending)
      await typeJournalEntry(wrapper, '<p>Contenu en cours</p>')
      await nextTick()

      // Collapsing the header must trigger the unsaved-changes confirm even though
      // the section is not "dirty" (no commit has happened yet)
      await header.trigger('click')
      expect(ElMessageBox.confirm).toHaveBeenCalled()

      // Default mock resolves → confirmed discard → section closes
      await nextTick()
      expect(sectionBodies(wrapper)[0].attributes('style') ?? '').toContain('display: none')

      // Re-opening the section shows a cleared create form (resetCreating ran)
      await header.trigger('click')
      await nextTick()
      const editor = wrapper.findComponent({ name: 'RichTextEditor' })
      expect(editor.props('modelValue')).toBe('')
    })
  })

  // ─── 5ter. Cancel-edit revert regression ──────────────────────────

  describe('cancel-edit revert regression', () => {
    it('reverts draft mutations when Annuler is clicked during edit, so saving does NOT persist the cancelled edit', async () => {
      const data = createDefaultData({
        journalEvolution: [
          { _key: 'e1', content: '<p>Original</p>', date: '2026-01-12', heure: '10:30', user: 'Mamadou Diallo' },
        ],
      })
      const wrapper = createWrapper({ data })

      // Click Modifier to enter edit mode on e1
      const editBtn = journalPreview(wrapper).find('.form-preview__row .form-preview__edit')
      await editBtn.trigger('click')
      await nextTick()

      // Mutate the draft content
      await typeJournalEntry(wrapper, '<p>Modified but will be cancelled</p>')
      await nextTick()

      // Click the card-level Annuler
      const cancelBtn = wrapper.findAll('.journal-card__actions .el-button')
        .find(b => b.text().trim() === 'Annuler')
      expect(cancelBtn).toBeDefined()
      await cancelBtn!.trigger('click')
      await nextTick()

      // After cancel, activeEditingKey is null → the card shows the "Nouvelle entrée" form
      const card = wrapper.find('.journal-card')
      expect(card.find('.journal-card__title').text()).toBe('Nouvelle entrée')

      // Save from the card-level Enregistrer (this commits whatever is in the draft)
      const saveBtn = wrapper.findAll('.journal-card__actions .el-button')
        .find(b => b.text().trim() === 'Enregistrer')
      expect(saveBtn).toBeDefined()
      await saveBtn!.trigger('click')
      await nextTick()

      // e1 must retain its ORIGINAL content — the cancelled edit must not be persisted
      expect(data.journalEvolution[0]).toMatchObject({
        _key: 'e1',
        content: '<p>Original</p>',
        date: '2026-01-12',
        heure: '10:30',
        user: 'Mamadou Diallo',
      })
    })
  })

  // ─── 5quater. Avis ghost-entry & cancel-edit regressions ───────────

  describe('avis ghost-entry & cancel-edit regressions', () => {
    async function openAvisSection(wrapper: ReturnType<typeof createWrapper>) {
      const header = wrapper.findAll('.collapsible-section__header')[1]
      await header.trigger('click')
      await nextTick()
      return sectionBodies(wrapper)[1]
    }

    function avisPreview(wrapper: ReturnType<typeof createWrapper>) {
      const previews = wrapper.findAll('.form-preview')
      const avis = previews.find(p => p.find('.form-preview__title').text().includes('Avis'))
      expect(avis).toBeDefined()
      return avis!
    }

    it('does NOT resurrect a deleted avis when saving after deleting from the preview while the section is open', async () => {
      const data = createDefaultData({
        avis: [
          { _key: 'k1', date: '2026-08-15', specialite: 'Cardiologie', motif: '<p>Tolérance</p>' },
          { _key: 'k2', date: '2026-08-20', specialite: 'Ophtalmo', motif: '<p>FO</p>' },
        ],
      })
      const wrapper = createWrapper({ data })

      // Open the Avis section so the draft is populated
      await openAvisSection(wrapper)

      // Delete k1 from the external preview while the section is open
      const rows = avisPreview(wrapper).findAll('.form-preview__row')
      expect(rows).toHaveLength(2)
      await rows[0].find('.form-preview__delete').trigger('click')
      await nextTick()

      // k1 is gone from the data
      expect(data.avis).toHaveLength(1)
      expect(data.avis![0]._key).toBe('k2')

      // Save from the card-level Enregistrer (no footer because hideFooter=true)
      const cards = wrapper.findAll('.avis-card')
      const saveBtn = cards[0].findAll('.avis-card__actions .el-button')
        .find(b => b.text().trim() === 'Enregistrer')
      expect(saveBtn).toBeDefined()
      await saveBtn!.trigger('click')
      await nextTick()

      // k1 must NOT be resurrected
      const keys = data.avis!.map(a => a._key)
      expect(keys).not.toContain('k1')
      expect(keys).toContain('k2')
    })

    it('reverts avis draft mutations when Annuler is clicked during edit, so saving does NOT persist the cancelled edit', async () => {
      const data = createDefaultData({
        avis: [
          { _key: 'k1', date: '2026-08-15', specialite: 'Cardiologie', motif: '<p>Original</p>' },
        ],
      })
      const wrapper = createWrapper({ data })

      // Click Modifier to enter edit mode on k1
      const editBtn = avisPreview(wrapper).find('.form-preview__row .form-preview__edit')
      await editBtn.trigger('click')
      await nextTick()

      // Change the date in the draft
      const card = wrapper.find('.avis-card')
      expect(card.find('.avis-card__title').text()).toBe("Modifier l'avis")
      await card.find('.el-date-picker').setValue('2026-99-99')
      await nextTick()

      // Click the card-level Annuler
      const cancelBtn = card.findAll('.avis-card__actions .el-button')
        .find(b => b.text().trim() === 'Annuler')
      expect(cancelBtn).toBeDefined()
      await cancelBtn!.trigger('click')
      await nextTick()

      // After cancel, activeAvisKey is null → the card shows "Nouvel avis"
      const cards = wrapper.findAll('.avis-card')
      expect(cards[0].find('.avis-card__title').text()).toBe('Nouvel avis')

      // Save from the card-level Enregistrer
      const saveBtn = cards[0].findAll('.avis-card__actions .el-button')
        .find(b => b.text().trim() === 'Enregistrer')
      expect(saveBtn).toBeDefined()
      await saveBtn!.trigger('click')
      await nextTick()

      // k1 must retain its ORIGINAL date — the cancelled edit must not be persisted
      expect(data.avis![0]).toMatchObject({
        _key: 'k1',
        date: '2026-08-15',
        specialite: 'Cardiologie',
        motif: '<p>Original</p>',
      })
    })
  })

  // ─── 6. Field meta (dernière modification) ────────────────────────

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
        data: createDefaultData({
          journalEvolution: [
            { _key: 'e1', content: '<p>Patient stable</p>', date: '2026-01-12', heure: '10:30', user: 'Mamadou Diallo' },
          ],
        }),
        fieldMeta: { 'evolutionMedicale.journalEvolution': '2026-06-15T10:30:00.000Z' },
      })

      const row = wrapper.findAll('.form-preview__row')
        .find(r => r.text().includes('Patient stable'))
      expect(row).toBeDefined()

      expect(row!.find('.form-preview__updated').text())
        .toMatch(/^Modifié le \d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/)

      const btn = row!.find('.form-preview__edit')
      expect(btn.exists()).toBe(true)
      expect(btn.attributes('aria-label')).toBe('Modifier 12/01/2026 10:30 · Mamadou Diallo')
    })

    it('re-opens the collapsed section and scrolls to it when Modifier is clicked', async () => {
      const wrapper = createWrapper({
        data: createDefaultData({
          journalEvolution: [
            { _key: 'e1', content: '<p>Patient stable</p>', date: '2026-01-12', heure: '10:30', user: 'Mamadou Diallo' },
          ],
        }),
        fieldMeta: { 'evolutionMedicale.journalEvolution': '2026-06-15T10:30:00.000Z' },
      })

      const body = sectionBodies(wrapper)[0]

      // Prove the section is collapsed BEFORE the click
      expect(body.attributes('style') ?? '').toContain('display: none')

      // The Journal preview holds the field row
      const btn = journalPreview(wrapper)
        .find('.form-preview__row .form-preview__edit')
      expect(btn.exists()).toBe(true)
      await btn.trigger('click')
      await nextTick()

      // openSection() re-opened the section and scrolled to it
      expect(body.attributes('style') ?? '').not.toContain('display: none')
      expect(scrollSpy).toHaveBeenCalled()
    })

    it('renders "Non modifié" when the field is tracked but has no timestamp', () => {
      const wrapper = createWrapper({
        data: createDefaultData({
          journalEvolution: [
            { _key: 'e1', content: '<p>Patient stable</p>', date: '', heure: '', user: '' },
          ],
        }),
        fieldMeta: {},
      })

      const row = wrapper.findAll('.form-preview__row')
        .find(r => r.text().includes('Patient stable'))
      expect(row).toBeDefined()
      expect(row!.find('.form-preview__updated').text()).toBe('Non modifié')
    })

    it('deletes a journal entry from the external preview and emits change', async () => {
      const data = createDefaultData({
        journalEvolution: [
          { _key: 'e1', content: '<p>Première entrée</p>', date: '2026-01-12', heure: '10:30', user: 'Mamadou Diallo' },
          { _key: 'e2', content: '<p>Deuxième entrée</p>', date: '', heure: '', user: '' },
        ],
      })
      const wrapper = createWrapper({ data })

      const rows = journalRows(wrapper)
      expect(rows).toHaveLength(2)

      const deleteBtn = rows[0].find('.form-preview__delete')
      expect(deleteBtn.exists()).toBe(true)
      expect(deleteBtn.attributes('aria-label')).toBe('Supprimer 12/01/2026 10:30 · Mamadou Diallo')
      await deleteBtn.trigger('click')
      await nextTick()

      // L'entrée est retirée de data et la preview suit
      expect(data.journalEvolution).toHaveLength(1)
      expect(data.journalEvolution[0]._key).toBe('e2')
      expect(wrapper.emitted('change')).toBeDefined()

      const remaining = journalRows(wrapper)
      expect(remaining).toHaveLength(1)
      expect(remaining[0].find('.form-preview__label').text()).toBe('Entrée #1')
      expect(remaining[0].find('.form-preview__value').text()).toBe('Deuxième entrée')
    })
  })

  // ─── 6bis. Migration des anciennes données (journal en chaîne) ────

  it('migrates a legacy string journalEvolution into timestamped entries on mount', () => {
    const data = createDefaultData({
      journalEvolution: '<p>[12/01/2026 10:30] Patient stable</p><p>Deuxième ligne</p>' as unknown as EvolutionJournalEntry[],
    })
    const wrapper = createWrapper({ data })

    // Le composant a migré la chaîne vers un tableau d'entrées structurées
    expect(Array.isArray(data.journalEvolution)).toBe(true)
    expect(data.journalEvolution).toHaveLength(2)
    expect(data.journalEvolution[0]).toMatchObject({
      date: '2026-01-12',
      heure: '10:30',
      user: '',
    })
    expect(data.journalEvolution[0].content).toContain('Patient stable')
    expect(data.journalEvolution[0]._key).toBeTruthy()
    expect(data.journalEvolution[1]).toMatchObject({ date: '', heure: '', user: '' })

    const rows = journalRows(wrapper)
    expect(rows).toHaveLength(2)
    expect(rows[0].find('.form-preview__label').text()).toBe('12/01/2026 10:30')
    expect(rows[0].find('.form-preview__value').text()).toBe('Patient stable')
    expect(rows[1].find('.form-preview__label').text()).toBe('Entrée #2')
    expect(rows[1].find('.form-preview__value').text()).toBe('Deuxième ligne')
  })

  // ─── 7. Avis section (formulaire, pré-remplissage, preview) ─────

  describe('avis section', () => {
    async function openAvisSection(wrapper: ReturnType<typeof createWrapper>) {
      const header = wrapper.findAll('.collapsible-section__header')[1]
      await header.trigger('click')
      await nextTick()
      return sectionBodies(wrapper)[1]
    }

    function avisPreview(wrapper: ReturnType<typeof createWrapper>) {
      const previews = wrapper.findAll('.form-preview')
      const avis = previews.find(p => p.find('.form-preview__title').text().includes('Avis'))
      expect(avis).toBeDefined()
      return avis!
    }

    it('shows the Avis section with a single "Nouvel avis" form (no add button)', async () => {
      const wrapper = createWrapper()

      const titles = wrapper.findAll('.collapsible-section__title').map(t => t.text())
      expect(titles).toContain('Avis')

      // sans avis : pas de badge et FormPreview vide
      const header = wrapper.findAll('.collapsible-section__header')[1]
      expect(header.find('.el-badge').exists()).toBe(false)
      expect(avisPreview(wrapper).find('.el-empty').exists()).toBe(true)

      // ouvrir la section affiche UN SEUL formulaire « Nouvel avis » (pas de bouton d'ajout)
      const body = await openAvisSection(wrapper)
      const cards = wrapper.findAll('.avis-card')
      expect(cards).toHaveLength(1)
      expect(cards[0].find('.avis-card__title').text()).toBe('Nouvel avis')

      // le bouton interne « + Ajouter un avis » a été retiré
      const addBtn = body.findAll('.el-button').find(b => b.text().includes('Ajouter un avis'))
      expect(addBtn).toBeUndefined()
    })

    it('commits a filled avis card into data.avis on the card Enregistrer', async () => {
      const data = createDefaultData()
      const wrapper = createWrapper({ data })

      const body = await openAvisSection(wrapper)
      // le formulaire unique est directement affiché (pas de clic « Ajouter un avis »)
      const cards = wrapper.findAll('.avis-card')
      expect(cards).toHaveLength(1)
      expect(cards[0].find('.avis-card__title').text()).toBe('Nouvel avis')

      await cards[0].find('.el-date-picker').setValue('2026-08-15')
      await cards[0].find('.el-select').setValue('Cardiologie')
      // motif is now RichTextEditor (TipTap HTML) — emit HTML directly
      const motifEditor = cards[0].findComponent({ name: 'RichTextEditor' })
      if (motifEditor.exists()) {
        motifEditor.vm.$emit('update:modelValue', '<p>Tolérance</p>')
        await nextTick()
      } else {
        await cards[0].find('.el-input').setValue('Tolérance')
      }
      await nextTick()

      const saveBtn = cards[0].findAll('.avis-card__actions .el-button')
        .find(b => b.text().trim() === 'Enregistrer')
      expect(saveBtn).toBeDefined()
      await saveBtn!.trigger('click')
      await nextTick()

      expect(data.avis).toHaveLength(1)
      expect(data.avis![0]).toMatchObject({ date: '2026-08-15', specialite: 'Cardiologie' })
      expect(data.avis![0].motif).toContain('Tolérance')
      expect(data.avis![0]._key).toBeTruthy()
      expect(wrapper.emitted('change')).toBeDefined()
    })

    it('deletes an avis from the external preview and emits change', async () => {
      const data = createDefaultData({
        avis: [
          { _key: 'k1', date: '2026-08-15', specialite: 'Cardiologie', motif: '<p>Tolérance</p>' },
          { _key: 'k2', date: '2026-08-20', specialite: 'Ophtalmo', motif: '<p>FO</p>' },
        ],
      })
      const wrapper = createWrapper({ data })

      const rows = avisPreview(wrapper).findAll('.form-preview__row')
      expect(rows).toHaveLength(2)

      // la suppression se fait depuis le bouton Supprimer de la preview externe
      const deleteBtn = rows[0].find('.form-preview__delete')
      expect(deleteBtn.exists()).toBe(true)
      expect(deleteBtn.attributes('aria-label')).toBe('Supprimer Motif — 15/08/2026 — Cardiologie')
      await deleteBtn.trigger('click')
      await nextTick()

      // l'avis est retiré de data immédiatement + change émis
      expect(data.avis).toHaveLength(1)
      expect(data.avis![0]._key).toBe('k2')
      expect(wrapper.emitted('change')).toBeDefined()

      const remaining = avisPreview(wrapper).findAll('.form-preview__row')
      expect(remaining).toHaveLength(1)
      expect(remaining[0].find('.form-preview__label').text()).toBe('Motif — 20/08/2026 — Ophtalmo')
    })

    it('re-opens the section in edit mode via Modifier and commits edits in place', async () => {
      const data = createDefaultData({
        avis: [
          { _key: 'k1', date: '2026-08-15', specialite: 'Cardiologie', motif: '<p>Original</p>' },
        ],
      })
      const wrapper = createWrapper({ data })

      const editBtn = avisPreview(wrapper).find('.form-preview__row .form-preview__edit')
      expect(editBtn.exists()).toBe(true)
      expect(editBtn.attributes('aria-label')).toBe('Modifier Motif — 15/08/2026 — Cardiologie')
      await editBtn.trigger('click')
      await nextTick()

      // La section rouvre sur l'avis édité (mode « Modifier l'avis »)
      const card = wrapper.find('.avis-card')
      expect(card.exists()).toBe(true)
      expect(card.find('.avis-card__title').text()).toBe("Modifier l'avis")

      // le formulaire est pré-rempli avec les valeurs existantes
      expect(card.find('.el-date-picker').attributes('value')).toBe('2026-08-15')
      expect(card.find('.el-select').attributes('value')).toBe('Cardiologie')
      const motifEditor = card.findComponent({ name: 'RichTextEditor' })
      expect(motifEditor.props('modelValue')).toBe('<p>Original</p>')

      // édition des champs
      await card.find('.el-date-picker').setValue('2026-08-20')
      motifEditor.vm.$emit('update:modelValue', '<p>Modifié</p>')
      await nextTick()

      const saveBtn = card.findAll('.avis-card__actions .el-button')
        .find(b => b.text().trim() === 'Enregistrer')
      expect(saveBtn).toBeDefined()
      await saveBtn!.trigger('click')
      await nextTick()

      // Édition en place : pas de nouvel avis, _key conservée, valeurs mises à jour
      expect(data.avis).toHaveLength(1)
      expect(data.avis![0]).toEqual({
        _key: 'k1',
        date: '2026-08-20',
        specialite: 'Cardiologie',
        motif: '<p>Modifié</p>',
      })
      expect(wrapper.emitted('change')).toBeDefined()

      const rows = avisPreview(wrapper).findAll('.form-preview__row')
      expect(rows).toHaveLength(1)
      expect(rows[0].find('.form-preview__value').text()).toBe('Modifié')
    })

    it('renders the "Récupérer les avis" area only when editable and patientId present', async () => {
      // sans patientId → pas de zone de récupération
      const wrapper = createWrapper()
      const body0 = await openAvisSection(wrapper)
      expect(body0.text()).not.toContain('Récupérer les avis')

      // readonly avec patientId → pas de zone
      const ro = createWrapper({ patientId: 7, readonly: true })
      const bodyRo = await openAvisSection(ro)
      expect(bodyRo.text()).not.toContain('Récupérer les avis')

      // patientId + édition → la zone de récupération est présente dans le formulaire
      const ok = createWrapper({ patientId: 7 })
      const bodyOk = await openAvisSection(ok)
      expect(bodyOk.text()).toContain('Récupérer les avis')
    })

    it('recuperates avis into the draft, then commits them via the section Enregistrer button', async () => {
      // 1er appel (auto-pré-remplissage au mount) : liste vide → rien à ajouter
      // appels suivants (bouton manuel) : avis non annulés à récupérer
      mockIpcInvoke
        .mockResolvedValueOnce([])
        .mockResolvedValue([
          { type: 'avis', plannedDate: '2026-08-15', specialtyName: 'Cardiologie', motif: 'Tolérance', statut: 'en_attente' },
          { type: 'avis', plannedDate: '2026-08-20', specialite: 'Ophtalmo', motif: 'FO', statut: 'en_cours' },
          { type: 'avis', plannedDate: '2026-09-01', specialite: 'Annulée', motif: 'x', statut: 'annule' },
        ])
      const data = createDefaultData()
      const wrapper = createWrapper({ data, patientId: 7 })
      await flushPromises()

      // l'auto-pré-remplissage du mount n'a rien ajouté (liste vide à ce moment)
      expect(data.avis).toHaveLength(0)

      const body = await openAvisSection(wrapper)
      // le footer « Enregistrer » est désactivé tant que rien n'est modifié dans la section
      const footer = body.find('.staged-section__footer')
      expect(footer.exists()).toBe(true)
      const footerButtons = footer.findAll('.el-button')
      const footerSave = footerButtons.find(b => b.text().trim() === 'Enregistrer')
      expect(footerSave!.attributes('disabled')).toBeDefined()

      // sélectionner une plage de dates (août) pour filtrer les demandes
      const rangeInput = body.find('.el-date-picker')
      await rangeInput.setValue('2026-08-01→2026-08-31')
      await nextTick()

      const btn = body.findAll('.el-button')
        .find(b => b.text().includes('Récupérer les avis'))
      expect(btn).toBeDefined()
      await btn!.trigger('click')
      await flushPromises()

      // la récupération ajoute les avis au DRAFT (non encore commités) et active le footer
      expect(mockIpcInvoke).toHaveBeenCalledWith('exam-request:list', { patientId: 7 })
      expect(data.avis).toHaveLength(0)
      expect(avisPreview(wrapper).findAll('.form-preview__row')).toHaveLength(0)

      await footerSave!.trigger('click')
      await flushPromises()

      // le « Enregistrer » de la section commit les avis récupérés + la plage
      expect(data.avis).toHaveLength(2)
      expect(data.avis![0]).toMatchObject({ date: '2026-08-15', specialite: 'Cardiologie', motif: 'Tolérance' })
      expect(data.avis![0]._key).toBeTruthy()
      expect(data.avis![1]).toMatchObject({ date: '2026-08-20', specialite: 'Ophtalmo', motif: 'FO' })
      expect(wrapper.emitted('change')).toBeDefined()
      // la plage est persistée avec les avis
      expect(data).toMatchObject({ avisDateFrom: '2026-08-01', avisDateTo: '2026-08-31' })
      // preview : ligne plage + 2 avis
      expect(avisPreview(wrapper).findAll('.form-preview__row')).toHaveLength(3)
    })

    it('renders the Avis FormPreview with formatted date labels and rich motif values', () => {
      const wrapper = createWrapper({
        data: createDefaultData({
          avis: [
            { _key: 'k1', date: '2026-08-15', specialite: 'Cardiologie', motif: '<p>Tolérance</p>' },
            { _key: 'k2', date: '', specialite: 'Ophtalmo', motif: '' },
            { _key: 'k3', date: '', specialite: '', motif: '' },
          ],
        }),
      })

      // le badge compte les avis présents
      const header = wrapper.findAll('.collapsible-section__header')[1]
      expect(header.find('.el-badge').attributes('value')).toBe('3')

      // FormPreview : avis with motif rich OR with specialité alone remain visible (SEV2 fix preserves specialité)
      const rows = avisPreview(wrapper).findAll('.form-preview__row')
      expect(rows).toHaveLength(2)
      expect(rows[0].find('.form-preview__label').text()).toBe('Motif — 15/08/2026 — Cardiologie')
      expect(rows[0].find('.form-preview__value').text()).toBe('Tolérance')
      expect(rows[0].find('.form-preview__value--rich').exists()).toBe(true)
      expect(rows[1].find('.form-preview__label').text()).toBe('Ophtalmo')
      expect(rows[1].find('.form-preview__value').text()).toBe('Ophtalmo')
      expect(rows[1].find('.form-preview__value--rich').exists()).toBe(false)

      // la preview est désormais deletable : chaque ligne expose Modifier + Supprimer
      expect(rows[0].find('.form-preview__delete').attributes('aria-label'))
        .toBe('Supprimer Motif — 15/08/2026 — Cardiologie')
      expect(rows[1].find('.form-preview__delete').attributes('aria-label')).toBe('Supprimer Ophtalmo')
      expect(rows[1].find('.form-preview__edit').attributes('aria-label')).toBe('Modifier Ophtalmo')
    })

    it('prefills avis from exam-request:list on mount', async () => {
      mockIpcInvoke.mockResolvedValue([
        { type: 'avis', plannedDate: '2026-08-15', specialtyName: 'Cardiologie', motif: 'Tolérance', statut: 'en_attente' },
        { type: 'avis', plannedDate: '2026-08-20', specialite: 'Ophtalmo', motif: 'FO', statut: 'en_cours' },
        { type: 'avis', plannedDate: '2026-09-01', specialite: 'Annulée', motif: 'x', statut: 'annule' },
        { type: 'imagerie', plannedDate: '2026-08-16', motif: 'Scanner', statut: 'en_attente' },
      ])
      const data = createDefaultData()
      const wrapper = createWrapper({ data, patientId: 7 })
      await flushPromises()

      expect(mockIpcInvoke).toHaveBeenCalledWith('exam-request:list', { patientId: 7 })
      // seuls les avis non annulés sont pré-remplis (annulé et imagerie exclus)
      expect(data.avis).toHaveLength(2)
      expect(data.avis![0]).toMatchObject({ date: '2026-08-15', specialite: 'Cardiologie', motif: 'Tolérance' })
      expect(data.avis![0]._key).toBeTruthy()
      expect(data.avis![1]).toMatchObject({ date: '2026-08-20', specialite: 'Ophtalmo', motif: 'FO' })
      expect(wrapper.emitted('change')).toBeDefined()
      expect(avisPreview(wrapper).findAll('.form-preview__row')).toHaveLength(2)
    })

    it('does not prefill when readonly', async () => {
      mockIpcInvoke.mockResolvedValue([
        { type: 'avis', plannedDate: '2026-08-15', specialtyName: 'Cardiologie', motif: 'x', statut: 'en_attente' },
      ])
      const data = createDefaultData()
      const wrapper = createWrapper({ data, patientId: 7, readonly: true })
      await flushPromises()

      expect(mockIpcInvoke).not.toHaveBeenCalled()
      expect(data.avis ?? []).toHaveLength(0)
      expect(wrapper.emitted('change')).toBeUndefined()
    })

    it('does not prefill without a patientId', async () => {
      mockIpcInvoke.mockResolvedValue([
        { type: 'avis', plannedDate: '2026-08-15', specialtyName: 'Cardiologie', motif: 'x', statut: 'en_attente' },
      ])
      const data = createDefaultData()
      createWrapper({ data })
      await flushPromises()

      expect(mockIpcInvoke).not.toHaveBeenCalled()
      expect(data.avis ?? []).toHaveLength(0)
    })

    it('does not prefill when the avis list is already filled', async () => {
      mockIpcInvoke.mockResolvedValue([
        { type: 'avis', plannedDate: '2026-08-15', specialtyName: 'Cardiologie', motif: 'Nouveau', statut: 'en_attente' },
      ])
      const data = createDefaultData({
        avis: [{ _key: 'k1', date: '2026-08-01', specialite: 'Cardiologie', motif: 'Existant' }],
      })
      const wrapper = createWrapper({ data, patientId: 7 })
      await flushPromises()

      expect(mockIpcInvoke).not.toHaveBeenCalled()
      expect(data.avis).toHaveLength(1)
      expect(data.avis![0].motif).toBe('Existant')
      expect(wrapper.emitted('change')).toBeUndefined()
    })
  })
})
