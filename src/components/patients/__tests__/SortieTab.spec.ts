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
      destinationSortie: 'Retour domicile',
      infoPatientFamille: false,
      produitsSanguins: false,
      bmrBhre: false,
      conclusionSortie: '',
      rdvSuivi: [],
      ...overrides,
    }
  }

  function createWrapper(options: {
    data?: SortieData
    fieldMeta?: Record<string, string>
  } = {}) {
    return mount(SortieTab, {
      props: {
        data: options.data ?? createDefaultData(),
        fieldMeta: options.fieldMeta,
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
      await openSection(wrapper, 0)
      const checkboxes = wrapper.findAll('.el-checkbox')
      expect(checkboxes).toHaveLength(3)
      expect(checkboxes.map(c => c.text())).toEqual(['Oui', 'Oui', 'Oui'])
      const labels = wrapper.findAll('.el-form-item label').map(el => el.text())
      expect(labels).toContain('Information du patient / famille')
      expect(labels).toContain('Administration de produits sanguins')
      expect(labels).toContain('Porteur / Contact BMR ou BHRe')
      const items = wrapper.findAll('.el-form-item')
      expect(items.some(i => i.attributes('data-history-path') === 'sortie.infoPatientFamille')).toBe(true)
      expect(items.some(i => i.attributes('data-history-path') === 'sortie.produitsSanguins')).toBe(true)
      expect(items.some(i => i.attributes('data-history-path') === 'sortie.bmrBhre')).toBe(true)
    })

    it('keeps edits in the draft until Enregistrer (checked checkbox → no preview row yet)', async () => {
      const wrapper = createWrapper()
      await openSection(wrapper, 0)
      await wrapper.find('.el-checkbox input').setValue(true)
      await nextTick()
      // The value is only in the draft — the preview still reads the committed data
      const rows = wrapper.findAll('.form-preview__row')
      const infoRow = rows.find(r => r.text().includes('Information du patient / famille'))
      expect(infoRow).toBeUndefined()
    })

    it('commits the draft and shows "Oui" in the preview on Enregistrer', async () => {
      const wrapper = createWrapper()
      await openSection(wrapper, 0)
      await wrapper.find('.el-checkbox input').setValue(true)
      await nextTick()
      const saveBtn = sectionBodies(wrapper)[0].findAll('.staged-section__footer .el-button')[0]
      await saveBtn.trigger('click')
      await nextTick()
      const rows = wrapper.findAll('.form-preview__row')
      const infoRow = rows.find(r => r.text().includes('Information du patient / famille'))
      expect(infoRow).toBeDefined()
      expect(infoRow!.text()).toContain('Oui')
      expect(infoRow!.text()).not.toContain('Non')
    })

    it('hides preview rows for unchecked réglementaires booleans', () => {
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
      const bmrRow = rows.find(r => r.text().includes('Porteur / Contact BMR ou BHRe'))
      expect(bmrRow).toBeDefined()
      expect(bmrRow!.text()).toContain('Oui')
      // Unchecked booleans render no row at all
      const sanguinsRow = rows.find(r => r.text().includes('Administration de produits sanguins'))
      expect(sanguinsRow).toBeUndefined()
    })
  })

  // ─── Clôture Médicale section ────────────────────────────────────

  describe('Clôture Médicale section', () => {
    it('renders RichTextEditor for conclusionSortie when opened', async () => {
      const wrapper = createWrapper()
      await openSection(wrapper, 1)
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
    it('renders RDV cards and an icon-only delete button', async () => {
      const wrapper = createWrapper({
        data: createDefaultData({
          rdvSuivi: [
            { _key: 'k1', date: '2025-02-01', heure: '10:00', intitule: 'Consult cardiologie', lieuPraticien: 'Bichat' },
          ],
        }),
      })
      await openSection(wrapper, 2)
      expect(wrapper.findAll('.rdv-card')).toHaveLength(1)
      const delBtn = wrapper.find('.rdv-card__delete')
      expect(delBtn.exists()).toBe(true)
      expect(delBtn.attributes('aria-label')).toBe('Supprimer RDV #1')
    })

    it('adds a RDV in the draft and commits it on Enregistrer', async () => {
      const wrapper = createWrapper()
      await openSection(wrapper, 2)
      const addBtn = wrapper.findAll('.el-button').find(b => b.text().includes('Ajouter un RDV'))
      await addBtn!.trigger('click')
      await nextTick()
      // Draft now holds a new RDV → Enregistrer becomes enabled
      const rdvBody = sectionBodies(wrapper)[2]
      const footerButtons = rdvBody.findAll('.el-button')
      expect(footerButtons[0].attributes('disabled')).toBeUndefined()
    })

    it('sorts RDVs by date and time', async () => {
      const wrapper = createWrapper({
        data: createDefaultData({
          rdvSuivi: [
            { _key: 'k1', date: '2025-02-02', heure: '10:00', intitule: 'B', lieuPraticien: 'x' },
            { _key: 'k2', date: '2025-02-01', heure: '09:00', intitule: 'A', lieuPraticien: 'x' },
          ],
        }),
      })
      await openSection(wrapper, 2)
      const titles = wrapper.findAll('.rdv-card__title').map(el => el.text())
      expect(titles).toEqual(['RDV #1', 'RDV #2'])
      const firstIntitule = wrapper.findAll('.rdv-card')[0].findAll('.el-input')[0].attributes('value')
      expect(firstIntitule).toBe('A')
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

      const body = sectionBodies(wrapper)[0]

      // Prove the section is collapsed BEFORE the click
      expect(body.attributes('style') ?? '').toContain('display: none')

      // The first preview (Clôture Administrative) holds the Date de sortie row
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

      const body = sectionBodies(wrapper)[0]

      // Prove the section is collapsed BEFORE the click
      expect(body.attributes('style') ?? '').toContain('display: none')

      // The first preview (Clôture Administrative) holds the infoPatientFamille row
      const btn = wrapper.findAll('.form-preview')[0]
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
