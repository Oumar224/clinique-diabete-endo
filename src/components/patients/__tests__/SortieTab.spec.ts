// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import type { SortieData } from '@/types/crh-diabete'

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

// ─── EL Stubs ──────────────────────────────────────────────────────

const EL_STUBS: Record<string, any> = {
  'el-form': {
    template: '<form class="el-form" @submit.prevent><slot /></form>',
    props: ['labelPosition', 'class'],
  },
  'el-form-item': {
    template: '<div class="el-form-item"><label v-if="label">{{ label }}</label><slot /></div>',
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
  'el-date-picker': {
    template: '<input class="el-date-picker" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'type', 'valueFormat'],
    emits: ['update:modelValue'],
  },
  'el-time-picker': {
    template: '<input class="el-time-picker" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'valueFormat'],
    emits: ['update:modelValue'],
  },
  'el-select': {
    template: '<select class="el-select" :value="modelValue"><slot /></select>',
    props: ['modelValue', 'placeholder'],
    emits: ['update:modelValue'],
  },
  'el-option': {
    template: '<option class="el-option" :value="value">{{ label }}</option>',
    props: ['label', 'value'],
  },
  'el-input': {
    template: '<input class="el-input" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'placeholder'],
    emits: ['update:modelValue'],
  },
  'el-checkbox': {
    template: '<label class="el-checkbox"><input type="checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)" /><slot /></label>',
    props: ['modelValue'],
    emits: ['update:modelValue', 'change'],
  },
  'el-button': {
    template: '<button class="el-button" :text="text" :type="type" :disabled="disabled" @click="$emit(\'click\', $event)"><slot /></button>',
    props: ['text', 'type', 'size', 'disabled'],
    emits: ['click'],
  },
  'el-empty': {
    template: '<div class="el-empty" :description="description"><slot /></div>',
    props: ['description', 'imageSize'],
  },
  'el-icon': {
    template: '<span class="el-icon"><slot /></span>',
  },
  'el-badge': {
    template: '<span class="el-badge" :value="value"><slot /></span>',
    props: ['value'],
  },
}

// ─── Import component ──────────────────────────────────────────────

import SortieTab from '../SortieTab.vue'

// ─── Test suite ────────────────────────────────────────────────────

describe('SortieTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function createDefaultData(overrides: Partial<SortieData> = {}): SortieData {
    return {
      dateSortie: '2025-01-15',
      destinationSortie: 'Retour à domicile',
      infoPatientFamille: false,
      produitsSanguins: false,
      bmrBhre: false,
      conclusionSortie: '',
      rdvSuivi: [],
      destinationPrecision: '',
      ...overrides,
    }
  }

  function createWrapper(options: {
    data?: SortieData
    fieldMeta?: Record<string, string>
    readonly?: boolean
  } = {}) {
    return mount(SortieTab, {
      props: {
        data: options.data ?? createDefaultData(),
        fieldMeta: options.fieldMeta,
        readonly: options.readonly ?? false,
      },
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

  // ─── Sections ────────────────────────────────────────────────────

  describe('sections', () => {
    it('renders the "Clôture Administrative" CollapsibleSection header', () => {
      const wrapper = createWrapper()
      const titles = wrapper.findAll('.collapsible-section__title').map(el => el.text())
      expect(titles).toContain('Clôture Administrative')
    })

    it('renders the "Clôture Médicale" CollapsibleSection header', () => {
      const wrapper = createWrapper()
      const titles = wrapper.findAll('.collapsible-section__title').map(el => el.text())
      expect(titles).toContain('Clôture Médicale')
    })

    it('renders the "Suivi et Planification des Soins" CollapsibleSection header', () => {
      const wrapper = createWrapper()
      const titles = wrapper.findAll('.collapsible-section__title').map(el => el.text())
      expect(titles).toContain('Suivi et Planification des Soins')
    })

    it('sections are collapsed by default', () => {
      const wrapper = createWrapper()
      for (const body of sectionBodies(wrapper)) {
        expect(body.attributes('style') ?? '').toContain('display: none')
      }
    })
  })

  // ─── Clôture Administrative — événements réglementaires ───────────

  describe('Clôture Administrative – réglementaires', () => {
    it('renders the 3 réglementaires checkboxes when the section is opened', async () => {
      const wrapper = createWrapper()
      await openSection(wrapper, 1)
      const checkboxes = wrapper.findAll('.el-checkbox')
      expect(checkboxes).toHaveLength(3)
      expect(checkboxes.map(c => c.text())).toEqual(['Oui', 'Oui', 'Oui'])
      const labels = wrapper.findAll('.el-form-item label').map(el => el.text())
      expect(labels).toContain('Information du patient / famille')
      expect(labels).toContain('Administration de produits sanguins')
      expect(labels).toContain('Porteur / Contact BMR ou BHRe')
      // Migration historique : data-history-path supprimé — la présence des
      // champs est vérifiée via leurs labels ci-dessus.
    })

    it('keeps edits in the draft until Enregistrer (checked checkbox → data prop not committed yet)', async () => {
      const wrapper = createWrapper()
      await openSection(wrapper, 1)
      // produitsSanguins is OFF by default → the preview already shows "Non"
      const rows = wrapper.findAll('.form-preview__row')
      const sanguinsRow = rows.find(r => r.text().includes('Administration de produits sanguins'))
      expect(sanguinsRow).toBeDefined()
      expect(sanguinsRow!.text()).toContain('Non')
      // Check the Sanguins checkbox (2nd of the 3 réglementaires) — the edit lands in the draft only
      await wrapper.findAll('.el-checkbox input')[1].setValue(true)
      await nextTick()
      // The value is only in the draft — the data prop (and the preview) still reads the committed value
      expect(wrapper.props('data').produitsSanguins).toBe(false)
      const rowsAfter = wrapper.findAll('.form-preview__row')
      const sanguinsAfter = rowsAfter.find(r => r.text().includes('Administration de produits sanguins'))
      expect(sanguinsAfter).toBeDefined()
      expect(sanguinsAfter!.text()).toContain('Non')
    })

    it('commits the draft and shows "Oui" in the preview on Enregistrer', async () => {
      const wrapper = createWrapper()
      await openSection(wrapper, 1)
      await wrapper.find('.el-checkbox input').setValue(true)
      await nextTick()
      const saveBtn = sectionBodies(wrapper)[1].findAll('.staged-section__footer .el-button')[0]
      await saveBtn.trigger('click')
      await nextTick()
      const rows = wrapper.findAll('.form-preview__row')
      const infoRow = rows.find(r => r.text().includes('Information du patient / famille'))
      expect(infoRow).toBeDefined()
      expect(infoRow!.text()).toContain('Oui')
      expect(infoRow!.text()).not.toContain('Non')
    })

    it('shows "Non" for unchecked réglementaires booleans and "Oui" for checked ones', () => {
      const wrapper = createWrapper({
        data: createDefaultData({
          infoPatientFamille: true,
          produitsSanguins: false,
          bmrBhre: true,
        }),
      })
      const rows = wrapper.findAll('.form-preview__row')
      const infoRow = rows.find(r => r.text().includes('Information du patient / famille'))
      expect(infoRow).toBeDefined()
      expect(infoRow!.text()).toContain('Oui')
      expect(infoRow!.text()).not.toContain('Non')
      const bmrRow = rows.find(r => r.text().includes('Porteur / Contact BMR ou BHRe'))
      expect(bmrRow).toBeDefined()
      expect(bmrRow!.text()).toContain('Oui')
      expect(bmrRow!.text()).not.toContain('Non')
      // Unchecked booleans now render an explicit "Non" row
      const sanguinsRow = rows.find(r => r.text().includes('Administration de produits sanguins'))
      expect(sanguinsRow).toBeDefined()
      expect(sanguinsRow!.text()).toContain('Non')
      expect(sanguinsRow!.text()).not.toContain('Oui')
    })
  })

  // ─── Clôture Médicale section ────────────────────────────────────

  describe('Clôture Médicale section', () => {
    it('renders RichTextEditor for conclusionSortie when opened', async () => {
      const wrapper = createWrapper()
      await openSection(wrapper, 0)
      expect(wrapper.find('.rich-editor-mock').exists()).toBe(true)
    })

    it('strips HTML from the conclusionSortie preview (regression F1: preview shows plain text)', () => {
      const wrapper = createWrapper({
        data: createDefaultData({
          conclusionSortie: '<p>Résumé de sortie &lt;stable&gt;</p>',
        }),
      })
      const rows = wrapper.findAll('.form-preview__row')
      const conclusionRow = rows.find(r => r.text().includes('Conclusion de sortie'))
      expect(conclusionRow).toBeDefined()
      // Raw HTML tags must never leak into the preview
      expect(conclusionRow!.text()).not.toContain('<p>')
      // The stripped plain text (with decoded entities) is what the user sees
      expect(conclusionRow!.text()).toContain('Résumé de sortie')
      expect(conclusionRow!.text()).toContain('<stable>')
    })
  })

  // ─── RDV section ─────────────────────────────────────────────────

  describe('RDV suivi section', () => {
    it('renders a single RDV form card with no add button', async () => {
      const wrapper = createWrapper()
      await openSection(wrapper, 2)
      const cards = wrapper.findAll('.rdv-card')
      expect(cards).toHaveLength(1)
      expect(cards[0].find('.rdv-card__title').text()).toBe('Nouveau RDV de suivi')
      // le bouton « + Ajouter un RDV de suivi » a été retiré (un seul formulaire à la fois)
      const addBtn = wrapper.findAll('.el-button').find(b => b.text().includes('Ajouter un RDV'))
      expect(addBtn).toBeUndefined()
    })

    it('commits a filled RDV card into data.rdvSuivi on the card Enregistrer', async () => {
      const data = createDefaultData()
      const wrapper = createWrapper({ data })
      await openSection(wrapper, 2)

      const cards = wrapper.findAll('.rdv-card')
      expect(cards).toHaveLength(1)
      const card = cards[0]
      await card.find('.el-date-picker').setValue('2025-02-01')
      await card.find('.el-time-picker').setValue('10:00')
      const inputs = card.findAll('.el-input')
      await inputs[0].setValue('Consult cardiologie')
      await inputs[1].setValue('Bichat')
      await nextTick()

      const saveBtn = card.findAll('.rdv-card__actions .el-button')
        .find(b => b.text().trim() === 'Enregistrer')
      expect(saveBtn).toBeDefined()
      await saveBtn!.trigger('click')
      await nextTick()

      expect(data.rdvSuivi).toHaveLength(1)
      expect(data.rdvSuivi[0]).toEqual({
        _key: expect.any(String),
        date: '2025-02-01',
        heure: '10:00',
        intitule: 'Consult cardiologie',
        lieuPraticien: 'Bichat',
      })
      expect(wrapper.emitted('change')).toBeDefined()

      // la preview externe (3e FormPreview) reflète le RDV commité
      const rows = wrapper.findAll('.form-preview')[2].findAll('.form-preview__row')
      expect(rows).toHaveLength(1)
      expect(rows[0].find('.form-preview__label').text()).toBe('01/02/2025 10:00')
      expect(rows[0].find('.form-preview__value').text()).toBe('Consult cardiologie — Bichat')
    })

    it('sorts RDVs in the preview by date and time', async () => {
      const wrapper = createWrapper({
        data: createDefaultData({
          rdvSuivi: [
            { _key: 'k1', date: '2025-02-02', heure: '10:00', intitule: 'B optic', lieuPraticien: 'b' },
            { _key: 'k2', date: '2025-02-01', heure: '09:00', intitule: 'A cardio', lieuPraticien: 'a' },
          ],
        }),
      })

      const rows = wrapper.findAll('.form-preview')[2].findAll('.form-preview__row')
      expect(rows).toHaveLength(2)
      expect(rows[0].find('.form-preview__label').text()).toBe('01/02/2025 09:00')
      expect(rows[0].find('.form-preview__value').text()).toBe('A cardio — a')
      expect(rows[1].find('.form-preview__label').text()).toBe('02/02/2025 10:00')
      expect(rows[1].find('.form-preview__value').text()).toBe('B optic — b')
    })

    it('edits an RDV from the preview Modifier button (single form)', async () => {
      const data = createDefaultData({
        rdvSuivi: [{ _key: 'k1', date: '2025-02-01', heure: '10:00', intitule: 'Consult', lieuPraticien: 'Bichat' }],
      })
      const wrapper = createWrapper({ data })

      const body = sectionBodies(wrapper)[2]
      expect(body.attributes('style') ?? '').toContain('display: none')

      const editBtn = wrapper.findAll('.form-preview')[2]
        .find('.form-preview__row .form-preview__edit')
      expect(editBtn.attributes('aria-label')).toBe('Modifier 01/02/2025 10:00')
      await editBtn.trigger('click')
      await nextTick()

      // la section est rouverte sur le RDV existant (pas de nouvel élément)
      expect(body.attributes('style') ?? '').not.toContain('display: none')
      const card = wrapper.find('.rdv-card')
      expect(card.find('.rdv-card__title').text()).toBe('Modifier le RDV')
      expect(card.find('.el-date-picker').attributes('value')).toBe('2025-02-01')
      expect(card.find('.el-time-picker').attributes('value')).toBe('10:00')
      const inputs = card.findAll('.el-input')
      expect(inputs[0].attributes('value')).toBe('Consult')
      expect(inputs[1].attributes('value')).toBe('Bichat')

      // modification en place : pas de nouvel RDV, valeurs mises à jour
      await inputs[0].setValue('Consult vasculaire')
      await nextTick()
      const saveBtn = card.findAll('.rdv-card__actions .el-button')
        .find(b => b.text().trim() === 'Enregistrer')
      await saveBtn!.trigger('click')
      await nextTick()

      expect(data.rdvSuivi).toHaveLength(1)
      expect(data.rdvSuivi[0]).toMatchObject({ _key: 'k1', intitule: 'Consult vasculaire', lieuPraticien: 'Bichat' })
      const rows = wrapper.findAll('.form-preview')[2].findAll('.form-preview__row')
      expect(rows).toHaveLength(1)
      expect(rows[0].find('.form-preview__value').text()).toBe('Consult vasculaire — Bichat')
    })

    it('deletes an RDV from the preview', async () => {
      const data = createDefaultData({
        rdvSuivi: [{ _key: 'k1', date: '2025-02-01', heure: '10:00', intitule: 'Consult', lieuPraticien: 'Bichat' }],
      })
      const wrapper = createWrapper({ data })

      const deleteBtn = wrapper.findAll('.form-preview')[2]
        .find('.form-preview__row .form-preview__delete')
      expect(deleteBtn.attributes('aria-label')).toBe('Supprimer 01/02/2025 10:00')
      await deleteBtn.trigger('click')
      await nextTick()

      expect(data.rdvSuivi).toHaveLength(0)
      expect(wrapper.emitted('change')).toBeDefined()
      expect(wrapper.findAll('.form-preview')[2].find('.el-empty').exists()).toBe(true)
    })

    it('shows the RDV count as a badge on the section header', () => {
      const wrapper = createWrapper({
        data: createDefaultData({
          rdvSuivi: [
            { _key: 'k1', date: '2025-02-01', heure: '10:00', intitule: 'A', lieuPraticien: 'a' },
            { _key: 'k2', date: '2025-02-02', heure: '09:00', intitule: 'B', lieuPraticien: 'b' },
          ],
        }),
      })

      const header = wrapper.findAll('.collapsible-section__header')[2]
      expect(header.find('.el-badge').attributes('value')).toBe('2')
    })

    it('disables the card actions in readonly mode', async () => {
      const wrapper = createWrapper({ readonly: true })
      await openSection(wrapper, 2)

      const saveBtn = wrapper.findAll('.rdv-card__actions .el-button')
        .find(b => b.text().trim() === 'Enregistrer')
      expect(saveBtn!.attributes('disabled')).toBeDefined()
    })
  })

  // ─── FormPreview ─────────────────────────────────────────────────

  describe('FormPreview', () => {
    it('shows a formatted DD/MM/YYYY value for "Date de sortie"', () => {
      const wrapper = createWrapper({
        data: createDefaultData({ dateSortie: '2025-06-01' }),
      })
      const rows = wrapper.findAll('.form-preview__row')
      const dateRow = rows.find(r => r.text().includes('Date de sortie'))
      expect(dateRow).toBeDefined()
      expect(dateRow!.text()).toContain('01/06/2025')
    })

    it('renders no "Date de sortie" row when dateSortie is empty', () => {
      const wrapper = createWrapper({
        data: createDefaultData({ dateSortie: '' }),
      })
      const rows = wrapper.findAll('.form-preview__row')
      const dateRow = rows.find(r => r.text().includes('Date de sortie'))
      expect(dateRow).toBeUndefined()
    })
  })

  // ─── Field meta (dernière modification) ───────────────────────────

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
        fieldMeta: { 'sortie.dateSortie': '2026-06-15T10:30:00.000Z' },
      })

      const row = wrapper.findAll('.form-preview__row')
        .find(r => r.text().includes('Date de sortie'))
      expect(row).toBeDefined()

      expect(row!.find('.form-preview__updated').text())
        .toMatch(/^Modifié le \d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/)

      const btn = row!.find('.form-preview__edit')
      expect(btn.exists()).toBe(true)
      expect(btn.attributes('aria-label')).toBe('Modifier Date de sortie')
    })

    it('re-opens the collapsed section and scrolls to it when Modifier is clicked', async () => {
      const wrapper = createWrapper({
        fieldMeta: { 'sortie.dateSortie': '2026-06-15T10:30:00.000Z' },
      })

      const body = sectionBodies(wrapper)[1]

      // Prove the section is collapsed BEFORE the click
      expect(body.attributes('style') ?? '').toContain('display: none')

      // The second preview (Clôture Administrative, now after Clôture Médicale) holds the Date de sortie row
      const btn = wrapper.findAll('.form-preview')[1]
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
        .find(r => r.text().includes('Date de sortie'))
      expect(row).toBeDefined()
      expect(row!.find('.form-preview__updated').text()).toBe('Non modifié')
    })

    it('renders "Modifié le" with a formatted date and a Modifier button for sortie.infoPatientFamille', () => {
      const wrapper = createWrapper({
        data: createDefaultData({ infoPatientFamille: true }),
        fieldMeta: { 'sortie.infoPatientFamille': '2026-06-15T10:30:00.000Z' },
      })

      const row = wrapper.findAll('.form-preview__row')
        .find(r => r.text().includes('Information du patient / famille'))
      expect(row).toBeDefined()

      expect(row!.find('.form-preview__updated').text())
        .toMatch(/^Modifié le \d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/)

      const btn = row!.find('.form-preview__edit')
      expect(btn.exists()).toBe(true)
      expect(btn.attributes('aria-label')).toBe('Modifier Information du patient / famille')
    })

    it('re-opens the Clôture Administrative section and scrolls to it when Modifier is clicked for infoPatientFamille', async () => {
      const wrapper = createWrapper({
        data: createDefaultData({ infoPatientFamille: true }),
        fieldMeta: { 'sortie.infoPatientFamille': '2026-06-15T10:30:00.000Z' },
      })

      const body = sectionBodies(wrapper)[1]

      // Prove the section is collapsed BEFORE the click
      expect(body.attributes('style') ?? '').toContain('display: none')

      // The second preview (Clôture Administrative) holds the infoPatientFamille row
      const btn = wrapper.findAll('.form-preview')[1]
        .find('.form-preview__row .form-preview__edit')
      expect(btn.exists()).toBe(true)
      await btn.trigger('click')
      await nextTick()

      // openSection() re-opened the section and scrolled to it
      expect(body.attributes('style') ?? '').not.toContain('display: none')
      expect(scrollSpy).toHaveBeenCalled()
    })

    it('renders "Non modifié" for sortie.infoPatientFamille when fieldMeta is empty', () => {
      const wrapper = createWrapper({
        data: createDefaultData({ infoPatientFamille: true }),
        fieldMeta: {},
      })

      const row = wrapper.findAll('.form-preview__row')
        .find(r => r.text().includes('Information du patient / famille'))
      expect(row).toBeDefined()
      expect(row!.find('.form-preview__updated').text()).toBe('Non modifié')
    })
  })
})
