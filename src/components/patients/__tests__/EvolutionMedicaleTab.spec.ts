// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import type { EvolutionMedicaleData } from '@/types/crh-diabete'

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
      journalEvolution: '',
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

  // ─── 1. Per-entry journal preview with timestamps ─────────────

  it('shows one preview row per journal entry with the timestamp as label', () => {
    const wrapper = createWrapper({
      data: createDefaultData({
        journalEvolution: '<p>[12/01/2026 10:30] Entrée un</p><p>[12/01/2026 14:00] Entrée deux</p>',
      }),
    })

    const rows = journalRows(wrapper)
    expect(rows).toHaveLength(2)
    expect(rows[0].find('.form-preview__label').text()).toBe('12/01/2026 10:30')
    expect(rows[0].find('.form-preview__value').text()).toBe('Entrée un')
    expect(rows[1].find('.form-preview__label').text()).toBe('12/01/2026 14:00')
    expect(rows[1].find('.form-preview__value').text()).toBe('Entrée deux')
  })

  // ─── 2. Entries without a timestamp → Entrée #N ───────────────

  it('labels a line without a timestamp as Entrée #1 with the whole line as value', () => {
    const wrapper = createWrapper({
      data: createDefaultData({
        journalEvolution: '<p>texte libre</p>',
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
        journalEvolution: '<p>Première ligne</p><p>Deuxième ligne</p>',
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
      data: createDefaultData({ journalEvolution: '' }),
    })

    const journal = journalPreview(wrapper)
    expect(journal.findAll('.form-preview__row')).toHaveLength(0)
    expect(journal.find('.el-empty').exists()).toBe(true)
  })

  // ─── 4. Timestamp + trailing text on the same paragraph ───────

  it('extracts label = timestamp and value = trailing text on the same paragraph', () => {
    const wrapper = createWrapper({
      data: createDefaultData({
        journalEvolution: '<p>[12/01/2026 10:30] Patient stable — sortie envisagée dans 48h</p>',
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
      const wrapper = createWrapper()
      const header = wrapper.findAll('.collapsible-section__header')[0]
      await header.trigger('click')
      await nextTick()
      await typeJournalEntry(wrapper, '<p>Entrée en cours</p>')
      // No preview row yet — the value is only in the draft
      expect(wrapper.findAll('.form-preview__row')).toHaveLength(0)
    })

    it('commits the draft and updates the preview on Enregistrer', async () => {
      const wrapper = createWrapper()
      const header = wrapper.findAll('.collapsible-section__header')[0]
      await header.trigger('click')
      await nextTick()
      await typeJournalEntry(wrapper, '<p>Entrée en cours</p>')
      const saveBtn = wrapper.findAll('.staged-section__footer .el-button')[0]
      await saveBtn.trigger('click')
      await nextTick()
      const rows = journalRows(wrapper)
      expect(rows).toHaveLength(1)
      expect(rows[0].find('.form-preview__value').text()).toBe('Entrée en cours')
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
        data: createDefaultData({ journalEvolution: '<p>Patient stable</p>' }),
        fieldMeta: { 'evolutionMedicale.journalEvolution': '2026-06-15T10:30:00.000Z' },
      })

      const row = wrapper.findAll('.form-preview__row')
        .find(r => r.text().includes('Patient stable'))
      expect(row).toBeDefined()

      expect(row!.find('.form-preview__updated').text())
        .toMatch(/^Modifié le \d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/)

      const btn = row!.find('.form-preview__edit')
      expect(btn.exists()).toBe(true)
      expect(btn.attributes('aria-label')).toBe('Modifier Entrée #1')
    })

    it('re-opens the collapsed section and scrolls to it when Modifier is clicked', async () => {
      const wrapper = createWrapper({
        data: createDefaultData({ journalEvolution: '<p>Patient stable</p>' }),
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
        data: createDefaultData({ journalEvolution: '<p>Patient stable</p>' }),
        fieldMeta: {},
      })

      const row = wrapper.findAll('.form-preview__row')
        .find(r => r.text().includes('Patient stable'))
      expect(row).toBeDefined()
      expect(row!.find('.form-preview__updated').text()).toBe('Non modifié')
    })
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

    it('shows the Avis section with an "Ajouter un avis" button', async () => {
      const wrapper = createWrapper()

      const titles = wrapper.findAll('.collapsible-section__title').map(t => t.text())
      expect(titles).toContain('Avis')

      // sans avis : pas de badge et FormPreview vide
      const header = wrapper.findAll('.collapsible-section__header')[1]
      expect(header.find('.el-badge').exists()).toBe(false)
      expect(avisPreview(wrapper).find('.el-empty').exists()).toBe(true)

      const body = await openAvisSection(wrapper)
      const addBtn = body.findAll('.el-button').find(b => b.text().includes('Ajouter un avis'))
      expect(addBtn).toBeDefined()
      expect(addBtn!.attributes('disabled')).toBeUndefined()
    })

    it('commits a filled avis card into data.evolutionMedicale.avis on Enregistrer', async () => {
      const data = createDefaultData()
      const wrapper = createWrapper({ data })

      const body = await openAvisSection(wrapper)
      const addBtn = body.findAll('.el-button').find(b => b.text().includes('Ajouter un avis'))!
      await addBtn.trigger('click')
      await nextTick()

      const cards = wrapper.findAll('.avis-card')
      expect(cards).toHaveLength(1)

      await cards[0].find('.el-date-picker').setValue('2026-08-15')
      await cards[0].find('.el-select').setValue('Cardiologie')
      await cards[0].find('.el-input').setValue('Tolérance')
      await nextTick()

      const saveBtn = body.findAll('.staged-section__footer .el-button')[0]
      await saveBtn.trigger('click')
      await nextTick()

      expect(data.avis).toHaveLength(1)
      expect(data.avis![0]).toMatchObject({ date: '2026-08-15', specialite: 'Cardiologie', motif: 'Tolérance' })
      expect(data.avis![0]._key).toBeTruthy()
      expect(wrapper.emitted('change')).toBeDefined()
    })

    it('deletes an avis card by _key and commits the removal on Enregistrer', async () => {
      const data = createDefaultData({
        avis: [
          { _key: 'k1', date: '2026-08-15', specialite: 'Cardiologie', motif: 'Tolérance' },
          { _key: 'k2', date: '2026-08-20', specialite: 'Ophtalmo', motif: 'FO' },
        ],
      })
      const wrapper = createWrapper({ data })

      const body = await openAvisSection(wrapper)
      const cards = wrapper.findAll('.avis-card')
      expect(cards).toHaveLength(2)

      const deleteBtn = cards[0].find('.avis-card__delete')
      expect(deleteBtn.attributes('aria-label')).toBe('Supprimer Avis #1')
      await deleteBtn.trigger('click')
      await nextTick()

      expect(wrapper.findAll('.avis-card')).toHaveLength(1)
      expect(wrapper.find('.avis-card__title').text()).toBe('Avis #1')

      const saveBtn = body.findAll('.staged-section__footer .el-button')[0]
      await saveBtn.trigger('click')
      await nextTick()

      expect(data.avis).toHaveLength(1)
      expect(data.avis![0]._key).toBe('k2')
      expect(wrapper.emitted('change')).toBeDefined()
    })

    it('renders the Avis FormPreview with formatted date labels and "specialite — motif" values', () => {
      const wrapper = createWrapper({
        data: createDefaultData({
          avis: [
            { _key: 'k1', date: '2026-08-15', specialite: 'Cardiologie', motif: 'Tolérance' },
            { _key: 'k2', date: '', specialite: 'Ophtalmo', motif: '' },
            { _key: 'k3', date: '', specialite: '', motif: '' },
          ],
        }),
      })

      // le badge compte les avis présents
      const header = wrapper.findAll('.collapsible-section__header')[1]
      expect(header.find('.el-badge').attributes('value')).toBe('3')

      // FormPreview : date formatée en label, "spécialité — motif" en valeur ;
      // l'avis entièrement vide est masqué par FormPreview
      const rows = avisPreview(wrapper).findAll('.form-preview__row')
      expect(rows).toHaveLength(2)
      expect(rows[0].find('.form-preview__label').text()).toBe('15/08/2026')
      expect(rows[0].find('.form-preview__value').text()).toBe('Cardiologie — Tolérance')
      expect(rows[1].find('.form-preview__label').text()).toBe('Avis #2')
      expect(rows[1].find('.form-preview__value').text()).toBe('Ophtalmo')
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
